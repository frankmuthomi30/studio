import PageHeader from '@/components/page-header';
import IndividualReport from '../components/individual-report';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { mockStudents } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
  

export default function IndividualReportPage() {
    // This is a placeholder. A real implementation would likely use a client component 
    // with state to handle selection and fetching data.
  return (
    <>
      <PageHeader
        title="Individual Attendance Report"
        subtitle="Select a student to generate their detailed attendance record."
      />
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Select Student</CardTitle>
                <CardDescription>Choose a choir member to generate their report.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2">
                    <Select>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a student..." />
                        </SelectTrigger>
                        <SelectContent>
                            {mockStudents.map(student => (
                                <SelectItem key={student.admission_number} value={student.admission_number}>
                                    {student.first_name} {student.last_name} ({student.admission_number})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button>
                        <Search className="mr-2 h-4 w-4" />
                        Generate Report
                    </Button>
                </div>
            </CardContent>
        </Card>

        <div className="print-container">
            {/* The generated report will be rendered here */}
            {/* For demonstration, we'll show a sample report */}
            <IndividualReport 
                student={mockStudents[0]} 
            />
        </div>
      </div>
    </>
  );
}
