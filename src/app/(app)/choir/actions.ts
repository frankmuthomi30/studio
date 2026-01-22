'use server';

import { revalidatePath } from 'next/cache';
import { getFirestore, doc, deleteDoc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore/lite';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

// This is not ideal but server actions need their own initialization.
function getDb() {
    if (!getApps().length) {
        initializeApp(firebaseConfig);
    }
    return getFirestore(getApp());
}


export async function updateChoirStatus(
  admission_number: string,
  newStatus: 'active' | 'inactive' | 'not_member',
  studentClass: string,
): Promise<{ success: boolean; message: string }> {
  const db = getDb();
  const memberRef = doc(db, 'choir_members', admission_number);

  try {
    if (newStatus === 'not_member') {
      await deleteDoc(memberRef);
    } else {
      const docSnap = await getDoc(memberRef);
      if (docSnap.exists()) {
        // Update existing member
        await setDoc(memberRef, { status: newStatus }, { merge: true });
      } else {
        // Create new member
        const memberData = {
          admission_number,
          status: newStatus,
          class: studentClass,
          date_joined: serverTimestamp(),
          // added_by: should be current user ID, but auth is not setup here for server action
        };
        await setDoc(memberRef, memberData);
      }
    }
  
    revalidatePath('/choir');
    revalidatePath('/dashboard');
    return { success: true, message: `Student ${admission_number} status updated to ${newStatus}.` };
  } catch (e: any) {
    console.error('Error in updateChoirStatus:', e);
    return { success: false, message: e.message || 'Could not update choir status.' };
  }
}
