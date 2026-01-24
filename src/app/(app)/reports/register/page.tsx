'use client';
import PageHeader from '@/components/page-header';
import RegisterReport from '../components/register-report';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Printer, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from "date-fns"
import { cn } from '@/lib/utils';
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Choir } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RegisterReportPage() {
    const firestore = useFirestore();
    const { isUserLoading: authLoading } = useUser();
    const [date, setDate] = useState<DateRange | undefined>()
    const [selectedChoirId, setSelectedChoirId] = useState<string | null>(null);
    const [reportFilters, setReportFilters] = useState<{dateRange?: DateRange, choirId?: string, choirName?: string}>({});

    const { data: choirs, isLoading: choirsLoading } = useCollection<Choir>(
        useMemoFirebase(() => !authLoading && firestore ? query(collection(firestore, 'choirs'), orderBy('name', 'asc')) : null, [firestore, authLoading])
    );

    const handleGenerate = () => {
        const choir = choirs?.find(c => c.id === selectedChoirId);
        setReportFilters({ dateRange: date, choirId: selectedChoirId ?? undefined, choirName: choir?.name });
    }

    const handlePrint = () => {
        window.print();
    }

    const handleExportPdf = () => {
        const reportElement = document.getElementById('register-report');
        if (!reportFilters.dateRange?.from || !reportElement || !reportFilters.choirId) return;

        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');

        const sessionTitle = reportElement?.querySelector('h3')?.innerText;
        const sessionSubtitle = reportElement?.querySelector('h3 + p')?.innerText;
        const totalPresentText = reportElement?.querySelector('#total-present')?.innerText;

        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let cursorY = margin;

        // --- PDF Header ---
        if (schoolLogo?.imageUrl) {
            doc.addImage(schoolLogo.imageUrl, 'PNG', margin, cursorY, 20, 20);
        }
        doc.setFont('times', 'bold');
        doc.setFontSize(20);
        doc.text("GATURA GIRLS", margin + 25, cursorY + 7);
    
        doc.setFont('times', 'normal');
        doc.setFontSize(9);
        doc.text("30-01013, Muranga.", margin + 25, cursorY + 12);
        doc.text("gaturagirls@gmail.com", margin + 25, cursorY + 16);
        doc.text("https://stteresagaturagirls.sc.ke/", margin + 25, cursorY + 20);
        doc.text("0793328863", margin + 25, cursorY + 24);
        
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.text("Full Choir Attendance Register", pageWidth - margin, cursorY + 15, { align: 'right' });
    
        cursorY += 30;

        // --- Session Info ---
        if (sessionTitle) {
            doc.setFont('times', 'bold');
            doc.setFontSize(12);
            doc.text(sessionTitle, pageWidth / 2, cursorY, { align: 'center' });
            cursorY += 5;
        }
        if (sessionSubtitle) {
            doc.setFont('times', 'italic');
            doc.setFontSize(10);
            doc.text(sessionSubtitle, pageWidth / 2, cursorY, { align: 'center' });
            cursorY += 7;
        }

        // --- Table ---
        (doc as any).autoTable({
            html: '#register-report-table',
            startY: cursorY,
            theme: 'grid',
            headStyles: {
                fillColor: '#107C41',
                textColor: 255,
                font: 'times',
                fontStyle: 'bold'
            },
            styles: {
                font: 'times',
                fontStyle: 'normal',
                cellPadding: 2,
            },
            margin: { left: margin, right: margin }
        });

        const finalY = (doc as any).lastAutoTable.finalY;

        // --- Summary ---
        if (totalPresentText) {
            doc.setFont('times', 'bold');
            doc.setFontSize(12);
            doc.text(totalPresentText, margin, finalY + 10);
        }

        // --- Footer ---
        const footerY = pageHeight - 20;
        doc.setFont('times', 'normal');
        doc.setFontSize(10);

        const preparedBy = "Prepared by: Mr. Muthomi (Choir Director)";
        doc.text(preparedBy, margin, footerY);

        const pageNumText = `Page 1 of 1`;
        doc.text(pageNumText, pageWidth - margin, footerY, { align: 'right' });

        const generatedOnText = `Generated on ${format(new Date(), 'PPp')}`;
        doc.setFontSize(9);
        doc.setTextColor(150); // a gray color
        doc.text(generatedOnText, pageWidth / 2, footerY + 8, { align: 'center' });

        doc.save(`Gatura-Girls-Choir-Register-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const isLoading = choirsLoading || authLoading;

  return (
    <>
      <PageHeader
        title="Full Choir Attendance Register"
        subtitle="Generate a register for a specific choir and date range."
      />
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Report Filters</CardTitle>
                <CardDescription>Select filters to generate the register. The report will be based on the first session found in the selected range.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
                {isLoading ? <Loader2 className="animate-spin" /> : (
                    <>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Choir</label>
                            <Select onValueChange={setSelectedChoirId} value={selectedChoirId ?? undefined}>
                                <SelectTrigger className="w-full sm:w-auto sm:min-w-[250px]">
                                    <SelectValue placeholder="Select a choir..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {choirs?.map(choir => (
                                        <SelectItem key={choir.id} value={choir.id}>
                                            {choir.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Date range</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                    "w-[300px] justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                    date.to ? (
                                        <>
                                        {format(date.from, "LLL dd, y")} -{" "}
                                        {format(date.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(date.from, "LLL dd, y")
                                    )
                                    ) : (
                                    <span>Pick a date range</span>
                                    )}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Button onClick={handleGenerate} disabled={!date?.from || !selectedChoirId}>
                            <Search className="mr-2 h-4 w-4" />
                            Generate Report
                        </Button>
                        <div className="ml-auto flex gap-2">
                            <Button variant="outline" onClick={handlePrint} disabled={!reportFilters.dateRange?.from}>
                                <Printer className="mr-2 h-4 w-4" />
                                Print
                            </Button>
                            <Button variant="outline" onClick={handleExportPdf} disabled={!reportFilters.dateRange?.from}>
                                <Download className="mr-2 h-4 w-4" />
                                Export PDF
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>

        <div className="print-container">
           <RegisterReport filters={reportFilters} />
        </div>
      </div>
    </>
  );
}
