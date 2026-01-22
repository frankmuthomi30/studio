'use client';

import PageHeader from '@/components/page-header';
import IndividualReport from '../components/individual-report';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { Button } from '@/components/ui/button';
import { Loader2, Search, Printer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Student, ChoirMember } from '@/lib/types';
  
export default function IndividualReportPage() {
    const firestore = useFirestore();
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [studentToReport, setStudentToReport] = useState<Student | null>(null);
    
    const studentsQuery = useMemoFirebase(() =>
        firestore ? collection(firestore, 'students') : null
    , [firestore]);
    const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

    const choirMembersQuery = useMemoFirebase(() =>
        firestore ? collection(firestore, 'choir_members') : null
    , [firestore]);
    const { data: choirMembers, isLoading: membersLoading } = useCollection<ChoirMember>(choirMembersQuery);

    const choirStudents = useMemo(() => {
        if (!students || !choirMembers) return [];
        const memberAdmissionNumbers = new Set(choirMembers.map(m => m.admission_number));
        return students.filter(student => memberAdmissionNumbers.has(student.admission_number));
    }, [students, choirMembers]);

    const isLoading = studentsLoading || membersLoading;

    const handleGenerateReport = () => {
        const student = choirStudents?.find(s => s.id === selectedStudentId);
        if (student) {
            setStudentToReport(student);
        }
    }

    const handleDownloadPdf = () => {
        window.print();
    }

  return (
    <>
      <PageHeader
        title="Individual Attendance Report"
        subtitle="Select a student to generate their detailed attendance record."
      />
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Select Student</CardTitle>
                <CardDescription>Choose a choir member to generate their report.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Loader2 className="animate-spin" />
                ) : (
                    <div className="flex flex-wrap items-center gap-2">
                        <Select onValueChange={setSelectedStudentId} value={selectedStudentId ?? undefined}>
                            <SelectTrigger className="w-full sm:w-auto sm:min-w-[300px]">
                                <SelectValue placeholder="Select a choir member..." />
                            </SelectTrigger>
                            <SelectContent>
                                {choirStudents?.sort((a,b) => (a.first_name || '').localeCompare(b.first_name || '')).map(student => (
                                    <SelectItem key={student.id} value={student.id!}>
                                        {student.first_name} {student.last_name} ({student.admission_number})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleGenerateReport} disabled={!selectedStudentId}>
                            <Search className="mr-2 h-4 w-4" />
                            Generate Report
                        </Button>
                        <Button onClick={handleDownloadPdf} disabled={!studentToReport} variant="outline">
                            <Printer className="mr-2 h-4 w-4" />
                            Print / Save PDF
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>

        <div className="print-container">
            {studentToReport ? (
                <IndividualReport 
                    student={studentToReport} 
                />
            ) : (
                <div className="text-center p-8 text-muted-foreground border rounded-lg">
                    <p>Select a choir member and click "Generate Report" to see their attendance record.</p>
                </div>
            )}
        </div>
      </div>
    </>
  );
}
