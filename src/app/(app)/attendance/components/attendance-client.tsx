'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Student, ChoirMember, AttendanceSession, Choir } from '@/lib/types';
import { saveAttendanceSession } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, PlusCircle, ListChecks, Edit, Music } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import AttendanceSheet from './attendance-sheet';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import DeleteSessionButton from '../../dashboard/components/delete-session-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ClientSession = Omit<AttendanceSession, 'date' | 'recorded_at' | 'uploaded_at'> & { date: Date };

export default function AttendanceClient() {
  const [sessionToEdit, setSessionToEdit] = useState<ClientSession | null>(null);
  const [newSession, setNewSession] = useState<{ date: Date; practice_type: string }>({
    date: new Date(),
    practice_type: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading: authLoading } = useUser();
  const [selectedChoirId, setSelectedChoirId] = useState<string | null>(null);

  const [students, setStudents] = useState<Student[] | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const choirsQuery = useMemoFirebase(() => 
    !authLoading && firestore ? query(collection(firestore, 'choirs'), orderBy('name', 'asc')) : null, 
  [firestore, authLoading]);
  const { data: choirs, isLoading: choirsLoading } = useCollection<Choir>(choirsQuery);

  const selectedChoir = useMemo(() => {
      if (!choirs || !selectedChoirId) return null;
      return choirs.find(c => c.id === selectedChoirId);
  }, [choirs, selectedChoirId]);

  const activeMembersQuery = useMemoFirebase(() =>
    !authLoading && firestore && selectedChoirId
      ? query(collection(firestore, 'choirs', selectedChoirId, 'members'), where('status', '==', 'active'))
      : null
  , [firestore, selectedChoirId, authLoading]);
  const { data: activeChoirMembers, isLoading: membersLoading } = useCollection<ChoirMember>(activeMembersQuery);
  
  const studentAdmissionNumbers = useMemo(() => {
    if (!activeChoirMembers) return [];
    return activeChoirMembers.map(m => m.admission_number);
  }, [activeChoirMembers]);

  useEffect(() => {
    if (!firestore || studentAdmissionNumbers.length === 0) {
        setStudents([]);
        return;
    }

    const fetchStudentsInChunks = async () => {
        setStudentsLoading(true);
        const allStudents: Student[] = [];
        const chunks: string[][] = [];

        for (let i = 0; i < studentAdmissionNumbers.length; i += 30) {
            chunks.push(studentAdmissionNumbers.slice(i, i + 30));
        }

        try {
            const queryPromises = chunks.map(chunk => {
                if (chunk.length > 0) {
                    const q = query(collection(firestore, 'students'), where('admission_number', 'in', chunk));
                    return getDocs(q);
                }
                return Promise.resolve(null);
            });

            const querySnapshots = await Promise.all(queryPromises);

            for (const querySnapshot of querySnapshots) {
                if (querySnapshot) {
                    querySnapshot.forEach((doc) => {
                        allStudents.push({ id: doc.id, ...doc.data() } as Student);
                    });
                }
            }
            setStudents(allStudents);
        } catch (error) {
            console.error("Error fetching students in chunks:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load student details for the attendance sheet.' });
        } finally {
            setStudentsLoading(false);
        }
    };

    fetchStudentsInChunks();
  }, [firestore, studentAdmissionNumbers, toast]);


  const sessionsQuery = useMemoFirebase(() =>
    !authLoading && firestore && selectedChoirId
      ? query(collection(firestore, 'choir_attendance'), where('choirId', '==', selectedChoirId))
      : null
  , [firestore, selectedChoirId, authLoading]);
  const { data: attendanceSessions, isLoading: sessionsLoading } = useCollection<AttendanceSession>(sessionsQuery);

  const sortedAttendanceSessions = useMemo(() => {
    if (!attendanceSessions) return [];
    return [...attendanceSessions].sort((a, b) => b.date.toMillis() - a.date.toMillis());
  }, [attendanceSessions]);

  const activeStudents = useMemo(() => students || [], [students]);

  const handleCreateAndSaveSession = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to create a session.' });
        return;
    }
    if (!selectedChoir) {
        toast({ variant: 'destructive', title: 'No Choir Selected', description: 'Please select a choir to create a session.' });
        return;
    }
    if (!newSession.date || !newSession.practice_type) {
      toast({ variant: 'destructive', title: 'Incomplete Information', description: 'Please provide both a date and a practice type.' });
      return;
    }
    if (!activeChoirMembers) {
      toast({ variant: 'destructive', title: 'No Active Members', description: `There are no active members in ${selectedChoir.name} to create a session for.` });
      return;
    }

    setIsCreating(true);

    const initialAttendanceMap = activeChoirMembers.reduce((acc, member) => {
      acc[member.admission_number] = false; // Mark all as absent initially
      return acc;
    }, {} as Record<string, boolean>);

    const result = await saveAttendanceSession({
      choirId: selectedChoir.id,
      choirName: selectedChoir.name,
      date: newSession.date,
      practice_type: newSession.practice_type,
      attendance_map: initialAttendanceMap,
    }, user.uid);

    if (result.success) {
      toast({
        title: 'Session Created!',
        description: `The session for ${newSession.practice_type} has been saved. You can now select it to start taking attendance.`,
      });
      setNewSession({ date: new Date(), practice_type: '' });
    } else {
      toast({ variant: 'destructive', title: 'Creation Failed', description: result.message });
    }
    setIsCreating(false);
  };
  
  const handleEditSession = (session: AttendanceSession) => {
    setSessionToEdit({
      ...session,
      date: session.date.toDate(), // Convert Timestamp to JS Date for the form
    });
  };

  const handleSaveAttendance = async (attendanceMap: Record<string, boolean>) => {
    if (!sessionToEdit || !selectedChoir || !user) return;
    setIsSaving(true);
    
    const result = await saveAttendanceSession({
      choirId: selectedChoir.id,
      choirName: selectedChoir.name,
      date: sessionToEdit.date,
      practice_type: sessionToEdit.practice_type,
      attendance_map: attendanceMap,
    }, user.uid);
    
    if (result.success) {
      toast({ title: 'Success!', description: result.message });
      setSessionToEdit(null);
    } else {
      toast({ variant: 'destructive', title: 'Save Failed', description: result.message });
    }
    
    setIsSaving(false);
  };
  
  const isLoading = authLoading || isCreating || isSaving || membersLoading || studentsLoading || choirsLoading;

  if (sessionToEdit) {
    return (
      <div className="max-w-4xl mx-auto">
        <AttendanceSheet
          session={sessionToEdit}
          activeChoirStudents={activeStudents}
          onSave={handleSaveAttendance}
          onCancel={() => setSessionToEdit(null)}
          isSaving={isSaving}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className='lg:col-span-1'>
            <Card className="lg:sticky top-8">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <PlusCircle className="text-primary"/> Create New Session
                  </CardTitle>
                  <CardDescription>Select a choir, then enter the details for a new practice session.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Choir</label>
                    <Select onValueChange={setSelectedChoirId} value={selectedChoirId ?? undefined} disabled={choirsLoading}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={choirsLoading ? "Loading choirs..." : "Select a choir..."} />
                        </SelectTrigger>
                        <SelectContent>
                            {choirs?.map(choir => (
                                <SelectItem key={choir.id} value={choir.id}>
                                    {choir.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                      <label className="text-sm font-medium">Practice Date</label>
                      <Popover>
                      <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            disabled={!selectedChoirId}
                            className={cn('w-full justify-start text-left font-normal', !newSession.date && 'text-muted-foreground')}
                          >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newSession.date ? format(newSession.date, 'PPP') : <span>Pick a date</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                          <Calendar
                          mode="single"
                          selected={newSession.date}
                          onSelect={(date) => setNewSession(prev => ({ ...prev, date: date || new Date() }))}
                          initialFocus
                          />
                      </PopoverContent>
                      </Popover>
                  </div>
                  <div className="grid gap-2">
                      <label className="text-sm font-medium">Practice Type</label>
                      <Input
                      placeholder="e.g., Evening Practice"
                      value={newSession.practice_type}
                      disabled={!selectedChoirId}
                      onChange={(e) => setNewSession(prev => ({ ...prev, practice_type: e.target.value }))}
                      />
                  </div>
                  <Button onClick={handleCreateAndSaveSession} className="w-full" disabled={isLoading || !selectedChoirId || activeStudents.length === 0}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isCreating ? 'Saving...' : 'Create & Save Session'}
                  </Button>
                  {selectedChoirId && activeStudents.length === 0 && !membersLoading && (
                    <p className="text-xs text-center text-muted-foreground">This choir has no active members. Add members in the 'Choirs' section.</p>
                  )}
              </CardContent>
            </Card>
        </div>
      <div className='lg:col-span-2'>
        <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <ListChecks className="text-primary"/>
                Past Attendance Sessions
              </CardTitle>
              <CardDescription>{selectedChoir ? `Showing sessions for ${selectedChoir.name}.` : 'Select a choir to see past sessions.'}</CardDescription>
            </CardHeader>
            <CardContent>
                {(sessionsLoading && selectedChoirId) && (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
              <div className="space-y-2">
                {sortedAttendanceSessions && sortedAttendanceSessions.length > 0 ? sortedAttendanceSessions.map((session, index) => (
                  <div key={session.id}>
                    <div 
                        className="flex justify-between items-center p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => handleEditSession(session)}
                    >
                      <div>
                        <p className="font-medium">{session.practice_type}</p>
                        <p className="text-sm text-muted-foreground">{format(session.date.toDate(), 'EEEE, MMMM d, yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium text-primary">
                            {Object.values(session.attendance_map).filter(Boolean).length} / {Object.keys(session.attendance_map).length}
                          </p>
                          <p className="text-xs text-muted-foreground">Present</p>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                            <DeleteSessionButton sessionId={session.id} />
                        </div>
                        <Edit className="h-4 w-4 text-muted-foreground"/>
                      </div>
                    </div>
                    {index < (sortedAttendanceSessions?.length ?? 0) - 1 && <Separator className="my-1" />}
                  </div>
                )) : (
                    !sessionsLoading && (
                        <div className="text-center p-8 text-muted-foreground border rounded-lg flex flex-col items-center gap-4">
                            <Music className="h-10 w-10" />
                            {selectedChoirId ? `No attendance sessions recorded yet for ${selectedChoir?.name}.` : 'Please select a choir to begin.'}
                        </div>
                    )
                )}
              </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
