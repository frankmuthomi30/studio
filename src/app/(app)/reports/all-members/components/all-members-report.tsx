
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
    <div className="report-preview mx-auto bg-white p-6 rounded-lg shadow-lg relative" id="all-members-report">
        {/* Serial Number top right */}
        <div className="absolute top-2 right-6 text-[9px] text-gray-400 font-mono text-right">
            <p>Serial: {serialNumber}</p>
            {generatedDate && <p>Generated: {format(generatedDate, 'dd/MM/yyyy HH:mm')}</p>}
        </div>

        <header className="flex items-start justify-between border-b-2 border-gray-800 pb-2">
            <div className="flex items-start gap-3">
                {schoolLogo && (
                    <Image
                        src={schoolLogo.imageUrl}
                        alt={schoolLogo.description}
                        width={60}
                        height={60}
                        data-ai-hint={schoolLogo.imageHint}
                    />
                )}
                <div className="space-y-0.5 font-serif">
                    <h2 className="text-2xl font-bold text-gray-800 tracking-wider">GATURA GIRLS</h2>
                    <div className="text-[10px] text-gray-600 leading-tight">
                        <p>30-01013, Muranga.</p>
                        <p>gaturagirls@gmail.com | 0793328863</p>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <h3 className="font-headline text-lg text-gray-700">{choirName} - All Members</h3>
            </div>
        </header>

        <section className="mt-4">
            <Table id="all-members-report-table">
                <TableHeader>
                    <TableRow className="h-8">
                        <TableHead className="text-xs">Admission No.</TableHead>
                        <TableHead className="text-xs">Full Name</TableHead>
                        <TableHead className="text-xs">Class</TableHead>
                        <TableHead className="text-right text-xs">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedStudents.length > 0 ? sortedStudents.map(student => (
                        <TableRow key={student.admission_number} className="h-8">
                            <TableCell className="text-xs">{student.admission_number}</TableCell>
                            <TableCell className="font-medium text-xs">{`${student.first_name} ${student.last_name}`}</TableCell>
                            <TableCell className="text-xs">{student.class} {student.stream || ''}</TableCell>
                            <TableCell className="text-right">
                                <Badge variant={student.choirMember?.status === 'active' ? 'default' : 'secondary'} className="text-[9px] h-5 px-1.5">
                                    {student.choirMember?.status === 'active' ? 'Active' : 'Inactive'}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-xs">
                                No choir members found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </section>

        <footer className="mt-6 pt-2 text-[10px] text-gray-500 border-t">
            <div className="flex justify-between items-center">
                <p>Prepared by: Mr. Muthomi (Choir Director)</p>
                <p className="font-bold">Total Members: {students.length}</p>
            </div>
            <div className="text-center text-[9px] mt-2">
              <p className="font-bold">GENERATED BY GATURA HUB ON {generatedDate ? format(generatedDate, 'PPPP').toUpperCase() : ''}, AT {generatedDate ? format(generatedDate, 'p').toUpperCase() : ''}</p>
            </div>
        </footer>
    </div>
  );
}
