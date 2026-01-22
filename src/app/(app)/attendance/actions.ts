'use server';

import type { AttendanceSession } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function saveAttendanceSession(
  sessionData: Omit<AttendanceSession, 'id' | 'recorded_at' | 'locked'>
): Promise<{ success: boolean; message: string }> {
  const newSession: AttendanceSession = {
    ...sessionData,
    id: `${sessionData.date.toISOString().split('T')[0]}_${sessionData.practice_type.toLowerCase().replace(' ', '-')}`,
    recorded_at: new Date(),
    locked: false,
  };

  console.log('Saving new attendance session:', newSession);

  // This is a mock implementation.
  // In a real application, you would write this to the `choir_attendance` collection in Firestore.
  // e.g., await setDoc(doc(db, 'choir_attendance', newSession.id), newSession);
  
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network latency
  
  revalidatePath('/attendance');

  return { success: true, message: 'Attendance session has been saved successfully.' };
}
