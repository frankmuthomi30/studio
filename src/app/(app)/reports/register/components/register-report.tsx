'use client';
import { useState, useEffect } from 'react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
    const [generatedDate, setGeneratedDate] = useState<Date | null>(null);
    const [serialNumber, setSerialNumber] = useState<string>('');

    useEffect(() => {
        const now = new Date();
        setGeneratedDate(now);
        setSerialNumber(`GGHS/${format(now, 'yyyyMMdd')}/${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    }, []);

    const sessionsQuery = useMemoFirebase(() => {
        if (!firestore || !filters.choirId) return null;

        return query(
            collection(firestore, 'choir_attendance'),
            where('choirId', '==', filters.choirId)
        );
    }, [firestore, filters.choirId]);
    const { data: sessions, isLoading: sessionsLoading } = useCollection<AttendanceSession>(sessionsQuery);

    const firstSession = useMemo(() => {
        if (!sessions || sessions.length === 0 || !filters.dateRange?.from) return null;
        
        const fromDate = filters.dateRange.from;
        const toDate = filters.dateRange.to || filters.dateRange.from;
        
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);

        const filteredSessions = sessions.filter(session => {
            const sessionDate = session.date.toDate();
            return sessionDate >= fromDate && sessionDate <= endOfDay;
        });

        if (filteredSessions.length === 0) return null;

        const sorted = filteredSessions.sort((a, b) => a.date.toMillis() - b.date.toMillis());
        return sorted[0];
    }, [sessions, filters.dateRange]);

    const studentAdmissionNumbers = useMemo(() => {
        if (!firstSession) return [];
        return Object.keys(firstSession.attendance_map);
    }, [firstSession]);

    const [students, setStudents] = useState<Student[] | null>(null);
    const [studentsLoading, setStudentsLoading] = useState(false);

    useEffect(() => {
        if (!firestore || studentAdmissionNumbers.length === 0) {
            setStudents([]);
            return;
        }

        const fetchStudentsInChunks = async () => {
            setStudentsLoading(true);
            const allStudents: Student[] = [];
            const chunks: string[][] = [];

            for (let i = 0; i < studentAdmissionNumbers.length; i += 30) {
                chunks.push(studentAdmissionNumbers.slice(i, i + 30));
            }

            try {
                const queryPromises = chunks.map(chunk => {
                    if (chunk.length > 0) {
                        const q = query(collection(firestore, 'students'), where('admission_number', 'in', chunk));
                        return getDocs(q);
                    }
                    return Promise.resolve(null);
                });
                
                const querySnapshots = await Promise.all(queryPromises);

                for (const querySnapshot of querySnapshots) {
                    if (querySnapshot) {
                        querySnapshot.forEach((doc) => {
                            allStudents.push({ id: doc.id, ...doc.data() } as Student);
                        });
                    }
                }
                setStudents(allStudents);
            } catch (error) {
                console.error("Error fetching students in chunks:", error);
            } finally {
                setStudentsLoading(false);
            }
        };

        fetchStudentsInChunks();
    }, [firestore, studentAdmissionNumbers]);


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

    const isLoading = sessionsLoading || (!!firstSession && studentsLoading);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!reportData || !sessions || sessions.length === 0 || !firstSession) {
        return (
            <div className="report-preview mx-auto bg-white p-8 rounded-lg shadow-lg relative" id="register-report">
                 <div className="absolute top-4 right-8 text-[10px] text-gray-400 font-mono text-right">
                    <p>Serial: {serialNumber}</p>
                    {generatedDate && <p>Generated: {format(generatedDate, 'dd/MM/yyyy HH:mm')}</p>}
                </div>
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
    <div className="report-preview mx-auto bg-white p-8 rounded-lg shadow-lg relative" id="register-report">
        {/* Serial Number top right */}
        <div className="absolute top-4 right-8 text-[10px] text-gray-400 font-mono text-right">
            <p>Serial: {serialNumber}</p>
            {generatedDate && <p>Generated: {format(generatedDate, 'dd/MM/yyyy HH:mm')}</p>}
        </div>

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
                                <TableCell>{member.class} {member.stream || ''}</TableCell>
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
            <div className="text-center text-[10px] mt-4 space-y-1">
              <p className="font-bold">GENERATED BY THE APP - Gatura Harmony Hub</p>
              {generatedDate && (
                <p>
                  On {format(generatedDate, 'PPPP')} at {format(generatedDate, 'p')}
                </p>
              )}
            </div>
        </footer>
    </div>
  );
}
