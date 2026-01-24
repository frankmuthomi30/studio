'use client';

import { useState } from 'react';
import type { Student, ChoirMember, AttendanceSession } from '@/lib/types';
import { saveAttendanceSession } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, PlusCircle, ListChecks } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import AttendanceSheet from './attendance-sheet';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import DeleteSessionButton from '../../dashboard/components/delete-session-button';

type Session = {
  date: Date;
  practice_type: string;
};

export default function AttendanceClient() {
  const [session, setSession] = useState<Session | null>(null);
  const [newSession, setNewSession] = useState<Partial<Session>>({
    date: new Date(),
    practice_type: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const activeMembersQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'choir_members'), where('status', '==', 'active')) : null
  , [firestore]);
  const { data: activeChoirMembers, isLoading: membersLoading } = useCollection<ChoirMember>(activeMembersQuery);
  
  const studentQuery = useMemoFirebase(() =>
    firestore && activeChoirMembers && activeChoirMembers.length > 0 ? 
    query(collection(firestore, 'students'), where('admission_number', 'in', activeChoirMembers.map(m => m.admission_number))) 
    : null
  , [firestore, activeChoirMembers]);
  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentQuery);

  const sessionsQuery = useMemoFirebase(() =>
    firestore
      ? query(collection(firestore, 'choir_attendance'), orderBy('date', 'desc'))
      : null
  , [firestore]);
  const { data: attendanceSessions, isLoading: sessionsLoading } = useCollection<AttendanceSession>(sessionsQuery);

  const activeStudents = useMemo(() => {
    if (!students) return [];
    return students;
  }, [students]);

  const handleCreateSession = () => {
    if (newSession.date && newSession.practice_type) {
      setSession(newSession as Session);
    } else {
      toast({
        variant: 'destructive',
        title: 'Incomplete Information',
        description: 'Please provide both a date and a practice type.',
      });
    }
  };

  const handleSaveAttendance = async (attendanceMap: Record<string, boolean>) => {
    if (!session) return;
    setIsSaving(true);
    
    const result = await saveAttendanceSession({
      date: session.date,
      practice_type: session.practice_type,
      attendance_map: attendanceMap,
    });
    
    if (result.success) {
      toast({
        title: 'Success!',
        description: result.message,
      });
      setSession(null);
      setNewSession({ date: new Date(), practice_type: '' });
    } else {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: result.message,
      });
    }
    
    setIsSaving(false);
  };
  
  const isLoading = isSaving || membersLoading || studentsLoading || sessionsLoading;

  if (isLoading && !session && !attendanceSessions) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-muted-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg">{isSaving ? 'Saving attendance session...' : 'Loading choir data...'}</p>
      </div>
    );
  }

  if (session) {
    return (
      <AttendanceSheet
        session={session}
        activeChoirStudents={activeStudents}
        onSave={handleSaveAttendance}
        onCancel={() => setSession(null)}
        isSaving={isSaving}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className='lg:col-span-1'>
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-6 lg:sticky top-8">
                <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
                    <PlusCircle className="text-primary"/> Create New Session
                </h3>
                <div className="space-y-4">
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Practice Date</label>
                    <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant={'outline'}
                        className={cn(
                            'w-full justify-start text-left font-normal',
                            !newSession.date && 'text-muted-foreground'
                        )}
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
                    placeholder="e.g., Evening Practice, Special Rehearsal"
                    value={newSession.practice_type}
                    onChange={(e) => setNewSession(prev => ({ ...prev, practice_type: e.target.value }))}
                    />
                </div>
                </div>
                <Button onClick={handleCreateSession} className="w-full" disabled={!activeStudents || activeStudents.length === 0}>
                {activeStudents && activeStudents.length > 0 ? 'Start Taking Attendance' : 'No active members found'}
                </Button>
            </div>
        </div>
      <div className='lg:col-span-2'>
        <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <ListChecks className="text-primary"/>
                Past Attendance Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
                {sessionsLoading && (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
              <div className="space-y-4">
                {attendanceSessions && attendanceSessions.length > 0 ? attendanceSessions.map((session, index) => (
                  <div key={session.id}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{session.practice_type}</p>
                        <p className="text-sm text-muted-foreground">{format(session.date.toDate(), 'EEEE, MMMM d, yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-medium text-primary">
                            {Object.values(session.attendance_map).filter(Boolean).length} / {Object.keys(session.attendance_map).length}
                          </p>
                          <p className="text-xs text-muted-foreground">Present</p>
                        </div>
                        <DeleteSessionButton sessionId={session.id} />
                      </div>
                    </div>
                    {index < (attendanceSessions?.length ?? 0) - 1 && <Separator className="mt-4" />}
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
