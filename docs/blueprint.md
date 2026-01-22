# **App Name**: ChoirMaster

## Core Features:

- Student Data Import: Import student data from Excel files, automatically detecting class and year where possible. Validates and uploads data to Firestore.
- Choir Membership Management: Manage choir membership by setting status (active/inactive) and recording join dates.
- Attendance Recording: Record attendance for each session, marking students present or absent. Lock sessions to prevent modification.
- Individual Attendance Report: Generate printable individual attendance reports with student details, attendance records, summaries, and signature lines.
- Full Choir Attendance Register: Generate a printable and exportable register-style report for the entire choir, with options for date range, class, and term filtering. Export to PDF and Excel.
- AI-Powered Data Verification Tool: Use AI to help detect possible errors, omissions, or formatting mistakes in uploaded files, before those files are committed to Firestore. It's used as a tool to check work; results can be overridden.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5), reflecting the trust, knowledge and stability of an academic environment.
- Background color: Very light blue (#F0F4FF), provides a clean and unobtrusive backdrop.
- Accent color: Orange (#FF9800), for highlighting key actions.
- Body font: 'PT Sans', sans-serif.
- Headline font: 'Playfair', modern serif; using 'PT Sans' for body.
- Use material design icons for a clean and consistent look.
- Grid-based layout to ensure consistent alignment and readability across all reports.