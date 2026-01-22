'use client';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { format } from 'date-fns';
import { Check, Loader2, X } from 'lucide-react';
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
        let q = query(collection(firestore, 'choir_attendance'), orderBy('date', 'asc'));
        if (filters.dateRange.from) {
            q = query(q, where('date', '>=', filters.dateRange.from));
        }
        if (filters.dateRange.to) {
            q = query(q, where('date', '<=', filters.dateRange.to));
        }
        return q;
    }, [firestore, filters.dateRange]);
    const { data: sessions, isLoading: sessionsLoading } = useCollection<AttendanceSession>(sessionsQuery);

    const activeMembersDetails = useMemo(() => {
        if (!students) return [];
        return students;
    }, [students]);

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
    
  return (
    <div className="report-preview-landscape mx-auto bg-white p-8 rounded-lg shadow-lg" id="register-report">
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
        <div className="text-sm text-gray-600 mt-2">
            <strong>Date Range:</strong> {filters.dateRange.from && format(filters.dateRange.from, 'MMM dd, yyyy')} - {filters.dateRange.to && format(filters.dateRange.to, 'MMM dd, yyyy')}
        </div>

        <section className="mt-6">
            <Table className="report-table">
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Adm. No.</TableHead>
                        <TableHead className="min-w-[150px]">Full Name</TableHead>
                        <TableHead className="w-[100px]">Class</TableHead>
                        {sessions?.map(session => (
                            <TableHead key={session.id} className="text-center rotate-[-45deg] !h-24 !pb-2 !align-bottom">
                                <span className="whitespace-nowrap">{format(session.date.toDate(), 'MMM dd')}</span>
                            </TableHead>
                        ))}
                        <TableHead className="text-center font-bold">Total Present</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {activeMembersDetails.map(member => {
                        if (!member) return null;
                        let presentCount = 0;
                        return (
                            <TableRow key={member.admission_number}>
                                <TableCell>{member.admission_number}</TableCell>
                                <TableCell>{member.first_name} {member.last_name}</TableCell>
                                <TableCell>{member.class}</TableCell>
                                {sessions?.map(session => {
                                    const isPresent = session.attendance_map[member.admission_number];
                                    if(isPresent) presentCount++;
                                    return (
                                        <TableCell key={`${member.admission_number}-${session.id}`} className="text-center">
                                            {isPresent === true && <Check className="h-4 w-4 text-green-600 mx-auto" />}
                                            {isPresent === false && <X className="h-4 w-4 text-red-600 mx-auto" />}
                                            {isPresent === undefined && <span className="text-gray-400">-</span>}
                                        </TableCell>
                                    )
                                })}
                                <TableCell className="text-center font-bold">{presentCount}</TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
            {(!sessions || sessions.length === 0) && (
                <p className="text-muted-foreground text-center p-4">No attendance sessions found for the selected date range.</p>
            )}
        </section>

        <footer className="mt-8 pt-4 text-sm text-gray-500 border-t">
            <div className="flex justify-between">
                <p>Prepared by: Choir Director (auto-generated)</p>
                <p>Page 1 of 1</p>
            </div>
            <p className="text-center text-xs mt-4">Generated by Gatura Girls Choir on {format(new Date(), 'PPp')}</p>
        </footer>
    </div>
  );
}
