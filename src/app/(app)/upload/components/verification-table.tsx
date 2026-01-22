'use client';

import { useState, useMemo } from 'react';
import type { ParsedStudentData } from '../actions';
import type { VerifyStudentDataOutput } from '@/ai/flows/ai-data-verification';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, Pencil, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type VerificationTableProps = {
  data: ParsedStudentData[];
  issues: VerifyStudentDataOutput;
  onCommit: (data: ParsedStudentData[]) => void;
  onCancel: () => void;
};

export default function VerificationTable({ data, issues, onCommit, onCancel }: VerificationTableProps) {
  const [editableData, setEditableData] = useState(data);

  const issueMap = useMemo(() => {
    const map = new Map<string, { field: string; issue: string; suggestion: string }[]>();
    issues.forEach(issue => {
      const studentIssues = map.get(issue.admission_number) || [];
      studentIssues.push({ field: issue.field, issue: issue.issue, suggestion: issue.suggestion });
      map.set(issue.admission_number, studentIssues);
    });
    return map;
  }, [issues]);

  const handleApplySuggestion = (rowIndex: number, field: string, suggestion: string) => {
    const newData = [...editableData];
    (newData[rowIndex] as any)[field] = suggestion;
    setEditableData(newData);
  };

  const hasIssues = issues.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
           <div className="flex items-center gap-2">
            {hasIssues ? (
                <AlertTriangle className="h-6 w-6 text-amber-500" />
            ) : (
                <Check className="h-6 w-6 text-green-500" />
            )}
             <CardTitle>Verification Results</CardTitle>
           </div>
          <CardDescription>
            {hasIssues 
                ? `${issues.length} potential issue(s) found. Review the suggestions below.`
                : 'No issues found. The data looks clean and ready to be saved.'
            }
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
                  {editableData.map((student, index) => {
                    const studentIssues = issueMap.get(student.admission_number);
                    return (
                      <>
                        <TableRow key={student.admission_number}>
                          <TableCell>{student.rowNumber}</TableCell>
                          <TableCell className={studentIssues?.some(i => i.field === 'admission_number') ? 'text-amber-600 font-medium' : ''}>{student.admission_number}</TableCell>
                          <TableCell className={studentIssues?.some(i => i.field === 'first_name') ? 'text-amber-600 font-medium' : ''}>{student.first_name}</TableCell>
                          <TableCell className={studentIssues?.some(i => i.field === 'last_name') ? 'text-amber-600 font-medium' : ''}>{student.last_name}</TableCell>
                          <TableCell className={studentIssues?.some(i => i.field === 'gender') ? 'text-amber-600 font-medium' : ''}>{student.gender}</TableCell>
                          <TableCell>{student.class}</TableCell>
                          <TableCell>{student.stream || 'N/A'}</TableCell>
                          <TableCell>{student.year || 'N/A'}</TableCell>
                        </TableRow>
                        {studentIssues && (
                            <TableRow className="bg-amber-50 dark:bg-amber-900/20">
                                <TableCell colSpan={8} className="p-0">
                                    <div className="p-3 space-y-2">
                                        {studentIssues.map(issue => (
                                            <div key={issue.field} className="flex items-center gap-4 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0"/>
                                                    <Badge variant="outline" className="font-mono text-xs">{issue.field}</Badge>
                                                </div>
                                                <p className="text-amber-800 dark:text-amber-200 grow">{issue.issue} → Suggested: <strong className="font-semibold">{issue.suggestion}</strong></p>
                                                <Button size="sm" variant="outline" onClick={() => handleApplySuggestion(index, issue.field, issue.suggestion)}>
                                                    <Pencil className="mr-2 h-3 w-3" />
                                                    Apply
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                      </>
                    );
                  })}
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
