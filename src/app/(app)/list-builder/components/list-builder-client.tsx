'use client';
import { useState, useMemo, useTransition } from 'react';
import type { CustomList, Student } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, getDoc, orderBy } from 'firebase/firestore';
import { Loader2, Plus, Printer, Search, Check, Edit, ListPlus, Users, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { saveList } from '../actions';
import DeleteListButton from './delete-list-button';
import { PlaceHolderImages } from '@/lib/placeholder-images';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Editor component for a single list
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
type ListEditorProps = {
    list: CustomList;
    onBack: () => void;
}

function ListEditor({ list, onBack }: ListEditorProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [listTitle, setListTitle] = useState(list.title);
    const [studentAdmissionNumbers, setStudentAdmissionNumbers] = useState<string[]>(list.student_admission_numbers || []);
    
    // Search states
    const [searchTerm, setSearchTerm] = useState('');
    const [foundStudent, setFoundStudent] = useState<Student | null>(null);
    const [isFinding, setIsFinding] = useState(false);
    const [findError, setFindError] = useState<string | null>(null);

    // Fetch student details for the IDs in the list
    const studentsQuery = useMemoFirebase(() =>
        firestore && studentAdmissionNumbers.length > 0
        ? query(collection(firestore, 'students'), where('admission_number', 'in', studentAdmissionNumbers)) 
        : null
    , [firestore, studentAdmissionNumbers]);
    const { data: studentsInList, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);
    
    const handleFindStudent = async () => {
        if (!searchTerm.trim() || !firestore) return;
        setIsFinding(true);
        setFoundStudent(null);
        setFindError(null);

        try {
            if (studentAdmissionNumbers.includes(searchTerm.trim())) {
                setFindError('This student is already in the list.');
                return;
            }
            const docRef = doc(firestore, 'students', searchTerm.trim());
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setFoundStudent({ id: docSnap.id, ...docSnap.data() } as Student);
            } else {
                setFindError('No student found with that Admission Number.');
            }
        } catch (error) {
            setFindError('An error occurred while searching.');
        } finally {
            setIsFinding(false);
        }
    };

    const handleAddStudent = (student: Student) => {
        setStudentAdmissionNumbers(prev => [...prev, student.admission_number]);
        setFoundStudent(null);
        setSearchTerm('');
        setFindError(null);
    };

    const handleRemoveStudent = (admissionNumber: string) => {
        setStudentAdmissionNumbers(prev => prev.filter(id => id !== admissionNumber));
    };

    const handleSaveList = () => {
        startTransition(async () => {
            const result = await saveList({
                id: list.id,
                title: listTitle,
                student_admission_numbers: studentAdmissionNumbers,
            });

            if (result.success) {
                toast({ title: 'Success!', description: result.message });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };

    const handleExportPdf = async () => {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let cursorY = margin;
        
        // --- PDF Header ---
        if (schoolLogo?.imageUrl) {
            try {
                doc.addImage(schoolLogo.imageUrl, 'PNG', margin, cursorY, 20, 20);
            } catch (error) {
                console.error("An error occurred while trying to add the logo image to the PDF:", error);
                 console.error("Could not load logo for PDF. This might happen on local machines if the base64 string is too large or malformed.");
            }
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
        doc.text(listTitle, pageWidth - margin, cursorY + 15, { align: 'right' });
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Custom Student List", pageWidth - margin, cursorY + 20, { align: 'right' });
        doc.setTextColor(0);
    
        cursorY += 35;

        (doc as any).autoTable({
            head: [['#', 'Admission No.', 'Full Name', 'Class', 'Signature']],
            body: (studentsInList || []).map((s, i) => [i + 1, s.admission_number, `${s.first_name} ${s.last_name}`, s.class, '']),
            startY: cursorY,
            theme: 'grid',
            headStyles: { fillColor: '#107C41', textColor: 255, font: 'times', fontStyle: 'bold' },
            styles: { font: 'times', fontStyle: 'normal', cellPadding: 2 },
            margin: { left: margin, right: margin }
        });

        const finalY = (doc as any).lastAutoTable.finalY;

        let footerY = finalY + 40;
        if (footerY > pageHeight - 50) {
            doc.addPage();
            footerY = margin;
        }

        doc.setFont('times', 'normal');
        doc.setFontSize(10);
        doc.setLineWidth(0.2);

        const signatureWidth = (pageWidth - margin * 3) / 2;
        doc.line(margin, footerY, margin + signatureWidth, footerY);
        doc.text("Matron Agnes", margin, footerY + 5);

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

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <Button variant="outline" onClick={onBack}>
                    <X className="mr-2" /> Back to All Lists
                </Button>
                <div className="flex gap-2">
                    <Button onClick={handleSaveList} disabled={isPending}>
                        {isPending ? <Loader2 className="animate-spin" /> : <Check className="mr-2"/>} Save Changes
                    </Button>
                    <Button variant="secondary" onClick={handleExportPdf} disabled={(studentsInList || []).length === 0}>
                        <Printer className="mr-2" /> Print PDF
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle>List Details</CardTitle></CardHeader>
                <CardContent>
                    <Input 
                        placeholder="Enter list title..."
                        value={listTitle}
                        onChange={(e) => setListTitle(e.target.value)}
                        className="text-lg"
                    />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Find and Add Student</CardTitle>
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
                                <Button onClick={handleFindStudent} disabled={isFinding} size="icon"><Search/></Button>
                            </div>
                            
                            {isFinding && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                            {findError && <p className="text-sm text-destructive">{findError}</p>}

                            {foundStudent && (
                                <div className="p-3 bg-muted rounded-md text-sm space-y-3">
                                    <p><span className="font-semibold">Found:</span> {foundStudent.first_name} {foundStudent.last_name} ({foundStudent.class})</p>
                                    <Button size="sm" className="w-full" onClick={() => handleAddStudent(foundStudent)}>
                                        <Plus className="mr-2 h-4 w-4" /> Add to List
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                Students in List
                                <span className="text-primary font-bold">{studentAdmissionNumbers.length}</span>
                            </CardTitle>
                            <CardDescription>
                                Review the students you've added to this list.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="space-y-2 max-h-96 overflow-y-auto pr-2 border rounded-lg">
                                {studentsLoading && <div className="flex justify-center p-4"><Loader2 className="animate-spin"/></div>}
                                {!studentsLoading && (studentsInList || []).length > 0 ? (studentsInList || []).map(student => (
                                    <div key={student.id} className="flex items-center justify-between text-sm p-2 hover:bg-muted">
                                        <div>
                                            <p className="font-medium">{student.first_name} {student.last_name}</p>
                                            <p className="text-xs text-muted-foreground">{student.admission_number} - {student.class}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => handleRemoveStudent(student.admission_number)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )) : !studentsLoading && (
                                    <p className="text-sm text-center text-muted-foreground p-8">No students added yet.</p>
                                )}
                             </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Main client component to manage all lists
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
export default function ListBuilderClient() {
    const firestore = useFirestore();
    const { isUserLoading: authLoading } = useUser();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // State for view
    const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
    const [selectedList, setSelectedList] = useState<CustomList | null>(null);
    
    // Dialog for creating a new list
    const [newListTitle, setNewListTitle] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // Data fetching
    const listsQuery = useMemoFirebase(() => 
        !authLoading && firestore ? query(collection(firestore, 'custom_lists'), orderBy('title', 'asc')) : null
    , [firestore, authLoading]);
    const { data: lists, isLoading: listsLoading } = useCollection<CustomList>(listsQuery);

    const handleCreateList = () => {
        if (!newListTitle.trim()) {
            toast({ variant: 'destructive', title: 'Title is required.' });
            return;
        }
        startTransition(async () => {
            const result = await saveList({ title: newListTitle });
            if (result.success && result.id) {
                toast({ title: 'Success!', description: `List '${newListTitle}' created.` });
                // Immediately switch to editing the new list
                setSelectedList({ id: result.id, title: newListTitle, student_admission_numbers: [] });
                setViewMode('edit');
                setIsCreateDialogOpen(false);
                setNewListTitle('');
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };

    const handleEditList = (list: CustomList) => {
        setSelectedList(list);
        setViewMode('edit');
    };
    
    const isLoading = authLoading || listsLoading;

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~ RENDER LOGIC ~~~~~~~~~~~~~~~~~~~~~~~~~~

    if (viewMode === 'edit' && selectedList) {
        return <ListEditor list={selectedList} onBack={() => { setViewMode('list'); setSelectedList(null); }} />;
    }

    return (
        <div>
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-6">
                     <div className="flex justify-end">
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <ListPlus className="mr-2"/>
                            Create New List
                        </Button>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {(lists || []).length > 0 ? (lists || []).map(list => (
                           <Card key={list.id} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="text-primary"/> {list.title}
                                    </CardTitle>
                                    <CardDescription>Contains {list.student_admission_numbers?.length || 0} students.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow" />
                                <CardFooter className="flex justify-between items-center">
                                    <DeleteListButton listId={list.id} listTitle={list.title} />
                                    <Button onClick={() => handleEditList(list)}>
                                        <Edit className="mr-2 h-4 w-4"/>
                                        Manage List
                                    </Button>
                                </CardFooter>
                           </Card>
                        )) : (
                          <div className="col-span-full text-center py-12 text-muted-foreground border rounded-lg">
                              <h3 className="text-xl font-semibold">No Custom Lists Found</h3>
                              <p className="mt-2">Get started by creating your first list.</p>
                          </div>
                        )}
                    </div>
                </div>
            )}

            {/* Dialog for creating a new list */}
            {isCreateDialogOpen && (
                 <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Create New List</CardTitle>
                            <CardDescription>Give your new list a name. You can add students in the next step.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <Input 
                                placeholder="e.g., Form 4 Trip to Nairobi"
                                value={newListTitle}
                                onChange={(e) => setNewListTitle(e.target.value)}
                                autoFocus
                            />
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateList} disabled={isPending}>
                               {isPending && <Loader2 className="animate-spin mr-2"/>} Create & Continue
                            </Button>
                        </CardFooter>
                    </Card>
                 </div>
            )}
        </div>
    );
}
