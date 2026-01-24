'use client';
import { useState, useEffect } from 'react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { AttendanceSession, Student } from '@/lib/types';
import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

type RegisterReportProps = {
    filters: {
        dateRange?: DateRange;
        choirId?: string;
        choirName?: string;
    }
}

export default function RegisterReport({ filters }: RegisterReportProps) {
    const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');
    const firestore = useFirestore();
    const { isUserLoading: authLoading } = useUser();
    const [generatedDate, setGeneratedDate] = useState<Date | null>(null);

    useEffect(() => {
        // This effect runs only on the client, preventing hydration mismatch
        setGeneratedDate(new Date());
    }, []);

    // 1. Query for the sessions in the given date range for the specified choir
    const sessionsQuery = useMemoFirebase(() => {
        if (authLoading || !firestore || !filters.dateRange?.from || !filters.choirId) return null;

        const fromDate = filters.dateRange.from;
        const toDate = filters.dateRange.to || filters.dateRange.from;

        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);

        return query(
            collection(firestore, 'choir_attendance'),
            where('choirId', '==', filters.choirId),
            where('date', '>=', fromDate),
            where('date', '<=', endOfDay),
            orderBy('date', 'asc')
        );
    }, [firestore, filters.dateRange, filters.choirId, authLoading]);
    const { data: sessions, isLoading: sessionsLoading } = useCollection<AttendanceSession>(sessionsQuery);

    const firstSession = useMemo(() => sessions?.[0], [sessions]);

    // 2. Get the admission numbers from the first session's attendance map
    const studentAdmissionNumbers = useMemo(() => {
        if (!firstSession) return [];
        return Object.keys(firstSession.attendance_map);
    }, [firstSession]);

    // 3. Query for the student details based on the admission numbers from the session
    const studentQuery = useMemoFirebase(() => {
        if (authLoading || !firestore || studentAdmissionNumbers.length === 0) return null;
        // Batching reads for up to 30 students at a time.
        return query(collection(firestore, 'students'), where('admission_number', 'in', studentAdmissionNumbers.slice(0, 30)));
    }, [firestore, studentAdmissionNumbers, authLoading]);
    const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentQuery);

    // 4. Combine data for the report
    const reportData = useMemo(() => {
        if (!students || !firstSession) {
            return null;
        }
        
        const reportRows = students.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''));

        const presentCount = Object.values(firstSession.attendance_map).filter(Boolean).length;
        const totalCount = Object.keys(firstSession.attendance_map).length;

        return {
            session: firstSession,
            rows: reportRows,
            presentCount,
            totalCount
        };
    }, [students, firstSession]);

    if (!filters.dateRange?.from || !filters.choirId) {
        return (
            <div className="text-center p-8 text-muted-foreground border rounded-lg">
                <p>Select a choir and date range, then click "Generate Report" to see the attendance register.</p>
            </div>
        );
    }

    const isLoading = authLoading || sessionsLoading || (!!firstSession && studentsLoading);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!reportData || !sessions || sessions.length === 0) {
        return (
            <div className="report-preview mx-auto bg-white p-8 rounded-lg shadow-lg" id="register-report">
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
                        <h3 className="font-headline text-xl text-gray-700">Full Choir Attendance Register</h3>
                    </div>
                </header>
                <p className="text-muted-foreground text-center p-4">No attendance sessions found for '{filters.choirName}' in the selected date range.</p>
            </div>
        );
    }
    
  return (
    <div className="report-preview mx-auto bg-white p-8 rounded-lg shadow-lg" id="register-report">
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
                <h3 className="font-headline text-xl text-gray-700">Full Choir Attendance Register</h3>
            </div>
        </header>
        <div className="text-center my-4">
            <h3 className="font-headline text-xl font-semibold text-gray-700">
                {filters.choirName} - {reportData.session.practice_type} on {format(reportData.session.date.toDate(), 'EEEE, MMMM d, yyyy')}
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
            {generatedDate && (
              <p className="text-center text-xs mt-4">
                Generated on {format(generatedDate, 'PPp')}
              </p>
            )}
        </footer>
    </div>
  );
}
