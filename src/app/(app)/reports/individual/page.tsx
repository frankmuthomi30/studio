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
import { Loader2, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Student } from '@/lib/types';
  
export default function IndividualReportPage() {
    const firestore = useFirestore();
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [studentToReport, setStudentToReport] = useState<Student | null>(null);
    
    const studentsQuery = useMemoFirebase(() =>
        firestore ? collection(firestore, 'students') : null
    , [firestore]);
    const { data: students, isLoading } = useCollection<Student>(studentsQuery);

    const handleGenerateReport = () => {
        const student = students?.find(s => s.id === selectedStudentId);
        if (student) {
            setStudentToReport(student);
        }
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
                    <div className="flex gap-2">
                        <Select onValueChange={setSelectedStudentId} value={selectedStudentId ?? undefined}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a student..." />
                            </SelectTrigger>
                            <SelectContent>
                                {students?.map(student => (
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
                    <p>Select a student and click "Generate Report" to see their attendance record.</p>
                </div>
            )}
        </div>
      </div>
    </>
  );
}
