'use client';

import type { ColumnDef, Table } from '@tanstack/react-table';
import type { Student, StudentWithChoirStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, MoreHorizontal, CheckCircle, XCircle, UserPlus, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTransition } from 'react';
import { addStudentToChoir, removeStudentFromChoir, setMemberStatus } from '../../actions';
import { useToast } from '@/hooks/use-toast';

const StatusBadge = ({ status }: { status: 'active' | 'inactive' | 'not_member' }) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500 hover:bg-green-600">Active Member</Badge>;
    case 'inactive':
      return <Badge variant="secondary">Inactive Member</Badge>;
    default:
      return <Badge variant="outline">Not a Member</Badge>;
  }
};

type ColumnsFnProps = {
  choirId: string;
  choirName: string;
}

export const columns = ({ choirId, choirName }: ColumnsFnProps ): ColumnDef<StudentWithChoirStatus>[] => [
  {
    accessorKey: 'admission_number',
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Admission No.
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    cell: ({ row }) => <div className="pl-4">{row.getValue('admission_number')}</div>,
  },
  {
    accessorFn: row => `${row.first_name} ${row.last_name}`,
    id: 'fullName',
    header: 'Full Name',
  },
  {
    accessorKey: 'class',
    header: 'Class',
  },
  {
    id: 'status',
    accessorFn: row => row.choirMember?.status ?? 'not_member',
    header: 'Choir Status',
    cell: ({ row }) => {
      const status = row.original.choirMember?.status ? row.original.choirMember.status : 'not_member';
      return <StatusBadge status={status} />;
    },
    filterFn: (row, id, value) => {
        const rowStatus = row.original.choirMember?.status || 'not_member';
        return value.includes(rowStatus);
    },
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const student = row.original;
      const [isPending, startTransition] = useTransition();
      const { toast } = useToast();
      const { userId } = table.options.meta as { userId?: string };

      const handleAdd = () => {
        if (!userId) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to add a student.' });
            return;
        }
        startTransition(async () => {
          const plainStudent: Partial<Student> = {
            admission_number: student.admission_number,
            first_name: student.first_name,
            last_name: student.last_name,
            class: student.class,
          };
          const result = await addStudentToChoir(choirId, plainStudent as Student, userId);
          if (result.success) {
            toast({ title: 'Success', description: result.message });
          } else {
            toast({ variant: 'destructive', title: 'Error', description: result.message });
          }
        });
      };

      const handleRemove = () => {
        startTransition(async () => {
            const result = await removeStudentFromChoir(choirId, student.admission_number);
            if (result.success) {
              toast({ title: 'Success', description: result.message });
            } else {
              toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
          });
      }

      const handleSetStatus = (newStatus: 'active' | 'inactive') => {
        startTransition(async () => {
            const result = await setMemberStatus(choirId, student.admission_number, newStatus);
            if (result.success) {
              toast({ title: 'Success', description: result.message });
            } else {
              toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
          });
      }

      const isMember = !!student.choirMember;
      const isActive = student.choirMember?.status === 'active';

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions for {choirName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!isMember && (
              <DropdownMenuItem onClick={handleAdd}>
                <UserPlus className="mr-2 h-4 w-4" /> Add to Choir
              </DropdownMenuItem>
            )}
            {isMember && !isActive && (
              <DropdownMenuItem onClick={() => handleSetStatus('active')}>
                <CheckCircle className="mr-2 h-4 w-4" /> Set to Active
              </DropdownMenuItem>
            )}
            {isMember && isActive && (
              <DropdownMenuItem onClick={() => handleSetStatus('inactive')}>
                <UserX className="mr-2 h-4 w-4" /> Set to Inactive
              </DropdownMenuItem>
            )}
            {isMember && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleRemove}
              >
                <XCircle className="mr-2 h-4 w-4" /> Remove from Choir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
