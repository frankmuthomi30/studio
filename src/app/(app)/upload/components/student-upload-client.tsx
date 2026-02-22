'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { processExcelFile, type VerificationResult, type ParsedStudentData } from '../actions';
import { useUser, useFirestore } from '@/firebase';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileUp, CheckCircle } from 'lucide-react';
import VerificationTable from './verification-table';

const formSchema = z.object({
  file: z.instanceof(File, { message: 'Please upload a file.' }).refine(
    (file) => file.size < 5 * 1024 * 1024,
    'File size must be less than 5MB.'
  ).refine(
    (file) => file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Only .xlsx files are allowed.'
  ),
  className: z.string().min(1, 'Class name is required.'),
});

type FormValues = z.infer<typeof formSchema>;
type UploadStep = 'idle' | 'uploading' | 'preview' | 'commit' | 'complete';

export default function StudentUploadClient() {
  const [step, setStep] = useState<UploadStep>('idle');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [committedCount, setCommittedCount] = useState(0);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { className: '', file: undefined },
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setStep('uploading');
    try {
      const fileBuffer = await values.file.arrayBuffer();
      const base64 = Buffer.from(fileBuffer).toString('base64');
      const result = await processExcelFile(base64, values.className);

      if (result.success && result.data) {
        setVerificationResult(result.data);
        setStep('preview');
      } else {
        toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
        setStep('idle');
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not read file.' });
      setStep('idle');
    }
  };

  const handleCommit = async (data: ParsedStudentData[]) => {
    if (!user || !firestore) return;
    setStep('commit');
    
    const batch = writeBatch(firestore);
    data.forEach(student => {
      const { rowNumber, ...studentData } = student;
      const docRef = doc(firestore, 'students', student.admission_number);
      batch.set(docRef, { 
        ...studentData, 
        uploaded_at: serverTimestamp(),
        uploaded_by: user.uid,
      }, { merge: true });
    });

    try {
      await batch.commit();
      setCommittedCount(data.length);
      setStep('complete');
      toast({ title: 'Success', description: `${data.length} records saved.` });
    } catch (error: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'students',
        operation: 'write'
      }));
      setStep('preview');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Data Upload</CardTitle>
        <CardDescription>Upload class lists to add or update students.</CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'idle' && (
           <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="className"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class / Grade</FormLabel>
                    <FormControl><Input placeholder="e.g., Form 3" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Excel File (.xlsx)</FormLabel>
                    <FormControl><Input type="file" accept=".xlsx" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Upload & Preview</Button>
            </form>
          </Form>
        )}
        
        {step === 'uploading' && <div className="flex flex-col items-center p-8"><Loader2 className="animate-spin h-8 w-8 mb-2" /><p>Analyzing file...</p></div>}
        {step === 'commit' && <div className="flex flex-col items-center p-8"><Loader2 className="animate-spin h-8 w-8 mb-2" /><p>Saving to database...</p></div>}

        {step === 'preview' && verificationResult && (
            <VerificationTable data={verificationResult.data} onCommit={handleCommit} onCancel={() => setStep('idle')} />
        )}

        {step === 'complete' && (
             <div className="flex flex-col items-center p-8 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-2xl font-bold">Upload Successful</h3>
                <p className="text-muted-foreground mb-6">{committedCount} records saved.</p>
                <Button onClick={() => setStep('idle')}>Upload Another</Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}