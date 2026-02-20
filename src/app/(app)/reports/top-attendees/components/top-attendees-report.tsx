
'use client';
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { format } from 'date-fns';
import { type TopAttendee } from '../page';
import { Badge } from '@/components/ui/badge';

type TopAttendeesReportProps = {
  attendees: TopAttendee[];
  choirName: string;
};

export default function TopAttendeesReport({ attendees, choirName }: TopAttendeesReportProps) {
    const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');
    const [generatedDate, setGeneratedDate] = useState<Date | null>(null);
    const [serialNumber, setSerialNumber] = useState<string>('');

    useEffect(() => {
        const now = new Date();
        setGeneratedDate(now);
        setSerialNumber(`GGHS/${format(now, 'yyyyMMdd')}/${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    }, []);

  return (
    <div className="report-preview mx-auto bg-white p-6 rounded-lg shadow-lg relative" id="top-attendees-report">
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
                <h3 className="font-headline text-lg text-gray-700">Top Attendees - {choirName}</h3>
            </div>
        </header>

        <section className="mt-4">
            <Table id="top-attendees-report-table">
                <TableHeader>
                    <TableRow className="h-8">
                        <TableHead className="w-12 text-xs">Rank</TableHead>
                        <TableHead className="text-xs">Admission No.</TableHead>
                        <TableHead className="text-xs">Full Name</TableHead>
                        <TableHead className="text-xs">Class</TableHead>
                        <TableHead className="text-center text-xs">Present</TableHead>
                        <TableHead className="text-center text-xs">Total</TableHead>
                        <TableHead className="text-right text-xs">Rate (%)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {attendees.length > 0 ? attendees.map((attendee, index) => (
                        <TableRow key={attendee.admission_number} className="h-8">
                            <TableCell className="font-bold text-sm text-center">{index + 1}</TableCell>
                            <TableCell className="text-xs">{attendee.admission_number}</TableCell>
                            <TableCell className="font-medium text-xs">{`${attendee.first_name} ${attendee.last_name}`}</TableCell>
                            <TableCell className="text-xs">{attendee.class} {attendee.stream || ''}</TableCell>
                            <TableCell className="text-center font-semibold text-primary text-xs">{attendee.present}</TableCell>
                            <TableCell className="text-center text-xs">{attendee.total}</TableCell>
                            <TableCell className="text-right">
                                <Badge variant={attendee.attendance_rate > 80 ? 'default' : attendee.attendance_rate > 50 ? 'secondary' : 'destructive'} className="text-[9px] h-5 px-1.5">
                                    {attendee.attendance_rate.toFixed(1)}%
                                </Badge>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-xs">
                                No attendance data available.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </section>

        <footer className="mt-6 pt-2 text-[10px] text-gray-500 border-t">
            <div className="flex justify-between items-center">
                <p>Prepared by: Mr. Muthomi (Choir Director)</p>
                <p className="font-bold">Total Ranked: {attendees.length}</p>
            </div>
            <div className="text-center text-[9px] mt-2">
              <p className="font-bold">GENERATED BY GATURA HUB ON {generatedDate ? format(generatedDate, 'PPPP').toUpperCase() : ''}, AT {generatedDate ? format(generatedDate, 'p').toUpperCase() : ''}</p>
            </div>
        </footer>
    </div>
  );
}
