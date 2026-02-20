
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
  const [serialNumber, setSerialNumber] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    setGeneratedDate(now);
    setSerialNumber(`GGHS/${format(now, 'yyyyMMdd')}/${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
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
    <div className="report-preview mx-auto bg-white p-6 rounded-lg shadow-lg relative" id="report">
      {/* Serial Number top right */}
      <div className="absolute top-2 right-6 text-[9px] text-gray-400 font-mono text-right leading-tight">
        <p>Serial: {serialNumber}</p>
        {generatedDate && <p>Generated: {format(generatedDate, 'dd/MM/yyyy HH:mm')}</p>}
      </div>

      {/* Report Header */}
      <header className="flex items-start justify-between border-b-2 border-gray-800 pb-2">
          <div className="flex items-start gap-3">
              {schoolLogo && (
                  <Image
                      src={schoolLogo.imageUrl}
                      alt={schoolLogo.description}
                      width={60}
                      height={60}
                      data-ai-hint={schoolLogo.imageHint}
                  />
              )}
              <div className="space-y-0.5 font-serif">
                  <h2 className="text-2xl font-bold text-gray-800 tracking-wider">GATURA GIRLS</h2>
                  <div className="text-[10px] text-gray-600 leading-tight">
                      <p>30-01013, Muranga.</p>
                      <p>gaturagirls@gmail.com | 0793328863</p>
                  </div>
              </div>
          </div>
          <div className="text-right">
              <h3 className="font-headline text-lg text-gray-700">{choirName}</h3>
              <p className="text-xs text-muted-foreground">Individual Attendance Report</p>
          </div>
      </header>

      {/* Student Details */}
      <section className="mt-4">
        <h3 className="font-headline text-lg font-semibold text-gray-700 mb-1">Student Details</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <div><span className="font-semibold text-gray-600">Full Name:</span> {student.first_name} {student.last_name}</div>
            <div><span className="font-semibold text-gray-600">Admission Number:</span> {student.admission_number}</div>
            <div><span className="font-semibold text-gray-600">Class:</span> {student.class} {student.stream || ''}</div>
        </div>
      </section>

      <Separator className="my-4" />

      {/* Attendance Summary */}
      <section>
        <h3 className="font-headline text-lg font-semibold text-gray-700 mb-2">Attendance Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card className="text-center">
                <CardHeader className="p-2 pb-1"><CardTitle className="text-lg">{totalSessions}</CardTitle></CardHeader>
                <CardContent className="p-2 pt-0"><p className="text-[10px] text-muted-foreground">Total Sessions</p></CardContent>
            </Card>
            <Card className="text-center">
                <CardHeader className="p-2 pb-1"><CardTitle className="text-lg text-primary">{presentCount}</CardTitle></CardHeader>
                <CardContent className="p-2 pt-0"><p className="text-[10px] text-muted-foreground">Present</p></CardContent>
            </Card>
            <Card className="text-center">
                <CardHeader className="p-2 pb-1"><CardTitle className="text-lg text-destructive">{absentCount}</CardTitle></CardHeader>
                <CardContent className="p-2 pt-0"><p className="text-[10px] text-muted-foreground">Absent</p></CardContent>
            </Card>
            <Card className="text-center">
                <CardHeader className="p-2 pb-1"><CardTitle className="text-lg">{attendancePercentage}%</CardTitle></CardHeader>
                <CardContent className="p-2 pt-0"><p className="text-[10px] text-muted-foreground">Rate</p></CardContent>
            </Card>
        </div>
      </section>
      
      <Separator className="my-4" />
      
      {/* Attendance Table */}
      <section>
        <h3 className="font-headline text-lg font-semibold text-gray-700 mb-2">Attendance Record</h3>
        <Table id="individual-report-table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px] h-8 text-xs">Date</TableHead>
              <TableHead className="h-8 text-xs">Practice Type</TableHead>
              <TableHead className="text-right h-8 text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceData.map((record, index) => (
                <TableRow key={index} className="h-8">
                    <TableCell className="text-xs">{format(record.date, 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-xs">{record.practice_type}</TableCell>
                    <TableCell className="text-right">
                        <Badge variant={record.status ? 'default' : 'destructive'} className="text-[10px] h-5 px-1.5">
                            {record.status ? 'Present' : 'Absent'}
                        </Badge>
                    </TableCell>
                </TableRow>
            ))}
             {attendanceData.length === 0 && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4 text-xs">
                        No attendance records found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      {/* Footer & Signatures */}
      <footer className="mt-8 pt-4 text-xs text-gray-500 space-y-8">
        <div className="grid grid-cols-2 gap-12">
            <div className="space-y-1">
                <div className="w-full border-b border-gray-400"></div>
                <p className="font-semibold text-[10px]">Mr. Muthomi (Choir Director)</p>
            </div>
            <div className="space-y-1">
                <div className="w-full border-b border-gray-400"></div>
                <p className="font-semibold text-[10px]">Date</p>
            </div>
        </div>
        <div className="text-center text-[9px] mt-2 space-y-0.5">
          <p className="font-bold uppercase tracking-tight">GENERATED BY GATURA HUB ON {generatedDate ? format(generatedDate, 'PPPP').toUpperCase() : ''}, AT {generatedDate ? format(generatedDate, 'p').toUpperCase() : ''}</p>
        </div>
      </footer>
    </div>
  );
}
