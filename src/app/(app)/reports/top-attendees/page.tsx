'use client';

import PageHeader from '@/components/page-header';
import TopAttendeesReport from './components/top-attendees-report';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Search } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { Student, Choir, ChoirMember, AttendanceSession } from '@/lib/types';
import { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export type TopAttendee = Student & {
    present: number;
    total: number;
    attendance_rate: number;
};

export default function TopAttendeesReportPage() {
    const firestore = useFirestore();
    const { isUserLoading: authLoading } = useUser();
    const [selectedChoirId, setSelectedChoirId] = useState<string | null>(null);
    const [choirToReport, setChoirToReport] = useState<Choir | null>(null);

    const { data: choirs, isLoading: choirsLoading } = useCollection<Choir>(
        useMemoFirebase(() => !authLoading && firestore ? query(collection(firestore, 'choirs'), orderBy('name', 'asc')) : null, [firestore, authLoading])
    );

    const { data: attendanceSessions, isLoading: sessionsLoading } = useCollection<AttendanceSession>(
        useMemoFirebase(() => !authLoading && firestore && choirToReport ? query(collection(firestore, 'choir_attendance'), where('choirId', '==', choirToReport.id)) : null, [firestore, choirToReport, authLoading])
    );
    const { data: students, isLoading: studentsLoading } = useCollection<Student>(
        useMemoFirebase(() => !authLoading && firestore ? collection(firestore, 'students') : null, [firestore, authLoading])
    );
    const { data: choirMembers, isLoading: membersLoading } = useCollection<ChoirMember>(
        useMemoFirebase(() => !authLoading && firestore && choirToReport ? collection(firestore, 'choirs', choirToReport.id, 'members') : null, [firestore, choirToReport, authLoading])
    );

    const topAttendeesData: TopAttendee[] = useMemo(() => {
        if (!attendanceSessions || !students || !choirMembers) return [];
        
        const studentMap = new Map(students.map(s => [s.admission_number, s]));
        const choirMemberAdmissionNumbers = new Set(choirMembers.map(cm => cm.admission_number));

        const attendanceCounts: Record<string, { present: number; total: number }> = {};

        choirMemberAdmissionNumbers.forEach(admNo => {
            attendanceCounts[admNo] = { present: 0, total: 0 };
        });

        attendanceSessions.forEach(session => {
            Object.keys(session.attendance_map).forEach(admNo => {
                if (choirMemberAdmissionNumbers.has(admNo)) {
                    if (!attendanceCounts[admNo]) {
                         attendanceCounts[admNo] = { present: 0, total: 0 };
                    }
                    attendanceCounts[admNo].total++;
                    if (session.attendance_map[admNo]) {
                        attendanceCounts[admNo].present++;
                    }
                }
            });
        });

        const rankedData = Object.entries(attendanceCounts)
            .map(([admissionNumber, counts]) => {
                const student = studentMap.get(admissionNumber);
                const attendanceRate = counts.total > 0 ? (counts.present / counts.total) * 100 : 0;
                return {
                    ...student,
                    id: student?.id,
                    admission_number: admissionNumber,
                    present: counts.present,
                    total: counts.total,
                    attendance_rate: attendanceRate
                } as TopAttendee;
            })
            .filter(item => item.first_name)
            .sort((a, b) => {
                if (b.present !== a.present) return b.present - a.present;
                if (b.attendance_rate !== a.attendance_rate) return b.attendance_rate - a.attendance_rate;
                return (a.first_name || '').localeCompare(b.first_name || '');
            });

        return rankedData;

    }, [attendanceSessions, students, choirMembers]);

    const handleGenerateReport = () => {
        const choir = choirs?.find(c => c.id === selectedChoirId);
        if (choir) {
            setChoirToReport(choir);
        }
    };

    const handleExportPdf = () => {
        if (!choirToReport) return;
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');
        const now = new Date();
        const serialNumber = `GGHS/${format(now, 'yyyyMMdd')}/${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let cursorY = margin;

        // --- Serial and Generation info (High Header) ---
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Serial: ${serialNumber}`, pageWidth - margin, 10, { align: 'right' });
        doc.text(`Generated: ${format(now, 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, 13, { align: 'right' });
        doc.setTextColor(0);
    
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
        doc.text(`Top Attendees - ${choirToReport.name}`, pageWidth - margin, cursorY + 15, { align: 'right' });
    
        cursorY += 30;
    
        // --- Table ---
        (doc as any).autoTable({
            html: '#top-attendees-report-table',
            startY: cursorY,
            theme: 'grid',
            headStyles: {
                fillColor: '#107C41', // Primary color
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
    
        const finalY = (doc as any).lastAutoTable.finalY;
    
        // --- Footer ---
        const footerY = pageHeight - 20;
        doc.setFont('times', 'normal');
        doc.setFontSize(10);
    
        const preparedBy = "Prepared by: Mr. Muthomi (Choir Director)";
        doc.text(preparedBy, margin, footerY);
    
        const pageNumText = `Page 1 of 1`;
        doc.text(pageNumText, pageWidth - margin, footerY, { align: 'right' });
    
        const generatedOnText = `GENERATED BY GATURA HUB ON ${format(now, 'PPPP').toUpperCase()}, AT ${format(now, 'p').toUpperCase()}`;
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(generatedOnText, pageWidth / 2, footerY + 8, { align: 'center' });
    
        doc.save(`Gatura-Girls-Top-Attendees-${choirToReport.name}-${format(now, 'yyyy-MM-dd')}.pdf`);
    };

    const isLoading = authLoading || choirsLoading;
    const isGenerating = !!choirToReport && (sessionsLoading || studentsLoading || membersLoading);

    return (
        <>
            <PageHeader
                title="Top Attendees Report"
                subtitle="A ranked list of choir members based on their attendance."
            />
            <div className="container mx-auto p-4 md:p-8 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Select Choir</CardTitle>
                        <CardDescription>Choose a choir to see its top attendees.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Loader2 className="animate-spin" /> : (
                            <div className="flex flex-wrap items-center gap-4">
                                <Select onValueChange={setSelectedChoirId} value={selectedChoirId ?? undefined}>
                                    <SelectTrigger className="w-full sm:w-auto sm:min-w-[300px]">
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
                                <Button onClick={handleGenerateReport} disabled={!selectedChoirId || isGenerating}>
                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                    {isGenerating ? 'Loading...' : 'Generate Report'}
                                </Button>
                                <Button onClick={handleExportPdf} variant="outline" disabled={!choirToReport || isGenerating || topAttendeesData.length === 0}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export PDF
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="print-container">
                    {choirToReport ? (
                        isGenerating ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            </div>
                        ) : (
                            <TopAttendeesReport attendees={topAttendeesData} choirName={choirToReport.name}/>
                        )
                    ) : (
                        <div className="text-center p-8 text-muted-foreground border rounded-lg">
                           <p>Select a choir and click "Generate Report" to see its top attendees.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
