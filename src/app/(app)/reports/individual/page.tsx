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
import { Loader2, Search, Download, FileDown, UserSearch } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Student, Choir, ChoirMember, AttendanceSession } from '@/lib/types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function IndividualReportPage() {
    const firestore = useFirestore();
    const { user, isUserLoading: authLoading } = useUser();
    const [selectedChoirId, setSelectedChoirId] = useState<string | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [studentToReport, setStudentToReport] = useState<Student | null>(null);
    const [preparerName, setPreparerName] = useState('Mr. Muthomi (Choir Director)');
    const [studentSearch, setStudentSearch] = useState('');
    const [isBulkGenerating, setIsBulkGenerating] = useState(false);
    
    // 1. Fetch all choirs
    const choirsQuery = useMemoFirebase(() => 
        !authLoading && firestore ? query(collection(firestore, 'choirs'), orderBy('name')) : null
    , [firestore, authLoading]);
    const { data: choirs, isLoading: choirsLoading } = useCollection<Choir>(choirsQuery);
    
    // 2. Fetch all students
    const studentsQuery = useMemoFirebase(() =>
        !authLoading && firestore ? collection(firestore, 'students') : null
    , [firestore, authLoading]);
    const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

    // 3. Fetch members for the selected choir
    const choirMembersQuery = useMemoFirebase(() =>
        !authLoading && firestore && selectedChoirId ? collection(firestore, 'choirs', selectedChoirId, 'members') : null
    , [firestore, selectedChoirId, authLoading]);
    const { data: choirMembers, isLoading: membersLoading } = useCollection<ChoirMember>(choirMembersQuery);

    // 4. Fetch attendance sessions for the selected choir
    const attendanceQuery = useMemoFirebase(() => 
        !authLoading && firestore && selectedChoirId 
        ? query(
            collection(firestore, 'choir_attendance'), 
            where('choirId', '==', selectedChoirId)
          ) 
        : null
    , [firestore, selectedChoirId, authLoading]);
    const { data: attendanceSessions, isLoading: attendanceLoading } = useCollection<AttendanceSession>(attendanceQuery);
    
    const selectedChoir = useMemo(() => {
        if (!choirs || !selectedChoirId) return null;
        return choirs.find(c => c.id === selectedChoirId);
    }, [choirs, selectedChoirId]);

    const choirStudents = useMemo(() => {
        if (!students || !choirMembers) return [];
        const memberAdmissionNumbers = new Set(choirMembers.map(m => m.admission_number));
        return students.filter(student => memberAdmissionNumbers.has(student.admission_number));
    }, [students, choirMembers]);

    const filteredStudents = useMemo(() => {
        if (!studentSearch) return choirStudents;
        const term = studentSearch.toLowerCase();
        return choirStudents.filter(s => 
            s.first_name.toLowerCase().includes(term) || 
            s.last_name.toLowerCase().includes(term) || 
            s.admission_number.toLowerCase().includes(term)
        );
    }, [choirStudents, studentSearch]);

    const isLoading = authLoading || choirsLoading || studentsLoading || membersLoading;
    const isGenerating = !!studentToReport && attendanceLoading;

    const handleChoirChange = (choirId: string) => {
        setSelectedChoirId(choirId);
        setSelectedStudentId(null);
        setStudentToReport(null);
        setStudentSearch('');
    }

    const handleGenerateReport = () => {
        const student = choirStudents?.find(s => s.id === selectedStudentId);
        if (student) {
            setStudentToReport(student);
        }
    }

    const generateStudentReportOnDoc = (doc: jsPDF, student: Student, choir: Choir, sessions: AttendanceSession[], cursorY: number) => {
        const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');
        const now = new Date();
        const serialNumber = `GGHS/${format(now, 'yyyyMMdd')}/${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        const relevantSessions = sessions.filter(session => session.attendance_map.hasOwnProperty(student.admission_number));

        const attendanceData = relevantSessions.map(session => ({
            date: session.date.toDate(),
            practice_type: session.practice_type,
            status: session.attendance_map[student.admission_number]
        })).sort((a, b) => b.date.getTime() - a.date.getTime());
        
        const totalSessions = attendanceData.length;
        const presentCount = attendanceData.filter(rec => rec.status).length;
        const absentCount = totalSessions - presentCount;
        const attendancePercentage = totalSessions > 0 ? ((presentCount / totalSessions) * 100).toFixed(1) : '0.0';

        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        
        // Serial at absolute top
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Serial: ${serialNumber}`, pageWidth - margin, 8, { align: 'right' });
        doc.text(`Generated: ${format(now, 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, 11, { align: 'right' });
        doc.setTextColor(0);

        let y = 12;

        // PDF Header
        if (schoolLogo?.imageUrl) {
            doc.addImage(schoolLogo.imageUrl, 'PNG', margin, y, 18, 18);
        }
        doc.setFont('times', 'bold');
        doc.setFontSize(18);
        doc.text("GATURA GIRLS", margin + 22, y + 6);
    
        doc.setFont('times', 'normal');
        doc.setFontSize(8.5);
        doc.text("30-01013, Muranga.", margin + 22, y + 10);
        doc.text("gaturagirls@gmail.com | 0793328863", margin + 22, y + 14);
        
        doc.setFont('times', 'bold');
        doc.setFontSize(13);
        doc.text(choir.name, pageWidth - margin, y + 8, { align: 'right' });
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("Individual Attendance Report", pageWidth - margin, y + 12, { align: 'right' });
        doc.setTextColor(0);
    
        y += 22;

        // Student Details
        doc.setFont('times', 'bold');
        doc.setFontSize(11);
        doc.text('Student Details', margin, y);
        y += 5;

        doc.setFont('times', 'normal');
        doc.setFontSize(9.5);
        doc.text(`Full Name: ${student.first_name} ${student.last_name}`, margin, y);
        doc.text(`Admission Number: ${student.admission_number}`, pageWidth / 2, y);
        y += 5;
        doc.text(`Class: ${student.class} ${student.stream || ''}`, margin, y);
        y += 5;
        
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;

        // Attendance Summary
        doc.setFont('times', 'bold');
        doc.setFontSize(11);
        doc.text('Attendance Summary', margin, y);
        y += 6;

        const summaryData = [
            { title: 'Total Sessions', value: totalSessions.toString() },
            { title: 'Present', value: presentCount.toString() },
            { title: 'Absent', value: absentCount.toString() },
            { title: 'Rate (%)', value: `${attendancePercentage}%` },
        ];
        
        const cardWidth = (pageWidth - (2*margin) - 15) / 4;
        
        doc.setFontSize(8.5);
        doc.setFont('times', 'normal');
        doc.setTextColor(80);
        summaryData.forEach((item, index) => {
            const x = margin + (index * (cardWidth + 5));
            doc.text(item.title, x + cardWidth/2, y + 10, { align: 'center'});
        });
        
        doc.setFontSize(14);
        doc.setFont('times', 'bold');
        doc.setTextColor(0);
        summaryData.forEach((item, index) => {
            const x = margin + (index * (cardWidth + 5));
            doc.text(item.value, x + cardWidth/2, y + 5, { align: 'center'});
        });

        y += 18;
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;

        // Attendance Table
        doc.setFont('times', 'bold');
        doc.setFontSize(11);
        doc.text('Attendance Record', margin, y);
        y += 5;

        const tableRows = attendanceData.map(record => [
            format(record.date, 'MMM dd, yyyy'),
            record.practice_type,
            record.status ? 'Present' : 'Absent'
        ]);

        (doc as any).autoTable({
            head: [['Date', 'Practice Type', 'Status']],
            body: tableRows,
            startY: y,
            theme: 'grid',
            headStyles: { fillColor: '#107C41', textColor: 255, font: 'times', fontStyle: 'bold' },
            styles: { font: 'times', fontStyle: 'normal', cellPadding: 1.5, fontSize: 9 },
            margin: { left: margin, right: margin },
            didDrawPage: (data: any) => {
                doc.setFontSize(8);
                doc.setFont('times', 'normal');
                doc.setTextColor(150);
                const generatedOnText = `Generated by Gatura Hub on ${format(now, 'PPPP')}, at ${format(now, 'p')}`;
                doc.text(generatedOnText, pageWidth / 2, pageHeight - 8, { align: 'center' });
            }
        });
        
        let finalY = (doc as any).lastAutoTable.finalY || y;

        // Footer
        let footerY = finalY + 20;
        if (footerY > pageHeight - 30) {
            doc.addPage();
            footerY = 20;
        }
        
        doc.setFont('times', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0);
        doc.setLineWidth(0.2);

        const signatureWidth = 50;
        doc.line(margin, footerY, margin + signatureWidth, footerY);
        doc.text(preparerName, margin, footerY + 4);

        doc.line(pageWidth - margin - signatureWidth, footerY, pageWidth - margin, footerY);
        doc.text("Date", pageWidth - margin - signatureWidth, footerY + 4);
    };

    const handleExportPdf = () => {
        if (!studentToReport || !selectedChoir || !attendanceSessions) return;
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        generateStudentReportOnDoc(doc, studentToReport, selectedChoir, attendanceSessions, 0);
        doc.save(`Choir-Report-${studentToReport.admission_number}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const handleExportAllPdf = async () => {
        if (!selectedChoir || !attendanceSessions || choirStudents.length === 0) return;
        
        setIsBulkGenerating(true);
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        
        // Numerically sort students by admission number for bulk export
        const sortedStudents = [...choirStudents].sort((a, b) => 
            (a.admission_number || '').localeCompare(b.admission_number || '', undefined, { numeric: true })
        );

        for (let i = 0; i < sortedStudents.length; i++) {
            if (i > 0) doc.addPage();
            generateStudentReportOnDoc(doc, sortedStudents[i], selectedChoir, attendanceSessions, 0);
        }

        doc.save(`${selectedChoir.name}-Full-Individual-Reports-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        setIsBulkGenerating(false);
    }

    const studentAttendanceSessions = useMemo(() => {
        if (!attendanceSessions || !studentToReport) return [];
        const sortedSessions = [...attendanceSessions].sort((a, b) => b.date.toMillis() - a.date.toMillis());
        return sortedSessions.filter(session => session.attendance_map.hasOwnProperty(studentToReport.admission_number));
    }, [attendanceSessions, studentToReport]);

    return (
        <>
            <PageHeader
                title="Individual Attendance Report"
                subtitle="Select a choir and student to generate their detailed attendance record."
            />
            <div className="container mx-auto p-4 md:p-8 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Select Report Criteria</CardTitle>
                        <CardDescription>Choose a choir, find a member using the search filter, and confirm the preparer's name.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isLoading ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                    <div className="space-y-2">
                                        <Label>1. Choir</Label>
                                        <Select onValueChange={handleChoirChange} value={selectedChoirId ?? undefined}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a choir..." />
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

                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <UserSearch className="h-3 w-3 text-primary"/> 2. Find Student
                                        </Label>
                                        <Input 
                                            placeholder="Type name or adm no..." 
                                            value={studentSearch} 
                                            onChange={(e) => setStudentSearch(e.target.value)}
                                            disabled={!selectedChoirId}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>3. Select Result</Label>
                                        <Select onValueChange={setSelectedStudentId} value={selectedStudentId ?? undefined} disabled={!selectedChoirId}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder={selectedChoirId ? `Results (${filteredStudents.length})` : "Select choir first"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {/* Numeric sorting by admission number in selection dropdown */}
                                                {filteredStudents?.sort((a, b) => 
                                                    (a.admission_number || '').localeCompare(b.admission_number || '', undefined, { numeric: true })
                                                ).map(student => (
                                                    <SelectItem key={student.id} value={student.id!}>
                                                        {student.first_name} {student.last_name} ({student.admission_number})
                                                    </SelectItem>
                                                ))}
                                                {filteredStudents.length === 0 && selectedChoirId && (
                                                    <div className="p-2 text-xs text-center text-muted-foreground">No matches found</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>4. Prepared By (Footer)</Label>
                                        <Input 
                                            value={preparerName} 
                                            onChange={(e) => setPreparerName(e.target.value)}
                                            placeholder="e.g. Mr. Muthomi"
                                        />
                                    </div>
                                </div>
                                
                                <div className='flex flex-wrap items-center gap-3 pt-2'>
                                  <Button onClick={handleGenerateReport} disabled={!selectedStudentId || isGenerating}>
                                      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                      {isGenerating ? 'Loading...' : 'Generate Preview'}
                                  </Button>
                                  <Button onClick={handleExportPdf} disabled={!studentToReport || isGenerating} variant="outline">
                                      <Download className="mr-2 h-4 w-4" />
                                      Download Current
                                  </Button>
                                  <div className="h-8 w-px bg-border mx-2 hidden md:block" />
                                  <Button 
                                    onClick={handleExportAllPdf} 
                                    disabled={!selectedChoirId || attendanceLoading || isBulkGenerating || choirStudents.length === 0} 
                                    variant="secondary"
                                    className="bg-primary/10 text-primary hover:bg-primary/20"
                                  >
                                      {isBulkGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                      Download All {selectedChoirId ? `(${choirStudents.length})` : ''} Reports
                                  </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <div className="print-container">
                    {studentToReport && selectedChoir ? (
                        <IndividualReport 
                            student={studentToReport} 
                            choirName={selectedChoir.name}
                            attendanceSessions={studentAttendanceSessions}
                            isLoading={attendanceLoading}
                            preparedBy={preparerName}
                        />
                    ) : (
                        <div className="text-center p-12 text-muted-foreground border-2 border-dashed rounded-2xl flex flex-col items-center gap-4 bg-muted/5">
                            <UserSearch className="h-12 w-12 opacity-20" />
                            <div className="space-y-1">
                                <p className="font-bold">Ready to generate report</p>
                                <p className="text-xs">Search for a student and click "Generate Preview" to see their history here.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
