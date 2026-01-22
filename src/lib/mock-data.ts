import type { Student, ChoirMember, AttendanceSession, StudentWithChoirStatus } from './types';

export const mockStudents: Student[] = [
  { admission_number: 'S001', first_name: 'John', last_name: 'Doe', gender: 'Male', class: 'Form 3', stream: 'A', year: '2026', uploaded_at: new Date() },
  { admission_number: 'S002', first_name: 'Jane', last_name: 'Smith', gender: 'Female', class: 'Form 3', stream: 'B', year: '2026', uploaded_at: new Date() },
  { admission_number: 'S003', first_name: 'Peter', last_name: 'Jones', gender: 'Male', class: 'Form 4', stream: 'A', year: '2026', uploaded_at: new Date() },
  { admission_number: 'S004', first_name: 'Mary', last_name: 'Williams', gender: 'Female', class: 'Form 3', stream: 'A', year: '2026', uploaded_at: new Date() },
  { admission_number: 'S005', first_name: 'David', last_name: 'Brown', gender: 'Male', class: 'Grade 11', year: '2026', uploaded_at: new Date() },
  { admission_number: 'S006', first_name: 'Susan', last_name: 'Miller', gender: 'Female', class: 'Grade 11', year: '2026', uploaded_at: new Date() },
  { admission_number: 'S007', first_name: 'Michael', last_name: 'Davis', gender: 'Male', class: 'Form 3', stream: 'B', year: '2026', uploaded_at: new Date() },
  { admission_number: 'S008', first_name: 'Linda', last_name: 'Garcia', gender: 'Female', class: 'Form 4', stream: 'A', year: '2026', uploaded_at: new Date() },
  { admission_number: 'S009', first_name: 'James', last_name: 'Rodriguez', gender: 'Male', class: 'Form 3', stream: 'C', year: '2026', uploaded_at: new Date() },
  { admission_number: 'S010', first_name: 'Patricia', last_name: 'Martinez', gender: 'Female', class: 'Grade 11', year: '2026', uploaded_at: new Date() },
];

export const mockChoirMembers: ChoirMember[] = [
  { admission_number: 'S001', class: 'Form 3', status: 'active', date_joined: new Date('2025-01-15') },
  { admission_number: 'S002', class: 'Form 3', status: 'active', date_joined: new Date('2025-01-15') },
  { admission_number: 'S003', class: 'Form 4', status: 'inactive', date_joined: new Date('2024-05-20') },
  { admission_number: 'S004', class: 'Form 3', status: 'active', date_joined: new Date('2025-02-01') },
  { admission_number: 'S005', class: 'Grade 11', status: 'active', date_joined: new Date('2025-02-01') },
  { admission_number: 'S006', class: 'Grade 11', status: 'active', date_joined: new Date('2025-02-10') },
  { admission_number: 'S008', class: 'Form 4', status: 'active', date_joined: new Date('2024-09-10') },
  { admission_number: 'S010', class: 'Grade 11', status: 'active', date_joined: new Date('2025-03-01') },
];

export const mockAttendanceSessions: AttendanceSession[] = [
    {
        id: '2026-02-01_evening',
        date: new Date('2026-02-01'),
        practice_type: 'Evening Practice',
        attendance_map: {
            'S001': true, 'S002': true, 'S004': false, 'S005': true, 'S006': true, 'S008': true, 'S010': true
        },
        recorded_at: new Date(),
        locked: true,
    },
    {
        id: '2026-02-08_evening',
        date: new Date('2026-02-08'),
        practice_type: 'Evening Practice',
        attendance_map: {
            'S001': true, 'S002': false, 'S004': true, 'S005': true, 'S006': true, 'S008': true, 'S010': false
        },
        recorded_at: new Date(),
        locked: true,
    },
    {
        id: '2026-02-15_special',
        date: new Date('2026-02-15'),
        practice_type: 'Special Rehearsal',
        attendance_map: {
            'S001': true, 'S002': true, 'S004': true, 'S005': true, 'S006': false, 'S008': true, 'S010': true
        },
        recorded_at: new Date(),
        locked: false,
    }
];

export const getStudentsWithChoirStatus = (): StudentWithChoirStatus[] => {
  return mockStudents.map(student => {
    const choirMember = mockChoirMembers.find(cm => cm.admission_number === student.admission_number);
    return {
      ...student,
      choirMember: choirMember
    };
  });
}
