'use client';
import { useState, useMemo, useTransition, useEffect } from 'react';
import type { CustomList, Student, ListSection } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, getDoc, getDocs, orderBy, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { Loader2, Plus, Printer, Search, Edit, ListPlus, Users, X, Check, CalendarIcon, Trash2, UserPlus, ArrowDown, FileDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import DeleteListButton from './delete-list-button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Image from 'next/image';

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
                 setFindError('No student found.');
                 if (/^\d+$/.test(term)) setShowQuickAdd(true);
            }
        } catch (error) {
            setFindError('Error occurred while searching.');
        } finally {
            setIsFinding(false);
        }
    };

    const handleQuickAddLocal = async () => {
        if (!firestore || !user) return;
        if (!quickFirstName || !quickLastName || !quickClass) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill in details.' });
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
            toast({ title: 'Success', description: 'Student added to database and list.' });
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
            className={cn("transition-all", isActive ? "ring-2 ring-primary ring-offset-2 shadow-xl" : "opacity-95")}
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
                        className="font-bold border-none bg-transparent h-8 p-0 text-lg"
                    />
                </div>
                <div className="flex items-center gap-1 no-print">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onActivate(); }}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); onRemoveSection(section.id); }}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="flex gap-2 no-print">
                    <div className="relative flex-grow">
                        <Input 
                            placeholder="Add student (Adm No. or Name)..."
                            value={searchTerm}
                            className="pr-10"
                            onChange={(e) => { setSearchTerm(e.target.value); setFoundStudents(null); setFindError(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleFind(); }}
                        />
                        {isFinding && <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-muted-foreground" />}
                    </div>
                    <Button size="sm" onClick={handleFind} disabled={isFinding}><Plus className="h-4 w-4 mr-1" /> Find</Button>
                </div>

                {findError && <p className="text-xs text-destructive no-print">{findError}</p>}
                
                {showQuickAdd && (
                    <Card className="border-primary/20 bg-primary/5 p-3 space-y-3 no-print">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs font-bold">Quick Add Student</Label>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowQuickAdd(false)}><X className="h-3 w-3"/></Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="First Name" value={quickFirstName} onChange={(e) => setQuickFirstName(e.target.value)} />
                            <Input placeholder="Last Name" value={quickLastName} onChange={(e) => setQuickLastName(e.target.value)} />
                            <Input placeholder="Class (e.g. F3)" value={quickClass} onChange={(e) => setQuickClass(e.target.value)} />
                            <Input placeholder="Stream" value={quickStream} onChange={(e) => setQuickStream(e.target.value)} />
                        </div>
                        <Button size="sm" className="w-full" onClick={handleQuickAddLocal} disabled={isQuickAdding}>
                            {isQuickAdding ? <Loader2 className="animate-spin h-4 w-4" /> : <UserPlus className="h-4 w-4 mr-2" />} 
                            Save & Add to Section
                        </Button>
                    </Card>
                )}

                {foundStudents && foundStudents.length > 0 && (
                    <div className="p-2 bg-muted/50 rounded-md border border-dashed space-y-2 no-print">
                        {foundStudents.map(s => (
                            <div key={s.id} className="flex justify-between items-center bg-white p-2 rounded border text-sm">
                                <div>
                                    <p className="font-bold">{s.first_name} {s.last_name}</p>
                                    <p className="text-[10px] text-muted-foreground">{s.admission_number} — {s.class}</p>
                                </div>
                                <Button size="sm" className="h-7 text-xs" onClick={() => { onAddStudent(s, section.id); setFoundStudents(prev => prev?.filter(ps => ps.id !== s.id) || null); }}>Add</Button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="divide-y rounded-md border overflow-hidden">
                    {section.student_admission_numbers.length > 0 ? (
                        section.student_admission_numbers.map((adm, sIdx) => {
                            const student = studentsMap.get(adm);
                            return (
                                <div key={`${section.id}-${adm}`} className="flex items-center justify-between p-3 text-sm hover:bg-muted/5">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] text-muted-foreground w-4">{sIdx + 1}.</span>
                                        <div>
                                            <p className="font-semibold">{student ? `${student.first_name} ${student.last_name}` : adm}</p>
                                            <p className="text-[11px] text-muted-foreground">{adm} — {student?.class || ''}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/50 hover:text-destructive no-print" onClick={() => onRemoveStudent(adm, section.id)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center text-muted-foreground text-xs">No students in section.</div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function ListEditor({ list, onBack }: { list: CustomList; onBack: () => void }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const schoolLogo = PlaceHolderImages.find(img => img.id === 'school_logo');

    const [listTitle, setListTitle] = useState(list.title);
    const [preparedBy, setPreparedBy] = useState(list.prepared_by || 'Mr. Muthomi (Choir Director)');
    const [eventDate, setEventDate] = useState<Date | undefined>(list.event_date ? list.event_date.toDate() : undefined);
    
    const [sections, setSections] = useState<ListSection[]>(() => {
        if (list.sections && list.sections.length > 0) return list.sections;
        return [{ id: 'default', title: 'Main List', student_admission_numbers: [] }];
    });

    const [activeSectionId, setActiveSectionId] = useState<string>(sections[0].id);
    const [studentsMap, setStudentsMap] = useState<Map<string, Student>>(new Map());

    useEffect(() => {
        const admNos = Array.from(new Set(sections.flatMap(s => s.student_admission_numbers)));
        if (!firestore || admNos.length === 0) return;

        const fetchStudents = async () => {
            const newMap = new Map<string, Student>();
            for (let i = 0; i < admNos.length; i += 30) {
                const chunk = admNos.slice(i, i + 30);
                const q = query(collection(firestore, 'students'), where('admission_number', 'in', chunk));
                const snap = await getDocs(q);
                snap.forEach(doc => {
                    const s = { id: doc.id, ...doc.data() } as Student;
                    newMap.set(s.admission_number, s);
                });
            }
            setStudentsMap(newMap);
        };
        fetchStudents();
    }, [firestore, sections]);

    const handleSaveList = () => {
        if (!firestore) return;
        startTransition(async () => {
            const payload = {
                title: listTitle,
                prepared_by: preparedBy,
                sections: sections,
                event_date: eventDate ? eventDate : null,
                updated_at: serverTimestamp(),
            };
            const listRef = doc(firestore, 'custom_lists', list.id);
            setDoc(listRef, payload, { merge: true })
                .then(() => toast({ title: 'Success', description: 'List saved.' }))
                .catch(async () => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: listRef.path,
                        operation: 'update',
                        requestResourceData: payload
                    }));
                });
        });
    };

    const handleAddStudent = (student: Student, sectionId: string) => {
        setSections(prev => prev.map(s => s.id === sectionId ? { 
            ...s, 
            student_admission_numbers: Array.from(new Set([...s.student_admission_numbers, student.admission_number])) 
        } : s));
    };

    const handleRemoveStudent = (adm: string, sectionId: string) => {
        setSections(prev => prev.map(s => s.id === sectionId ? { 
            ...s, 
            student_admission_numbers: s.student_admission_numbers.filter(id => id !== adm) 
        } : s));
    };

    const handleAddSection = () => {
        const id = `section-${Date.now()}`;
        setSections(prev => [...prev, { id, title: `Section ${prev.length + 1}`, student_admission_numbers: [] }]);
        setActiveSectionId(id);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportPdf = () => {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const now = new Date();
        const serialNumber = `GGHS/LIST/${format(now, 'yyyyMMdd')}/${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;

        // Header and serial logic similar to other reports
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
        doc.text(listTitle, pageWidth - margin, cursorY + 8, { align: 'right' });

        cursorY += 25;

        sections.forEach((section, index) => {
            doc.setFont('times', 'bold');
            doc.setFontSize(11);
            doc.text(section.title, margin, cursorY);
            cursorY += 5;

            const tableRows = section.student_admission_numbers.map((adm, sIdx) => {
                const s = studentsMap.get(adm);
                return [
                    (sIdx + 1).toString(),
                    adm,
                    s ? `${s.first_name} ${s.last_name}` : 'Unknown Student',
                    s ? `${s.class} ${s.stream || ''}` : ''
                ];
            });

            (doc as any).autoTable({
                head: [['#', 'Adm No.', 'Full Name', 'Class']],
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

            cursorY = (doc as any).lastAutoTable.finalY + 10;
            
            if (cursorY > pageHeight - 40 && index < sections.length - 1) {
                doc.addPage();
                cursorY = 20;
            }
        });

        const totalStudents = new Set(sections.flatMap(s => s.student_admission_numbers)).size;
        doc.setFont('times', 'bold');
        doc.setFontSize(10);
        doc.text(`Total Unique Students: ${totalStudents}`, margin, cursorY);
        
        cursorY += 15;
        if (cursorY > pageHeight - 25) {
            doc.addPage();
            cursorY = 20;
        }

        doc.setFont('times', 'normal');
        doc.setFontSize(9);
        const signatureWidth = 50;
        doc.line(margin, cursorY, margin + signatureWidth, cursorY);
        doc.text(preparedBy, margin, cursorY + 4);

        doc.line(pageWidth - margin - signatureWidth, cursorY, pageWidth - margin, cursorY);
        doc.text("Date", pageWidth - margin - signatureWidth, cursorY + 4);

        doc.save(`${listTitle.replace(/\s+/g, '-')}-${format(now, 'yyyy-MM-dd')}.pdf`);
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center bg-card p-4 rounded-lg border sticky top-0 z-20 no-print">
                <Button variant="outline" onClick={onBack} size="sm"><X className="mr-2 h-4 w-4" /> Exit</Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrint} size="sm"><Printer className="mr-2 h-4 w-4" /> Print</Button>
                    <Button variant="outline" onClick={handleExportPdf} size="sm"><FileDown className="mr-2 h-4 w-4" /> Export PDF</Button>
                    <Button onClick={handleSaveList} disabled={isPending} size="sm">
                        {isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <Check className="mr-2 h-4 w-4"/>} Save
                    </Button>
                </div>
            </div>

            {/* Print-only Header */}
            <div className="hidden print-container space-y-6">
                <div className="flex items-start justify-between border-b-2 border-gray-800 pb-2">
                    <div className="flex items-start gap-3">
                        {schoolLogo && (
                            <Image
                                src={schoolLogo.imageUrl}
                                alt={schoolLogo.description}
                                width={60}
                                height={60}
                            />
                        )}
                        <div className="space-y-0.5 font-serif">
                            <h2 className="text-2xl font-bold text-gray-800 tracking-wider">GATURA GIRLS</h2>
                            <div className="text-[10px] text-gray-600 leading-tight">
                                <p>30-01013, Muranga.</p>
                                <p>gaturagirls@gmail.com | 0793328863</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <h3 className="font-headline text-lg text-gray-700">{listTitle}</h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-4 no-print">
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Editor Info</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Main Title</Label>
                                <Input value={listTitle} onChange={(e) => setListTitle(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Prepared By</Label>
                                <Input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>
                    <Button variant="outline" className="w-full border-dashed" onClick={handleAddSection}><Plus className="mr-2"/> Add Section</Button>
                </div>

                <div className="lg:col-span-3 space-y-8 print-container">
                    {sections.map((section, idx) => (
                        <SectionCard 
                            key={section.id}
                            index={idx}
                            section={section}
                            studentsMap={studentsMap}
                            isActive={activeSectionId === section.id}
                            onActivate={() => setActiveSectionId(section.id)}
                            onRemoveSection={(id) => setSections(prev => prev.length > 1 ? prev.filter(s => s.id !== id) : prev)}
                            onUpdateTitle={(id, title) => setSections(prev => prev.map(s => s.id === id ? { ...s, title } : s))}
                            onAddStudent={handleAddStudent}
                            onRemoveStudent={handleRemoveStudent}
                        />
                    ))}
                    
                    {/* Print-only footer for window.print() */}
                    <div className="hidden print-container mt-12 pt-8 border-t space-y-8">
                        <div className="grid grid-cols-2 gap-12">
                            <div className="space-y-1">
                                <div className="w-full border-b border-gray-400"></div>
                                <p className="font-semibold text-xs">{preparedBy}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="w-full border-b border-gray-400"></div>
                                <p className="font-semibold text-xs">Date</p>
                            </div>
                        </div>
                        <div className="text-center text-[9px] text-gray-500">
                            <p>Generated by Gatura Hub on {format(new Date(), 'PPPP')}, at {format(new Date(), 'p')} — Page 1 of 1</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ListBuilderClient() {
    const firestore = useFirestore();
    const { user, isUserLoading: authLoading } = useUser();
    const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
    const [selectedList, setSelectedList] = useState<CustomList | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newListTitle, setNewListTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const listsQuery = useMemoFirebase(() => 
        !authLoading && firestore ? query(collection(firestore, 'custom_lists'), orderBy('title', 'asc')) : null
    , [firestore, authLoading]);
    const { data: lists, isLoading } = useCollection<CustomList>(listsQuery);

    const handleCreate = () => {
        if (!newListTitle.trim() || !firestore || !user) return;
        setIsCreating(true);
        const data = {
            title: newListTitle,
            prepared_by: 'Mr. Muthomi (Choir Director)',
            sections: [{ id: 'default', title: 'Main List', student_admission_numbers: [] }],
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
            created_by: user.uid
        };
        addDoc(collection(firestore, 'custom_lists'), data)
            .then((docRef) => {
                setSelectedList({ id: docRef.id, ...data } as any);
                setViewMode('edit');
                setIsCreateDialogOpen(false);
                setNewListTitle('');
            })
            .catch(async () => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: 'custom_lists',
                    operation: 'create',
                    requestResourceData: data
                }));
            })
            .finally(() => setIsCreating(false));
    };

    if (viewMode === 'edit' && selectedList) {
        return <ListEditor list={selectedList} onBack={() => setViewMode('list')} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end"><Button onClick={() => setIsCreateDialogOpen(true)}><ListPlus className="mr-2"/> New List</Button></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {lists?.map(list => (
                    <Card key={list.id}>
                        <CardHeader>
                            <CardTitle>{list.title}</CardTitle>
                            <CardDescription>{list.sections?.length || 1} section(s)</CardDescription>
                        </CardHeader>
                        <CardFooter className="justify-between">
                            <DeleteListButton listId={list.id} listTitle={list.title} />
                            <Button variant="secondary" size="sm" onClick={() => { setSelectedList(list); setViewMode('edit'); }}><Edit className="mr-2 h-4 w-4"/> Manage</Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {isCreateDialogOpen && (
                 <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader><CardTitle>Create New List</CardTitle></CardHeader>
                        <CardContent><Input placeholder="List Title" value={newListTitle} onChange={(e) => setNewListTitle(e.target.value)} /></CardContent>
                        <CardFooter className="justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={isCreating}>{isCreating && <Loader2 className="animate-spin mr-2"/>} Create</Button>
                        </CardFooter>
                    </div>
                 </div>
            )}
        </div>
    );
}
