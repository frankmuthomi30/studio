import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { User, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const reportTypes = [
  {
    icon: User,
    title: 'Individual Member Report',
    description: 'Generate a detailed, printable attendance report for a single student.',
    href: '/reports/individual',
  },
  {
    icon: Users,
    title: 'Full Choir Register',
    description: 'Generate a register-style report for a date range, class, or term. Exportable to PDF and Excel.',
    href: '/reports/register',
  },
];

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports & Exports"
        subtitle="Generate printable and exportable attendance records."
      />
      <div className="container mx-auto p-4 md:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          {reportTypes.map((report) => (
            <Card key={report.title} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                        <report.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle>{report.title}</CardTitle>
                        <CardDescription className="mt-1">{report.description}</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow"></CardContent>
              <div className="p-6 pt-0">
                <Button asChild className="w-full">
                  <Link href={report.href}>
                    Go to Report <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
