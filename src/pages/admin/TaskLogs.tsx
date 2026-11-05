import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Office } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardList, CalendarIcon, Filter, ChevronLeft, ChevronRight, Tags, Building2, UserCircle2, Search, Users, Activity, Eye, Clock, User, Briefcase } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from "@/components/SearchableSelect";

const PAGE_SIZE = 15;

export default function TaskLogsPage() {
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedOffice, setSelectedOffice] = useState<string>('all');
  const [searchUser, setSearchUser] = useState<string>('');
  const [page, setPage] = useState(0);
  const [previewLog, setPreviewLog] = useState<any | null>(null);

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name, role, office_id').order('full_name');
      return (data as any[]) ?? [];
    },
  });



  const { data: offices, isLoading: loadingOffices } = useQuery({
    queryKey: ['offices'],
    queryFn: async () => {
      const { data } = await supabase.from('offices').select('*').order('name');
      return (data ?? []) as Office[];
    },
  });

  const { data: logsData, isLoading: loadingLogs } = useQuery({
    queryKey: ['admin', 'taskLogs', selectedUser, selectedDate?.toISOString(), page, selectedRole, selectedOffice],
    queryFn: async () => {
      let query = supabase
        .from('task_logs')
        .select('*', { count: 'exact' })
        .order('logged_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        
      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      } else {
        // If "All Users" is selected, we still respect the role/office filters by limiting to those users
        if (selectedRole !== 'all' || selectedOffice !== 'all') {
          let filteredUserIds = users || [];
          if (selectedRole !== 'all') {
            filteredUserIds = filteredUserIds.filter(u => u.role === selectedRole);
          }
          if (selectedOffice !== 'all') {
            filteredUserIds = filteredUserIds.filter(u => 
              selectedOffice === 'none' ? !u.office_id : u.office_id === selectedOffice
            );
          }
          
          if (filteredUserIds.length === 0) {
             return { logs: [], total: 0 };
          }
          query = query.in('user_id', filteredUserIds.map(u => u.user_id));
        }
      }
      
      if (selectedDate) {
        query = query.gte('logged_at', startOfDay(selectedDate).toISOString()).lte('logged_at', endOfDay(selectedDate).toISOString());
      }
      
      const { data, count, error } = await query;
      if (error) throw error;
      return { logs: data ?? [], total: count ?? 0 };
    },
    enabled: !!users, // Wait for users to load first to apply role/office filters properly
  });


  const offMap = useMemo(() => { const m = new Map<string, string>(); offices?.forEach(o => m.set(o.id, o.name)); return m; }, [offices]);
  const userMap = useMemo(() => { const m = new Map<string, string>(); users?.forEach(u => m.set(u.user_id, u.full_name)); return m; }, [users]);
  
  const totalPages = Math.ceil((logsData?.total ?? 0) / PAGE_SIZE);

  const filteredSidebarUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      if (selectedRole !== 'all' && u.role !== selectedRole) return false;
      if (selectedOffice !== 'all') {
        if (selectedOffice === 'none' && u.office_id) return false;
        if (selectedOffice !== 'none' && u.office_id !== selectedOffice) return false;
      }
      if (searchUser && !u.full_name?.toLowerCase().includes(searchUser.toLowerCase())) return false;
      return true;
    });
  }, [users, selectedRole, selectedOffice, searchUser]);

  const selectedUserDetails = useMemo(() => {
    if (selectedUser === 'all' || !users) return null;
    return users.find(u => u.user_id === selectedUser);
  }, [selectedUser, users]);

  return (
    <div className="space-y-6 animate-fade-in w-full h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Precise Task Logs</h1>
        <p className="text-muted-foreground mt-1">Review task records precisely for each user or the entire organization.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
        
        {/* LEFT SIDEBAR - MASTER LIST */}
        <Card className="lg:col-span-4 xl:col-span-3 flex flex-col h-full border-0 shadow-xl shadow-primary/5 rounded-2xl overflow-hidden bg-card/80 backdrop-blur-xl">
          <CardHeader className="bg-muted/30 border-b p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Directory</CardTitle>
            </div>
            
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search user..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="pl-9 bg-background/50 h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="h-8 text-xs bg-background/50"><SelectValue placeholder="Role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="department_head">Dept Head</SelectItem>
                    <SelectItem value="oic">OIC</SelectItem>
                  </SelectContent>
                </Select>
                <SearchableSelect
                  value={selectedOffice}
                  onValueChange={setSelectedOffice}
                  options={offices}
                  placeholder="Office"
                  searchPlaceholder="Search office..."
                  emptyMessage="No office found."
                  loading={loadingOffices}
                  className="h-8 text-xs bg-background/50"
                  staticOptions={[
                    { id: "all", name: "All Offices" },
                    { id: "none", name: "No Office" }
                  ]}
                />
              </div>
            </div>
          </CardHeader>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            <button
              onClick={() => { setSelectedUser('all'); setPage(0); }}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3",
                selectedUser === 'all' 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-medium" 
                  : "hover:bg-muted/50 text-foreground"
              )}
            >
              <div className={cn("p-2 rounded-full", selectedUser === 'all' ? "bg-primary-foreground/20" : "bg-primary/10")}>
                <Globe className={cn("h-4 w-4", selectedUser === 'all' ? "text-primary-foreground" : "text-primary")} />
              </div>
              <div>
                <div className="text-sm">Everyone</div>
                <div className={cn("text-xs", selectedUser === 'all' ? "text-primary-foreground/80" : "text-muted-foreground")}>All filtered users</div>
              </div>
            </button>
            
            {loadingUsers ? (
              <div className="space-y-2 p-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : filteredSidebarUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No users found matching filters.
              </div>
            ) : (
              filteredSidebarUsers.map(user => (
                <button
                  key={user.user_id}
                  onClick={() => { setSelectedUser(user.user_id); setPage(0); }}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3",
                    selectedUser === user.user_id 
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-medium" 
                      : "hover:bg-muted/50 text-foreground"
                  )}
                >
                  <div className={cn("p-2 rounded-full shrink-0", selectedUser === user.user_id ? "bg-primary-foreground/20" : "bg-primary/10")}>
                    <UserCircle2 className={cn("h-4 w-4", selectedUser === user.user_id ? "text-primary-foreground" : "text-primary")} />
                  </div>
                  <div className="truncate">
                    <div className="text-sm truncate">{user.full_name}</div>
                    <div className={cn("text-[10px] uppercase tracking-wider truncate", selectedUser === user.user_id ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {user.role?.replace('_', ' ')} {user.office_id && offMap.get(user.office_id) ? `• ${offMap.get(user.office_id)}` : ''}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* RIGHT CONTENT - DETAILS & LOGS */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6 h-full overflow-hidden">
          
          {/* User/Global Context Header */}
          <Card className="shrink-0 border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-primary/10 rounded-2xl">
                    {selectedUser === 'all' ? (
                      <Globe className="h-8 w-8 text-primary" />
                    ) : (
                      <UserCircle2 className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedUser === 'all' ? 'Organization Logs' : selectedUserDetails?.full_name}
                    </h2>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                      {selectedUser === 'all' ? (
                        <>Viewing logs across all selected users</>
                      ) : (
                        <>
                          <Badge variant="outline" className="text-xs uppercase bg-background">{selectedUserDetails?.role?.replace('_', ' ')}</Badge>
                          {selectedUserDetails?.office_id && offMap.get(selectedUserDetails.office_id) && (
                            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{offMap.get(selectedUserDetails.office_id)}</span>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground mb-1">Total Logs Found</div>
                    <div className="text-3xl font-black text-primary">{logsData?.total ?? 0}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table Area */}
          <Card className="flex-1 flex flex-col border-0 shadow-xl shadow-primary/5 rounded-2xl overflow-hidden bg-card/80 backdrop-blur-xl">
            <CardHeader className="bg-muted/30 border-b py-3 px-4 flex flex-row items-center justify-between shrink-0 space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Task Timeline
              </CardTitle>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-8 text-xs font-normal", !selectedDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3 w-3" />{selectedDate ? format(selectedDate, 'PPP') : 'Filter by Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar mode="single" selected={selectedDate} onSelect={(d) => { setSelectedDate(d ?? undefined); setPage(0); }} />
                  </PopoverContent>
                </Popover>
                {selectedDate && (
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedDate(undefined); setPage(0); }} className="h-8 text-xs">Clear</Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto custom-scrollbar">
                {loadingLogs ? (
                  <div className="p-4 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
                ) : logsData && logsData.logs.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-md">
                      <TableRow className="hover:bg-transparent">
                        {selectedUser === 'all' && <TableHead className="w-[200px]">Employee</TableHead>}
                        <TableHead>Task Title</TableHead>
                        <TableHead className="text-right w-[150px]">Date Logged</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsData.logs.map((log: any) => (
                        <TableRow key={log.id} className="group hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setPreviewLog(log)}>
                          {selectedUser === 'all' && (
                            <TableCell className="font-medium">
                              {userMap.get(log.user_id) ?? 'Unknown User'}
                              <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                                {log.office_id ? offMap.get(log.office_id) : 'No Office'}
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="font-medium text-foreground whitespace-pre-wrap leading-relaxed">{log.custom_title}</TableCell>

                          <TableCell className="text-right text-muted-foreground text-xs whitespace-nowrap">
                            <div className="font-medium text-foreground">{format(new Date(log.logged_at), 'MMM d, yyyy')}</div>
                            <div>{format(new Date(log.logged_at), 'h:mm a')}</div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                    <div className="p-4 bg-muted/30 rounded-full mb-4">
                      <ClipboardList className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-medium">No tasks found</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mt-1">
                      {selectedUser === 'all' 
                        ? "There are no task logs matching your current filters."
                        : `${selectedUserDetails?.full_name} hasn't logged any tasks for this time period.`}
                    </p>
                  </div>
                )}
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t bg-muted/10 shrink-0">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="h-8"><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
                  <span className="text-xs text-muted-foreground font-medium bg-background px-3 py-1 rounded-full border shadow-sm">Page {page + 1} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="h-8">Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task Preview Dialog */}
      <Dialog open={!!previewLog} onOpenChange={(open) => !open && setPreviewLog(null)}>
        <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-muted/40 border-b px-6 py-4 flex flex-row items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg font-bold">Task Detail</DialogTitle>
          </DialogHeader>
          {previewLog && (
            <div className="p-6 space-y-5">
              {/* Task Title */}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Task / Activity</p>
                <p className="text-base font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
                  {previewLog.custom_title || '—'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Employee */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border">
                  <User className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Employee</p>
                    <p className="text-sm font-semibold mt-0.5">{userMap.get(previewLog.user_id) ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {users?.find((u: any) => u.user_id === previewLog.user_id)?.role?.replace('_', ' ') ?? ''}
                    </p>
                  </div>
                </div>

                {/* Office */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border">
                  <Briefcase className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Office</p>
                    <p className="text-sm font-semibold mt-0.5">
                      {previewLog.office_id ? (offMap.get(previewLog.office_id) ?? 'Unknown Office') : 'No Office'}
                    </p>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border">
                  <CalendarIcon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Date</p>
                    <p className="text-sm font-semibold mt-0.5">{format(new Date(previewLog.logged_at), 'MMMM d, yyyy')}</p>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border">
                  <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Time Logged</p>
                    <p className="text-sm font-semibold mt-0.5">{format(new Date(previewLog.logged_at), 'h:mm a')}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setPreviewLog(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Globe icon (inline SVG)
function Globe(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}