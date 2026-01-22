import PageHeader from '@/components/page-header';
import StudentUploadClient from './components/student-upload-client';

export default function StudentUploadPage() {
  return (
    <>
      <PageHeader
        title="Student Data Import"
        subtitle="Upload the latest class list. The system will automatically add new students and update the details of existing ones."
      />
      <div className="container mx-auto p-4 md:p-8">
        <StudentUploadClient />
      </div>
    </>
  );
}
