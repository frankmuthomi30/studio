'use server';

import { revalidatePath } from 'next/cache';
import { getFirestore, doc, deleteDoc, setDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore/lite';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import type { CustomList } from '@/lib/types';

function getDb() {
    if (!getApps().length) {
        initializeApp(firebaseConfig);
    }
    return getFirestore(getApp());
}

export async function saveList(
  list: Partial<CustomList>
): Promise<{ success: boolean; message: string; id?: string }> {
  const db = getDb();
  
  try {
    if (list.id) {
      // Update existing list
      const listRef = doc(db, 'custom_lists', list.id);
      await setDoc(listRef, { ...list, updated_at: serverTimestamp() }, { merge: true });
      revalidatePath('/list-builder');
      return { success: true, message: `List '${list.title}' has been updated.` };
    } else {
      // Create new list
      const newListData = {
        title: list.title,
        prepared_by: list.prepared_by || '',
        student_admission_numbers: [],
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        // created_by should be current user ID
      };
      const docRef = await addDoc(collection(db, 'custom_lists'), newListData);
      revalidatePath('/list-builder');
      return { success: true, message: `List '${list.title}' has been created.`, id: docRef.id };
    }
  } catch (e: any) {
    console.error('Error in saveList:', e);
    return { success: false, message: e.message || 'Could not save list.' };
  }
}

export async function deleteList(listId: string): Promise<{ success: boolean; message: string }> {
    const db = getDb();
    const listRef = doc(db, 'custom_lists', listId);

    try {
        await deleteDoc(listRef);
        revalidatePath('/list-builder');
        return { success: true, message: 'The list has been deleted.' };
    } catch (e: any) {
        console.error('Error deleting list:', e);
        return { success: false, message: e.message || 'Could not delete list.' };
    }
}
