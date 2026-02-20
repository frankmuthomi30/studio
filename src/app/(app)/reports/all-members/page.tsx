'use client';

import PageHeader from '@/components/page-header';
import AllMembersReport from './components/all-members-report';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Search } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Student, Choir, ChoirMember, StudentWithChoirStatus } from '@/lib/types';
import { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';


export default function AllMembersReportPage() {
    const firestore = useFirestore();
    const { isUserLoading: authLoading } = useUser();
    const [selectedChoirId, setSelectedChoirId] = useState<string | null>(null);
    const [choirToReport, setChoirToReport] = useState<Choir | null>(null);

    // 1. Fetch all choirs
    const choirsQuery = useMemoFirebase(() => 
        !authLoading && firestore ? query(collection(firestore, 'choirs'), orderBy('name', 'asc')) : null
    , [firestore, authLoading]);
    const { data: choirs, isLoading: choirsLoading } = useCollection<Choir>(choirsQuery);

    const studentsQuery = useMemoFirebase(() => 
        !authLoading && firestore ? collection(firestore, 'students') : null
    , [firestore, authLoading]);
    const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

    const choirMembersQuery = useMemoFirebase(() =>
        !authLoading && firestore && choirToReport ? collection(firestore, 'choirs', choirToReport.id, 'members') : null
    , [firestore, choirToReport, authLoading]);
    const { data: choirMembers, isLoading: membersLoading } = useCollection<ChoirMember>(choirMembersQuery);

    const allChoirStudents: StudentWithChoirStatus[] = useMemo(() => {
        if (!students || !choirMembers) return [];
        
        const choirMemberMap = new Map(choirMembers.map(cm => [cm.admission_number, cm]));
        
        return students
            .filter(student => choirMemberMap.has(student.admission_number))
            .map(student => {
                const choirMember = choirMemberMap.get(student.admission_number);
                return {
                    ...student,
                    choirMember: choirMember
                };
            });
    }, [students, choirMembers]);
    
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
    
        const totalMembersText = `Total Members: ${allChoirStudents.length}`;
    
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
        doc.text(`${choirToReport.name} - All Members`, pageWidth - margin, cursorY + 15, { align: 'right' });
    
        cursorY += 30;
    
        // --- Table ---
        (doc as any).autoTable({
            html: '#all-members-report-table',
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
    
        // --- Summary ---
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.text(totalMembersText, margin, finalY + 10);
    
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
    
        doc.save(`Gatura-Girls-${choirToReport.name}-All-Members-${format(now, 'yyyy-MM-dd')}.pdf`);
    };

    const isLoading = authLoading || studentsLoading || choirsLoading;
    const isGenerating = !!choirToReport && membersLoading;

    return (
        <>
            <PageHeader
                title="All Choir Members Report"
                subtitle="A list of all students registered in a specific choir."
            />
            <div className="container mx-auto p-4 md:p-8 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Select Choir</CardTitle>
                        <CardDescription>Choose a choir to see a list of all its members, past and present.</CardDescription>
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
                                <Button onClick={handleExportPdf} variant="outline" disabled={!choirToReport || isGenerating}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export PDF
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="print-container">
                    {choirToReport ? (
                        isLoading || isGenerating ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            </div>
                        ) : (
                            <AllMembersReport students={allChoirStudents} choirName={choirToReport.name} />
                        )
                    ) : (
                        <div className="text-center p-8 text-muted-foreground border rounded-lg">
                           <p>Select a choir and click "Generate Report" to see a list of all its members.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
