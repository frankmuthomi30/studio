'use client';
import { useState, useEffect } from 'react';
import type { StudentWithChoirStatus } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { format } from 'date-fns';

type AllMembersReportProps = {
  students: StudentWithChoirStatus[];
  choirName: string;
};

export default function AllMembersReport({ students, choirName }: AllMembersReportProps) {
    const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');
    const [generatedDate, setGeneratedDate] = useState<Date | null>(null);
    const [serialNumber, setSerialNumber] = useState<string>('');

    useEffect(() => {
        const now = new Date();
        setGeneratedDate(now);
        setSerialNumber(`GGHS/${format(now, 'yyyyMMdd')}/${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    }, []);
    
    const sortedStudents = students.sort((a, b) => {
        const classComparison = (a.class || '').localeCompare(b.class || '');
        if (classComparison !== 0) return classComparison;
        const a_name = `${a.first_name} ${a.last_name}`;
        const b_name = `${b.first_name} ${b.last_name}`;
        return a_name.localeCompare(b_name);
    });

  return (
    <div className="report-preview mx-auto bg-white p-8 rounded-lg shadow-lg relative" id="all-members-report">
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
                <h3 className="font-headline text-xl text-gray-700">{choirName} - All Members</h3>
            </div>
        </header>

        <section className="mt-6">
            <Table id="all-members-report-table">
                <TableHeader>
                    <TableRow>
                        <TableHead>Admission No.</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedStudents.length > 0 ? sortedStudents.map(student => (
                        <TableRow key={student.admission_number}>
                            <TableCell>{student.admission_number}</TableCell>
                            <TableCell className="font-medium">{`${student.first_name} ${student.last_name}`}</TableCell>
                            <TableCell>{student.class} {student.stream || ''}</TableCell>
                            <TableCell className="text-right">
                                <Badge variant={student.choirMember?.status === 'active' ? 'default' : 'secondary'}>
                                    {student.choirMember?.status === 'active' ? 'Active' : 'Inactive'}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                No choir members found for this choir.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </section>

        <footer className="mt-8 pt-4 text-sm text-gray-500 border-t">
            <div className="flex justify-between">
                <p>Prepared by: Mr. Muthomi (Choir Director)</p>
                <p className="font-bold">Total Members: {students.length}</p>
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
