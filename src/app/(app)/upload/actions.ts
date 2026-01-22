'use server';

import * as xlsx from 'xlsx';
import { z } from 'zod';
import { getFirestore, doc, writeBatch, serverTimestamp } from 'firebase/firestore/lite';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import type { Student } from '@/lib/types';
import { revalidatePath } from 'next/cache';

// This is not ideal but server actions need their own initialization.
function getDb() {
    if (!getApps().length) {
        initializeApp(firebaseConfig);
    }
    return getFirestore(getApp());
}

// Omit 'uploaded_by' as well, since it's added on the server
export type ParsedStudentData = Omit<Student, 'id' | 'uploaded_at' | 'uploaded_by'> & {
    rowNumber: number;
};


export type VerificationResult = {
  data: ParsedStudentData[];
  issues: any[]; // AI feature removed
};

export async function processExcelFile(
  fileBuffer: Buffer,
  className: string
): Promise<{ success: boolean; data?: VerificationResult; error?: string }> {
  try {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { raw: false });
    
    // Basic validation for mandatory columns
    if (jsonData.length > 0) {
        const firstRow = jsonData[0] as any;
        const requiredKeys = ['Admission Number', 'Name', 'Gender'];
        for (const key of requiredKeys) {
            if (!(key in firstRow)) {
                return { success: false, error: `Missing mandatory column: "${key}". Column names are case-sensitive.` };
            }
        }
    }

    const parsedData: ParsedStudentData[] = jsonData.map((row: any, index: number) => {
      const name = row['Name'] || '';
      const nameParts = name.trim().split(' ');
      const first_name = nameParts.shift() || '';
      const last_name = nameParts.join(' ');
      
      return {
        admission_number: String(row['Admission Number']),
        first_name,
        last_name,
        gender: row['Gender'],
        class: className,
        stream: row['Stream'] ? String(row['Stream']) : undefined,
        upi: row['UPI'] ? String(row['UPI']) : undefined,
        common_kcse: row['common.kcse'] ? Number(row['common.kcse']) : undefined,
        contacts: row['Contacts'] ? String(row['Contacts']) : undefined,
        rowNumber: index + 2,
      };
    });
    
    return { success: true, data: { data: parsedData, issues: [] } };
  } catch (error) {
    console.error('Error processing Excel file:', error);
    return { success: false, error: 'Failed to process the Excel file. Please ensure it is a valid .xlsx file.' };
  }
}

export async function commitStudentData(students: ParsedStudentData[]): Promise<{ success: boolean; message: string }> {
    const db = getDb();
    const batch = writeBatch(db);
    
    students.forEach(student => {
      const { rowNumber, ...studentData } = student;
      const docRef = doc(db, 'students', student.admission_number);
      batch.set(docRef, { 
          ...studentData, 
          uploaded_at: serverTimestamp(),
          // uploaded_by should be current user ID
        }, { merge: true });
    });
    
    try {
        await batch.commit();
        revalidatePath('/choir');
        revalidatePath('/dashboard');
        return { success: true, message: `${students.length} student records have been successfully saved.` };
    } catch (e: any) {
        console.error('Error committing student data:', e);
        return { success: false, message: e.message || 'Failed to save student records.' };
    }
}
