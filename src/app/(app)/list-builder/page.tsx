import PageHeader from '@/components/page-header';
import ListBuilderClient from './components/list-builder-client';

export default function ListBuilderPage() {
  return (
    <>
      <PageHeader
        title="Custom List Builder"
        subtitle="Create and print custom lists of students for any purpose."
      />
      <div className="container mx-auto p-4 md:p-8">
        <ListBuilderClient />
      </div>
    </>
  );
}
