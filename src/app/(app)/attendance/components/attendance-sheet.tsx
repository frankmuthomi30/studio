'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Student, AttendanceSession } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Check, X, Loader2, UserPlus, UserX, Printer, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

type AttendanceSheetProps = {
  session: Omit<AttendanceSession, 'date' | 'recorded_at' | 'uploaded_at'> & { date: Date };
  activeChoirStudents: Student[];
  onSave: (attendanceMap: Record<string, boolean>) => void;
  onCancel: () => void;
  isSaving: boolean;
};

export default function AttendanceSheet({ session, activeChoirStudents, onSave, onCancel, isSaving }: AttendanceSheetProps) {
  const [presentAdmissionNumbers, setPresentAdmissionNumbers] = useState<Set<string>>(() => {
    return new Set(
        Object.entries(session.attendance_map || {})
            .filter(([, isPresent]) => isPresent)
            .map(([admissionNumber]) => admissionNumber)
    );
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [preparerName, setPreparerName] = useState('Mr. Muthomi (Choir Director)');
  
  const foundStudent = useMemo(() => {
    if (!searchTerm) return null;
    return activeChoirStudents.find(m => m.admission_number.toLowerCase() === searchTerm.toLowerCase());
  }, [searchTerm, activeChoirStudents]);

  const presentStudents = useMemo(() => {
    return activeChoirStudents
      .filter(m => presentAdmissionNumbers.has(m.admission_number))
      .sort((a, b) => (a.admission_number || '').localeCompare(b.admission_number || '', undefined, { numeric: true }));
  }, [presentAdmissionNumbers, activeChoirStudents]);

  const handleMarkPresent = () => {
    if (foundStudent && !presentAdmissionNumbers.has(foundStudent.admission_number)) {
      setPresentAdmissionNumbers(prev => new Set(prev).add(foundStudent.admission_number));
      setSearchTerm('');
    }
  };

  const handleRemove = (admissionNumber: string) => {
    setPresentAdmissionNumbers(prev => {
      const newSet = new Set(prev);
      newSet.delete(admissionNumber);
      return newSet;
    });
  };

  const handleSave = () => {
    const attendanceMap = activeChoirStudents.reduce((acc, member) => {
      acc[member.admission_number] = presentAdmissionNumbers.has(member.admission_number);
      return acc;
    }, {} as Record<string, boolean>);
    onSave(attendanceMap);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');
    const now = new Date();
    const serialNumber = `GGHS/${format(now, 'yyyyMMdd')}/${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Serial: ${serialNumber}`, pageWidth - margin, 8, { align: 'right' });
    doc.text(`Generated: ${format(now, 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, 11, { align: 'right' });
    doc.setTextColor(0);

    let cursorY = 12;

    if (schoolLogo?.imageUrl) {
        try {
            doc.addImage(schoolLogo.imageUrl, 'PNG', margin, cursorY, 18, 18);
        } catch (e) {
            console.error("Error adding logo to PDF:", e);
        }
    }
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.text("GATURA GIRLS", margin + 22, cursorY + 6);

    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text("30-01013, Muranga.", margin + 22, cursorY + 10);
    doc.text("gaturagirls@gmail.com | 0793328863", margin + 22, cursorY + 14);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.text("Attendance Register", pageWidth - margin, cursorY + 8, { align: 'right' });

    cursorY += 22;

    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text(`${session.choirName} - ${session.practice_type}`, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 5;
    doc.setFont('times', 'normal');
    doc.text(format(session.date, 'EEEE, MMMM d, yyyy'), pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 8;

    // Row mapping - students already sorted by admission number in useMemo
    const tableRows = presentStudents.map(s => [
        s.admission_number,
        `${s.first_name} ${s.last_name}`,
        `${s.class} ${s.stream || ''}`.trim()
    ]);

    (doc as any).autoTable({
        head: [['Adm. No.', 'Full Name', 'Class']],
        body: tableRows,
        startY: cursorY,
        theme: 'grid',
        headStyles: { fillColor: '#107C41', textColor: 255, font: 'times', fontStyle: 'bold' },
        styles: { font: 'times', fontStyle: 'normal', cellPadding: 1.5, fontSize: 9 },
        margin: { left: margin, right: margin },
        didDrawPage: (data: any) => {
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setFont('times', 'normal');
            doc.setTextColor(150);
            const generatedOnText = `Generated by Gatura Hub on ${format(now, 'PPPP')}, at ${format(now, 'p')} — Page ${data.pageNumber} of ${pageCount}`;
            doc.text(generatedOnText, pageWidth / 2, pageHeight - 8, { align: 'center' });
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Total Present: ${presentStudents.length} / ${activeChoirStudents.length}`, margin, finalY + 10);

    const footerY = pageHeight - 20;
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.line(margin, footerY, margin + 50, footerY);
    doc.text(preparerName, margin, footerY + 4);

    doc.save(`Attendance-${session.practice_type.replace(/\s+/g, '-')}-${format(session.date, 'yyyy-MM-dd')}.pdf`);
  };
  
  const presentCount = presentAdmissionNumbers.size;
  const totalCount = activeChoirStudents.length;

  return (
    <Card className="print-container">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <CardTitle>Attendance for: {session.practice_type}</CardTitle>
                <CardDescription>{format(session.date, 'EEEE, MMMM d, yyyy')}</CardDescription>
                <div className="flex gap-2 pt-2 no-print">
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPdf}>
                        <FileDown className="mr-2 h-4 w-4" /> Export PDF
                    </Button>
                </div>
            </div>
            <div className="text-right">
                <p className="text-2xl font-bold text-primary">{presentCount} / {totalCount}</p>
                <p className="text-sm text-muted-foreground">Present</p>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="no-print space-y-4">
            <div className="grid gap-2 max-w-sm">
                <Label>Report Preparer Name</Label>
                <Input 
                    value={preparerName} 
                    onChange={(e) => setPreparerName(e.target.value)}
                    placeholder="e.g. Mr. Muthomi"
                />
            </div>
            
            <Separator />

            <div>
                <h3 className="text-lg font-medium mb-2">Mark Attendance</h3>
                <div className="flex items-start gap-2">
                    <div className="grid gap-1.5 flex-grow">
                        <Input
                            placeholder="Enter Admission No..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleMarkPresent()}}
                        />
                        {searchTerm && !foundStudent && <p className="text-xs text-destructive">No active choir member found with this Admission No.</p>}
                        {foundStudent && presentAdmissionNumbers.has(foundStudent.admission_number) && <p className="text-xs text-blue-600">{foundStudent.first_name} {foundStudent.last_name} is already marked present.</p>}
                    </div>
                    <Button onClick={handleMarkPresent} disabled={!foundStudent || presentAdmissionNumbers.has(foundStudent.admission_number)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Mark Present
                    </Button>
                </div>
                {foundStudent && !presentAdmissionNumbers.has(foundStudent.admission_number) && (
                    <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                       <p><span className="font-semibold">Found:</span> {foundStudent.first_name} {foundStudent.last_name} ({foundStudent.class} {foundStudent.stream || ''})</p>
                    </div>
                )}
            </div>
        </div>

        <div className="space-y-4">
            <h3 className="text-lg font-medium">Present Students ({presentStudents.length})</h3>
            <div className="rounded-md border max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right no-print">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {presentStudents.length > 0 ? presentStudents.map(member => (
                    <TableRow key={member.admission_number}>
                      <TableCell>{member.admission_number}</TableCell>
                      <TableCell className="font-medium">{`${member.first_name} ${member.last_name}`}</TableCell>
                      <TableCell>{member.class} {member.stream || ''}</TableCell>
                      <TableCell className="text-right no-print">
                          <Button variant="ghost" size="sm" onClick={() => handleRemove(member.admission_number)}>
                            <UserX className="mr-2 h-4 w-4"/> Undo
                          </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            No students marked present yet. Use the search bar to find and mark students.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-4 no-print">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          {isSaving ? 'Saving...' : 'Save Session'}
        </Button>
      </CardFooter>
    </Card>
  );
}
