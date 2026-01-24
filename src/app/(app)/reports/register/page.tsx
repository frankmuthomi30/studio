'use client';
import PageHeader from '@/components/page-header';
import RegisterReport from '../components/register-report';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from "date-fns"
import { cn } from '@/lib/utils';
import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


export default function RegisterReportPage() {
    const [date, setDate] = React.useState<DateRange | undefined>()
    const [reportFilters, setReportFilters] = React.useState<{dateRange?: DateRange}>({});

    const handleGenerate = () => {
        setReportFilters({ dateRange: date });
    }

    const handlePrint = () => {
        window.print();
    }

    const handleExportPdf = () => {
        const reportElement = document.getElementById('register-report');
        if (!reportFilters.dateRange?.from || !reportElement) return;

        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

        const schoolName = "Gatura Girls High School";
        const reportTitleText = "Full Choir Attendance Register";

        const sessionTitle = reportElement?.querySelector('h3')?.innerText;
        const sessionSubtitle = reportElement?.querySelector('h3 + p')?.innerText;
        const totalPresentText = reportElement?.querySelector('#total-present')?.innerText;

        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;

        // --- PDF Header ---
        doc.setFont('times', 'bold');
        doc.setFontSize(18);
        doc.text(schoolName, pageWidth / 2, margin, { align: 'center' });

        doc.setFont('times', 'normal');
        doc.setFontSize(14);
        doc.text(reportTitleText, pageWidth / 2, margin + 8, { align: 'center' });

        // --- Session Info ---
        if (sessionTitle) {
            doc.setFont('times', 'bold');
            doc.setFontSize(12);
            doc.text(sessionTitle, pageWidth / 2, margin + 20, { align: 'center' });
        }
        if (sessionSubtitle) {
            doc.setFont('times', 'italic');
            doc.setFontSize(10);
            doc.text(sessionSubtitle, pageWidth / 2, margin + 25, { align: 'center' });
        }

        // --- Table ---
        (doc as any).autoTable({
            html: '#register-report-table',
            startY: margin + 32,
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

  return (
    <>
      <PageHeader
        title="Full Choir Attendance Register"
        subtitle="Generate a register for a specific date range."
      />
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Report Filters</CardTitle>
                <CardDescription>Select filters to generate the register. The report will be based on the first session found in the selected range.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
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
                <Button onClick={handleGenerate} disabled={!date?.from}>
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
            </CardContent>
        </Card>

        <div className="print-container">
           <RegisterReport filters={reportFilters} />
        </div>
      </div>
    </>
  );
}
