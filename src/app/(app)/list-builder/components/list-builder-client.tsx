'use client';
import { useState, useMemo, useTransition, useEffect } from 'react';
import type { CustomList, Student, ListSection } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, getDoc, getDocs, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Plus, Printer, Search, Edit, ListPlus, Users, X, Check, CalendarIcon, Trash2, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import DeleteListButton from './delete-list-button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { saveList } from '../actions';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Editor component for a single list
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
type ListEditorProps = {
    list: CustomList;
    onBack: () => void;
}

function ListEditor({ list, onBack }: ListEditorProps) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [listTitle, setListTitle] = useState(list.title);
    const [preparedBy, setPreparedBy] = useState(list.prepared_by || '');
    const [eventDate, setEventDate] = useState<Date | undefined>(
        list.event_date ? list.event_date.toDate() : undefined
    );
    
    // Initialize sections with legacy support
    const [sections, setSections] = useState<ListSection[]>(() => {
        if (list.sections && list.sections.length > 0) return list.sections;
        const legacyStudents = list.student_admission_numbers || [];
        return [{ 
            id: 'default', 
            title: 'Main List', 
            student_admission_numbers: legacyStudents 
        }];
    });

    const [activeSectionId, setActiveSectionId] = useState<string>(sections[0].id);
    
    // Search states
    const [searchTerm, setSearchTerm] = useState('');
    const [foundStudents, setFoundStudents] = useState<Student[] | null>(null);
    const [isFinding, setIsFinding] = useState(false);
    const [findError, setFindError] = useState<string | null>(null);
    const [showQuickAdd, setShowQuickAdd] = useState(false);

    // Quick Add Form States
    const [quickFirstName, setQuickFirstName] = useState('');
    const [quickLastName, setQuickLastName] = useState('');
    const [quickClass, setQuickClass] = useState('');
    const [isQuickAdding, setIsQuickAdding] = useState(false);

    // Fetch student details for all sections (unique IDs for fetching)
    const allAdmissionNumbers = useMemo(() => {
        return Array.from(new Set(sections.flatMap(s => s.student_admission_numbers)));
    }, [sections]);

    const [studentsMap, setStudentsMap] = useState<Map<string, Student>>(new Map());
    const [studentsLoading, setStudentsLoading] = useState(false);

    useEffect(() => {
        if (!firestore || allAdmissionNumbers.length === 0) {
            setStudentsMap(new Map());
            return;
        }

        const fetchStudentsInChunks = async () => {
            setStudentsLoading(true);
            const newMap = new Map<string, Student>();
            const chunks: string[][] = [];
            
            for (let i = 0; i < allAdmissionNumbers.length; i += 30) {
                chunks.push(allAdmissionNumbers.slice(i, i + 30));
            }

            try {
                const queryPromises = chunks.map(chunk => {
                    if (chunk.length > 0) {
                        const q = query(collection(firestore, 'students'), where('admission_number', 'in', chunk));
                        return getDocs(q);
                    }
                    return Promise.resolve(null);
                });

                const querySnapshots = await Promise.all(queryPromises);

                for (const querySnapshot of querySnapshots) {
                    if (querySnapshot) {
                        querySnapshot.forEach((doc) => {
                            const student = { id: doc.id, ...doc.data() } as Student;
                            newMap.set(student.admission_number, student);
                        });
                    }
                }
                setStudentsMap(newMap);
            } catch (error) {
                console.error("Error fetching students in chunks:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load student details.' });
            } finally {
                setStudentsLoading(false);
            }
        };

        fetchStudentsInChunks();
    }, [firestore, allAdmissionNumbers, toast]);
    
    const handleFindStudent = async () => {
        if (!searchTerm.trim() || !firestore) return;
        setIsFinding(true);
        setFoundStudents(null);
        setFindError(null);
        setShowQuickAdd(false);
        const term = searchTerm.trim();
        const capitalizedTerm = term.charAt(0).toUpperCase() + term.slice(1);
    
        try {
            const found: Student[] = [];
            const foundIds = new Set<string>();
    
            const docRef = doc(firestore, 'students', term);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const student = { id: docSnap.id, ...docSnap.data() } as Student;
                found.push(student);
                foundIds.add(student.id!);
            }
    
            const searchTerms = Array.from(new Set([term, capitalizedTerm]));
            for (const st of searchTerms) {
                const qFirstName = query(
                    collection(firestore, 'students'),
                    where('first_name', '>=', st),
                    where('first_name', '<=', st + '\uf8ff')
                );
                const firstNameSnap = await getDocs(qFirstName);
                firstNameSnap.forEach(doc => {
                    const student = { id: doc.id, ...doc.data() } as Student;
                    if (!foundIds.has(student.id!)) {
                        found.push(student);
                        foundIds.add(student.id!);
                    }
                });
    
                const qLastName = query(
                    collection(firestore, 'students'),
                    where('last_name', '>=', st),
                    where('last_name', '<=', st + '\uf8ff')
                );
                const lastNameSnap = await getDocs(qLastName);
                lastNameSnap.forEach(doc => {
                    const student = { id: doc.id, ...doc.data() } as Student;
                    if (!foundIds.has(student.id!)) {
                        found.push(student);
                        foundIds.add(student.id!);
                    }
                });
            }
    
            if (found.length > 0) {
                const activeSection = sections.find(s => s.id === activeSectionId);
                const newResults = found.filter(s => !activeSection?.student_admission_numbers.includes(s.admission_number));
                
                if (newResults.length > 0) {
                    setFoundStudents(newResults);
                } else {
                     setFindError('Matching students are already in this specific section.');
                }
            } else {
                 setFindError('No student found with that Admission Number or Name.');
                 if (/^\d+$/.test(term)) {
                    setShowQuickAdd(true);
                 }
            }
        } catch (error) {
            setFindError('An error occurred while searching.');
            console.error(error);
        } finally {
            setIsFinding(false);
        }
    };

    const handleQuickAdd = async () => {
        if (!firestore || !user) return;
        if (!quickFirstName || !quickLastName || !quickClass) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill in all student details.' });
            return;
        }

        setIsQuickAdding(true);
        const newStudent: Student = {
            admission_number: searchTerm.trim(),
            first_name: quickFirstName,
            last_name: quickLastName,
            class: quickClass,
            uploaded_at: serverTimestamp() as any,
            uploaded_by: user.uid
        };

        const studentRef = doc(firestore, 'students', newStudent.admission_number);

        try {
            await setDoc(studentRef, newStudent);
            setStudentsMap(prev => {
                const next = new Map(prev);
                next.set(newStudent.admission_number, newStudent);
                return next;
            });
            handleAddStudent(newStudent, activeSectionId);
            toast({ title: 'Student Created', description: `${quickFirstName} has been added to the database and your list.` });
            setQuickFirstName('');
            setQuickLastName('');
            setQuickClass('');
            setShowQuickAdd(false);
            setSearchTerm('');
        } catch (error: any) {
            const contextualError = new FirestorePermissionError({
                path: studentRef.path,
                operation: 'create',
                requestResourceData: newStudent,
            });
            errorEmitter.emit('permission-error', contextualError);
        } finally {
            setIsQuickAdding(false);
        }
    };

    const handleAddStudent = (student: Student, sectionId: string) => {
        setSections(prev => prev.map(s => {
            if (s.id === sectionId) {
                // Prevent duplicate in the SAME section
                if (s.student_admission_numbers.includes(student.admission_number)) return s;
                return { ...s, student_admission_numbers: [...s.student_admission_numbers, student.admission_number] };
            }
            return s;
        }));
        setFoundStudents(prev => prev ? prev.filter(s => s.id !== student.id) : null);
        setFindError(null);
    };

    const handleRemoveStudent = (admissionNumber: string, sectionId: string) => {
        setSections(prev => prev.map(s => {
            if (s.id === sectionId) {
                return { ...s, student_admission_numbers: s.student_admission_numbers.filter(id => id !== admissionNumber) };
            }
            return s;
        }));
    };

    const handleAddSection = () => {
        const newId = `section-${Date.now()}`;
        setSections(prev => [...prev, { id: newId, title: `New Section ${prev.length + 1}`, student_admission_numbers: [] }]);
        setActiveSectionId(newId);
    };

    const handleRemoveSection = (sectionId: string) => {
        if (sections.length <= 1) {
            toast({ variant: 'destructive', title: 'Error', description: 'A list must have at least one section.' });
            return;
        }
        setSections(prev => {
            const filtered = prev.filter(s => s.id !== sectionId);
            if (activeSectionId === sectionId) {
                setActiveSectionId(filtered[0].id);
            }
            return filtered;
        });
    };

    const handleUpdateSectionTitle = (sectionId: string, title: string) => {
        setSections(prev => prev.map(s => s.id === sectionId ? { ...s, title } : s));
    };

    const handleSaveList = () => {
        startTransition(async () => {
            const result = await saveList({
                id: list.id,
                title: listTitle,
                prepared_by: preparedBy,
                sections: sections,
                event_date: eventDate,
            });

            if (result.success) {
                toast({ title: 'Success!', description: result.message });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };

    const handleExportPdf = async () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;

        // Count TOTAL rows across all sections to determine stamp placement
        const totalRowsCount = sections.reduce((acc, s) => acc + s.student_admission_numbers.length, 0);
        const sectionCount = sections.length;
        
        // Header stamp logic:
        // 1. Total rows exactly 23-25 (one-page space optimization)
        // 2. ONLY if there are 5 or fewer sub-sections (requested rule)
        const useHeaderStamp = (totalRowsCount >= 23 && totalRowsCount <= 25) && (sectionCount <= 5);

        const drawPageFooter = (data: any) => {
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(150);
            const generatedOnText = `Generated on ${format(new Date(), 'PPp')}`;
            const pageNumText = `Page ${data.pageNumber} of ${pageCount}`;
            doc.text(generatedOnText, margin, pageHeight - 8);
            doc.text(pageNumText, pageWidth - margin, pageHeight - 8, { align: 'right' });
        };

        // --- PDF Header ---
        if (schoolLogo?.imageUrl) {
            try {
                doc.addImage(schoolLogo.imageUrl, 'PNG', margin, 15, 20, 20);
            } catch (error) { console.error(error); }
        }
        doc.setFont('times', 'bold');
        doc.setFontSize(18);
        doc.text('GATURA GIRLS', margin + 25, 15 + 7);
        doc.setFont('times', 'normal');
        doc.setFontSize(9);
        doc.text('30-01013, Muranga.', margin + 25, 15 + 12);
        doc.text('gaturagirls@gmail.com', margin + 25, 15 + 16);
        doc.text('0793328863', margin + 25, 15 + 20);

        // --- Official Stamp Box at Top Right (Conditional) ---
        if (useHeaderStamp) {
            const stampBoxWidth = 50;
            const stampBoxHeight = 25;
            const stampX = pageWidth - margin - stampBoxWidth;
            const stampY = 15;
            
            doc.setLineWidth(0.2);
            doc.rect(stampX, stampY, stampBoxWidth, stampBoxHeight);
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text('OFFICIAL SCHOOL STAMP', stampX + stampBoxWidth / 2, stampY + 6, { align: 'center' });
            doc.text('Sign & Date Inside', stampX + stampBoxWidth / 2, stampY + 14, { align: 'center' });
            
            doc.setTextColor(0);
            doc.setFontSize(9);
            doc.setFont('times', 'bold');
            doc.text(`By: ${preparedBy || 'Matron'}`, stampX, stampY + stampBoxHeight + 5);
        }

        doc.setLineWidth(0.5);
        doc.line(margin, 46, pageWidth - margin, 46);
        
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        const titleLines = doc.splitTextToSize(listTitle, pageWidth - margin * 2);
        doc.text(titleLines, pageWidth / 2, 55, { align: 'center' });
        let currentY = 55 + (doc.getTextDimensions(titleLines).h);

        if (eventDate) {
            doc.setFont('times', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(80);
            doc.text(`Event Date: ${format(eventDate, 'EEEE, MMMM d, yyyy')}`, pageWidth / 2, currentY + 4, { align: 'center' });
            currentY += 12;
            doc.setTextColor(0);
        } else {
            currentY += 6;
        }

        // --- Render Sections ---
        for (const section of sections) {
            const sectionStudents = section.student_admission_numbers
                .map(adm => studentsMap.get(adm))
                .filter(Boolean) as Student[];
            
            if (sectionStudents.length === 0) continue;

            if (currentY > pageHeight - 30) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFont('times', 'bold');
            doc.setFontSize(11);
            doc.text(section.title, margin, currentY);
            currentY += 4;

            (doc as any).autoTable({
                head: [['#', 'Admission No.', 'Full Name', 'Class', 'Signature']],
                body: sectionStudents.sort((a,b) => (a.first_name || '').localeCompare(b.first_name || '')).map((s, i) => [i + 1, s.admission_number, `${s.first_name} ${s.last_name}`, s.class, '']),
                startY: currentY,
                theme: 'grid',
                headStyles: { fillColor: '#107C41', textColor: 255, font: 'times', fontStyle: 'bold' },
                styles: { font: 'times', fontStyle: 'normal', cellPadding: 2, fontSize: 9.5 },
                margin: { left: margin, right: margin },
                didDrawPage: drawPageFooter,
            });

            currentY = (doc as any).lastAutoTable.finalY + 10;
        }

        // --- Render Bottom Stamp (If not using header stamp) ---
        if (!useHeaderStamp) {
            const stampBoxWidth = 55;
            const stampBoxHeight = 30;
            
            // Check for space on current page
            if (currentY > pageHeight - (stampBoxHeight + 20)) {
                doc.addPage();
                currentY = 20;
            }

            doc.setLineWidth(0.2);
            doc.setFontSize(10);
            doc.setFont('times', 'bold');
            doc.text(`Prepared By: ${preparedBy || 'Matron'}`, margin, currentY + 5);
            
            const stampX = pageWidth - margin - stampBoxWidth;
            doc.rect(stampX, currentY, stampBoxWidth, stampBoxHeight);
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text('OFFICIAL SCHOOL STAMP', stampX + stampBoxWidth / 2, currentY + 8, { align: 'center' });
            
            doc.setTextColor(0);
            doc.setLineWidth(0.2);
            doc.line(margin, currentY + 22, margin + 50, currentY + 22);
            doc.setFontSize(8);
            doc.text('Signature & Date', margin, currentY + 26);
        }

        doc.save(`${listTitle.replace(/\s+/g, '-') || 'custom-list'}.pdf`);
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <Button variant="outline" onClick={onBack}>
                    <X className="mr-2" /> Back
                </Button>
                <div className="flex gap-2">
                    <Button onClick={handleSaveList} disabled={isPending}>
                        {isPending ? <Loader2 className="animate-spin" /> : <Check className="mr-2"/>} Save
                    </Button>
                    <Button variant="secondary" onClick={handleExportPdf} disabled={sections.every(s => s.student_admission_numbers.length === 0)}>
                        <Printer className="mr-2" /> Print PDF
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle>List Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="list-title">List Title</Label>
                            <Input 
                                id="list-title"
                                placeholder="Enter list title..."
                                value={listTitle}
                                onChange={(e) => setListTitle(e.target.value)}
                                className="text-lg"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Event Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !eventDate && 'text-muted-foreground')}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {eventDate ? format(eventDate, 'PPP') : <span>Pick an event date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={eventDate} onSelect={setEventDate} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prepared-by">Prepared By (Signature Name)</Label>
                        <Input 
                            id="prepared-by"
                            placeholder="e.g., Matron Agnes"
                            value={preparedBy}
                            onChange={(e) => setPreparedBy(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Add Student</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Target Section</Label>
                                <Select value={activeSectionId} onValueChange={setActiveSectionId}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-start gap-2">
                                <Input 
                                    placeholder="Adm No. or Name..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setFoundStudents(null); setFindError(null); setShowQuickAdd(false); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleFindStudent()}}
                                />
                                <Button onClick={handleFindStudent} disabled={isFinding} size="icon"><Search/></Button>
                            </div>
                            
                            {isFinding && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                            
                            {findError && (
                                <div className="space-y-2">
                                    <p className="text-sm text-destructive">{findError}</p>
                                    {showQuickAdd && (
                                        <Button variant="outline" className="w-full" onClick={() => setShowQuickAdd(true)}>
                                            <Plus className="mr-2 h-4 w-4" /> Add "{searchTerm}" Manually
                                        </Button>
                                    )}
                                </div>
                            )}

                            {showQuickAdd && (
                                <Card className="border-primary/20 bg-primary/5">
                                    <CardHeader className="p-3">
                                        <CardTitle className="text-sm">Quick Add Student</CardTitle>
                                        <CardDescription className="text-xs">This will add the student to the database.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0 space-y-3">
                                        <div className="grid gap-2">
                                            <Input placeholder="First Name" value={quickFirstName} onChange={(e) => setQuickFirstName(e.target.value)} />
                                            <Input placeholder="Last Name" value={quickLastName} onChange={(e) => setQuickLastName(e.target.value)} />
                                            <Input placeholder="Class (e.g. Form 4)" value={quickClass} onChange={(e) => setQuickClass(e.target.value)} />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" className="flex-1" onClick={handleQuickAdd} disabled={isQuickAdding}>
                                                {isQuickAdding ? <Loader2 className="animate-spin" /> : <UserPlus className="mr-2" />} Create & Add
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setShowQuickAdd(false)}>Cancel</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {foundStudents && foundStudents.length > 0 && (
                                <div className="p-3 bg-muted rounded-md text-sm space-y-3 mt-2">
                                    <p className="font-semibold">Found {foundStudents.length}:</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                        {foundStudents.map(student => (
                                            <div key={student.id} className="flex justify-between items-center bg-background p-2 rounded-md">
                                                <div className="flex-1 min-w-0 mr-2">
                                                    <p className="font-medium truncate">{student.first_name} {student.last_name}</p>
                                                    <p className="text-xs text-muted-foreground">{student.admission_number}</p>
                                                </div>
                                                <Button size="sm" onClick={() => handleAddStudent(student, activeSectionId)}>Add</Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Button variant="outline" className="w-full" onClick={handleAddSection}><Plus className="mr-2"/> Add New Section</Button>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    {sections.map((section) => (
                        <Card key={section.id} className={cn(activeSectionId === section.id && "ring-2 ring-primary")}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <div className="flex-grow mr-4">
                                    <Input 
                                        value={section.title}
                                        onChange={(e) => handleUpdateSectionTitle(section.id, e.target.value)}
                                        className="font-bold border-none bg-transparent h-8 p-0 text-lg hover:bg-muted/50 focus:bg-muted"
                                    />
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => setActiveSectionId(section.id)} className={activeSectionId === section.id ? "text-primary" : ""}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    {sections.length > 1 && (
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleRemoveSection(section.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 border rounded-lg overflow-hidden">
                                    {section.student_admission_numbers.length > 0 ? (
                                        section.student_admission_numbers.map((adm, sIdx) => {
                                            const student = studentsMap.get(adm);
                                            return (
                                                <div key={`${section.id}-${adm}-${sIdx}`} className="flex items-center justify-between p-2 text-sm hover:bg-muted border-b last:border-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-4">{sIdx + 1}.</span>
                                                        <div>
                                                            <p className="font-medium">{student ? `${student.first_name} ${student.last_name}` : adm}</p>
                                                            <p className="text-xs text-muted-foreground">{adm} - {student?.class || '...'}</p>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => handleRemoveStudent(adm, section.id)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-sm text-center text-muted-foreground p-4">Section is empty.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Main client component
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
export default function ListBuilderClient() {
    const firestore = useFirestore();
    const { isUserLoading: authLoading } = useUser();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
    const [selectedList, setSelectedList] = useState<CustomList | null>(null);
    const [newListTitle, setNewListTitle] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    const listsQuery = useMemoFirebase(() => 
        !authLoading && firestore ? query(collection(firestore, 'custom_lists'), orderBy('title', 'asc')) : null
    , [firestore, authLoading]);
    const { data: lists, isLoading: listsLoading } = useCollection<CustomList>(listsQuery);

    const handleCreateList = () => {
        if (!newListTitle.trim()) return;
        startTransition(async () => {
            const result = await saveList({ 
                title: newListTitle, 
                prepared_by: '',
                sections: [{ id: 'default', title: 'Main List', student_admission_numbers: [] }]
            });
            if (result.success && result.id) {
                setSelectedList({ id: result.id, title: newListTitle, sections: [], prepared_by: '' });
                setViewMode('edit');
                setIsCreateDialogOpen(false);
                setNewListTitle('');
            }
        });
    };

    const handleEditList = (list: CustomList) => {
        setSelectedList(list);
        setViewMode('edit');
    };
    
    if (viewMode === 'edit' && selectedList) {
        return <ListEditor list={selectedList} onBack={() => { setViewMode('list'); setSelectedList(null); }} />;
    }

    return (
        <div>
            {authLoading || listsLoading ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
            ) : (
                <div className="space-y-6">
                     <div className="flex justify-end"><Button onClick={() => setIsCreateDialogOpen(true)}><ListPlus className="mr-2"/> New List</Button></div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {(lists || []).map(list => (
                           <Card key={list.id} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 truncate"><Users className="text-primary shrink-0"/> {list.title}</CardTitle>
                                    <CardDescription>
                                        {list.sections?.length || 1} section(s). 
                                        {list.event_date && <span className="block mt-1 text-xs text-primary">{format(list.event_date.toDate(), 'PPP')}</span>}
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter className="mt-auto flex justify-between items-center">
                                    <DeleteListButton listId={list.id} listTitle={list.title} />
                                    <Button onClick={() => handleEditList(list)}><Edit className="mr-2 h-4 w-4"/> Manage</Button>
                                </CardFooter>
                           </Card>
                        ))}
                    </div>
                </div>
            )}

            {isCreateDialogOpen && (
                 <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader><CardTitle>Create New List</CardTitle></CardHeader>
                        <CardContent><Input placeholder="e.g., Music Festival 2026" value={newListTitle} onChange={(e) => setNewListTitle(e.target.value)} autoFocus/></CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateList} disabled={isPending}>{isPending && <Loader2 className="animate-spin mr-2"/>} Create</Button>
                        </CardFooter>
                    </Card>
                 </div>
            )}
        </div>
    );
}
