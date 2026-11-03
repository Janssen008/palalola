import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, Users as UsersIcon, Loader2, Edit2, Trash2, Building2, Calendar, LayoutGrid, List } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SearchableSelect } from "@/components/SearchableSelect";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editOffice, setEditOffice] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [officeFilter, setOfficeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: offices, isLoading: loadingOffices } = useQuery({
    queryKey: ['admin-offices-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('offices').select('*').order('name');
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`*, offices(name)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const filteredProfiles = profiles?.filter((profile: any) => {
    const matchesSearch = profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || profile.role === roleFilter;
    const matchesOffice = officeFilter === 'all' || 
      (officeFilter === 'none' ? !profile.office_id : profile.office_id === officeFilter);
    return matchesSearch && matchesRole && matchesOffice;
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('admin_reset_user_password', {
        target_user_id: userId,
        new_password: 'PalaGawa123!',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      setResetOpen(false);
      toast.success('Password reset successfully. The user will be forced to change it on next login.');
    },
    onError: (error) => {
      toast.error('Failed to reset password: ' + error.message);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      const { error } = await (supabase.from('profiles') as any)
        .update({
          full_name: editName,
          role: editRole,
          office_id: editOffice === 'none' ? null : editOffice,
        })
        .eq('user_id', selectedUser.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      setEditOpen(false);
      toast.success('User updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update user: ' + error.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      const { error } = await supabase.rpc('admin_delete_user', {
        target_user_id: selectedUser.user_id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      setDeleteOpen(false);
      toast.success('User deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete user: ' + error.message);
    },
  });

  const handleResetClick = (user: Profile) => {
    setSelectedUser(user);
    setResetOpen(true);
  };
  
  const handleEditClick = (user: Profile) => {
    setSelectedUser(user);
    setEditName(user.full_name);
    setEditRole(user.role);
    setEditOffice(user.office_id || 'none');
    setEditOpen(true);
  };

  const handleDeleteClick = (user: Profile) => {
    setSelectedUser(user);
    setDeleteOpen(true);
  };

  const confirmReset = () => {
    if (selectedUser) {
      resetPasswordMutation.mutate(selectedUser.user_id);
    }
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserMutation.mutate();
  };

  return (
    <div className="space-y-8 animate-fade-in w-full pb-12">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage Users</h1>
          <p className="text-muted-foreground mt-1">View and manage user accounts and passwords.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="flex bg-muted/50 p-1 rounded-lg w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 px-2 rounded-md flex-1 sm:flex-none", viewMode === 'grid' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 px-2 rounded-md flex-1 sm:flex-none", viewMode === 'list' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Input 
            placeholder="Search users..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-[250px] shadow-sm bg-card/50 h-10"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[150px] shadow-sm bg-card/50 h-10">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="department_head">Dept Head</SelectItem>
              <SelectItem value="oic">OIC</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <SearchableSelect
            value={officeFilter}
            onValueChange={setOfficeFilter}
            options={offices}
            placeholder="All Offices"
            searchPlaceholder="Search office..."
            emptyMessage="No office found."
            loading={loadingOffices}
            className="w-full sm:w-[200px] shadow-sm bg-card/50 h-10"
            staticOptions={[
              { id: "all", name: "All Offices" },
              { id: "none", name: "No Office" }
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        viewMode === 'grid' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
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
      ) : filteredProfiles && filteredProfiles.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProfiles.map((profile) => (
              <Card key={profile.id} className="border-0 shadow-lg shadow-primary/5 bg-card/80 backdrop-blur-xl relative overflow-hidden group flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-sm">
                        {profile.full_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {profile.force_password_reset ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 uppercase tracking-wider">
                          Must Reset
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2 truncate">{profile.full_name}</CardTitle>
                  <div className="flex items-center gap-2">
                     <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground uppercase tracking-wider">
                       {profile.role === 'oic' ? 'OIC' : profile.role === 'department_head' ? 'Dept Head' : profile.role}
                     </span>
                  </div>
                </CardHeader>
                
                <CardContent className="pb-4 space-y-2 flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{profile.offices?.name || 'No Office assigned'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>Joined {format(new Date(profile.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </CardContent>
                
                <div className="border-t border-border/50 bg-muted/10 flex divide-x divide-border/50">
                  <Button 
                    variant="ghost" 
                    className="flex-1 rounded-none hover:bg-muted/30 h-11 text-xs"
                    onClick={() => handleEditClick(profile)}
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="flex-1 rounded-none hover:bg-amber-500/10 hover:text-amber-600 text-xs text-muted-foreground"
                    onClick={() => handleResetClick(profile)}
                  >
                    <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
                    Reset
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="flex-1 rounded-none hover:bg-destructive/10 hover:text-destructive text-xs text-muted-foreground"
                    onClick={() => handleDeleteClick(profile)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-lg shadow-primary/5 bg-card/80 backdrop-blur-xl overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Office</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((profile) => (
                    <TableRow key={profile.id} className="hover:bg-muted/30 group">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary font-bold text-xs">
                              {profile.full_name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          {profile.full_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-muted text-muted-foreground uppercase tracking-wider">
                          {profile.role === 'oic' ? 'OIC' : profile.role === 'department_head' ? 'Dept Head' : profile.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {profile.offices?.name || 'No Office assigned'}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(profile.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {profile.force_password_reset ? (
                          <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 uppercase tracking-wider flex items-center gap-1 w-fit">
                            <ShieldAlert className="h-3 w-3" />
                            Must Reset
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(profile)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10" onClick={() => handleResetClick(profile)}>
                            <ShieldAlert className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(profile)}>
                            <Trash2 className="h-4 w-4" />
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
          <UsersIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-xl font-medium text-foreground">No users found</h3>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">No user profiles match your current search and filter criteria.</p>
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update role, office assignment, and details for {selectedUser?.full_name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="department_head">Department Head</SelectItem>
                    <SelectItem value="oic">OIC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-office">Office</Label>
                <SearchableSelect
                  value={editOffice}
                  onValueChange={setEditOffice}
                  options={offices}
                  placeholder="Select office"
                  searchPlaceholder="Search office..."
                  emptyMessage="No office found."
                  loading={loadingOffices}
                  staticOptions={[
                    { id: "none", name: "No Office" }
                  ]}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reset the password for <span className="font-semibold text-foreground">{selectedUser?.full_name}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will set their password to <strong className="text-foreground">PalaGawa123!</strong> and force them to change it on their next login.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={confirmReset}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Reset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{selectedUser?.full_name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteUserMutation.mutate()}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
