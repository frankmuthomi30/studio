'use client';

import PageHeader from '@/components/page-header';
import StudentUploadClient from './components/student-upload-client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { Loader2, Database } from 'lucide-react';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function StudentUploadPage() {
  const firestore = useFirestore();
  const studentsQuery = useMemoFirebase(() =>
    firestore ? collection(firestore, 'students') : null
  , [firestore]);
  const { data: students, isLoading } = useCollection<Student>(studentsQuery);

  const stats = useMemo(() => {
    if (!students) return { total: 0, byClass: {} as Record<string, number> };
    
    const byClass = students.reduce((acc, student) => {
        if (student.class) {
            acc[student.class] = (acc[student.class] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return {
        total: students.length,
        byClass,
    };
  }, [students]);

  return (
    <>
      <PageHeader
        title="Student Data Import"
        subtitle="Upload class lists. The system adds new students and updates existing ones."
      />
      <div className="container mx-auto p-4 md:p-8 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <StudentUploadClient />
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="text-primary" />
                Database Summary
              </CardTitle>
              <CardDescription>
                A live overview of student records in the database.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center p-4">
                  <Loader2 className="animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Total Students</span>
                    <span className="font-bold text-lg text-primary">{stats.total}</span>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Students per Class</h4>
                    <div className="space-y-2">
                      {Object.keys(stats.byClass).length > 0 ? (
                        Object.entries(stats.byClass)
                          .sort(([classA], [classB]) => classA.localeCompare(classB))
                          .map(([className, count]) => (
                            <div key={className} className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">{className}</span>
                              <span className="font-semibold">{count}</span>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">No class data uploaded yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
