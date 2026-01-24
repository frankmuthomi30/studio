'use client';

import PageHeader from '@/components/page-header';
import AllMembersReport from './components/all-members-report';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Student, ChoirMember, StudentWithChoirStatus } from '@/lib/types';
import { useMemo } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export default function AllMembersReportPage() {
    const firestore = useFirestore();

    const studentsQuery = useMemoFirebase(() => 
        firestore ? collection(firestore, 'students') : null
    , [firestore]);
    const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

    const choirMembersQuery = useMemoFirebase(() =>
        firestore ? collection(firestore, 'choir_members') : null
    , [firestore]);
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

    const handleExportPdf = () => {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    
        const schoolName = "Gatura Girls High School";
        const reportTitleText = "All Choir Members Report";
        const totalMembersText = `Total Members: ${allChoirStudents.length}`;
    
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
    
        // --- PDF Header ---
        doc.setFont('times', 'bold');
        doc.setFontSize(18);
        doc.text(schoolName, pageWidth / 2, margin, { align: 'center' });
    
        doc.setFont('times', 'normal');
        doc.setFontSize(14);
        doc.text(reportTitleText, pageWidth / 2, margin + 8, { align: 'center' });
    
        // --- Table ---
        (doc as any).autoTable({
            html: '#all-members-report-table',
            startY: margin + 20,
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
    
        const generatedOnText = `Generated on ${format(new Date(), 'PPp')}`;
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(generatedOnText, pageWidth / 2, footerY + 8, { align: 'center' });
    
        doc.save(`Gatura-Girls-All-Members-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const isLoading = studentsLoading || membersLoading;

    return (
        <>
            <PageHeader
                title="All Choir Members Report"
                subtitle="A complete list of all students registered in the choir, past and present."
                actions={
                    <Button onClick={handleExportPdf} disabled={isLoading || allChoirStudents.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Export PDF
                    </Button>
                }
            />
            <div className="container mx-auto p-4 md:p-8">
                <div className="print-container">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    ) : (
                        <AllMembersReport students={allChoirStudents} />
                    )}
                </div>
            </div>
        </>
    );
}
