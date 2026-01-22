'use server';
/**
 * @fileOverview Schemas for student data verification.
 */

import {z} from 'zod';

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

export type VerifyStudentDataInput = z.infer<typeof VerifyStudentDataInputSchema>;
const VerifyStudentDataInputSchema = z.array(StudentDataSchema).describe('Array of student data objects to verify.');

const DataIssueSchema = z.object({
  admission_number: z.string().describe('Admission number of the student with the issue'),
  field: z.string().describe('The specific field with a potential error'),
  issue: z.string().describe('Description of the potential issue'),
  suggestion: z.string().describe('Suggested correction for the issue'),
});

export type VerifyStudentDataOutput = z.infer<typeof VerifyStudentDataOutputSchema>;
const VerifyStudentDataOutputSchema = z.array(DataIssueSchema).describe('Array of identified data issues and suggested corrections.');
