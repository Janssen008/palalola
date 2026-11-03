import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Office } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Building2, Loader2, Users, LayoutGrid, List } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function OfficesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [name, setName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: offices, isLoading } = useQuery({
    queryKey: ['offices-with-stats'],
    queryFn: async () => {
      const { data: officesData, error } = await supabase
        .from('offices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      const { data: profiles } = await supabase.from('profiles').select('office_id');
      const counts: Record<string, number> = {};
      (profiles as any[])?.forEach((p: any) => {
         if (p.office_id) counts[p.office_id] = (counts[p.office_id] || 0) + 1;
      });
      
      return (officesData as Office[]).map(o => ({
        ...o,
        employeeCount: counts[o.id] || 0
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (officeName: string) => {
      const { error } = await (supabase.from('offices') as any).insert({ name: officeName });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices-with-stats'] });
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setCreateOpen(false);
      setName('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await (supabase.from('offices') as any).update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices-with-stats'] });
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setEditOpen(false);
      setSelectedOffice(null);
      setName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('offices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices-with-stats'] });
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setDeleteOpen(false);
      setSelectedOffice(null);
    },
  });

  const openEdit = (office: Office) => {
    setSelectedOffice(office);
    setName(office.name);
    setEditOpen(true);
  };

  const openDelete = (office: Office) => {
    setSelectedOffice(office);
    setDeleteOpen(true);
  };

  return (
    <div className="space-y-8 animate-fade-in w-full pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Organization Offices</h1>
          <p className="text-muted-foreground mt-1">Manage the physical or logical divisions in your workspace.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-muted/50 p-1 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 px-2 rounded-md", viewMode === 'grid' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 px-2 rounded-md", viewMode === 'list' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none gap-2 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" />
                Add Office
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Office</DialogTitle>
                <DialogDescription>Add a new division or office location.</DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate(name);
                }}
              >
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="office-name">Office Name</Label>
                    <Input
                      id="office-name"
                      placeholder="e.g. Engineering, Marketing"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        viewMode === 'grid' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-lg shadow-primary/5 bg-card/80 backdrop-blur-xl">
            <CardContent className="p-0">
              <div className="space-y-3 p-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            </CardContent>
          </Card>
        )
      ) : offices && offices.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {offices.map((office) => (
              <Card key={office.id} className="border-0 shadow-lg shadow-primary/5 bg-card/80 backdrop-blur-xl relative overflow-hidden group flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 hover:bg-muted" onClick={() => openEdit(office)}>
                        <Pencil className="h-4 w-4 text-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 hover:bg-destructive/10 hover:text-destructive" onClick={() => openDelete(office)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-xl mt-4 line-clamp-1">{office.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">Added {format(new Date(office.created_at), 'MMM d, yyyy')}</p>
                </CardHeader>
                <div className="flex-1" />
                <CardFooter className="pt-4 border-t bg-muted/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {office.employeeCount} {office.employeeCount === 1 ? 'Employee' : 'Employees'}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-lg shadow-primary/5 bg-card/80 backdrop-blur-xl overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Office Name</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offices.map((office) => (
                    <TableRow key={office.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                            <Building2 className="h-4 w-4" />
                          </div>
                          {office.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {office.employeeCount}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(office.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(office)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openDelete(office)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-muted rounded-2xl bg-muted/10">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-xl font-medium text-foreground">No offices found</h3>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Create your first office to start organizing your employees and tracking departmental tasks.</p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Office</DialogTitle>
            <DialogDescription>Update the office details.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedOffice) updateMutation.mutate({ id: selectedOffice.id, name });
            }}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-office-name">Office Name</Label>
                <Input
                  id="edit-office-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Office</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">"{selectedOffice?.name}"</span>? This action cannot be undone and will unset the office for all assigned employees.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedOffice && deleteMutation.mutate(selectedOffice.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Office'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
