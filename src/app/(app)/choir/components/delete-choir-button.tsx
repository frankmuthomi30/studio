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
import { doc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type DeleteChoirButtonProps = {
  choirId: string;
  choirName: string;
};

export default function DeleteChoirButton({ choirId, choirName }: DeleteChoirButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleDelete = () => {
    if (!firestore) return;
    startTransition(async () => {
      const choirRef = doc(firestore, 'choirs', choirId);
      const membersRef = collection(firestore, 'choirs', choirId, 'members');

      try {
        const membersSnapshot = await getDocs(membersRef);
        const batch = writeBatch(firestore);

        membersSnapshot.forEach(memberDoc => {
          batch.delete(memberDoc.ref);
        });
        batch.delete(choirRef);

        await batch.commit();
        toast({ title: 'Success', description: 'Choir deleted successfully.' });
      } catch (error: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: choirRef.path,
          operation: 'delete'
        }));
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          <span className="sr-only">Delete Choir</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete <strong>{choirName}</strong> and all its members.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
            Yes, delete choir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}