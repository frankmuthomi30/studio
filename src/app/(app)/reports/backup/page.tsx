'use client';
import PageHeader from '@/components/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ServerCrash, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { backupAllData, restoreAllData } from './actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useUser } from '@/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function BackupPage() {
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const { user } = useUser();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBackup = async () => {
        setIsBackingUp(true);
        toast({ title: 'Starting Backup...', description: 'Gathering all records from the database.' });
        
        const result = await backupAllData();

        if (result.success && result.data) {
            try {
                const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(result.data, null, 2))}`;
                const link = document.createElement("a");
                link.href = jsonString;
                link.download = `gatura-choir-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;

                link.click();
                toast({ title: 'Backup Successful', description: 'Your data file has been downloaded.' });
            } catch (e: any) {
                 toast({ variant: 'destructive', title: 'Download Failed', description: e.message || 'Could not create the download file.' });
            }
        } else {
            toast({ variant: 'destructive', title: 'Backup Failed', description: result.message });
        }

        setIsBackingUp(false);
    }

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result as string;
            try {
                const json = JSON.parse(content);
                await performRestore(json);
            } catch (err) {
                toast({ variant: 'destructive', title: 'Invalid File', description: 'The file you selected is not a valid backup JSON.' });
            }
        };
        reader.readAsText(file);
        // Reset input so the same file can be picked again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    const performRestore = async (jsonData: any) => {
        if (!user) return;
        setIsRestoring(true);
        toast({ title: 'Restoring Data...', description: 'Please do not close your browser.' });

        const result = await restoreAllData(jsonData, user.uid);

        if (result.success) {
            toast({ title: 'Restoration Complete', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Restoration Failed', description: result.message });
        }
        setIsRestoring(false);
    }

    return (
        <>
            <PageHeader
                title="Backup & Restoration"
                subtitle="Safeguard your choir data by downloading backups or restoring from a previous state."
            />
            <div className="container mx-auto p-4 md:p-8 space-y-8">
                <div className="grid gap-8 md:grid-cols-2">
                    {/* Backup Card */}
                    <Card className="flex flex-col border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Download className="text-primary h-5 w-5" />
                                Download Backup
                            </CardTitle>
                            <CardDescription>
                                Create a portable JSON file containing all students, choirs, attendance history, and custom lists.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Regular backups are recommended before making large changes to your student lists or performing end-of-term maintenance.
                            </p>
                        </CardContent>
                        <CardFooter className="pt-6 border-t bg-muted/5">
                            <Button onClick={handleBackup} disabled={isBackingUp || isRestoring} className="w-full">
                                {isBackingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                {isBackingUp ? 'Generating...' : 'Download JSON Backup'}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Restore Card */}
                    <Card className="flex flex-col border-destructive/20 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="text-destructive h-5 w-5" />
                                Restore from File
                            </CardTitle>
                            <CardDescription>
                                Re-import data into the database using a previously downloaded backup file.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4">
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex gap-3 text-amber-800 text-sm">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <p><strong>Warning:</strong> Restoring will merge data. If a record with the same ID already exists, it will be updated with the version from the backup file.</p>
                            </div>
                            <input 
                                type="file" 
                                accept=".json" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleFileSelect} 
                            />
                        </CardContent>
                        <CardFooter className="pt-6 border-t bg-destructive/5">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={isBackingUp || isRestoring} className="w-full">
                                        {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                        {isRestoring ? 'Restoring...' : 'Start Restoration'}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Restoring data is a powerful operation. It will overwrite or update existing records in your database with the content of the backup file.
                                            <br/><br/>
                                            We recommend taking a fresh backup of your current state before proceeding.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => fileInputRef.current?.click()} className="bg-destructive hover:bg-destructive/90">
                                            Yes, I have a backup file
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Administrative Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2 text-muted-foreground">
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            <p>Backups are stored locally on your device once downloaded. The school does not store these in the cloud automatically.</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            <p>Restoration supports all core modules: Students, Choirs, Members, Attendance, and Custom Lists.</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            <p>The system intelligently converts dates during restoration to ensure reports remain accurate.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
