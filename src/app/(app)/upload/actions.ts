'use server';

import * as xlsx from 'xlsx';
import { z } from 'zod';
import type { StudentData, VerifyStudentDataOutput } from '@/ai/flows/ai-data-verification';

const StudentDataSchema = z.object({
  admission_number: z.union([z.string(), z.number()]),
  first_name: z.string(),
  last_name: z.string(),
  gender: z.string(),
  stream: z.optional(z.string()),
  year: z.optional(z.union([z.string(), z.number()])),
});

const ExcelRowSchema = z.array(StudentDataSchema);

export type ParsedStudentData = StudentData & {
    rowNumber: number;
    class: string;
};

export type VerificationResult = {
  data: ParsedStudentData[];
  issues: VerifyStudentDataOutput;
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
    // This is a mock implementation.
    // In a real application, you would write this data to Firebase Firestore.
    console.log('Committing data for', students.length, 'students.');
    // Example:
    // const db = getFirestore();
    // const batch = writeBatch(db);
    // students.forEach(student => {
    //   const { rowNumber, ...studentData } = student;
    //   const docRef = doc(db, 'students', student.admission_number);
    //   batch.set(docRef, { ...studentData, uploaded_at: serverTimestamp() }, { merge: true });
    // });
    // await batch.commit();
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network latency

    return { success: true, message: `${students.length} student records have been successfully saved.` };
}
