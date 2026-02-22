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
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type DeleteListButtonProps = {
  listId: string;
  listTitle: string;
};

export default function DeleteListButton({ listId, listTitle }: DeleteListButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleDelete = () => {
    if (!firestore) return;
    startTransition(async () => {
      const listRef = doc(firestore, 'custom_lists', listId);
      
      deleteDoc(listRef)
        .then(() => {
          toast({
            title: 'Success!',
            description: `List '${listTitle}' has been deleted.`,
          });
        })
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: listRef.path,
            operation: 'delete'
          }));
        });
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete List</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the list: <strong>{listTitle}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
            Yes, delete list
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
