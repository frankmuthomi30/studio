'use client';

import { useState } from 'react';
import type { Student, ChoirMember, AttendanceSession } from '@/lib/types';
import { saveAttendanceSession } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, PlusCircle, ListChecks, Edit } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import AttendanceSheet from './attendance-sheet';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import DeleteSessionButton from '../../dashboard/components/delete-session-button';

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
  const { isUserLoading: authLoading } = useUser();

  const activeMembersQuery = useMemoFirebase(() =>
    !authLoading && firestore ? query(collection(firestore, 'choir_members'), where('status', '==', 'active')) : null
  , [firestore, authLoading]);
  const { data: activeChoirMembers, isLoading: membersLoading } = useCollection<ChoirMember>(activeMembersQuery);
  
  const studentQuery = useMemoFirebase(() =>
    !authLoading && firestore && activeChoirMembers && activeChoirMembers.length > 0 ? 
    query(collection(firestore, 'students'), where('admission_number', 'in', activeChoirMembers.map(m => m.admission_number))) 
    : null
  , [firestore, activeChoirMembers, authLoading]);
  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentQuery);

  const sessionsQuery = useMemoFirebase(() =>
    !authLoading && firestore
      ? query(collection(firestore, 'choir_attendance'), orderBy('date', 'desc'))
      : null
  , [firestore, authLoading]);
  const { data: attendanceSessions, isLoading: sessionsLoading } = useCollection<AttendanceSession>(sessionsQuery);

  const activeStudents = useMemo(() => students || [], [students]);

  const handleCreateAndSaveSession = async () => {
    if (!newSession.date || !newSession.practice_type) {
      toast({ variant: 'destructive', title: 'Incomplete Information', description: 'Please provide both a date and a practice type.' });
      return;
    }
    if (!activeChoirMembers) {
      toast({ variant: 'destructive', title: 'No Choir Members', description: 'Cannot create a session without active choir members.' });
      return;
    }

    setIsCreating(true);

    const initialAttendanceMap = activeChoirMembers.reduce((acc, member) => {
      acc[member.admission_number] = false; // Mark all as absent initially
      return acc;
    }, {} as Record<string, boolean>);

    const result = await saveAttendanceSession({
      date: newSession.date,
      practice_type: newSession.practice_type,
      attendance_map: initialAttendanceMap,
    });

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
    if (!sessionToEdit) return;
    setIsSaving(true);
    
    const result = await saveAttendanceSession({
      date: sessionToEdit.date,
      practice_type: sessionToEdit.practice_type,
      attendance_map: attendanceMap,
    });
    
    if (result.success) {
      toast({ title: 'Success!', description: result.message });
      setSessionToEdit(null);
    } else {
      toast({ variant: 'destructive', title: 'Save Failed', description: result.message });
    }
    
    setIsSaving(false);
  };
  
  const isLoading = authLoading || isCreating || isSaving || membersLoading || studentsLoading;

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
                  <CardDescription>Create a new practice session. It will appear in the list, where you can then click to edit it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="grid gap-2">
                      <label className="text-sm font-medium">Practice Date</label>
                      <Popover>
                      <PopoverTrigger asChild>
                          <Button
                          variant={'outline'}
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
                      onChange={(e) => setNewSession(prev => ({ ...prev, practice_type: e.target.value }))}
                      />
                  </div>
                  <Button onClick={handleCreateAndSaveSession} className="w-full" disabled={isLoading || activeStudents.length === 0}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isCreating ? 'Saving...' : 'Create & Save Session'}
                  </Button>
                  {activeStudents.length === 0 && !membersLoading && (
                    <p className="text-xs text-center text-muted-foreground">You must have active choir members to create a session.</p>
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
              <CardDescription>Click on a session to view or edit its attendance.</CardDescription>
            </CardHeader>
            <CardContent>
                {sessionsLoading && (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
              <div className="space-y-2">
                {attendanceSessions && attendanceSessions.length > 0 ? attendanceSessions.map((session, index) => (
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
                    {index < (attendanceSessions?.length ?? 0) - 1 && <Separator className="my-1" />}
                  </div>
                )) : (
                    !sessionsLoading && <p className="text-muted-foreground text-center p-4">No attendance sessions recorded yet.</p>
                )}
              </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
