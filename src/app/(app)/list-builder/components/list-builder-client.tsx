'use client';
import { useState, useMemo, useTransition, useEffect } from 'react';
import type { CustomList, Student, ListSection } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, getDoc, getDocs, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Plus, Printer, Search, Edit, ListPlus, Users, X, Check, CalendarIcon, Trash2, UserPlus, ArrowDown } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Individual Section Card with its own Search and Add functionality
 */
function SectionCard({ 
    section, 
    index, 
    studentsMap, 
    isActive, 
    onActivate, 
    onRemoveSection, 
    onUpdateTitle, 
    onAddStudent, 
    onRemoveStudent 
}: { 
    section: ListSection; 
    index: number; 
    studentsMap: Map<string, Student>;
    isActive: boolean;
    onActivate: () => void;
    onRemoveSection: (id: string) => void;
    onUpdateTitle: (id: string, title: string) => void;
    onAddStudent: (student: Student, sectionId: string) => void;
    onRemoveStudent: (adm: string, sectionId: string) => void;
}) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [foundStudents, setFoundStudents] = useState<Student[] | null>(null);
    const [isFinding, setIsFinding] = useState(false);
    const [findError, setFindError] = useState<string | null>(null);
    const [showQuickAdd, setShowQuickAdd] = useState(false);

    const [quickFirstName, setQuickFirstName] = useState('');
    const [quickLastName, setQuickLastName] = useState('');
    const [quickClass, setQuickClass] = useState('');
    const [quickStream, setQuickStream] = useState('');
    const [isQuickAdding, setIsQuickAdding] = useState(false);

    const handleFind = async () => {
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
                const results = found.filter(s => !section.student_admission_numbers.includes(s.admission_number));
                if (results.length > 0) {
                    setFoundStudents(results);
                } else {
                     setFindError('Matching student is already in this section.');
                }
            } else {
                 setFindError('No student found with that Admission Number or Name.');
                 if (/^\d+$/.test(term)) setShowQuickAdd(true);
            }
        } catch (error) {
            setFindError('An error occurred while searching.');
            console.error(error);
        } finally {
            setIsFinding(false);
        }
    };

    const handleQuickAddLocal = async () => {
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
            stream: quickStream,
            uploaded_at: serverTimestamp() as any,
            uploaded_by: user.uid
        };

        const studentRef = doc(firestore, 'students', newStudent.admission_number);

        try {
            await setDoc(studentRef, newStudent);
            onAddStudent(newStudent, section.id);
            toast({ title: 'Student Created', description: `${quickFirstName} added to database and this list.` });
            setQuickFirstName(''); setQuickLastName(''); setQuickClass(''); setQuickStream('');
            setShowQuickAdd(false); setSearchTerm('');
        } catch (error: any) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: studentRef.path,
                operation: 'create',
                requestResourceData: newStudent,
            }));
        } finally {
            setIsQuickAdding(false);
        }
    };

    return (
        <Card 
            id={section.id}
            className={cn(
                "transition-all duration-500",
                isActive 
                    ? "ring-2 ring-primary ring-offset-2 shadow-xl scale-[1.01]" 
                    : "opacity-95"
            )}
            onClick={onActivate}
        >
            <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0 border-b bg-muted/30">
                <div className="flex items-center gap-3 flex-grow mr-4">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                        {index + 1}
                    </div>
                    <Input 
                        value={section.title}
                        onChange={(e) => onUpdateTitle(section.id, e.target.value)}
                        className="font-bold border-none bg-transparent h-8 p-0 text-lg hover:bg-muted/50 focus:bg-white transition-colors"
                    />
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onActivate(); }} className={isActive ? "text-primary" : "text-muted-foreground"}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); onRemoveSection(section.id); }}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {/* Search Bar for this section */}
                <div className="flex gap-2">
                    <div className="relative flex-grow">
                        <Input 
                            placeholder="Add student to this section (Adm No. or Name)..."
                            value={searchTerm}
                            className="pr-10"
                            onChange={(e) => { setSearchTerm(e.target.value); setFoundStudents(null); setFindError(null); setShowQuickAdd(false); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleFind(); }}
                        />
                        {isFinding && <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-muted-foreground" />}
                    </div>
                    <Button size="sm" onClick={handleFind} disabled={isFinding}><Plus className="h-4 w-4 mr-1" /> Find</Button>
                </div>

                {/* Local Search Results */}
                {findError && <p className="text-xs text-destructive">{findError}</p>}
                
                {showQuickAdd && (
                    <Card className="border-primary/20 bg-primary/5 p-3 space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs font-bold">Quick Add New Student</Label>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowQuickAdd(false)}><X className="h-3 w-3"/></Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="First Name" value={quickFirstName} onChange={(e) => setQuickFirstName(e.target.value)} />
                            <Input placeholder="Last Name" value={quickLastName} onChange={(e) => setQuickLastName(e.target.value)} />
                            <Input placeholder="Class (e.g. F3)" value={quickClass} onChange={(e) => setQuickClass(e.target.value)} />
                            <Input placeholder="Stream (e.g. Blue)" value={quickStream} onChange={(e) => setQuickStream(e.target.value)} />
                        </div>
                        <Button size="sm" className="w-full" onClick={handleQuickAddLocal} disabled={isQuickAdding}>
                            {isQuickAdding ? <Loader2 className="animate-spin h-4 w-4" /> : <UserPlus className="h-4 w-4 mr-2" />} 
                            Save & Add to {section.title}
                        </Button>
                    </Card>
                )}

                {foundStudents && foundStudents.length > 0 && (
                    <div className="p-2 bg-muted/50 rounded-md border border-dashed border-primary/20 space-y-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Search Results:</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                            {foundStudents.map(s => (
                                <div key={s.id} className="flex justify-between items-center bg-white p-2 rounded border text-sm">
                                    <div className="truncate">
                                        <p className="font-bold">{s.first_name} {s.last_name}</p>
                                        <p className="text-[10px] text-muted-foreground">{s.admission_number} — {s.class} {s.stream || ''}</p>
                                    </div>
                                    <Button size="sm" className="h-7 text-xs" onClick={() => { onAddStudent(s, section.id); setFoundStudents(prev => prev?.filter(ps => ps.id !== s.id) || null); }}>Add</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Student List */}
                <div className="divide-y rounded-md border overflow-hidden">
                    {section.student_admission_numbers.length > 0 ? (
                        section.student_admission_numbers.map((adm, sIdx) => {
                            const student = studentsMap.get(adm);
                            return (
                                <div key={`${section.id}-${adm}-${sIdx}`} className="flex items-center justify-between p-3 text-sm hover:bg-primary/5 transition-colors bg-white">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] text-muted-foreground w-4 font-mono">{sIdx + 1}.</span>
                                        <div>
                                            <p className="font-semibold">{student ? `${student.first_name} ${student.last_name}` : adm}</p>
                                            <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                                                <span className="bg-muted px-1.5 py-0.5 rounded">{adm}</span>
                                                <span>{student?.class || ''} {student?.stream || ''}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-full" onClick={() => onRemoveStudent(adm, section.id)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-muted-foreground bg-muted/5">
                            <Users className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-xs font-medium">No students in this section yet</p>
                            <p className="text-[10px]">Use the search bar above to find and add students.</p>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="py-2 bg-muted/10 text-[10px] text-muted-foreground flex justify-between">
                <span>Section ID: {section.id}</span>
                <span>{section.student_admission_numbers.length} students listed</span>
            </CardFooter>
        </Card>
    );
}

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
    
    const [sections, setSections] = useState<ListSection[]>(() => {
        if (list.sections && list.sections.length > 0) return list.sections;
        return [{ id: 'default', title: 'Main List', student_admission_numbers: [] }];
    });

    const [activeSectionId, setActiveSectionId] = useState<string>(sections[0].id);
    
    // Auto-scroll logic
    useEffect(() => {
        const element = document.getElementById(activeSectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeSectionId]);

    const allAdmissionNumbers = useMemo(() => {
        return Array.from(new Set(sections.flatMap(s => s.student_admission_numbers)));
    }, [sections]);

    const [studentsMap, setStudentsMap] = useState<Map<string, Student>>(new Map());

    useEffect(() => {
        if (!firestore || allAdmissionNumbers.length === 0) {
            setStudentsMap(new Map());
            return;
        }

        const fetchStudentsInChunks = async () => {
            const newMap = new Map<string, Student>();
            const chunks: string[][] = [];
            for (let i = 0; i < allAdmissionNumbers.length; i += 30) {
                chunks.push(allAdmissionNumbers.slice(i, i + 30));
            }

            try {
                const queryPromises = chunks.map(chunk => {
                    const q = query(collection(firestore, 'students'), where('admission_number', 'in', chunk));
                    return getDocs(q);
                });
                const querySnapshots = await Promise.all(queryPromises);
                for (const querySnapshot of querySnapshots) {
                    querySnapshot.forEach((doc) => {
                        const student = { id: doc.id, ...doc.data() } as Student;
                        newMap.set(student.admission_number, student);
                    });
                }
                setStudentsMap(newMap);
            } catch (error) {
                console.error("Error fetching students:", error);
            }
        };

        fetchStudentsInChunks();
    }, [firestore, allAdmissionNumbers]);

    const handleAddStudent = (student: Student, sectionId: string) => {
        setSections(prev => prev.map(s => {
            if (s.id === sectionId) {
                if (s.student_admission_numbers.includes(student.admission_number)) return s;
                return { ...s, student_admission_numbers: [...s.student_admission_numbers, student.admission_number] };
            }
            return s;
        }));
        setStudentsMap(prev => new Map(prev).set(student.admission_number, student));
    };

    const handleRemoveStudent = (admissionNumber: string, sectionId: string) => {
        setSections(prev => prev.map(s => s.id === sectionId 
            ? { ...s, student_admission_numbers: s.student_admission_numbers.filter(id => id !== admissionNumber) }
            : s
        ));
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
            if (activeSectionId === sectionId) setActiveSectionId(filtered[0].id);
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
            if (result.success) toast({ title: 'Success!', description: result.message });
            else toast({ variant: 'destructive', title: 'Error', description: result.message });
        });
    };

    const handleExportPdf = async () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        const now = new Date();
        const serialNumber = `GGHS/${format(now, 'yyyyMMdd')}/${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const totalRowsCount = sections.reduce((acc, s) => acc + s.student_admission_numbers.length, 0);
        const sectionCount = sections.length;
        const useHeaderStamp = (totalRowsCount >= 23 && totalRowsCount <= 25) && (sectionCount <= 5);

        const drawPageFooter = (data: any) => {
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setFont('times', 'normal');
            doc.setTextColor(150);
            const generatedOnText = `Generated by Gatura Hub on ${format(now, 'PPPP')}, at ${format(now, 'p')} — Page ${data.pageNumber} of ${pageCount}`;
            doc.text(generatedOnText, margin, pageHeight - 8);
        };

        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Serial: ${serialNumber}`, pageWidth - margin, 8, { align: 'right' });
        doc.text(`Generated: ${format(now, 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, 11, { align: 'right' });
        doc.setTextColor(0);

        if (schoolLogo?.imageUrl) {
            try { doc.addImage(schoolLogo.imageUrl, 'PNG', margin, 12, 18, 18); } catch (e) {}
        }
        doc.setFont('times', 'bold');
        doc.setFontSize(16);
        doc.text('GATURA GIRLS', margin + 22, 18);
        doc.setFont('times', 'normal');
        doc.setFontSize(8.5);
        doc.text('30-01013, Muranga.', margin + 22, 22);
        doc.text('gaturagirls@gmail.com | 0793328863', margin + 22, 26);

        if (useHeaderStamp) {
            const stampBoxWidth = 45;
            const stampBoxHeight = 22;
            const stampX = pageWidth - margin - stampBoxWidth;
            const stampY = 15; 
            doc.setLineWidth(0.2);
            doc.rect(stampX, stampY, stampBoxWidth, stampBoxHeight);
            doc.setFontSize(6.5);
            doc.setTextColor(150);
            doc.text('OFFICIAL SCHOOL STAMP', stampX + stampBoxWidth / 2, stampY + 5, { align: 'center' });
            doc.setTextColor(0);
            doc.setFontSize(8);
            doc.setFont('times', 'bold');
            doc.text(`By: ${preparedBy || 'Matron'}`, stampX, stampY + stampBoxHeight + 4);
        }

        doc.setLineWidth(0.4);
        doc.line(margin, 38, pageWidth - margin, 38);
        doc.setFont('times', 'bold');
        doc.setFontSize(13);
        const titleLines = doc.splitTextToSize(listTitle, pageWidth - margin * 2);
        doc.text(titleLines, pageWidth / 2, 45, { align: 'center' });
        let currentY = 45 + (doc.getTextDimensions(titleLines).h) + (eventDate ? 10 : 5);

        if (eventDate) {
            doc.setFont('times', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(80);
            doc.text(`Event Date: ${format(eventDate, 'EEEE, MMMM d, yyyy')}`, pageWidth / 2, currentY - 7, { align: 'center' });
            doc.setTextColor(0);
        }

        for (const section of sections) {
            const sectionStudents = section.student_admission_numbers.map(adm => studentsMap.get(adm)).filter(Boolean) as Student[];
            if (sectionStudents.length === 0) continue;
            if (currentY > pageHeight - 30) { doc.addPage(); currentY = 20; }
            doc.setFont('times', 'bold'); doc.setFontSize(10); doc.text(section.title, margin, currentY); currentY += 3;
            (doc as any).autoTable({
                head: [['#', 'Admission No.', 'Full Name', 'Class', 'Signature']],
                body: sectionStudents.sort((a,b) => (a.first_name || '').localeCompare(b.first_name || '')).map((s, i) => [i + 1, s.admission_number, `${s.first_name} ${s.last_name}`, `${s.class} ${s.stream || ''}`.trim(), '']),
                startY: currentY,
                theme: 'grid',
                headStyles: { fillColor: '#107C41', textColor: 255, font: 'times', fontStyle: 'bold' },
                styles: { font: 'times', fontStyle: 'normal', cellPadding: 1.5, fontSize: 9 },
                margin: { left: margin, right: margin },
                didDrawPage: drawPageFooter,
            });
            currentY = (doc as any).lastAutoTable.finalY + 8;
        }

        if (!useHeaderStamp) {
            if (currentY > pageHeight - 45) { doc.addPage(); currentY = 20; }
            doc.setFontSize(9); doc.setFont('times', 'bold'); doc.text(`Prepared By: ${preparedBy || 'Matron'}`, margin, currentY + 5);
            doc.rect(pageWidth - margin - 50, currentY, 50, 25);
            doc.setFontSize(7); doc.setTextColor(150); doc.text('OFFICIAL SCHOOL STAMP', pageWidth - margin - 25, currentY + 8, { align: 'center' });
            doc.setTextColor(0); doc.line(margin, currentY + 20, margin + 45, currentY + 20);
            doc.setFontSize(8); doc.text('Signature & Date', margin, currentY + 24);
        }

        doc.save(`${listTitle.replace(/\s+/g, '-') || 'custom-list'}.pdf`);
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm sticky top-0 z-20">
                <Button variant="outline" onClick={onBack} size="sm">
                    <X className="mr-2 h-4 w-4" /> Exit Editor
                </Button>
                <div className="flex gap-2">
                    <Button onClick={handleSaveList} disabled={isPending} size="sm">
                        {isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <Check className="mr-2 h-4 w-4"/>} Save List
                    </Button>
                    <Button variant="secondary" onClick={handleExportPdf} size="sm" disabled={sections.every(s => s.student_admission_numbers.length === 0)}>
                        <Printer className="mr-2 h-4 w-4" /> Print PDF
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1">
                    <div className="lg:sticky lg:top-20 space-y-4">
                        <Card className="border-primary/20 shadow-sm">
                            <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><ArrowDown className="h-4 w-4 text-primary" /> Editor Info</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="list-title">Main Title</Label>
                                    <Input id="list-title" value={listTitle} onChange={(e) => setListTitle(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Event Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !eventDate && 'text-muted-foreground')}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {eventDate ? format(eventDate, 'PPP') : <span>Set date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={eventDate} onSelect={setEventDate} initialFocus /></PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>Signature Name</Label>
                                    <Input placeholder="e.g., Matron Agnes" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} />
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Jump to Section</Label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {sections.map((s, i) => (
                                            <Button 
                                                key={s.id} 
                                                variant={activeSectionId === s.id ? "default" : "outline"} 
                                                size="sm" 
                                                className="h-8 w-8 p-0 text-xs"
                                                onClick={() => setActiveSectionId(s.id)}
                                                title={s.title}
                                            >
                                                {i + 1}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Button variant="outline" className="w-full border-dashed border-primary/40 hover:border-primary" onClick={handleAddSection}><Plus className="mr-2"/> Add New Section</Button>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-8">
                    {sections.map((section, idx) => (
                        <SectionCard 
                            key={section.id}
                            index={idx}
                            section={section}
                            studentsMap={studentsMap}
                            isActive={activeSectionId === section.id}
                            onActivate={() => setActiveSectionId(section.id)}
                            onRemoveSection={handleRemoveSection}
                            onUpdateTitle={handleUpdateSectionTitle}
                            onAddStudent={handleAddStudent}
                            onRemoveStudent={handleRemoveStudent}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

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
                           <Card key={list.id} className="flex flex-col hover:shadow-md transition-shadow cursor-default group">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 truncate group-hover:text-primary transition-colors"><Users className="text-primary shrink-0 h-5 w-5"/> {list.title}</CardTitle>
                                    <CardDescription>
                                        {list.sections?.length || 1} section(s). 
                                        {list.event_date && <span className="block mt-1 text-xs text-primary font-medium">{format(list.event_date.toDate(), 'PPP')}</span>}
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter className="mt-auto flex justify-between items-center bg-muted/20 py-3 px-6">
                                    <DeleteListButton listId={list.id} listTitle={list.title} />
                                    <Button variant="secondary" size="sm" onClick={() => handleEditList(list)} className="group-hover:bg-primary group-hover:text-primary-foreground transition-all"><Edit className="mr-2 h-3.5 w-3.5"/> Manage List</Button>
                                </CardFooter>
                           </Card>
                        ))}
                        {(!lists || lists.length === 0) && (
                            <div className="col-span-full border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground bg-muted/5">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <h3 className="text-lg font-semibold">No lists created yet</h3>
                                <p className="text-sm">Click "New List" to start building your first custom student registry.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isCreateDialogOpen && (
                 <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                    <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <CardHeader><CardTitle>Create New List</CardTitle><CardDescription>Enter a name for your custom registry (e.g., "Trip to Nairobi").</CardDescription></CardHeader>
                        <CardContent><Input placeholder="e.g., Music Festival 2026" value={newListTitle} onChange={(e) => setNewListTitle(e.target.value)} autoFocus className="text-lg"/></CardContent>
                        <CardFooter className="flex justify-end gap-2 bg-muted/30 py-4">
                            <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateList} disabled={isPending || !newListTitle.trim()}>{isPending && <Loader2 className="animate-spin mr-2"/>} Create & Build</Button>
                        </CardFooter>
                    </Card>
                 </div>
            )}
        </div>
    );
}
