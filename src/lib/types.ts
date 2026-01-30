import type { Timestamp } from 'firebase/firestore';

export type Student = {
  id?: string; // Firestore document ID
  admission_number: string;
  first_name: string;
  last_name: string;
  class: string;
  stream?: string;
  year?: string;
  upi?: string;
  common_kcse?: number;
  contacts?: string;
  uploaded_at?: Timestamp;
  uploaded_by?: string;
};

export type Choir = {
  id: string;
  name: string;
  description?: string;
  type?: string;
  created_at: Timestamp;
  created_by?: string;
};

export type ChoirMember = {
  id: string; // Firestore document ID, which is student admission_number
  admission_number: string;
  first_name: string;
  last_name: string;
  class: string;
  status: 'active' | 'inactive';
  date_joined: Timestamp;
  added_by?: string;
};

export type AttendanceSession = {
  id: string; // e.g., 2026-02-01_evening
  choirId: string;
  choirName: string; // Denormalized for display
  date: Timestamp;
  practice_type: string;
  class_filter?: string;
  attendance_map: Record<string, boolean>; // admission_number -> true/false
  recorded_by?: string;
  recorded_at?: Timestamp;
  locked: boolean;
};

// Represents a student with their membership status for a *specific* choir
export type StudentWithChoirStatus = Student & {
  choirMember?: Omit<ChoirMember, 'id' | 'admission_number' | 'first_name' | 'last_name' | 'class'>;
};

export type CustomList = {
  id: string;
  title: string;
  student_admission_numbers: string[];
  prepared_by?: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  created_by?: string;
};
