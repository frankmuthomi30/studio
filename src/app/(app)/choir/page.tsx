'use client';
import PageHeader from '@/components/page-header';
import ChoirManagementClient from './components/choir-management-client';
import type { Student, ChoirMember, StudentWithChoirStatus } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';

export default function ChoirManagementPage() {
  const firestore = useFirestore();

  const studentsQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, 'students') : null
  , [firestore]);
  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

  const choirMembersQuery = useMemoFirebase(() =>
    firestore ? collection(firestore, 'choir_members') : null
  , [firestore]);
  const { data: choirMembers, isLoading: membersLoading } = useCollection<ChoirMember>(choirMembersQuery);
  
  const studentsWithStatus: StudentWithChoirStatus[] = useMemo(() => {
    if (!students || !choirMembers) return [];
    return students.map(student => {
      const choirMember = choirMembers.find(cm => cm.admission_number === student.admission_number);
      return {
        ...student,
        choirMember: choirMember
      };
    });
  }, [students, choirMembers]);

  return (
    <>
      <PageHeader
        title="Choir Management"
        subtitle="View all students and manage their choir membership status."
      />
      <div className="container mx-auto p-4 md:p-8">
        {(studentsLoading || membersLoading) ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        ) : (
            <ChoirManagementClient data={studentsWithStatus} />
        )}
      </div>
    </>
  );
}
