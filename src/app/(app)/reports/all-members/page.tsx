'use client';

import PageHeader from '@/components/page-header';
import AllMembersReport from './components/all-members-report';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Student, ChoirMember, StudentWithChoirStatus } from '@/lib/types';
import { useMemo } from 'react';

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

    const handlePrint = () => {
        window.print();
    }

    const isLoading = studentsLoading || membersLoading;

    return (
        <>
            <PageHeader
                title="All Choir Members Report"
                subtitle="A complete list of all students registered in the choir, past and present."
                actions={
                    <Button onClick={handlePrint} disabled={isLoading || allChoirStudents.length === 0}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print Report
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
