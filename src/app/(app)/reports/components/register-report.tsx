'use client';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { AttendanceSession, ChoirMember, Student } from '@/lib/types';
import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

type RegisterReportProps = {
    filters: {
        dateRange?: DateRange;
    }
}

export default function RegisterReport({ filters }: RegisterReportProps) {
    const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');
    const firestore = useFirestore();

    const activeMembersQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'choir_members'), where('status', '==', 'active')) : null
    , [firestore]);
    const { data: activeChoirMembers, isLoading: membersLoading } = useCollection<ChoirMember>(activeMembersQuery);
    
    const studentQuery = useMemoFirebase(() =>
        firestore && activeChoirMembers && activeChoirMembers.length > 0 ? 
        query(collection(firestore, 'students'), where('admission_number', 'in', activeChoirMembers.map(m => m.admission_number))) 
        : null
    , [firestore, activeChoirMembers]);
    const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentQuery);

    const sessionsQuery = useMemoFirebase(() => {
        if (!firestore || !filters.dateRange?.from) return null;

        const fromDate = filters.dateRange.from;
        // If 'to' is not selected, use the same day as 'from'.
        const toDate = filters.dateRange.to || filters.dateRange.from;

        // Set time to the end of the day for the 'to' date to include all sessions on that day.
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);

        const q = query(
            collection(firestore, 'choir_attendance'),
            where('date', '>=', fromDate),
            where('date', '<=', endOfDay),
            orderBy('date', 'asc')
        );
        
        return q;
    }, [firestore, filters.dateRange]);
    const { data: sessions, isLoading: sessionsLoading } = useCollection<AttendanceSession>(sessionsQuery);

    const reportData = useMemo(() => {
        if (!students || !sessions || sessions.length === 0) {
            return null;
        }

        const session = sessions[0]; // Use the first session in the range
        const studentDetails = students.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''));

        const reportRows = studentDetails.map(student => ({
            ...student,
            present: session.attendance_map[student.admission_number] === true,
        }));
        
        const presentCount = reportRows.filter(r => r.present).length;

        return {
            session,
            rows: reportRows,
            presentCount,
            totalCount: reportRows.length
        };
    }, [students, sessions]);

    if (!filters.dateRange?.from) {
        return (
            <div className="text-center p-8 text-muted-foreground border rounded-lg">
                <p>Select a date range and click "Generate Report" to see the attendance register.</p>
            </div>
        );
    }

    if (membersLoading || studentsLoading || sessionsLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!reportData || !sessions || sessions.length === 0) {
        return (
            <div className="report-preview mx-auto bg-white p-8 rounded-lg shadow-lg" id="register-report">
                 <header className="hidden print:flex items-center justify-between border-b pb-4">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-gray-800">Gatura Girls High School</h2>
                        <p className="font-headline text-lg text-gray-600">Full Choir Attendance Register</p>
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
                <p className="text-muted-foreground text-center p-4">No attendance sessions found for the selected date range.</p>
            </div>
        );
    }
    
  return (
    <div className="report-preview mx-auto bg-white p-8 rounded-lg shadow-lg" id="register-report">
        <header className="flex items-center justify-between border-b pb-4">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold text-gray-800">Gatura Girls High School</h2>
                <p className="font-headline text-lg text-gray-600">Full Choir Attendance Register</p>
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
        <div className="text-center my-4">
            <h3 className="font-headline text-xl font-semibold text-gray-700">
                {reportData.session.practice_type} on {format(reportData.session.date.toDate(), 'EEEE, MMMM d, yyyy')}
            </h3>
            <p className="text-sm text-gray-500">(Showing first session in selected date range)</p>
        </div>

        <section className="mt-6">
            <Table className="report-table" id="register-report-table">
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Adm. No.</TableHead>
                        <TableHead className="min-w-[150px]">Full Name</TableHead>
                        <TableHead className="w-[100px]">Class</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reportData.rows.map(member => {
                        return (
                            <TableRow key={member.admission_number}>
                                <TableCell>{member.admission_number}</TableCell>
                                <TableCell>{member.first_name} {member.last_name}</TableCell>
                                <TableCell>{member.class}</TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </section>
        
        <section className="mt-6">
            <p id="total-present" className="text-lg font-bold text-gray-800">
                Total Present: {reportData.presentCount} / {reportData.totalCount}
            </p>
        </section>

        <footer className="mt-8 pt-4 text-sm text-gray-500 border-t">
            <div className="flex justify-between">
                <p>Prepared by: Mr. Muthomi (Choir Director)</p>
                <p>Page 1 of 1</p>
            </div>
            <p className="text-center text-xs mt-4">Generated on {format(new Date(), 'PPp')}</p>
        </footer>
    </div>
  );
}
