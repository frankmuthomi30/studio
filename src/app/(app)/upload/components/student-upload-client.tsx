'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { processExcelFile, commitStudentData, type VerificationResult, type ParsedStudentData } from '../actions';
import { useUser } from '@/firebase';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileUp, CheckCircle } from 'lucide-react';
import VerificationTable from './verification-table';

const formSchema = z.object({
  file: z.instanceof(File, { message: 'Please upload a file.' }).refine(
    (file) => file.size < 5 * 1024 * 1024, // 5MB limit
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
  const [committedData, setCommittedData] = useState<ParsedStudentData[]>([]);
  const { user } = useUser();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      className: '',
      file: undefined,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setStep('uploading');
    setVerificationResult(null);

    try {
      const fileBuffer = await values.file.arrayBuffer();
      const base64 = Buffer.from(fileBuffer).toString('base64');
      const result = await processExcelFile(base64, values.className);

      if (result.success && result.data) {
        setVerificationResult(result.data);
        setStep('preview');
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: result.error || 'An unknown error occurred.',
        });
        setStep('idle');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: 'Could not read the uploaded file.',
      });
      setStep('idle');
    }
  };

  const handleCommit = async (data: ParsedStudentData[]) => {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Commit Failed',
            description: 'You must be logged in to commit data.',
        });
        return;
    }
    setStep('commit');
    const result = await commitStudentData(data, user.uid);
    if (result.success) {
        toast({
            title: 'Success!',
            description: result.message,
        });
        setCommittedData(data);
        setStep('complete');
    } else {
        toast({
            variant: 'destructive',
            title: 'Commit Failed',
            description: result.message,
        });
        setStep('preview');
    }
  }

  const handleReset = () => {
    form.reset({ file: undefined, className: '' });
    setVerificationResult(null);
    setCommittedData([]);
    setStep('idle');
  }

  const isProcessing = step === 'uploading' || step === 'commit';

  const descriptions: Record<UploadStep, string> = {
    idle: 'Select an Excel file and specify the class. This will add any new students and update the details for existing ones based on their admission number.',
    uploading: 'Processing your file. Please wait...',
    preview: 'Review the parsed data. Committing will add new students and update the details of existing students.',
    commit: 'Saving data to the database...',
    complete: `Upload complete! ${committedData.length} student records were successfully saved or updated.`,
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Data Upload</CardTitle>
        <CardDescription>
          {descriptions[step]}
        </CardDescription>
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
                    <FormControl>
                      <Input placeholder="e.g., Form 3 or Grade 11" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Excel File (.xlsx)</FormLabel>
                    <FormControl>
                       <Input 
                        type="file" 
                        accept=".xlsx"
                        onChange={(e) => onChange(e.target.files?.[0])}
                        {...rest}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin" /> : <FileUp />}
                Upload & Preview
              </Button>
            </form>
          </Form>
        )}
        
        {isProcessing && (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg">{step === 'uploading' ? 'Analyzing file...' : 'Committing data...'}</p>
            </div>
        )}

        {step === 'preview' && verificationResult && (
            <VerificationTable 
                data={verificationResult.data} 
                onCommit={handleCommit}
                onCancel={handleReset}
            />
        )}

        {step === 'complete' && (
             <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <h3 className="text-2xl font-bold">Upload Successful</h3>
                <p className="max-w-md text-muted-foreground">
                    {committedData.length > 0 && `The data for ${committedData[0].class} has been saved.`} You can now manage these students in the Choir Management section.
                </p>
                <Button onClick={handleReset}>
                    Upload Another File
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
