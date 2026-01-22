# Gatura Girls Choir - App Generation Prompt

Here is a detailed prompt that can be used to generate the "Gatura Girls Choir" attendance management application using an AI code generation assistant.

---

### **Master Prompt:**

"Create a comprehensive Next.js application for Gatura Girls High School to manage their choir attendance. The application should use **Next.js with the App Router**, be styled with **Tailwind CSS** and **ShadCN UI components**, and use **Firebase Firestore** as the backend for all data storage. The application must be fully functional and ready for use by the choir director, Mr. Muthomi.

**Application Structure & Navigation:**

1.  **Main Layout**: Implement a primary layout with a collapsible sidebar for navigation. The sidebar should initially be narrow (icon-only) and expand on hover.
2.  **Navigation Links**: The sidebar must include links to the following pages:
    *   Dashboard
    *   Student Upload
    *   Choir Management
    *   Attendance
    *   Reports
3.  **Login Page**: Create a simple, elegant landing page that serves as a simulated login. It should have a button that navigates the user directly to the `/dashboard`.

**Core Features & Pages:**

**1. Student Data Management (`/upload`):**
    *   Implement a feature to upload student class lists from an Excel file (.xlsx).
    *   The system must flexibly parse columns, recognizing variations like "Admission Number", "Adm No", "Name", "Full Name", etc., and should be case-insensitive.
    *   It should correctly split a "Name" column into `first_name` and `last_name`.
    *   The upload process must be idempotent: it should **update** existing student records (based on their unique "Admission Number") and **add** new students. It should not create duplicates.
    *   Add a "Database Summary" card on this page that provides a live count of the total students and a breakdown of students per class, fetched directly from Firestore.

**2. Choir Management (`/choir`):**
    *   Create a page to view all students in a data table.
    *   The table should be searchable by student name and filterable by choir membership status.
    *   For each student, provide a dropdown menu with actions to manage their choir status:
        *   Add to Choir (Active)
        *   Set to Active
        *   Set to Inactive
        *   Remove from Choir

**3. Attendance Tracking (`/attendance`):**
    *   Allow the user to create a new attendance session by specifying a **date** and a **practice type** (e.g., "Evening Practice").
    *   Upon starting a session, display a clean attendance sheet listing all **active** choir members.
    *   Each student row should have a checkbox to mark them as present (default) or absent.
    *   Include "Mark All Present" and "Mark All Absent" buttons for efficiency.
    *   Provide "Save Session" and "Cancel" buttons. Saving commits the record to Firestore.
    *   Display a list of past attendance sessions on this page. Each item must have a **delete button** that triggers a confirmation dialog before permanently deleting the record.

**4. Dashboard (`/dashboard`):**
    *   This page should be the main overview of choir activity.
    *   Display summary cards with key statistics:
        *   Total active choir members.
        *   Attendance count from the most recent session (e.g., "35 / 40").
        *   Attendance rate percentage for the last session.
    *   Show a list of the 5 most recent attendance sessions. Each item in this list must also have a **delete button** with a confirmation dialog.

**5. Reporting & Exports (`/reports`):**
    *   Create a main reports page that links to two sub-report pages:
        *   **Individual Member Report (`/reports/individual`):**
            *   Allow the user to select a single **choir member** from a dropdown list.
            *   Generate a detailed, printable report showing that student's complete attendance history (date, practice, present/absent) and a summary (total sessions, present, absent, attendance rate).
            *   Include a "Print / Save PDF" button.
            *   The report footer must credit **"Mr. Muthomi (Choir Director)"**.
        *   **Full Choir Register (`/reports/register`):**
            *   Allow the user to select a date range.
            *   Generate a simplified register based on the *first* session found within that range.
            *   This report must only contain three columns: **Admission No., Full Name, Class**.
            *   Below the table, display the total number of present students (e.g., "Total Present: 35 / 40").
            *   Enable an **"Export PDF"** button that generates a professional, **A4 portrait PDF**. The PDF must have a centered header with "Gatura Girls High School" and the report title, using the **"Times New Roman"** font.

**Branding & Styling:**

*   **Logo**: Use the provided school emblem for all branding.
*   **Theme**: Use the specified green-based color theme for primary actions, accents, and highlights.
*   **Typography**: Use 'Playfair Display' for headlines and 'PT Sans' for body text.

**Data Models (Firestore):**

*   **`students` collection**: Document ID should be the `admission_number`. Schema should include `first_name`, `last_name`, `class`, `stream`, `upi`, `common_kcse`, `contacts`.
*   **`choir_members` collection**: Document ID should be the `admission_number`. Schema should include `status`, `date_joined`, etc.
*   **`choir_attendance` collection**: Document ID should be a unique combination of date and practice type. Schema should include `date`, `practice_type`, and an `attendance_map` (object mapping admission numbers to boolean presence).

By following these instructions, you should create the complete Gatura Girls Choir attendance application."

---
