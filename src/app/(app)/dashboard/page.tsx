'use client';

import PageHeader from '@/components/page-header';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Users, UserCheck, Percent, CalendarClock, ListChecks, Loader2, TrendingUp, Music } from 'lucide-react';
import DashboardCard from './components/dashboard-card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, limit, collectionGroup } from 'firebase/firestore';
import type { AttendanceSession, ChoirMember } from '@/lib/types';
import DeleteSessionButton from './components/delete-session-button';
import { useMemo } from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";

export default function DashboardPage() {
  const firestore = useFirestore();
  const { isUserLoading: authLoading } = useUser();

  // Fetch all members from all choirs
  const allChoirMembersQuery = useMemoFirebase(() =>
    !authLoading && firestore ? collectionGroup(firestore, 'members') : null
  , [firestore, authLoading]);
  const { data: allChoirMembers, isLoading: membersLoading } = useCollection<ChoirMember>(allChoirMembersQuery);

  // Filter for active members on the client
  const activeChoirMembers = useMemo(() => {
    if (!allChoirMembers) return [];
    return allChoirMembers.filter(member => member.status === 'active');
  }, [allChoirMembers]);
  
  const sessionsQuery = useMemoFirebase(() =>
    !authLoading && firestore
      ? query(collection(firestore, 'choir_attendance'), orderBy('date', 'desc'), limit(10))
      : null
  , [firestore, authLoading]);
  const { data: attendanceSessions, isLoading: sessionsLoading } = useCollection<AttendanceSession>(sessionsQuery);
  
  const isLoading = authLoading || membersLoading || sessionsLoading;

  const chartData = useMemo(() => {
    if (!attendanceSessions) return [];
    return [...attendanceSessions]
      .reverse()
      .slice(-7)
      .map(session => ({
        name: format(session.date.toDate(), 'MMM d'),
        present: Object.values(session.attendance_map).filter(Boolean).length,
        total: Object.keys(session.attendance_map).length,
        practice: session.practice_type
      }));
  }, [attendanceSessions]);

  if (isLoading) {
      return (
        <>
          <PageHeader
            title="Dashboard"
            subtitle="Authorizing and loading choir statistics..."
          />
          <div className="flex flex-col justify-center items-center h-96 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm font-bold text-muted-foreground animate-pulse uppercase tracking-widest">Preparing Harmony Hub...</p>
          </div>
        </>
      )
  }

  const activeMembersCount = activeChoirMembers.length;
  const lastSession = attendanceSessions?.[0];
  const prevSession = attendanceSessions?.[1];

  const presentCount = lastSession ? Object.values(lastSession.attendance_map).filter(Boolean).length : 0;
  const totalInSession = lastSession ? Object.keys(lastSession.attendance_map).length : 0;
  const attendancePercentage = totalInSession > 0 ? Math.round((presentCount / totalInSession) * 100) : 0;

  const prevPresentCount = prevSession ? Object.values(prevSession.attendance_map).filter(Boolean).length : 0;
  const prevPercentage = prevSession ? Math.round((prevPresentCount / Object.keys(prevSession.attendance_map).length) * 100) : 0;
  
  const percentageDiff = attendancePercentage - prevPercentage;

  return (
    <>
      <PageHeader
        title="Harmony Dashboard"
        subtitle="Welcome back! Here is an overview of the choir's recent performance."
      />
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Total Active"
            value={activeMembersCount.toString()}
            icon={Users}
            description={'Registered choir members'}
            trend={{ value: 'Stable', label: 'Member count', isPositive: true }}
          />
          <DashboardCard
            title="Latest Attendance"
            value={`${presentCount} / ${totalInSession}`}
            icon={UserCheck}
            description={lastSession ? `${lastSession.choirName} session` : 'No sessions yet'}
            trend={lastSession ? { 
                value: format(lastSession.date.toDate(), 'MMM d'), 
                label: 'Last practice', 
                isPositive: true 
            } : undefined}
          />
          <DashboardCard
            title="Success Rate"
            value={`${attendancePercentage}%`}
            icon={Percent}
            description="Participation intensity"
            trend={prevSession ? { 
                value: `${percentageDiff > 0 ? '+' : ''}${percentageDiff}%`, 
                label: 'vs previous', 
                isPositive: percentageDiff >= 0 
            } : undefined}
          />
          <DashboardCard
            title="Total Sessions"
            value={(attendanceSessions?.length || 0).toString()}
            icon={Music}
            description="Recorded this term"
            trend={{ value: 'Active', label: 'System status', isPositive: true }}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Chart Section */}
          <Card className="lg:col-span-2 shadow-xl shadow-primary/5 border-border/50 overflow-hidden">
            <CardHeader className="bg-muted/20 border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Attendance Trends
                  </CardTitle>
                  <CardDescription>Visualizing student participation over the last 7 sessions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              {chartData.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 600 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border rounded-xl p-3 shadow-2xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">{data.practice}</p>
                                <p className="text-sm font-bold">{data.name}</p>
                                <div className="mt-2 space-y-1">
                                  <p className="text-xs font-medium">Present: <span className="text-primary font-bold">{data.present}</span></p>
                                  <p className="text-xs font-medium text-muted-foreground">Total: {data.total}</p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="present" 
                        radius={[6, 6, 0, 0]}
                        barSize={40}
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === chartData.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.4)'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-2xl">
                  <TrendingUp className="h-12 w-12 mb-4 opacity-20" />
                  <p className="font-medium">Record more sessions to see trends</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Section */}
          <Card className="shadow-xl shadow-primary/5 border-border/50">
            <CardHeader className="bg-muted/20 border-b pb-4">
              <CardTitle className='text-lg flex items-center gap-2'>
                <ListChecks className="h-5 w-5 text-primary"/>
                Recent Activity
              </CardTitle>
              <CardDescription>Last 5 attendance records</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {attendanceSessions && attendanceSessions.length > 0 ? attendanceSessions.slice(0, 5).map((session, index) => (
                  <div key={session.id} className="relative group">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-bold text-sm group-hover:text-primary transition-colors">{session.choirName}</p>
                        <p className="text-xs text-muted-foreground font-medium">{session.practice_type}</p>
                        <p className="text-[10px] text-muted-foreground/60">{format(session.date.toDate(), 'EEE, MMM d, yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-black text-sm text-primary tracking-tighter">
                            {Object.values(session.attendance_map).filter(Boolean).length} / {Object.keys(session.attendance_map).length}
                          </p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">Checked In</p>
                        </div>
                        <DeleteSessionButton sessionId={session.id} />
                      </div>
                    </div>
                    {index < 4 && index < (attendanceSessions.length - 1) && <Separator className="mt-6 opacity-50" />}
                  </div>
                )) : (
                    <div className="text-center py-12 space-y-3">
                        <div className="bg-muted w-12 h-12 rounded-2xl flex items-center justify-center mx-auto">
                            <Music className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No activity yet</p>
                    </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
