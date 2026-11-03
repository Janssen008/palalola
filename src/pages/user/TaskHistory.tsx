import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { TaskLog } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  CalendarIcon,
  History,
  CheckCircle2,
  Tags,
  StickyNote,
  Pencil,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListTodo,
} from 'lucide-react';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
  isFuture,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function TaskHistory() {
  const { user } = useAuth();

  const queryClient = useQueryClient();

  // Week navigation state
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Edit / delete dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskLog | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const [editDate, setEditDate] = useState('');

  // Calendar popover
  const [calOpen, setCalOpen] = useState(false);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  // Build the 7 days of the current week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const dateStart = startOfDay(selectedDate).toISOString();
  const dateEnd = endOfDay(selectedDate).toISOString();

  // Load logs for the selected day
  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ['user', 'history', user?.id, selectedDate.toDateString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_logs')
        .select('*')
        .eq('user_id', user!.id)
        .gte('logged_at', dateStart)
        .lte('logged_at', dateEnd)
        .order('logged_at', { ascending: false });
      if (error) throw error;
      return (data as TaskLog[]) ?? [];
    },
    enabled: !!user,
  });

  // Load counts per day for the whole week (for badges)
  const weekStartISO = startOfDay(weekStart).toISOString();
  const weekEndISO = endOfDay(weekEnd).toISOString();
  const { data: weekLogs } = useQuery({
    queryKey: ['user', 'weekLogs', user?.id, weekStart.toDateString()],
    queryFn: async () => {
      const { data } = await supabase
        .from('task_logs')
        .select('logged_at')
        .eq('user_id', user!.id)
        .gte('logged_at', weekStartISO)
        .lte('logged_at', weekEndISO);
      return (data ?? []) as { logged_at: string }[];
    },
    enabled: !!user,
  });

  const dayCountMap = useMemo(() => {
    const m = new Map<string, number>();
    weekLogs?.forEach(({ logged_at }) => {
      const key = format(new Date(logged_at), 'yyyy-MM-dd');
      m.set(key, (m.get(key) ?? 0) + 1);
    });
    return m;
  }, [weekLogs]);



  const { data: recentDates } = useQuery({
    queryKey: ['user', 'recentDates', user?.id],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 90).toISOString();
      const { data } = await supabase
        .from('task_logs')
        .select('logged_at')
        .eq('user_id', user!.id)
        .gte('logged_at', thirtyDaysAgo);
      if (!data) return new Set<string>();
      return new Set((data as any[]).map((d) => format(new Date(d.logged_at), 'yyyy-MM-dd')));
    },
    enabled: !!user,
  });



  const updateMutation = useMutation({
    mutationFn: async ({ id, title, date }: { id: string; title: string; date: string }) => {
      const { error } = await (supabase.from('task_logs') as any)
        .update({ custom_title: title, logged_at: new Date(date).toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'weekLogs'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'recentDates'] });
      setEditOpen(false);
      setSelectedTask(null);
      toast.success('Task updated successfully');
    },
    onError: () => toast.error('Failed to update task'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('task_logs') as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'weekLogs'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'recentDates'] });
      setDeleteOpen(false);
      setSelectedTask(null);
      toast.success('Task deleted');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const openEdit = (log: TaskLog) => {
    setSelectedTask(log);
    setEditTitle(log.custom_title || '');
    setEditDate(format(new Date(log.logged_at), 'yyyy-MM-dd'));
    setEditOpen(true);
  };

  const openDelete = (log: TaskLog) => {
    setSelectedTask(log);
    setDeleteOpen(true);
  };

  const goToPrevWeek = () => setWeekStart((w) => subWeeks(w, 1));
  const goToNextWeek = () => setWeekStart((w) => addWeeks(w, 1));
  const goToCurrentWeek = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setSelectedDate(new Date());
  };

  const handleDaySelect = (day: Date) => {
    if (isFuture(startOfDay(day)) && !isToday(day)) return;
    setSelectedDate(day);
    // Navigate week if day is outside the current week view
    const dayWeekStart = startOfWeek(day, { weekStartsOn: 1 });
    if (dayWeekStart.getTime() !== weekStart.getTime()) {
      setWeekStart(dayWeekStart);
    }
  };

  const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <div className="space-y-5 animate-fade-in pb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            Task History
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Browse and manage your completed tasks</p>
        </div>
        {/* Calendar picker for jumping to any date */}
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-xl mt-1" title="Jump to date">
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              disabled={(d) => isFuture(startOfDay(d)) && !isToday(d)}
              onSelect={(d) => {
                if (d) {
                  handleDaySelect(d);
                  setCalOpen(false);
                }
              }}
              modifiers={{
                hasLogs: (date) => recentDates?.has(format(date, 'yyyy-MM-dd')) ?? false,
              }}
              modifiersStyles={{
                hasLogs: {
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  textDecorationColor: 'hsl(262, 83%, 58%)',
                  textUnderlineOffset: '4px',
                },
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Week Navigator */}
      <Card className="border-0 shadow-lg shadow-primary/5 rounded-2xl bg-card/90 backdrop-blur-xl">
        <CardContent className="p-3 sm:p-4">
          {/* Week header row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={goToPrevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold">
                {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl"
                onClick={goToNextWeek}
                disabled={isCurrentWeek}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {!isCurrentWeek && (
              <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg px-3" onClick={goToCurrentWeek}>
                This Week
              </Button>
            )}
          </div>

          {/* Day pills */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const count = dayCountMap.get(key) ?? 0;
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDay = isToday(day);
              const isFutureDay = isFuture(startOfDay(day)) && !isTodayDay;
              return (
                <button
                  key={key}
                  disabled={isFutureDay}
                  onClick={() => handleDaySelect(day)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl py-2 px-1 transition-all duration-200',
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                      : isTodayDay
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : isFutureDay
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    {format(day, 'EEE')}
                  </span>
                  <span className={cn('text-sm font-bold leading-none', isSelected ? 'text-primary-foreground' : '')}>
                    {format(day, 'd')}
                  </span>
                  {count > 0 ? (
                    <span
                      className={cn(
                        'text-[9px] font-semibold rounded-full px-1.5 py-0.5 leading-none',
                        isSelected
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-primary/15 text-primary'
                      )}
                    >
                      {count}
                    </span>
                  ) : (
                    <span className="h-[18px]" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Tasks */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="font-semibold text-base">
              {isToday(selectedDate)
                ? "Today's Tasks"
                : format(selectedDate, 'EEEE, MMMM d')}
            </h2>
            {!loadingLogs && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {logs?.length ?? 0} task{(logs?.length ?? 0) !== 1 ? 's' : ''} logged
              </p>
            )}
          </div>
        </div>

        {loadingLogs ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
            ))}
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="space-y-2">
            {logs.map((log) => {
              return (
                <Card
                  key={log.id}
                  className="border-0 shadow-sm rounded-xl bg-card/80 backdrop-blur-sm group hover:shadow-md transition-all duration-200"
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm leading-snug break-words whitespace-pre-wrap">{log.custom_title}</p>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-2.5 w-2.5" />
                                {format(new Date(log.logged_at), 'h:mm a')}
                              </span>
                            </div>
                          </div>

                          {/* Action buttons - visible always on mobile, on hover for desktop */}
                          <div className="flex gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg"
                              onClick={() => openEdit(log)}
                              title="Edit task"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => openDelete(log)}
                              title="Delete task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-0 shadow-sm rounded-2xl bg-card/60">
            <CardContent className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                <ListTodo className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <div className="text-center">
                <p className="font-medium text-muted-foreground">No tasks on this day</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  {isToday(selectedDate) ? 'Log your first task from Daily Tasks' : 'Nothing was logged here'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Edit Task
            </DialogTitle>
            <DialogDescription>Make changes to the logged task below.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedTask) {
                updateMutation.mutate({ id: selectedTask.id, title: editTitle, date: editDate });
              }
            }}
          >
            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="edit-task-title">Task Description</Label>
                <Textarea
                  id="edit-task-title"
                  className="mt-2 min-h-[90px] resize-y text-sm leading-relaxed"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="What did you work on?"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-task-date">Date</Label>
                <Input
                  id="edit-task-date"
                  type="date"
                  className="mt-2"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" /> Delete Task
            </DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <div className="bg-muted/50 rounded-xl p-3 border-l-4 border-destructive">
              <p className="text-sm font-medium whitespace-pre-wrap">{selectedTask?.custom_title}</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedTask && deleteMutation.mutate(selectedTask.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Deleting...
                </>
              ) : (
                'Delete Task'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
