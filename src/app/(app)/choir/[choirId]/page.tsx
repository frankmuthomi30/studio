'use client';
import PageHeader from '@/components/page-header';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useMemo, use } from 'react';
import type { Student, Choir, ChoirMember, StudentWithChoirStatus } from '@/lib/types';
import MemberManagementClient from './components/member-management-client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ChoirMemberPage({ params }: { params: { choirId: string } }) {
  const { choirId } = use(params as any);
  const firestore = useFirestore();

  const choirRef = useMemoFirebase(() => 
    firestore ? doc(firestore, 'choirs', choirId) : null, [firestore, choirId]);
  const { data: choir, isLoading: choirLoading } = useDoc<Choir>(choirRef);

  const studentsQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, 'students') : null, [firestore]);
  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

  const choirMembersQuery = useMemoFirebase(() =>
    firestore ? collection(firestore, 'choirs', choirId, 'members') : null, [firestore, choirId]);
  const { data: choirMembers, isLoading: membersLoading } = useCollection<ChoirMember>(choirMembersQuery);
  
  const studentsWithStatus: StudentWithChoirStatus[] = useMemo(() => {
    if (!students) return [];

    const memberMap = new Map(choirMembers?.map(cm => [cm.admission_number, cm]));
    
    return students.map(student => {
      const choirMember = memberMap.get(student.admission_number);
      return {
        ...student,
        choirMember: choirMember ? {
            status: choirMember.status,
            date_joined: choirMember.date_joined
        } : undefined
      };
    });
  }, [students, choirMembers]);

  const isLoading = choirLoading || studentsLoading || membersLoading;

  return (
    <>
      <PageHeader
        title={choir ? choir.name : 'Choir Members'}
        subtitle={choir ? 'Manage students in this choir.' : 'Loading choir details...'}
        actions={
            <Button variant="outline" asChild>
                <Link href="/choir">
                    <ArrowLeft className="mr-2"/>
                    Back to Choirs
                </Link>
            </Button>
        }
      />
      <div className="container mx-auto p-4 md:p-8">
        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        ) : (
            <MemberManagementClient 
                choirId={choirId}
                choirName={choir?.name || 'this choir'}
                data={studentsWithStatus}
            />
        )}
      </div>
    </>
  );
}
