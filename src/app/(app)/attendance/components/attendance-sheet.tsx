'use client';

import { useState, useMemo } from 'react';
import type { Student } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Check, X, Loader2, UserPlus, UserX } from 'lucide-react';

type AttendanceSheetProps = {
  session: {
    date: Date;
    practice_type: string;
  };
  activeChoirStudents: Student[]; // All active choir members
  onSave: (attendanceMap: Record<string, boolean>) => void;
  onCancel: () => void;
  isSaving: boolean;
};

export default function AttendanceSheet({ session, activeChoirStudents, onSave, onCancel, isSaving }: AttendanceSheetProps) {
  const [presentAdmissionNumbers, setPresentAdmissionNumbers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  
  const foundStudent = useMemo(() => {
    if (!searchTerm) return null;
    return activeChoirStudents.find(m => m.admission_number.toLowerCase() === searchTerm.toLowerCase());
  }, [searchTerm, activeChoirStudents]);

  const presentStudents = useMemo(() => {
    return activeChoirStudents
      .filter(m => presentAdmissionNumbers.has(m.admission_number))
      .sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''));
  }, [presentAdmissionNumbers, activeChoirStudents]);

  const handleMarkPresent = () => {
    if (foundStudent && !presentAdmissionNumbers.has(foundStudent.admission_number)) {
      setPresentAdmissionNumbers(prev => new Set(prev).add(foundStudent.admission_number));
      setSearchTerm('');
    }
  };

  const handleRemove = (admissionNumber: string) => {
    setPresentAdmissionNumbers(prev => {
      const newSet = new Set(prev);
      newSet.delete(admissionNumber);
      return newSet;
    });
  };

  const handleSave = () => {
    const attendanceMap = activeChoirStudents.reduce((acc, member) => {
      acc[member.admission_number] = presentAdmissionNumbers.has(member.admission_number);
      return acc;
    }, {} as Record<string, boolean>);
    onSave(attendanceMap);
  };
  
  const presentCount = presentStudents.length;
  const totalCount = activeChoirStudents.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Attendance for: {session.practice_type}</CardTitle>
                <CardDescription>{format(session.date, 'EEEE, MMMM d, yyyy')}</CardDescription>
            </div>
            <div className="text-right">
                <p className="text-2xl font-bold text-primary">{presentCount} / {totalCount}</p>
                <p className="text-sm text-muted-foreground">Present</p>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Add section */}
        <div>
            <h3 className="text-lg font-medium mb-2">Mark Attendance</h3>
            <div className="flex items-start gap-2">
                <div className="grid gap-1.5 flex-grow">
                    <Input
                        placeholder="Enter Admission No..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleMarkPresent()}}
                    />
                    {searchTerm && !foundStudent && <p className="text-xs text-destructive">No active choir member found with this Admission No.</p>}
                    {foundStudent && presentAdmissionNumbers.has(foundStudent.admission_number) && <p className="text-xs text-blue-600">{foundStudent.first_name} {foundStudent.last_name} is already marked present.</p>}
                </div>
                <Button onClick={handleMarkPresent} disabled={!foundStudent || presentAdmissionNumbers.has(foundStudent.admission_number)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Mark Present
                </Button>
            </div>
            {foundStudent && !presentAdmissionNumbers.has(foundStudent.admission_number) && (
                <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                   <p><span className="font-semibold">Found:</span> {foundStudent.first_name} {foundStudent.last_name} ({foundStudent.class})</p>
                </div>
            )}
        </div>

        {/* Present students list */}
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Present Students ({presentStudents.length})</h3>
            <div className="rounded-md border max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {presentStudents.length > 0 ? presentStudents.map(member => (
                    <TableRow key={member.admission_number}>
                      <TableCell>{member.admission_number}</TableCell>
                      <TableCell className="font-medium">{`${member.first_name} ${member.last_name}`}</TableCell>
                      <TableCell>{member.class}</TableCell>
                      <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleRemove(member.admission_number)}>
                            <UserX className="mr-2 h-4 w-4"/> Undo
                          </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            No students marked present yet.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-4">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          {isSaving ? 'Saving...' : 'Save Session'}
        </Button>
      </CardFooter>
    </Card>
  );
}
