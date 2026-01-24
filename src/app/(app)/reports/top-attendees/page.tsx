'use client';

import PageHeader from '@/components/page-header';
import TopAttendeesReport from './components/top-attendees-report';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Student, ChoirMember, AttendanceSession } from '@/lib/types';
import { useMemo } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export type TopAttendee = Student & {
    present: number;
    total: number;
    attendance_rate: number;
};

export default function TopAttendeesReportPage() {
    const firestore = useFirestore();

    const { data: attendanceSessions, isLoading: sessionsLoading } = useCollection<AttendanceSession>(
        useMemoFirebase(() => firestore ? query(collection(firestore, 'choir_attendance')) : null, [firestore])
    );
    const { data: students, isLoading: studentsLoading } = useCollection<Student>(
        useMemoFirebase(() => firestore ? collection(firestore, 'students') : null, [firestore])
    );
    const { data: choirMembers, isLoading: membersLoading } = useCollection<ChoirMember>(
        useMemoFirebase(() => firestore ? query(collection(firestore, 'choir_members')) : null, [firestore])
    );

    const topAttendeesData: TopAttendee[] = useMemo(() => {
        if (!attendanceSessions || !students || !choirMembers) return [];
        
        const studentMap = new Map(students.map(s => [s.admission_number, s]));
        const choirMemberAdmissionNumbers = new Set(choirMembers.map(cm => cm.admission_number));

        const attendanceCounts: Record<string, { present: number; total: number }> = {};

        // Initialize counts for all choir members to ensure they are included even with 0 attendance
        choirMemberAdmissionNumbers.forEach(admNo => {
            attendanceCounts[admNo] = { present: 0, total: 0 };
        });

        // Process each attendance session
        attendanceSessions.forEach(session => {
            // Iterate over all known choir members for this session
            Object.keys(session.attendance_map).forEach(admNo => {
                // Ensure we only count for students who are currently (or were) in the choir
                if (choirMemberAdmissionNumbers.has(admNo)) {
                    // This check is slightly redundant due to pre-initialization but is safe
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
            .filter(item => item.first_name) // Filter out any choir members for whom we don't have student details
            .sort((a, b) => {
                // Sort by present count desc, then by attendance rate desc, then by name
                if (b.present !== a.present) return b.present - a.present;
                if (b.attendance_rate !== a.attendance_rate) return b.attendance_rate - a.attendance_rate;
                return (a.first_name || '').localeCompare(b.first_name || '');
            });

        return rankedData;

    }, [attendanceSessions, students, choirMembers]);

    const handleExportPdf = () => {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');
    
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
        doc.text("Top Choir Attendees Report", pageWidth - margin, cursorY + 15, { align: 'right' });
    
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
    
        const generatedOnText = `Generated on ${format(new Date(), 'PPp')}`;
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(generatedOnText, pageWidth / 2, footerY + 8, { align: 'center' });
    
        doc.save(`Gatura-Girls-Top-Attendees-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const isLoading = studentsLoading || membersLoading || sessionsLoading;

    return (
        <>
            <PageHeader
                title="Top Attendees Report"
                subtitle="A ranked list of choir members based on their attendance."
                actions={
                    <Button onClick={handleExportPdf} disabled={isLoading || topAttendeesData.length === 0}>
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
                        <TopAttendeesReport attendees={topAttendeesData} />
                    )}
                </div>
            </div>
        </>
    );
}
