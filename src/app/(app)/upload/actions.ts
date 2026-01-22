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


const StudentDataSchema = z.object({
  admission_number: z.union([z.string(), z.number()]),
  first_name: z.string(),
  last_name: z.string(),
  gender: z.string(),
  stream: z.optional(z.string()),
  year: z.optional(z.union([z.string(), z.number()])),
});

export type ParsedStudentData = Omit<Student, 'id' | 'uploaded_at'> & {
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
    const jsonData = xlsx.utils.sheet_to_json(worksheet);
    
    // Basic validation for mandatory columns
    if (jsonData.length > 0) {
        const firstRow = jsonData[0] as any;
        const requiredKeys = ['admission_number', 'first_name', 'last_name', 'gender'];
        for (const key of requiredKeys) {
            if (!(key in firstRow)) {
                return { success: false, error: `Missing mandatory column: "${key}"` };
            }
        }
    }

    const parsedData: ParsedStudentData[] = jsonData.map((row: any, index: number) => ({
      ...row,
      admission_number: String(row.admission_number),
      year: row.year ? String(row.year) : undefined,
      rowNumber: index + 2, // Excel rows are 1-based, plus header
      class: className,
    }));
    
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
