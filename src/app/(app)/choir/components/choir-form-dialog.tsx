'use client';

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { saveChoir } from '../actions';
import { type Choir } from '@/lib/types';
import { useEffect, useTransition } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(3, { message: 'Choir name must be at least 3 characters long.' }),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type ChoirFormDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  choir: Choir | null;
};

export default function ChoirFormDialog({ isOpen, setIsOpen, choir }: ChoirFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (choir) {
      form.reset({
        name: choir.name,
        description: choir.description || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
      });
    }
  }, [choir, form, isOpen]);

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    startTransition(async () => {
      const payload: Partial<Choir> = {
        ...values,
      };
      if (choir?.id) {
        payload.id = choir.id;
      }

      const result = await saveChoir(payload);

      if (result.success) {
        toast({
          title: 'Success!',
          description: result.message,
        });
        setIsOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{choir ? 'Edit Choir' : 'Create New Choir'}</DialogTitle>
          <DialogDescription>
            {choir ? `Update the details for ${choir.name}.` : 'Fill in the details for your new choir.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Choir Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Senior Choir" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A brief description of the choir's purpose or members." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {choir ? 'Save Changes' : 'Create Choir'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
