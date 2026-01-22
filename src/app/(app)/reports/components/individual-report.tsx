'use client';
import type { Student, AttendanceSession } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

type IndividualReportProps = {
  student: Student;
};

export default function IndividualReport({ student }: IndividualReportProps) {
  const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');
  const firestore = useFirestore();

  const attendanceQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'choir_attendance'), orderBy('date', 'asc')) : null
  , [firestore]);
  const { data: attendanceSessions, isLoading } = useCollection<AttendanceSession>(attendanceQuery);
  
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  const attendanceData = (attendanceSessions ?? []).map(session => ({
    date: session.date.toDate(),
    practice_type: session.practice_type,
    status: session.attendance_map[student.admission_number]
  })).filter(rec => rec.status !== undefined);

  const totalSessions = attendanceData.length;
  const presentCount = attendanceData.filter(rec => rec.status).length;
  const absentCount = totalSessions - presentCount;
  const attendancePercentage = totalSessions > 0 ? ((presentCount / totalSessions) * 100).toFixed(1) : '0.0';

  return (
    <div className="report-preview mx-auto bg-white p-8 rounded-lg shadow-lg" id="report">
      {/* Report Header */}
      <header className="flex items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-800">Gatura Girls High School</h2>
          <p className="font-headline text-lg text-gray-600">Choir Attendance Report</p>
        </div>
        {schoolLogo && (
          <Image
            src={schoolLogo.imageUrl}
            alt={schoolLogo.description}
            width={80}
            height={80}
            className="rounded-full"
            data-ai-hint={schoolLogo.imageHint}
          />
        )}
      </header>

      {/* Student Details */}
      <section className="mt-6">
        <h3 className="font-headline text-xl font-semibold text-gray-700 mb-2">Student Details</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div><span className="font-semibold text-gray-600">Full Name:</span> {student.first_name} {student.last_name}</div>
            <div><span className="font-semibold text-gray-600">Admission Number:</span> {student.admission_number}</div>
            <div><span className="font-semibold text-gray-600">Class / Grade:</span> {student.class}</div>
        </div>
      </section>

      <Separator className="my-6" />

      {/* Attendance Table */}
      <section>
        <h3 className="font-headline text-xl font-semibold text-gray-700 mb-4">Attendance Record</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Date</TableHead>
              <TableHead>Practice Type</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceData.map((record, index) => (
                <TableRow key={index}>
                    <TableCell>{format(record.date, 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{record.practice_type}</TableCell>
                    <TableCell className="text-right">
                        <Badge variant={record.status ? 'default' : 'destructive'} className={record.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {record.status ? 'Present' : 'Absent'}
                        </Badge>
                    </TableCell>
                </TableRow>
            ))}
             {attendanceData.length === 0 && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No attendance records found for this student.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
      
      <Separator className="my-6" />

      {/* Attendance Summary */}
      <section>
        <h3 className="font-headline text-xl font-semibold text-gray-700 mb-4">Attendance Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="text-center"><CardHeader><CardTitle>{totalSessions}</CardTitle></CardHeader><CardContent>Total Sessions</CardContent></Card>
            <Card className="text-center"><CardHeader><CardTitle className="text-green-600">{presentCount}</CardTitle></CardHeader><CardContent>Present</CardContent></Card>
            <Card className="text-center"><CardHeader><CardTitle className="text-red-600">{absentCount}</CardTitle></CardHeader><CardContent>Absences</CardContent></Card>
            <Card className="text-center"><CardHeader><CardTitle className="text-blue-600">{attendancePercentage}%</CardTitle></CardHeader><CardContent>Attendance Rate</CardContent></Card>
        </div>
      </section>

      {/* Footer & Signatures */}
      <footer className="mt-16 pt-8 text-sm text-gray-500 space-y-12">
        <div className="grid grid-cols-2 gap-16">
            <div className="space-y-2">
                <div className="w-full border-b border-gray-400"></div>
                <p className="font-semibold">Choir Director's Signature</p>
            </div>
            <div className="space-y-2">
                <div className="w-full border-b border-gray-400"></div>
                <p className="font-semibold">Date</p>
            </div>
        </div>
        <p className="text-center text-xs">Generated by Gatura Girls Choir on {format(new Date(), 'PPp')}</p>
      </footer>
    </div>
  );
}
