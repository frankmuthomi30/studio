import PageHeader from '@/components/page-header';
import AttendanceClient from './components/attendance-client';

export default function AttendancePage() {
  return (
    <>
      <PageHeader
        title="Attendance Management"
        subtitle="Create a new session, or click a past session to mark attendance."
      />
      <div className="container mx-auto p-4 md:p-8">
        <AttendanceClient />
      </div>
    </>
  );
}
