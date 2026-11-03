import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Users, ClipboardList, TrendingUp, CheckCircle, Clock, CalendarDays, Activity } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, isAfter, parseISO } from 'date-fns';
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

export default function AdminDashboard() {
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

  const { data: globalStats, isLoading: loadingGlobalStats } = useQuery({
    queryKey: ['admin', 'globalStats', timeFilter],
    queryFn: async () => {
      // 1. Fetch total users (active)
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user');
      
      // Fetch all profiles to map office_id for logs
      const { data: allProfiles } = await supabase.from('profiles').select('user_id, office_id');
      const userOfficeMap = new Map(allProfiles?.map(p => [p.user_id, p.office_id]) || []);
      
      // 2. Fetch logs within the date range
      let logsQuery = supabase.from('task_logs').select('*');
      if (startDate) {
        logsQuery = logsQuery.gte('logged_at', startDate.toISOString());
      }
      
      const { data: logsData } = await logsQuery;
      const logs = (logsData as any[]) || [];
      
      // Calculate top office
      const officeCounts: Record<string, number> = {};
      logs.forEach(l => {
        const officeId = l.office_id || userOfficeMap.get(l.user_id);
        if (officeId) {
          officeCounts[officeId] = (officeCounts[officeId] || 0) + 1;
        }
      });
      let topOfficeId = null;
      let maxTasks = 0;
      Object.entries(officeCounts).forEach(([id, count]) => {
        if (count > maxTasks) { maxTasks = count; topOfficeId = id; }
      });
      


      // Prepare timeline data
      const timelineMap: Record<string, number> = {};
      logs.forEach(l => {
        // Group by day for month/week/today, by month for year/all
        const date = new Date(l.logged_at);
        let key = format(date, 'MMM dd');
        if (timeFilter === 'year' || timeFilter === 'all') {
          key = format(date, 'MMM yyyy');
        }
        timelineMap[key] = (timelineMap[key] || 0) + 1;
      });
      const timelineData = Object.entries(timelineMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => {
          // simple sort logic since we formatted the keys, might not be perfectly chronological for cross-years without proper parsing, but ok for now
           return 1; // Actually, let's keep the chronological order by sorting the original logs then mapping
        });
        
      // Proper chronological timeline
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
      const properTimelineData = Array.from(chronoTimelineMap.entries()).map(([date, count]) => ({ date, count }));

      return {
        totalUsers: usersCount ?? 0,
        periodLogs: logs.length,
        topOfficeId,
        topOfficeTasks: maxTasks,
        timeline: properTimelineData,
        recentLogs: sortedLogs.slice(-10).reverse(), // Last 10
      };
    }
  });

  // Fetch names for the IDs found in stats
  const { data: topOffice } = useQuery({
    queryKey: ['admin', 'office', globalStats?.topOfficeId],
    queryFn: async () => {
      if (!globalStats?.topOfficeId) return null;
      const { data } = await supabase.from('offices').select('name').eq('id', globalStats.topOfficeId).single();
      return data as { name: string } | null;
    },
    enabled: !!globalStats?.topOfficeId
  });


  
  // Fetch profiles and offices for recent activity feed
  const { data: recentFeedData } = useQuery({
    queryKey: ['admin', 'recentFeed', globalStats?.recentLogs],
    queryFn: async () => {
      if (!globalStats?.recentLogs || globalStats.recentLogs.length === 0) return [];
      
      const userIds = [...new Set(globalStats.recentLogs.map((l: any) => l.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, office_id').in('user_id', userIds);
      
      const missingOfficeIds = [...new Set(globalStats.recentLogs.map((l: any) => l.office_id).filter(Boolean))];
      const additionalOfficeIds = (profiles as any[])?.map(p => p.office_id).filter(Boolean) || [];
      const officeIds = [...new Set([...missingOfficeIds, ...additionalOfficeIds])];
      
      const { data: offices } = await supabase.from('offices').select('id, name').in('id', officeIds);
      
      const pMap = new Map((profiles as any[])?.map((p: any) => [p.user_id, { name: p.full_name, officeId: p.office_id }]) || []);
      const oMap = new Map((offices as any[])?.map((o: any) => [o.id, o.name]) || []);
      
      return globalStats.recentLogs.map((l: any) => {
        const profile = pMap.get(l.user_id);
        const actualOfficeId = l.office_id || profile?.officeId;
        return {
          ...l,
          user_name: profile?.name || 'Unknown User',
          office_name: actualOfficeId ? oMap.get(actualOfficeId) : null
        };
      });
    },
    enabled: !!globalStats?.recentLogs
  });



  // Office Bar Chart Data
  const { data: officeStats, isLoading: loadingOfficeStats } = useQuery({
    queryKey: ['admin', 'officeStats', timeFilter],
    queryFn: async () => {
      const { data } = await supabase.from('offices').select('id, name');
      const offices = (data as any[]) || [];
      
      // Fetch profiles to map user_id to office_id for older logs
      const { data: profiles } = await supabase.from('profiles').select('user_id, office_id');
      const userOfficeMap = new Map(profiles?.map(p => [p.user_id, p.office_id]) || []);
      
      let logsQuery = supabase.from('task_logs').select('office_id, user_id');
      if (startDate) logsQuery = logsQuery.gte('logged_at', startDate.toISOString());
      const { data: logsData } = await logsQuery;
      const logs = (logsData as any[]) || [];
      
      if (!logs.length || !offices.length) return [];
      
      const counts: Record<string, number> = {};
      logs.forEach(l => {
         const officeId = l.office_id || userOfficeMap.get(l.user_id);
         if (officeId) counts[officeId] = (counts[officeId] || 0) + 1;
      });
      
      const stats = offices.map(o => ({
         name: o.name.replace('Office', '').trim(), // shorter names for chart
         tasks: counts[o.id] || 0
      })).filter(s => s.tasks > 0);
      
      return stats.sort((a,b) => b.tasks - a.tasks).slice(0, 8); // Top 8 offices
    }
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12 w-full">
      {/* Page Header & Global Filter */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Command Center</h1>
          <p className="text-muted-foreground mt-1">High-level overview of workspace productivity and trends.</p>
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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-0 shadow-lg shadow-primary/5 bg-gradient-to-br from-card to-card relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Active Users</CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingGlobalStats ? <Skeleton className="h-8 w-16" /> : (
              <div>
                <div className="text-3xl font-bold">{globalStats?.totalUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">Across the organization</p>
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
            {loadingGlobalStats ? <Skeleton className="h-8 w-16" /> : (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{globalStats?.periodLogs}</span>
                  {globalStats?.periodLogs! > 0 && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">In selected period</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-primary/5 bg-gradient-to-br from-card to-card relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Office</CardTitle>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingGlobalStats ? <Skeleton className="h-8 w-full" /> : (
              <div>
                <div className="text-xl font-bold truncate">{topOffice?.name || 'No Data'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {globalStats?.topOfficeTasks ? `${globalStats.topOfficeTasks} tasks logged` : 'In selected period'}
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
              <Activity className="h-5 w-5 text-primary" />
              Activity Over Time
            </CardTitle>
            <CardDescription>Task logging frequency across the organization</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingGlobalStats ? (
              <Skeleton className="h-[350px] w-full rounded-xl" />
            ) : globalStats?.timeline && globalStats.timeline.length > 0 ? (
              <div className="h-[350px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={globalStats.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
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
                      fill="url(#colorCount)" 
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
          <Card className="border-0 shadow-lg shadow-primary/5 bg-card/80 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" /> Top Offices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingOfficeStats ? <Skeleton className="h-[300px] w-full" /> : officeStats && officeStats.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={officeStats} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                      <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} />
                      <Bar dataKey="tasks" fill="hsl(197, 71%, 52%)" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground/50 text-xs">No office data</div>
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
          <CardDescription>The most recently logged tasks across the organization.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!recentFeedData ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : recentFeedData.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No recent activity found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {recentFeedData.map((log: any) => (
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
                    {log.office_name && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                        <Building2 className="h-3 w-3" /> {log.office_name}
                      </div>
                    )}
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
