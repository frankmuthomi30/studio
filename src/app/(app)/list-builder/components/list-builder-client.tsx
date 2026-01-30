'use client';
import { useState, useMemo } from 'react';
import type { Student } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Loader2, Plus, Printer, Trash2, Users, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import CustomListReport from './custom-list-report';

export default function ListBuilderClient() {
    const firestore = useFirestore();
    const { isUserLoading: authLoading } = useUser();
    const [customList, setCustomList] = useState<Student[]>([]);
    const [listTitle, setListTitle] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const studentsQuery = useMemoFirebase(() => 
        !authLoading && firestore ? query(collection(firestore, 'students'), orderBy('class'), orderBy('first_name')) : null
    , [firestore, authLoading]);
    const { data: allStudents, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

    const customListIds = useMemo(() => new Set(customList.map(s => s.id)), [customList]);

    const availableStudents = useMemo(() => {
        if (!allStudents) return [];
        const lowercasedFilter = searchTerm.toLowerCase();
        return allStudents.filter(student => {
            if (customListIds.has(student.id!)) return false;
            const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
            return fullName.includes(lowercasedFilter) || student.admission_number.includes(lowercasedFilter);
        });
    }, [allStudents, customListIds, searchTerm]);

    const handleAddStudent = (student: Student) => {
        setCustomList(prev => [...prev, student]);
    };

    const handleRemoveStudent = (studentId: string) => {
        setCustomList(prev => prev.filter(s => s.id !== studentId));
    };
    
    const handleClearList = () => {
        setCustomList([]);
    };

    const handleExportPdf = async () => {
        if (customList.length === 0) return;

        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const schoolLogoPath = '/images/school-logo.png';

        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let cursorY = margin;

        // --- PDF Header ---
        try {
            const response = await fetch(schoolLogoPath);
            const blob = await response.blob();
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            doc.addImage(dataUrl as string, 'PNG', margin, cursorY, 20, 20);
        } catch (error) {
            console.error("Could not load logo for PDF. Make sure /public/images/school-logo.png exists.", error);
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
        doc.text(listTitle || 'Custom Student List', pageWidth - margin, cursorY + 15, { align: 'right' });
    
        cursorY += 30;

        // --- Table ---
        (doc as any).autoTable({
            html: '#custom-list-report-table',
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

        // --- Footer ---
        let footerY = finalY + 40;
        if (footerY > pageHeight - 50) {
            doc.addPage();
            footerY = margin;
        }

        doc.setFont('times', 'normal');
        doc.setFontSize(10);
        doc.setLineWidth(0.2);

        const signatureWidth = (pageWidth - margin * 3) / 2;

        // Matron Signature
        doc.line(margin, footerY, margin + signatureWidth, footerY);
        doc.text("Matron Agnes", margin, footerY + 5);

        // School Stamp
        const stampX = pageWidth - margin - signatureWidth;
        const stampY = footerY - 15;
        doc.setLineDashPattern([2, 2], 0);
        doc.rect(stampX, stampY, signatureWidth, 20);
        doc.setLineDashPattern([], 0);
        doc.setTextColor(150);
        doc.text("(School Stamp)", stampX + signatureWidth / 2, stampY + 12, { align: 'center' });
        doc.setTextColor(0);

        const generatedOnText = `Generated on ${format(new Date(), 'PPp')}`;
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(generatedOnText, pageWidth / 2, pageHeight - 15, { align: 'center' });

        doc.save(`${listTitle.replace(/\s+/g, '-') || 'custom-list'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const isLoading = authLoading || studentsLoading;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>All Students</CardTitle>
                        <CardDescription>Search for students and add them to your custom list.</CardDescription>
                        <Input 
                            placeholder="Search by name or admission number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm mt-2"
                        />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                        ) : (
                            <div className="rounded-md border max-h-[60vh] overflow-y-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-muted z-10">
                                        <TableRow>
                                            <TableHead>Full Name</TableHead>
                                            <TableHead>Admission No.</TableHead>
                                            <TableHead>Class</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {availableStudents.length > 0 ? availableStudents.map(student => (
                                            <TableRow key={student.id}>
                                                <TableCell>{student.first_name} {student.last_name}</TableCell>
                                                <TableCell>{student.admission_number}</TableCell>
                                                <TableCell>{student.class}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant="outline" onClick={() => handleAddStudent(student)}>
                                                        <Plus className="mr-2 h-4 w-4" /> Add
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={4} className="h-24 text-center">No students found.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1">
                <Card className="lg:sticky top-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="text-primary"/>
                            Your Custom List
                        </CardTitle>
                        <CardDescription>
                            Review the students you've added. Give your list a title and print it as a PDF.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input 
                            placeholder="Enter list title..."
                            value={listTitle}
                            onChange={(e) => setListTitle(e.target.value)}
                        />
                        <Separator />
                         <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                            {customList.length > 0 ? customList.map(student => (
                                <div key={student.id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted">
                                    <div>
                                        <p className="font-medium">{student.first_name} {student.last_name}</p>
                                        <p className="text-xs text-muted-foreground">{student.admission_number} - {student.class}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => handleRemoveStudent(student.id!)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )) : (
                                <p className="text-sm text-center text-muted-foreground py-4">No students added yet.</p>
                            )}
                         </div>
                         <Separator />
                         <div className="flex justify-between items-center">
                            <p className="text-sm font-medium">Total: {customList.length}</p>
                            <Button variant="outline" size="sm" onClick={handleClearList} disabled={customList.length === 0}>
                                <Trash2 className="mr-2 h-4 w-4" /> Clear List
                            </Button>
                         </div>

                        <Button className="w-full" onClick={handleExportPdf} disabled={customList.length === 0}>
                            <Printer className="mr-2 h-4 w-4" />
                            Print PDF
                        </Button>
                    </CardContent>
                </Card>
            </div>
            <div className="hidden print-container">
                <CustomListReport students={customList} listTitle={listTitle} />
            </div>
        </div>
    );
}
