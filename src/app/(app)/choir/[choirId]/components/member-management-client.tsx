'use client';

import type { StudentWithChoirStatus } from '@/lib/types';
import { columns } from './columns';
import { DataTable } from './data-table';

type MemberManagementClientProps = {
  choirId: string;
  choirName: string;
  data: StudentWithChoirStatus[];
  userId?: string;
};

export default function MemberManagementClient({ choirId, choirName, data, userId }: MemberManagementClientProps) {
  return (
    <div>
      <DataTable columns={columns({ choirId, choirName })} data={data} meta={{ userId }} />
    </div>
  );
}
