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
        if (!date?.from) return;

        const doc = new jsPDF({ orientation: "landscape" });

        const schoolName = "Gatura Girls High School";
        const reportTitle = "Full Choir Attendance Register";
        const dateRange = `Date Range: ${format(date.from, "MMM dd, yyyy")} - ${date.to ? format(date.to, "MMM dd, yyyy") : format(date.from, "MMM dd, yyyy")}`;

        doc.setFontSize(18);
        doc.text(schoolName, 14, 20);
        doc.setFontSize(14);
        doc.text(reportTitle, 14, 28);
        doc.setFontSize(10);
        doc.text(dateRange, 14, 34);

        (doc as any).autoTable({
            html: '#register-report-table',
            startY: 40,
            theme: 'grid',
            headStyles: {
                fillColor: '#107C41' // green theme color
            },
        });

        doc.save(`Gatura-Girls-Choir-Register-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

  return (
    <>
      <PageHeader
        title="Full Choir Attendance Register"
        subtitle="Generate a register for a specific date range, class, or term."
      />
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Report Filters</CardTitle>
                <CardDescription>Select filters to generate the register.</CardDescription>
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
                <Button onClick={handleGenerate}>
                    <Search className="mr-2 h-4 w-4" />
                    Generate Report
                </Button>
                <div className="ml-auto flex gap-2">
                    <Button variant="outline" onClick={handlePrint}>
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
