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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type TopAttendee = Student & {
    present: number;
    total: number;
    attendance_rate: number;
};

export default function TopAttendeesReportPage() {
    const firestore = useFirestore();
    const { isUserLoading: authLoading } = useUser();
    const [selectedChoirId, setSelectedChoirId] = useState<string | null>(null);
    const [preparerName, setPreparerName] = useState('Mr. Muthomi (Choir Director)');
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

        // Serial Header - Tighter
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Serial: ${serialNumber}`, pageWidth - margin, 8, { align: 'right' });
        doc.text(`Generated: ${format(now, 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, 11, { align: 'right' });
        doc.setTextColor(0);

        let cursorY = 12;

        // PDF Header - Tighter
        if (schoolLogo?.imageUrl) {
            doc.addImage(schoolLogo.imageUrl, 'PNG', margin, cursorY, 18, 18);
        }
        doc.setFont('times', 'bold');
        doc.setFontSize(18);
        doc.text("GATURA GIRLS", margin + 22, cursorY + 6);
    
        doc.setFont('times', 'normal');
        doc.setFontSize(8.5);
        doc.text("30-01013, Muranga.", margin + 22, cursorY + 10);
        doc.text("gaturagirls@gmail.com | 0793328863", margin + 22, cursorY + 14);
        
        doc.setFont('times', 'bold');
        doc.setFontSize(13);
        doc.text(`Top Attendees - ${choirToReport.name}`, pageWidth - margin, cursorY + 8, { align: 'right' });
    
        cursorY += 22;
    
        // Table
        (doc as any).autoTable({
            html: '#top-attendees-report-table',
            startY: cursorY,
            theme: 'grid',
            headStyles: { fillColor: '#107C41', textColor: 255, font: 'times', fontStyle: 'bold' },
            styles: { font: 'times', fontStyle: 'normal', cellPadding: 1.5, fontSize: 9 },
            margin: { left: margin, right: margin },
            didDrawPage: (data: any) => {
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setFont('times', 'normal');
                doc.setTextColor(150);
                const generatedOnText = `Generated by Gatura Hub on ${format(now, 'PPPP')}, at ${format(now, 'p')} — Page ${data.pageNumber} of ${pageCount}`;
                doc.text(generatedOnText, pageWidth / 2, pageHeight - 8, { align: 'center' });
            }
        });
    
        const finalY = (doc as any).lastAutoTable.finalY;
    
        // Footer
        const footerY = pageHeight - 15;
        doc.setFont('times', 'normal');
        doc.setFontSize(9);
        const preparedBy = `Prepared by: ${preparerName}`;
        doc.text(preparedBy, margin, footerY);
    
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
                        <CardTitle>Select Choir & Preparer</CardTitle>
                        <CardDescription>Choose a choir and specify the report preparer's name.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isLoading ? <Loader2 className="animate-spin" /> : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                    <div className="space-y-2">
                                        <Label>Choir</Label>
                                        <Select onValueChange={setSelectedChoirId} value={selectedChoirId ?? undefined}>
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
                                        <Label>Prepared By (Footer)</Label>
                                        <Input 
                                            value={preparerName} 
                                            onChange={(e) => setPreparerName(e.target.value)}
                                            placeholder="e.g. Mr. Muthomi"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-4">
                                    <Button onClick={handleGenerateReport} disabled={!selectedChoirId || isGenerating}>
                                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                        {isGenerating ? 'Loading...' : 'Generate Report'}
                                    </Button>
                                    <Button onClick={handleExportPdf} variant="outline" disabled={!choirToReport || isGenerating || topAttendeesData.length === 0}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Export PDF
                                    </Button>
                                </div>
                            </>
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
                            <TopAttendeesReport 
                                attendees={topAttendeesData} 
                                choirName={choirToReport.name}
                                preparedBy={preparerName}
                            />
                        )
                    ) : (
                        <div className="text-center p-8 text-muted-foreground border rounded-lg">
                           <p>Select report criteria above and click "Generate Report".</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
