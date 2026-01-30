'use server';

import * as xlsx from 'xlsx';
import { z } from 'zod';
import { getFirestore, doc, writeBatch, serverTimestamp, query, where, getDocs, collection } from 'firebase/firestore/lite';
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
  fileAsBase64: string,
  className: string
): Promise<{ success: boolean; data?: VerificationResult; error?: string }> {
  try {
    const fileBuffer = Buffer.from(fileAsBase64, 'base64');
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[] = xlsx.utils.sheet_to_json(worksheet, { raw: false });
    
    if (jsonData.length === 0) {
        return { success: false, error: 'The uploaded Excel file is empty or has no data rows.' };
    }

    const firstRow = jsonData[0];
    const headers = Object.keys(firstRow);
    
    const headerMap: { [key: string]: string } = {};
    headers.forEach(header => {
        headerMap[header.toLowerCase().trim()] = header;
    });

    const findHeader = (possibleNames: string[]): string | undefined => {
        for (const name of possibleNames) {
            if (headerMap[name.toLowerCase()]) {
                return headerMap[name.toLowerCase()];
            }
        }
        return undefined;
    }

    const admissionHeader = findHeader(['Admission Number', 'Adm No', 'Admission No']);
    const nameHeader = findHeader(['Name', 'Full Name']);
    const streamHeader = findHeader(['Stream']);
    const upiHeader = findHeader(['UPI']);
    const kcseHeader = findHeader(['common.kcse', 'KCSE', 'KCSE Score']);
    const contactsHeader = findHeader(['Contacts', 'Contact', 'Phone Number']);

    if (!admissionHeader || !nameHeader) {
        let missing = [];
        if (!admissionHeader) missing.push("'Admission Number' or 'Adm No'");
        if (!nameHeader) missing.push("'Name' or 'Full Name'");
        return { success: false, error: `Missing mandatory columns: ${missing.join(', ')}. Please check your file.` };
    }

    const parsedData: ParsedStudentData[] = jsonData.map((row: any, index: number) => {
      const name = row[nameHeader] || '';
      const nameParts = name.trim().split(' ');
      const first_name = nameParts.shift() || '';
      const last_name = nameParts.join(' ');
      
      return {
        admission_number: String(row[admissionHeader]),
        first_name,
        last_name,
        class: className,
        stream: streamHeader && row[streamHeader] ? String(row[streamHeader]) : undefined,
        upi: upiHeader && row[upiHeader] ? String(row[upiHeader]) : undefined,
        common_kcse: kcseHeader && row[kcseHeader] ? Number(row[kcseHeader]) : undefined,
        contacts: contactsHeader && row[contactsHeader] ? String(row[contactsHeader]) : undefined,
        rowNumber: index + 2,
      };
    });
    
    return { success: true, data: { data: parsedData, issues: [] } };
  } catch (error) {
    console.error('Error processing Excel file:', error);
    return { success: false, error: 'Failed to process the Excel file. Please ensure it is a valid .xlsx file.' };
  }
}

export async function commitStudentData(students: ParsedStudentData[], userId: string): Promise<{ success: boolean; message: string }> {
    const db = getDb();
    const batch = writeBatch(db);
    
    students.forEach(student => {
      const { rowNumber, ...studentData } = student;
      const docRef = doc(db, 'students', student.admission_number);
      batch.set(docRef, { 
          ...studentData, 
          uploaded_at: serverTimestamp(),
          uploaded_by: userId,
        }, { merge: true });
    });
    
    try {
        await batch.commit();
        revalidatePath('/upload');
        revalidatePath('/choir');
        revalidatePath('/dashboard');
        return { success: true, message: `${students.length} student records have been successfully saved.` };
    } catch (e: any) {
        console.error('Error committing student data:', e);
        return { success: false, message: e.message || 'Failed to save student records.' };
    }
}

export async function deleteStudentsByClass(className: string): Promise<{ success: boolean; message: string }> {
    const db = getDb();
    
    try {
        const studentsQuery = query(collection(db, 'students'), where('class', '==', className));
        const querySnapshot = await getDocs(studentsQuery);

        if (querySnapshot.empty) {
            return { success: true, message: `No students found for class '${className}'. Nothing to delete.` };
        }

        const batch = writeBatch(db);
        querySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        
        revalidatePath('/upload');
        revalidatePath('/choir');
        revalidatePath('/dashboard');

        return { success: true, message: `Successfully deleted ${querySnapshot.size} students from class '${className}'.` };
    } catch (e: any) {
        console.error(`Error deleting students for class ${className}:`, e);
        return { success: false, message: e.message || `Failed to delete students for class '${className}'.` };
    }
}
