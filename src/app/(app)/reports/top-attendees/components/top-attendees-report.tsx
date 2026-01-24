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
};

export default function TopAttendeesReport({ attendees }: TopAttendeesReportProps) {
    const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');
    const [generatedDate, setGeneratedDate] = useState<Date | null>(null);

    useEffect(() => {
        setGeneratedDate(new Date());
    }, []);

  return (
    <div className="report-preview mx-auto bg-white p-8 rounded-lg shadow-lg" id="top-attendees-report">
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
                <h3 className="font-headline text-xl text-gray-700">Top Choir Attendees</h3>
            </div>
        </header>

        <section className="mt-6">
            <Table id="top-attendees-report-table">
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Admission No.</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Total Sessions</TableHead>
                        <TableHead className="text-right">Rate (%)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {attendees.length > 0 ? attendees.map((attendee, index) => (
                        <TableRow key={attendee.admission_number}>
                            <TableCell className="font-bold text-lg text-center">{index + 1}</TableCell>
                            <TableCell>{attendee.admission_number}</TableCell>
                            <TableCell className="font-medium">{`${attendee.first_name} ${attendee.last_name}`}</TableCell>
                            <TableCell>{attendee.class}</TableCell>
                            <TableCell className="text-center font-semibold text-primary">{attendee.present}</TableCell>
                            <TableCell className="text-center">{attendee.total}</TableCell>
                            <TableCell className="text-right">
                                <Badge variant={attendee.attendance_rate > 80 ? 'default' : attendee.attendance_rate > 50 ? 'secondary' : 'destructive'}>
                                    {attendee.attendance_rate.toFixed(1)}%
                                </Badge>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                No attendance data available to generate rankings.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </section>

        <footer className="mt-8 pt-4 text-sm text-gray-500 border-t">
            <div className="flex justify-between">
                <p>Prepared by: Mr. Muthomi (Choir Director)</p>
                <p className="font-bold">Total Members Ranked: {attendees.length}</p>
            </div>
            {generatedDate && (
              <p className="text-center text-xs mt-4">
                Generated on {format(generatedDate, 'PPp')}
              </p>
            )}
        </footer>
    </div>
  );
}
