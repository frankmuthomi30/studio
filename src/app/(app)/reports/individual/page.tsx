'use client';

import PageHeader from '@/components/page-header';
import IndividualReport from '../components/individual-report';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { Button } from '@/components/ui/button';
import { Loader2, Search, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Student, ChoirMember, AttendanceSession } from '@/lib/types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { PlaceHolderImages } from '@/lib/placeholder-images';
  
export default function IndividualReportPage() {
    const firestore = useFirestore();
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [studentToReport, setStudentToReport] = useState<Student | null>(null);
    
    const studentsQuery = useMemoFirebase(() =>
        firestore ? collection(firestore, 'students') : null
    , [firestore]);
    const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

    const choirMembersQuery = useMemoFirebase(() =>
        firestore ? collection(firestore, 'choir_members') : null
    , [firestore]);
    const { data: choirMembers, isLoading: membersLoading } = useCollection<ChoirMember>(choirMembersQuery);

    const attendanceQuery = useMemoFirebase(() => 
        firestore && studentToReport ? query(collection(firestore, 'choir_attendance'), orderBy('date', 'asc')) : null
    , [firestore, studentToReport]);
    const { data: attendanceSessions, isLoading: attendanceLoading } = useCollection<AttendanceSession>(attendanceQuery);

    const choirStudents = useMemo(() => {
        if (!students || !choirMembers) return [];
        const memberAdmissionNumbers = new Set(choirMembers.map(m => m.admission_number));
        return students.filter(student => memberAdmissionNumbers.has(student.admission_number));
    }, [students, choirMembers]);

    const isLoading = studentsLoading || membersLoading;

    const handleGenerateReport = () => {
        const student = choirStudents?.find(s => s.id === selectedStudentId);
        if (student) {
            setStudentToReport(student);
        }
    }

    const handleExportPdf = () => {
        if (!studentToReport) return;

        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');
        
        const attendanceData = (attendanceSessions ?? []).map(session => ({
            date: session.date.toDate(),
            practice_type: session.practice_type,
            status: session.attendance_map[studentToReport.admission_number]
          })).filter(rec => rec.status !== undefined);
        
          const totalSessions = attendanceData.length;
          const presentCount = attendanceData.filter(rec => rec.status).length;
          const absentCount = totalSessions - presentCount;
          const attendancePercentage = totalSessions > 0 ? ((presentCount / totalSessions) * 100).toFixed(1) : '0.0';

        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let cursorY = margin;

        // --- PDF Header ---
        if (schoolLogo?.imageUrl) {
            doc.addImage(schoolLogo.imageUrl, 'PNG', margin, cursorY, 20, 20);
        }
        doc.setFont('times', 'bold');
        doc.setFontSize(20);
        doc.text("GATURA GIRLS", margin + 25, cursorY + 7);
    
        doc.setFont('times', 'normal');
        doc.setFontSize(9);
        doc.text("30-01013, Muranga.", margin + 25, cursorY + 12);
        doc.text("gaturagirls@gmail.com", margin + 25, cursorY + 16);
        doc.text("https://stteresagaturagirls.sc.ke/", margin + 25, cursorY + 20);
        doc.text("0793328863", margin + 25, cursorY + 24);
        
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.text("Choir Attendance Report", pageWidth - margin, cursorY + 15, { align: 'right' });
    
        cursorY += 35;

        // --- Student Details ---
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.text('Student Details', margin, cursorY);
        cursorY += 6;

        doc.setFont('times', 'normal');
        doc.setFontSize(11);
        doc.text(`Full Name: ${studentToReport.first_name} ${studentToReport.last_name}`, margin, cursorY);
        doc.text(`Admission Number: ${studentToReport.admission_number}`, pageWidth / 2, cursorY);
        cursorY += 6;
        doc.text(`Class / Grade: ${studentToReport.class}`, margin, cursorY);
        cursorY += 6;
        
        doc.setLineWidth(0.2);
        doc.line(margin, cursorY, pageWidth - margin, cursorY);
        cursorY += 6;


        // --- Attendance Summary ---
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.text('Attendance Summary', margin, cursorY);
        cursorY += 8;

        const summaryData = [
            { title: 'Total Sessions', value: totalSessions.toString() },
            { title: 'Sessions Present', value: presentCount.toString() },
            { title: 'Sessions Absent', value: absentCount.toString() },
            { title: 'Attendance Rate', value: `${attendancePercentage}%` },
        ];
        
        const cardWidth = (pageWidth - (2*margin) - 15) / 4;
        
        doc.setFontSize(10);
        doc.setFont('times', 'normal');
        doc.setTextColor(80, 80, 80);
        summaryData.forEach((item, index) => {
            const x = margin + (index * (cardWidth + 5));
            doc.text(item.title, x + cardWidth/2, cursorY + 12, { align: 'center'});
        });
        
        doc.setFontSize(16);
        doc.setFont('times', 'bold');
        doc.setTextColor(0);
        summaryData.forEach((item, index) => {
            const x = margin + (index * (cardWidth + 5));
            doc.text(item.value, x + cardWidth/2, cursorY + 6, { align: 'center'});
        });

        cursorY += 25;
        doc.line(margin, cursorY, pageWidth - margin, cursorY);
        cursorY += 6;


        // --- Attendance Table ---
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.text('Attendance Record', margin, cursorY);
        cursorY += 6;

        (doc as any).autoTable({
            html: '#individual-report-table',
            startY: cursorY,
            theme: 'grid',
            headStyles: {
                fillColor: '#107C41',
                textColor: 255,
                font: 'times',
                fontStyle: 'bold'
            },
            styles: {
                font: 'times',
                fontStyle: 'normal',
                cellPadding: 2,
            },
            margin: { left: margin, right: margin }
        });
        
        let finalY = (doc as any).lastAutoTable.finalY || cursorY;

        // --- Footer ---
        let footerY = finalY + 30;
        if (footerY > pageHeight - 40) {
            doc.addPage();
            footerY = margin;
        }
        
        doc.setFont('times', 'normal');
        doc.setFontSize(10);
        doc.setLineWidth(0.2);

        const signatureWidth = (pageWidth - margin * 3) / 2;
        doc.line(margin, footerY, margin + signatureWidth, footerY);
        doc.text("Mr. Muthomi (Choir Director)", margin, footerY + 5);

        doc.line(pageWidth - margin - signatureWidth, footerY, pageWidth - margin, footerY);
        doc.text("Date", pageWidth - margin - signatureWidth, footerY + 5);

        const generatedOnText = `Generated on ${format(new Date(), 'PPp')}`;
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(generatedOnText, pageWidth / 2, pageHeight - 15, { align: 'center' });

        doc.save(`Choir-Report-${studentToReport.admission_number}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    }

  return (
    <>
      <PageHeader
        title="Individual Attendance Report"
        subtitle="Select a student to generate their detailed attendance record."
      />
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Select Student</CardTitle>
                <CardDescription>Choose a choir member to generate their report.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Loader2 className="animate-spin" />
                ) : (
                    <div className="flex flex-wrap items-center gap-2">
                        <Select onValueChange={setSelectedStudentId} value={selectedStudentId ?? undefined}>
                            <SelectTrigger className="w-full sm:w-auto sm:min-w-[300px]">
                                <SelectValue placeholder="Select a choir member..." />
                            </SelectTrigger>
                            <SelectContent>
                                {choirStudents?.sort((a,b) => (a.first_name || '').localeCompare(b.first_name || '')).map(student => (
                                    <SelectItem key={student.id} value={student.id!}>
                                        {student.first_name} {student.last_name} ({student.admission_number})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleGenerateReport} disabled={!selectedStudentId}>
                            <Search className="mr-2 h-4 w-4" />
                            Generate Report
                        </Button>
                        <Button onClick={handleExportPdf} disabled={!studentToReport || attendanceLoading} variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Export PDF
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>

        <div className="print-container">
            {studentToReport ? (
                <IndividualReport 
                    student={studentToReport} 
                    attendanceSessions={attendanceSessions}
                    isLoading={attendanceLoading}
                />
            ) : (
                <div className="text-center p-8 text-muted-foreground border rounded-lg">
                    <p>Select a choir member and click "Generate Report" to see their attendance record.</p>
                </div>
            )}
        </div>
      </div>
    </>
  );
}
