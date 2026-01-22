'use client';

import type { StudentWithChoirStatus } from '@/lib/types';
import { columns } from './columns';
import { DataTable } from './data-table';

type ChoirManagementClientProps = {
  data: StudentWithChoirStatus[];
};

export default function ChoirManagementClient({ data }: ChoirManagementClientProps) {
  return (
    <div>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
