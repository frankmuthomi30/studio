'use server';

import type { AttendanceSession } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getFirestore, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore/lite';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { Timestamp } from 'firebase/firestore/lite';

function getDb() {
    if (!getApps().length) {
        initializeApp(firebaseConfig);
    }
    return getFirestore(getApp());
}

export async function saveAttendanceSession(
  sessionData: Omit<AttendanceSession, 'id' | 'recorded_at' | 'locked' | 'date'> & { date: Date }
): Promise<{ success: boolean; message: string }> {
  const db = getDb();
  
  const id = `${sessionData.date.toISOString().split('T')[0]}_${sessionData.choirId}_${sessionData.practice_type.toLowerCase().replace(/\s+/g, '-')}`;
  
  const newSession: Omit<AttendanceSession, 'id'> = {
    ...sessionData,
    date: Timestamp.fromDate(sessionData.date),
    recorded_at: serverTimestamp(),
    locked: false,
    // recorded_by: should be current user ID
  };
  
  const sessionRef = doc(db, 'choir_attendance', id);

  try {
    await setDoc(sessionRef, newSession, { merge: true });
    revalidatePath('/attendance');
    revalidatePath('/dashboard');
    return { success: true, message: 'Attendance session has been saved successfully.' };
  } catch (e: any) {
    console.error('Error saving attendance session:', e);
    return { success: false, message: e.message || 'Failed to save attendance session.' };
  }
}

export async function deleteAttendanceSession(sessionId: string): Promise<{ success: boolean; message: string }> {
  const db = getDb();
  const sessionRef = doc(db, 'choir_attendance', sessionId);

  try {
    await deleteDoc(sessionRef);
    revalidatePath('/attendance');
    revalidatePath('/dashboard');
    return { success: true, message: 'Attendance session has been deleted successfully.' };
  } catch (e: any) {
    console.error('Error deleting attendance session:', e);
    return { success: false, message: e.message || 'Failed to delete attendance session.' };
  }
}
