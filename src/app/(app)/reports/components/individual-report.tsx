'use client';
import { useState, useEffect } from 'react';
import type { Student, AttendanceSession } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

type IndividualReportProps = {
  student: Student;
  choirName: string;
  attendanceSessions: AttendanceSession[] | null;
  isLoading: boolean;
};

export default function IndividualReport({ student, choirName, attendanceSessions, isLoading }: IndividualReportProps) {
  const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');
  const [generatedDate, setGeneratedDate] = useState<Date | null>(null);

  useEffect(() => {
    setGeneratedDate(new Date());
  }, []);

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
      <header className="flex items-start justify-between border-b-4 border-gray-800 pb-4">
          <div className="flex items-start gap-4">
              {schoolLogo && (
                  <Image
                      src={schoolLogo.imageUrl}
                      alt={schoolLogo.description}
                      width={80}
                      height={80}
                      data-ai-hint={schoolLogo.imageHint}
                  />
              )}
              <div className="space-y-1 font-serif">
                  <h2 className="text-3xl font-bold text-gray-800 tracking-wider">GATURA GIRLS</h2>
                  <div className="text-xs text-gray-600">
                      <p>30-01013, Muranga.</p>
                      <p>gaturagirls@gmail.com</p>
                      <p>https://stteresagaturagirls.sc.ke/</p>
                      <p>0793328863</p>
                  </div>
              </div>
          </div>
          <div className="text-right">
              <h3 className="font-headline text-xl text-gray-700">{choirName}</h3>
              <p className="text-sm text-muted-foreground">Individual Attendance Report</p>
          </div>
      </header>

      {/* Student Details */}
      <section className="mt-6">
        <h3 className="font-headline text-xl font-semibold text-gray-700 mb-2">Student Details</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div><span className="font-semibold text-gray-600">Full Name:</span> {student.first_name} {student.last_name}</div>
            <div><span className="font-semibold text-gray-600">Admission Number:</span> {student.admission_number}</div>
            <div><span className="font-semibold text-gray-600">Class / Grade:</span> {student.class} {student.stream || ''}</div>
        </div>
      </section>

      <Separator className="my-6" />

      {/* Attendance Summary */}
      <section>
        <h3 className="font-headline text-xl font-semibold text-gray-700 mb-4">Attendance Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="text-center">
                <CardHeader><CardTitle>{totalSessions}</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">Total Sessions</p></CardContent>
            </Card>
            <Card className="text-center">
                <CardHeader><CardTitle className="text-primary">{presentCount}</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">Sessions Present</p></CardContent>
            </Card>
            <Card className="text-center">
                <CardHeader><CardTitle className="text-destructive">{absentCount}</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">Sessions Absent</p></CardContent>
            </Card>
            <Card className="text-center">
                <CardHeader><CardTitle>{attendancePercentage}%</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">Attendance Rate</p></CardContent>
            </Card>
        </div>
      </section>
      
      <Separator className="my-6" />
      
      {/* Attendance Table */}
      <section>
        <h3 className="font-headline text-xl font-semibold text-gray-700 mb-4">Attendance Record</h3>
        <Table id="individual-report-table">
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
                        <Badge variant={record.status ? 'default' : 'destructive'}>
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

      {/* Footer & Signatures */}
      <footer className="mt-16 pt-8 text-sm text-gray-500 space-y-12">
        <div className="grid grid-cols-2 gap-16">
            <div className="space-y-2">
                <div className="w-full border-b border-gray-400"></div>
                <p className="font-semibold">Mr. Muthomi (Choir Director)</p>
            </div>
            <div className="space-y-2">
                <div className="w-full border-b border-gray-400"></div>
                <p className="font-semibold">Date</p>
            </div>
        </div>
        {generatedDate && (
          <p className="text-center text-xs mt-4">
            Generated on {format(generatedDate, 'PPp')}
          </p>
        )}
      </footer>
    </div>
  );
}
