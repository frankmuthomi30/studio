import PageHeader from '@/components/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, UserCheck, Percent, CalendarClock, ListChecks } from 'lucide-react';
import DashboardCard from './components/dashboard-card';
import { Separator } from '@/components/ui/separator';
import { mockAttendanceSessions, mockChoirMembers, mockStudents } from '@/lib/mock-data';
import { format } from 'date-fns';

export default function DashboardPage() {
  const activeMembers = mockChoirMembers.filter(m => m.status === 'active').length;
  const totalStudents = mockStudents.length;

  const lastSession = mockAttendanceSessions[mockAttendanceSessions.length - 1];
  const presentCount = lastSession ? Object.values(lastSession.attendance_map).filter(Boolean).length : 0;
  const totalInSession = lastSession ? Object.keys(lastSession.attendance_map).length : 0;
  const attendancePercentage = totalInSession > 0 ? ((presentCount / totalInSession) * 100).toFixed(0) : 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome! Here's a summary of your choir's activity."
      />
      <div className="container mx-auto p-4 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Active Choir Members"
            value={activeMembers.toString()}
            icon={Users}
            description={`Out of ${totalStudents} total students`}
          />
          <DashboardCard
            title="Last Session Attendance"
            value={`${presentCount} / ${totalInSession}`}
            icon={UserCheck}
            description={lastSession ? `On ${format(lastSession.date, 'MMM d, yyyy')}` : 'No sessions yet'}
          />
          <DashboardCard
            title="Attendance Rate"
            value={`${attendancePercentage}%`}
            icon={Percent}
            description="For the last practice session"
          />
          <DashboardCard
            title="Next Practice (placeholder)"
            value="Feb 22, 2026"
            icon={CalendarClock}
            description="Evening Practice"
          />
        </div>
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <ListChecks className="text-primary"/>
                Recent Attendance Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAttendanceSessions.slice().reverse().map((session, index) => (
                  <div key={session.id}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{session.practice_type}</p>
                        <p className="text-sm text-muted-foreground">{format(session.date, 'EEEE, MMMM d, yyyy')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-lg text-primary">
                          {Object.values(session.attendance_map).filter(Boolean).length} / {Object.keys(session.attendance_map).length}
                        </p>
                        <p className="text-sm text-muted-foreground">Present</p>
                      </div>
                    </div>
                    {index < mockAttendanceSessions.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
