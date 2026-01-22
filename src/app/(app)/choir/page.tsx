import PageHeader from '@/components/page-header';
import ChoirManagementClient from './components/choir-management-client';
import { getStudentsWithChoirStatus } from '@/lib/mock-data';

export default async function ChoirManagementPage() {
  // In a real app, this data would be fetched from Firestore.
  const studentsWithStatus = getStudentsWithChoirStatus();

  return (
    <>
      <PageHeader
        title="Choir Management"
        subtitle="View all students and manage their choir membership status."
      />
      <div className="container mx-auto p-4 md:p-8">
        <ChoirManagementClient data={studentsWithStatus} />
      </div>
    </>
  );
}
