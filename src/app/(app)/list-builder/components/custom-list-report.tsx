'use client';
import { useState, useEffect } from 'react';
import type { Student } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { format } from 'date-fns';

type CustomListReportProps = {
  students: Student[];
  listTitle: string;
};

export default function CustomListReport({ students, listTitle }: CustomListReportProps) {
    const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');
    const [generatedDate, setGeneratedDate] = useState<Date | null>(null);

    useEffect(() => {
        // This effect runs only on the client, preventing hydration mismatch
        setGeneratedDate(new Date());
    }, []);
    
    const sortedStudents = students.sort((a, b) => {
        const a_name = `${a.first_name} ${a.last_name}`;
        const b_name = `${b.first_name} ${b.last_name}`;
        return a_name.localeCompare(b_name);
    });

  return (
    <div className="report-preview mx-auto bg-white p-8 rounded-lg shadow-lg" id="custom-list-report">
        <header className="flex items-start justify-between border-b-4 border-gray-800 pb-4">
            <div className="flex items-start gap-4">
                 {/* The logo is loaded via fetch in the client component, so this is just a placeholder for the print layout */}
            </div>
            <div className="text-right">
                <h3 className="font-headline text-xl text-gray-700">{listTitle || 'Custom Student List'}</h3>
            </div>
        </header>

        <section className="mt-6">
            <Table id="custom-list-report-table">
                <TableHeader>
                    <TableRow>
                        <TableHead className='w-12'>#</TableHead>
                        <TableHead>Admission No.</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Signature</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedStudents.length > 0 ? sortedStudents.map((student, index) => (
                        <TableRow key={student.admission_number}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{student.admission_number}</TableCell>
                            <TableCell className="font-medium">{`${student.first_name} ${student.last_name}`}</TableCell>
                            <TableCell>{student.class}</TableCell>
                            <TableCell className="text-right border-b"></TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                No students added to the list yet.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </section>
    </div>
  );
}
