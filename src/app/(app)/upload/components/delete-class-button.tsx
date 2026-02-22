'use client';

import { useTransition } from 'react';
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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type DeleteClassButtonProps = {
  className: string;
  studentCount: number;
};

export default function DeleteClassButton({ className, studentCount }: DeleteClassButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleDelete = () => {
    if (!firestore) return;
    startTransition(async () => {
      try {
        const q = query(collection(firestore, 'students'), where('class', '==', className));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          toast({ title: 'Info', description: 'No students found.' });
          return;
        }

        const batch = writeBatch(firestore);
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();

        toast({ title: 'Success', description: `Deleted ${snap.size} students from ${className}.` });
      } catch (error: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'students',
          operation: 'delete'
        }));
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive h-6 w-6">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Class Data?</AlertDialogTitle>
          <AlertDialogDescription>
            Permanently delete all <strong>{studentCount}</strong> records for <strong>{className}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}