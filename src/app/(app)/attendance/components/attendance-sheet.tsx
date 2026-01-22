'use client';

import { useState } from 'react';
import type { Student } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Check, X } from 'lucide-react';

type AttendanceSheetProps = {
  session: {
    date: Date;
    practice_type: string;
  };
  members: Student[];
  onSave: (attendanceMap: Record<string, boolean>) => void;
  onCancel: () => void;
};

export default function AttendanceSheet({ session, members, onSave, onCancel }: AttendanceSheetProps) {
  const [attendance, setAttendance] = useState<Record<string, boolean>>(
    members.reduce((acc, member) => ({ ...acc, [member.admission_number]: false }), {})
  );

  const handleToggle = (admissionNumber: string) => {
    setAttendance(prev => ({ ...prev, [admissionNumber]: !prev[admissionNumber] }));
  };

  const handleMarkAll = (present: boolean) => {
    setAttendance(
      members.reduce((acc, member) => ({ ...acc, [member.admission_number]: present }), {})
    );
  };
  
  const presentCount = Object.values(attendance).filter(Boolean).length;
  const totalCount = members.length;

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
      <CardContent>
        <div className="flex justify-end gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => handleMarkAll(true)}>Mark All Present</Button>
            <Button variant="outline" size="sm" onClick={() => handleMarkAll(false)}>Mark All Absent</Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Present</TableHead>
                <TableHead>Admission No.</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Class</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(member => (
                <TableRow key={member.admission_number} onClick={() => handleToggle(member.admission_number)} className="cursor-pointer">
                  <TableCell className="text-center">
                    <Checkbox
                      checked={attendance[member.admission_number]}
                      onCheckedChange={() => handleToggle(member.admission_number)}
                    />
                  </TableCell>
                  <TableCell>{member.admission_number}</TableCell>
                  <TableCell className="font-medium">{`${member.first_name} ${member.last_name}`}</TableCell>
                  <TableCell>{member.class}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-4">
        <Button variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <Button onClick={() => onSave(attendance)}>
          <Check className="mr-2 h-4 w-4" /> Save Session
        </Button>
      </CardFooter>
    </Card>
  );
}
