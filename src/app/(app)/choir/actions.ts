'use server';

import { revalidatePath } from 'next/cache';
import { getFirestore, doc, deleteDoc, setDoc, serverTimestamp, writeBatch, collection, addDoc, getDocs } from 'firebase/firestore/lite';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import type { Student, Choir } from '@/lib/types';

// This is not ideal but server actions need their own initialization.
function getDb() {
    if (!getApps().length) {
        initializeApp(firebaseConfig);
    }
    return getFirestore(getApp());
}

export async function saveChoir(
  choirData: Partial<Choir>
): Promise<{ success: boolean; message: string; id?: string }> {
  const db = getDb();
  
  try {
    if (choirData.id) {
      // Update existing choir
      const choirRef = doc(db, 'choirs', choirData.id);
      await setDoc(choirRef, choirData, { merge: true });
      revalidatePath('/choir');
      return { success: true, message: `Choir '${choirData.name}' has been updated.` };
    } else {
      // Create new choir
      const newChoirData = {
        ...choirData,
        created_at: serverTimestamp(),
        // created_by should be current user ID
      };
      const docRef = await addDoc(collection(db, 'choirs'), newChoirData);
      revalidatePath('/choir');
      return { success: true, message: `Choir '${choirData.name}' has been created.`, id: docRef.id };
    }
  } catch (e: any) {
    console.error('Error in saveChoir:', e);
    return { success: false, message: e.message || 'Could not save choir data.' };
  }
}

export async function deleteChoir(choirId: string): Promise<{ success: boolean; message: string }> {
    const db = getDb();
    const choirRef = doc(db, 'choirs', choirId);
    const membersRef = collection(db, 'choirs', choirId, 'members');

    try {
        // Find all members of the choir to delete them along with the choir
        const membersSnapshot = await getDocs(membersRef);
        const batch = writeBatch(db);

        // Add all member deletions to the batch
        membersSnapshot.forEach(memberDoc => {
            batch.delete(memberDoc.ref);
        });

        // Add the choir document deletion to the batch
        batch.delete(choirRef);

        // Commit the batch
        await batch.commit();
        
        revalidatePath('/choir');
        revalidatePath('/dashboard');
        return { success: true, message: 'Choir and all its members have been deleted.' };
    } catch (e: any) {
        console.error('Error deleting choir and its members:', e);
        return { success: false, message: e.message || 'Could not delete choir and its members.' };
    }
}


export async function addStudentToChoir(
    choirId: string,
    student: Student
): Promise<{ success: boolean; message: string }> {
    const db = getDb();
    const memberRef = doc(db, 'choirs', choirId, 'members', student.admission_number);

    try {
        const memberData = {
            admission_number: student.admission_number,
            first_name: student.first_name,
            last_name: student.last_name,
            class: student.class,
            status: 'active',
            date_joined: serverTimestamp(),
            // added_by should be current user ID
        };
        await setDoc(memberRef, memberData);
        revalidatePath(`/choir/${choirId}`);
        return { success: true, message: `${student.first_name} added to the choir.` };
    } catch (e: any) {
        console.error('Error adding student to choir:', e);
        return { success: false, message: e.message || 'Could not add student.' };
    }
}

export async function removeStudentFromChoir(
    choirId: string,
    admissionNumber: string
): Promise<{ success: boolean; message: string }> {
    const db = getDb();
    const memberRef = doc(db, 'choirs', choirId, 'members', admissionNumber);

    try {
        await deleteDoc(memberRef);
        revalidatePath(`/choir/${choirId}`);
        return { success: true, message: 'Student has been removed from the choir.' };
    } catch (e: any) {
        console.error('Error removing student from choir:', e);
        return { success: false, message: e.message || 'Could not remove student.' };
    }
}

export async function setMemberStatus(
    choirId: string,
    admissionNumber: string,
    status: 'active' | 'inactive'
): Promise<{ success: boolean; message: string }> {
    const db = getDb();
    const memberRef = doc(db, 'choirs', choirId, 'members', admissionNumber);
    try {
        await setDoc(memberRef, { status }, { merge: true });
        revalidatePath(`/choir/${choirId}`);
        return { success: true, message: `Member status updated to ${status}.`};
    } catch(e: any) {
        console.error('Error updating member status:', e);
        return { success: false, message: e.message || 'Could not update status.' };
    }
}
