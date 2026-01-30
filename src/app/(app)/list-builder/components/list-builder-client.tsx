'use client';
import { useState, useMemo } from 'react';
import type { Student } from '@/lib/types';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, Plus, Printer, Search, Trash2, Users, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    const [foundStudent, setFoundStudent] = useState<Student | null>(null);
    const [isFinding, setIsFinding] = useState(false);
    const [findError, setFindError] = useState<string | null>(null);

    const customListIds = useMemo(() => new Set(customList.map(s => s.id)), [customList]);

    const handleFindStudent = async () => {
        if (!searchTerm.trim() || !firestore) return;
        setIsFinding(true);
        setFoundStudent(null);
        setFindError(null);

        try {
            const docRef = doc(firestore, 'students', searchTerm.trim());
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const studentData = { id: docSnap.id, ...docSnap.data() } as Student;
                if (customListIds.has(studentData.id!)) {
                    setFindError(`${studentData.first_name} is already in the list.`);
                } else {
                    setFoundStudent(studentData);
                }
            } else {
                setFindError('No student found with that Admission Number.');
            }
        } catch (error) {
            console.error("Error finding student:", error);
            setFindError('An error occurred while searching.');
        } finally {
            setIsFinding(false);
        }
    };

    const handleAddStudent = (student: Student) => {
        if (student && !customListIds.has(student.id!)) {
            setCustomList(prev => [...prev, student]);
            setFoundStudent(null);
            setSearchTerm('');
            setFindError(null);
        }
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
            if (response.ok) {
                const blob = await response.blob();
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                doc.addImage(dataUrl, 'PNG', margin, cursorY, 20, 20);
            } else {
                 console.error("Could not load logo for PDF. Make sure the file exists at /public/images/school-logo.png.");
            }
        } catch (error) {
            console.error("An error occurred while trying to load the logo for the PDF:", error);
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

    const isLoading = authLoading;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Find and Add Students</CardTitle>
                        <CardDescription>Enter a student's Admission Number to find them and add them to your list.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-2">
                            <Input 
                                placeholder="Enter Admission No..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setFoundStudent(null);
                                    setFindError(null);
                                }}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleFindStudent()}}
                            />
                            <Button onClick={handleFindStudent} disabled={isFinding}>
                                {isFinding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                Find
                            </Button>
                        </div>
                        
                        {isFinding && <div className="flex justify-center items-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                        
                        {findError && <p className="text-sm text-destructive">{findError}</p>}

                        {foundStudent && (
                             <Card className="bg-muted">
                                <CardHeader>
                                    <CardTitle>Student Found</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold">{foundStudent.first_name} {foundStudent.last_name}</p>
                                            <p className="text-sm text-muted-foreground">{foundStudent.admission_number} - {foundStudent.class}</p>
                                        </div>
                                        <Button onClick={() => handleAddStudent(foundStudent)}>
                                            <Plus className="mr-2 h-4 w-4" /> Add to List
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
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
                                <p className="text-sm text-center text-muted-foreground py-4">No students added yet. Use the search to find and add students to the list.</p>
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
