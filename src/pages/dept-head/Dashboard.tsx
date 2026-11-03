import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ClipboardList, TrendingUp, Clock, CalendarDays, Activity, UserCircle2, Tags } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'all';

export default function DeptDashboard() {
  const { profile } = useAuth();
  const officeId = profile?.office_id;
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');

  // Calculate the start date based on filter
  const startDate = useMemo(() => {
    const now = new Date();
    switch (timeFilter) {
      case 'today': return startOfDay(now);
      case 'week': return startOfWeek(now, { weekStartsOn: 1 });
      case 'month': return startOfMonth(now);
      case 'year': return startOfYear(now);
      case 'all': return null;
    }
  }, [timeFilter]);

  const { data: deptStats, isLoading: loadingDeptStats } = useQuery({
    queryKey: ['dept-dashboard', officeId, timeFilter],
    queryFn: async () => {
      if (!officeId) return null;

      // 1. Fetch total employees
      const { count: empCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('office_id', officeId);
      
      // 2. Fetch all profiles in office to map IDs to Names quickly
      const { data: profilesData } = await supabase.from('profiles').select('user_id, full_name, role').eq('office_id', officeId);
      const profiles = (profilesData as any[]) || [];
      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      const userIds = profiles.map(p => p.user_id);
      if (userIds.length === 0) {
        return {
          totalEmployees: empCount ?? 0,
          periodLogs: 0,
          todayLogs: 0,
          topEmpId: null,
          topEmpTasks: 0,
          topEmpName: null,
          timeline: [],
          empStats: [],
          recentLogs: [],
        };
      }

      // 3. Fetch logs within the date range for users in this office
      let logsQuery = supabase.from('task_logs').select('*').in('user_id', userIds);
      if (startDate) {
        logsQuery = logsQuery.gte('logged_at', startDate.toISOString());
      }
      
      const { data: logsData } = await logsQuery;
      const logs = (logsData as any[]) || [];
      
      // Top performing employee
      const empCounts: Record<string, number> = {};
      logs.forEach(l => {
        empCounts[l.user_id] = (empCounts[l.user_id] || 0) + 1;
      });
      let topEmpId = null;
      let maxTasks = 0;
      Object.entries(empCounts).forEach(([id, count]) => {
        if (count > maxTasks) { maxTasks = count; topEmpId = id; }
      });
      
      // Tasks Today
      const todayStart = startOfDay(new Date()).toISOString();
      const todayLogs = logs.filter(l => l.logged_at >= todayStart).length;

      // Prepare timeline data
      const sortedLogs = [...logs].sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
      const chronoTimelineMap = new Map<string, number>();
      sortedLogs.forEach(l => {
         const date = new Date(l.logged_at);
         let key = format(date, 'MMM dd');
         if (timeFilter === 'year' || timeFilter === 'all') {
           key = format(date, 'MMM yyyy');
         }
         chronoTimelineMap.set(key, (chronoTimelineMap.get(key) || 0) + 1);
      });
      const timelineData = Array.from(chronoTimelineMap.entries()).map(([date, count]) => ({ date, count }));

      // Employee Bar Chart Data
      const empStats = Object.entries(empCounts).map(([id, count]) => {
         const p = profileMap.get(id);
         return {
           name: p ? (p.full_name.split(' ')[0] + ' ' + (p.full_name.split(' ').pop()?.[0] || '') + '.') : 'Unknown',
           tasks: count
         };
      }).sort((a, b) => b.tasks - a.tasks).slice(0, 8); // Top 8

      return {
        totalEmployees: empCount ?? 0,
        periodLogs: logs.length,
        todayLogs,
        topEmpId,
        topEmpTasks: maxTasks,
        topEmpName: topEmpId ? profileMap.get(topEmpId)?.full_name : null,
        timeline: timelineData,
        empStats,
        recentLogs: sortedLogs.slice(-10).reverse().map((l: any) => ({
          ...l,
          user_name: profileMap.get(l.user_id)?.full_name || 'Unknown Employee'
        })),
      };
    },
    enabled: !!officeId
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12 w-full">
      {/* Page Header & Global Filter */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Department Command Center</h1>
          <p className="text-muted-foreground mt-1">Monitor productivity and trends within your office.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="bg-muted/50 p-1 rounded-lg flex items-center shadow-inner">
            <CalendarDays className="h-4 w-4 text-muted-foreground ml-2 mr-1 shrink-0" />
            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
              <SelectTrigger className="w-[160px] border-0 bg-transparent shadow-none font-medium focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Select Range" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl shadow-xl">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Primary Stat Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg shadow-primary/5 bg-gradient-to-br from-card to-card relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Employees</CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingDeptStats ? <Skeleton className="h-8 w-16" /> : (
              <div>
                <div className="text-3xl font-bold">{deptStats?.totalEmployees}</div>
                <p className="text-xs text-muted-foreground mt-1">Active in department</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-primary/5 bg-gradient-to-br from-card to-card relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasks Logged</CardTitle>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingDeptStats ? <Skeleton className="h-8 w-16" /> : (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{deptStats?.periodLogs}</span>
                  {deptStats?.periodLogs! > 0 && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">In selected period</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-primary/5 bg-gradient-to-br from-card to-card relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasks Today</CardTitle>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingDeptStats ? <Skeleton className="h-8 w-16" /> : (
              <div>
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-500">{deptStats?.todayLogs}</div>
                <p className="text-xs text-muted-foreground mt-1">Submitted today</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-primary/5 bg-gradient-to-br from-card to-card relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Performer</CardTitle>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <UserCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingDeptStats ? <Skeleton className="h-8 w-full" /> : (
              <div>
                <div className="text-lg font-bold truncate">{deptStats?.topEmpName || 'No Data'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {deptStats?.topEmpTasks ? `${deptStats.topEmpTasks} tasks logged` : 'In selected period'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Chart Area */}
        <Card className="lg:col-span-8 border-0 shadow-xl shadow-primary/5 bg-card/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Department Activity
            </CardTitle>
            <CardDescription>Task logging frequency across your department</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDeptStats ? (
              <Skeleton className="h-[350px] w-full rounded-xl" />
            ) : deptStats?.timeline && deptStats.timeline.length > 0 ? (
              <div className="h-[350px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={deptStats.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDeptCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      name="Tasks"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorDeptCount)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground mt-4 border-2 border-dashed border-muted rounded-xl">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No activity data for this period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Secondary Charts Stack */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex-1 border-0 shadow-lg shadow-primary/5 bg-card/80 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <UserCircle2 className="h-4 w-4" /> Top Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDeptStats ? <Skeleton className="h-[300px] w-full" /> : deptStats?.empStats && deptStats.empStats.length > 0 ? (
                <div className="h-[300px] -mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptStats.empStats} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                      <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} />
                      <Bar dataKey="tasks" fill="hsl(262, 83%, 58%)" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground/50 text-xs">No employee data</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <Card className="border-0 shadow-xl shadow-primary/5 bg-card/80 backdrop-blur-xl overflow-hidden">
        <CardHeader className="bg-muted/30 border-b py-4 px-6">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Live Activity Feed
          </CardTitle>
          <CardDescription>The most recently logged tasks from your employees.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!deptStats?.recentLogs ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : deptStats.recentLogs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No recent activity found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {deptStats.recentLogs.map((log: any) => (
                <div key={log.id} className="p-4 px-6 hover:bg-muted/30 transition-colors flex items-start sm:items-center gap-4 flex-col sm:flex-row">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-sm">
                      {log.user_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground truncate">{log.user_name}</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline-block">logged a task</span>
                    </div>
                    <div className="text-sm font-medium text-foreground truncate">{log.custom_title}</div>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <div className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full whitespace-nowrap">
                      {format(new Date(log.logged_at), 'MMM d, h:mm a')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
