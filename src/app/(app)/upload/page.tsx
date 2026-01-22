import PageHeader from '@/components/page-header';
import StudentUploadClient from './components/student-upload-client';

export default function StudentUploadPage() {
  return (
    <>
      <PageHeader
        title="Student Data Import"
        subtitle="Upload Excel files to add or update student master data."
      />
      <div className="container mx-auto p-4 md:p-8">
        <StudentUploadClient />
      </div>
    </>
  );
}
