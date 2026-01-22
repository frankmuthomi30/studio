'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { StudentWithChoirStatus } from '@/lib/types';
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
import { updateChoirStatus } from '../actions';
import { useToast } from '@/hooks/use-toast';

const StatusBadge = ({ status }: { status: 'active' | 'inactive' | 'not_member' }) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
    case 'inactive':
      return <Badge variant="secondary">Inactive</Badge>;
    default:
      return <Badge variant="outline">Not a Member</Badge>;
  }
};

export const columns: ColumnDef<StudentWithChoirStatus>[] = [
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
    accessorKey: 'gender',
    header: 'Gender',
  },
  {
    id: 'status',
    accessorFn: row => row.choirMember?.status ?? 'not_member',
    header: 'Choir Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as 'active' | 'inactive' | 'not_member';
      return <StatusBadge status={status} />;
    },
    filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const student = row.original;
      const [isPending, startTransition] = useTransition();
      const { toast } = useToast();

      const handleStatusChange = (newStatus: 'active' | 'inactive' | 'not_member') => {
        startTransition(async () => {
          const result = await updateChoirStatus(student.admission_number, newStatus, student.class);
          if (result.success) {
            toast({ title: 'Success', description: result.message });
          } else {
            toast({ variant: 'destructive', title: 'Error', description: result.message });
          }
        });
      };

      const currentStatus = student.choirMember?.status ?? 'not_member';

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {currentStatus === 'not_member' && (
              <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                <UserPlus className="mr-2 h-4 w-4" /> Add to Choir (Active)
              </DropdownMenuItem>
            )}
            {currentStatus === 'inactive' && (
              <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                <CheckCircle className="mr-2 h-4 w-4" /> Set to Active
              </DropdownMenuItem>
            )}
            {currentStatus === 'active' && (
              <DropdownMenuItem onClick={() => handleStatusChange('inactive')}>
                <UserX className="mr-2 h-4 w-4" /> Set to Inactive
              </DropdownMenuItem>
            )}
            {(currentStatus === 'active' || currentStatus === 'inactive') && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleStatusChange('not_member')}
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
