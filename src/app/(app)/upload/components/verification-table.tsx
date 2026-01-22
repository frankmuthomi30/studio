'use client';

import { useState } from 'react';
import type { ParsedStudentData } from '../actions';
import type { VerifyStudentDataOutput } from '@/ai/flows/ai-data-verification';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type VerificationTableProps = {
  data: ParsedStudentData[];
  issues: VerifyStudentDataOutput;
  onCommit: (data: ParsedStudentData[]) => void;
  onCancel: () => void;
};

export default function VerificationTable({ data, issues, onCommit, onCancel }: VerificationTableProps) {
  const [editableData, setEditableData] = useState(data);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
           <div className="flex items-center gap-2">
            <Check className="h-6 w-6 text-green-500" />
            <CardTitle>Preview Uploaded Data</CardTitle>
           </div>
          <CardDescription>
            Review the data below before saving it to the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Row</TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead>Year</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editableData.map((student) => (
                    <TableRow key={student.admission_number}>
                      <TableCell>{student.rowNumber}</TableCell>
                      <TableCell>{student.admission_number}</TableCell>
                      <TableCell>{student.first_name}</TableCell>
                      <TableCell>{student.last_name}</TableCell>
                      <TableCell>{student.gender}</TableCell>
                      <TableCell>{student.class}</TableCell>
                      <TableCell>{student.stream || 'N/A'}</TableCell>
                      <TableCell>{student.year || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onCancel}>
            <X className="mr-2"/>
            Cancel & Start Over
        </Button>
        <Button onClick={() => onCommit(editableData)}>
            <Check className="mr-2" />
            Commit {editableData.length} Records
        </Button>
      </div>
    </div>
  );
}
