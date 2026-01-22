// This file is machine-generated - edit at your own risk!
'use server';
/**
 * @fileOverview Implements the AI-powered data verification for uploaded student data.
 *
 * - verifyStudentData - An asynchronous function that takes student data as input, uses AI to identify potential errors and inconsistencies, and returns a list of suggested corrections.
 * - VerifyStudentDataInput - The input type for the verifyStudentData function.
 * - VerifyStudentDataOutput - The output type for the verifyStudentData function, representing suggested corrections.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StudentDataSchema = z.object({
  admission_number: z.string().describe('Unique admission number of the student'),
  first_name: z.string().describe('First name of the student'),
  last_name: z.string().describe('Last name of the student'),
  gender: z.string().describe('Gender of the student'),
  class: z.string().describe('Class or grade of the student'),
  stream: z.string().optional().describe('Stream of the student, if applicable'),
  year: z.string().optional().describe('Year of admission or enrollment'),
});

export type StudentData = z.infer<typeof StudentDataSchema>;

const VerifyStudentDataInputSchema = z.array(StudentDataSchema).describe('Array of student data objects to verify.');
export type VerifyStudentDataInput = z.infer<typeof VerifyStudentDataInputSchema>;

const DataIssueSchema = z.object({
  admission_number: z.string().describe('Admission number of the student with the issue'),
  field: z.string().describe('The specific field with a potential error'),
  issue: z.string().describe('Description of the potential issue'),
  suggestion: z.string().describe('Suggested correction for the issue'),
});

const VerifyStudentDataOutputSchema = z.array(DataIssueSchema).describe('Array of identified data issues and suggested corrections.');
export type VerifyStudentDataOutput = z.infer<typeof VerifyStudentDataOutputSchema>;

export async function verifyStudentData(input: VerifyStudentDataInput): Promise<VerifyStudentDataOutput> {
  return verifyStudentDataFlow(input);
}

const verifyStudentDataPrompt = ai.definePrompt({
  name: 'verifyStudentDataPrompt',
  input: {schema: VerifyStudentDataInputSchema},
  output: {schema: VerifyStudentDataOutputSchema},
  prompt: `You are an AI assistant designed to review student data and identify potential errors or inconsistencies.

  Analyze the following array of student data objects. For each student, check for missing fields, incorrect formatting, or any other potential issues that could compromise data quality.

  For each identified issue, create an object with the student's admission_number, the field with the issue, a description of the issue, and a suggested correction.

  Return an array of these objects. If no issues are found, return an empty array.

  Here is the student data:
  {{JSON.stringify input}}
  
  Output the response as a JSON array.
  `,
});

const verifyStudentDataFlow = ai.defineFlow(
  {
    name: 'verifyStudentDataFlow',
    inputSchema: VerifyStudentDataInputSchema,
    outputSchema: VerifyStudentDataOutputSchema,
  },
  async input => {
    const {output} = await verifyStudentDataPrompt(input);
    return output!;
  }
);
