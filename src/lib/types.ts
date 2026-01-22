export type Student = {
  admission_number: string;
  first_name: string;
  last_name: string;
  gender: string;
  class: string;
  stream?: string;
  year?: string;
  uploaded_at?: Date;
  uploaded_by?: string;
};

export type ChoirMember = {
  admission_number: string;
  class: string;
  status: 'active' | 'inactive';
  date_joined: Date;
  added_by?: string;
};

export type AttendanceSession = {
  id: string; // e.g., 2026-02-01_evening
  date: Date;
  practice_type: string;
  class_filter?: string;
  attendance_map: Record<string, boolean>; // admission_number -> true/false
  recorded_by?: string;
  recorded_at?: Date;
  locked: boolean;
};

export type StudentWithChoirStatus = Student & {
  choirMember?: ChoirMember;
};
