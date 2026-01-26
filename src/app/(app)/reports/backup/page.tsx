'use client';
import PageHeader from '@/components/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ServerCrash } from 'lucide-react';
import { useState } from 'react';
import { backupAllData } from './actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function BackupPage() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleBackup = async () => {
        setIsLoading(true);
        toast({ title: 'Starting Backup...', description: 'Please wait while we gather all your data.' });
        
        const result = await backupAllData();

        if (result.success && result.data) {
            try {
                const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(result.data, null, 2))}`;
                const link = document.createElement("a");
                link.href = jsonString;
                link.download = `gatura-choir-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;

                link.click();
                toast({ title: 'Backup Successful', description: 'Your data has been downloaded.' });
            } catch (e: any) {
                 toast({ variant: 'destructive', title: 'Download Failed', description: e.message || 'Could not create the download file.' });
            }
        } else {
            toast({ variant: 'destructive', title: 'Backup Failed', description: result.message });
        }

        setIsLoading(false);
    }

    return (
        <>
            <PageHeader
                title="Backup & Export"
                subtitle="Download a complete backup of all your application data."
            />
            <div className="container mx-auto p-4 md:p-8">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>Download All Data</CardTitle>
                        <CardDescription>
                            This will generate and download a single JSON file containing all students, choirs, choir members, and attendance records.
                            Store this file in a safe place. Please note that a restore function is not yet available within the app.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-r-md">
                            <h4 className="font-bold flex items-center gap-2"><ServerCrash /> Important</h4>
                            <p className="text-sm">
                                The restore functionality is a complex manual process. This backup is for archival purposes and emergency recovery performed by a technical administrator.
                            </p>
                        </div>
                        <div className="mt-6 flex justify-center">
                            <Button onClick={handleBackup} disabled={isLoading} size="lg">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                {isLoading ? 'Generating Backup...' : 'Generate & Download Backup'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
