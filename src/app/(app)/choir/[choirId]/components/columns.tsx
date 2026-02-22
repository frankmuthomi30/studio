'use client';

import type { ColumnDef } from '@tanstack/react-table';
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
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
    accessorFn: row => `${row.class} ${row.stream || ''}`.trim(),
    id: 'class',
    header: 'Class',
  },
  {
    id: 'status',
    accessorFn: row => row.choirMember?.status ?? 'not_member',
    header: 'Choir Status',
    cell: ({ row }) => {
      const status = row.original.choirMember?.status ? row.original.choirMember.status : 'not_member';
      return <StatusBadge status={status as any} />;
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
      const firestore = useFirestore();
      const { userId } = table.options.meta as { userId?: string };

      const memberRef = doc(firestore, 'choirs', choirId, 'members', student.admission_number);

      const handleAdd = () => {
        if (!userId) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }
        startTransition(async () => {
          const memberData = {
            admission_number: student.admission_number,
            first_name: student.first_name,
            last_name: student.last_name,
            class: student.class,
            status: 'active',
            date_joined: serverTimestamp(),
            added_by: userId,
          };

          setDoc(memberRef, memberData)
            .then(() => toast({ title: 'Success', description: `${student.first_name} added to choir.` }))
            .catch(async () => {
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: memberRef.path,
                operation: 'create',
                requestResourceData: memberData
              }));
            });
        });
      };

      const handleRemove = () => {
        startTransition(async () => {
            deleteDoc(memberRef)
              .then(() => toast({ title: 'Success', description: 'Student removed from choir.' }))
              .catch(async () => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                  path: memberRef.path,
                  operation: 'delete'
                }));
              });
          });
      }

      const handleSetStatus = (newStatus: 'active' | 'inactive') => {
        startTransition(async () => {
            setDoc(memberRef, { status: newStatus }, { merge: true })
              .then(() => toast({ title: 'Success', description: `Member status updated to ${newStatus}.` }))
              .catch(async () => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                  path: memberRef.path,
                  operation: 'update',
                  requestResourceData: { status: newStatus }
                }));
              });
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