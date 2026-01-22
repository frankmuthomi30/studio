import PageHeader from '@/components/page-header';
import AttendanceClient from './components/attendance-client';

export default function AttendancePage() {
  return (
    <>
      <PageHeader
        title="Attendance Recording"
        subtitle="Create a new session or view past attendance records."
      />
      <div className="container mx-auto p-4 md:p-8">
        <AttendanceClient />
      </div>
    </>
  );
}
