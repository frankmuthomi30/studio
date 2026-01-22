import type { Timestamp } from 'firebase/firestore';

export type Student = {
  id?: string; // Firestore document ID
  admission_number: string;
  first_name: string;
  last_name: string;
  gender: string;
  class: string;
  stream?: string;
  year?: string;
  uploaded_at?: Timestamp;
  uploaded_by?: string;
};

export type ChoirMember = {
  id?: string; // Firestore document ID, which is student admission_number
  admission_number: string;
  class: string;
  status: 'active' | 'inactive';
  date_joined: Timestamp;
  added_by?: string;
};

export type AttendanceSession = {
  id: string; // e.g., 2026-02-01_evening
  date: Timestamp;
  practice_type: string;
  class_filter?: string;
  attendance_map: Record<string, boolean>; // admission_number -> true/false
  recorded_by?: string;
  recorded_at?: Timestamp;
  locked: boolean;
};

export type StudentWithChoirStatus = Student & {
  choirMember?: ChoirMember;
};
