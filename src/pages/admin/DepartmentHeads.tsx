import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users as UsersIcon, Plus, Loader2, Building2, ShieldAlert, Mail, Calendar, LayoutGrid, List } from 'lucide-react';
import { SearchableSelect } from "@/components/SearchableSelect";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function DepartmentHeadsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('oic');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: deptHeads, isLoading } = useQuery({
    queryKey: ['admin-dept-heads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`*, offices(name)`)
        .in('role', ['department_head', 'oic'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const { data: offices } = useQuery({
    queryKey: ['offices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('offices').select('*').order('name');
      if (error) throw error;
      return data as Office[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {

      
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });

      const tempPassword = 'PalaGawa123!';

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email,
        password: tempPassword,
        options: { data: { full_name: fullName } },
      });

      if (authError) throw authError;

      if (authData.user) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const roleVal: 'department_head' | 'oic' = selectedPosition === 'department_head' ? 'department_head' : 'oic';
        const positionTitleVal =
          selectedPosition === 'vice_president'
            ? 'Vice President'
            : selectedPosition === 'secretary'
            ? 'Secretary'
            : selectedPosition === 'treasurer'
            ? 'Treasurer'
            : selectedPosition === 'oic'
            ? 'Officer-in-Charge (OIC)'
            : 'Department Head';

        const { error: updateError } = await (supabase.from('profiles') as any)
          .update({
            role: roleVal,
            position_title: positionTitleVal,
            office_id: selectedOfficeId,
            force_password_reset: true,
          })
          .eq('user_id', authData.user.id);
          
        if (updateError) {
          throw new Error('User created but failed to assign role: ' + updateError.message);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dept-heads'] });
      setCreateOpen(false);
      setFullName('');
      setEmail('');
      setSelectedOfficeId('');
      toast.success('Department Head created successfully. Temporary password is: PalaGawa123!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create Department Head');
    },
  });

  
  const getOfficialBadge = (profile: any) => {
    const title = (profile.position_title || '').toLowerCase();
    const role = profile.role;
    if (title.includes('vice') || title.includes('vp')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-600 border border-purple-500/30 uppercase tracking-wider">
          Vice President
        </span>
      );
    }
    if (title.includes('secretar')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 uppercase tracking-wider">
          Secretary
        </span>
      );
    }
    if (title.includes('treasur')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 border border-amber-500/30 uppercase tracking-wider">
          Treasurer
        </span>
      );
    }
    if (role === 'oic' || title.includes('oic') || title.includes('officer-in-charge') || title.includes('head')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-600 border border-blue-500/30 uppercase tracking-wider">
          OIC Head
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
        Dept Head
      </span>
    );
  };

  const filteredHeads: any[] = (deptHeads || []).filter((profile: any) => {
    if (filterPosition === 'all') return true;
    const title = (profile.position_title || '').toLowerCase();
    if (filterPosition === 'oic') return profile.role === 'oic' && !title.includes('vice') && !title.includes('secretar') && !title.includes('treasur');
    if (filterPosition === 'vice_president') return title.includes('vice') || title.includes('vp');
    if (filterPosition === 'secretary') return title.includes('secretar');
    if (filterPosition === 'treasurer') return title.includes('treasur');
    if (filterPosition === 'department_head') return profile.role === 'department_head';
    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in w-full pb-12">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Department Heads</h1>
          <p className="text-muted-foreground mt-1">Manage OIC and Department Heads for your offices.</p>
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
                Create OIC
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Department Head</DialogTitle>
                <DialogDescription>
                  Create a new account for an OIC and assign them to an office. Their temporary password will be <strong className="text-foreground">PalaGawa123!</strong>
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
              >
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullname">Full Name</Label>
                    <Input
                      id="fullname"
                      placeholder="e.g. Juan Dela Cruz"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g. juan@palayan.gov.ph"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Position Title</Label>
                    <Select value={selectedPosition} onValueChange={(val: string) => setSelectedPosition(val)} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oic">Officer-in-Charge (OIC) / Head</SelectItem>
                        <SelectItem value="vice_president">OSCA Vice President</SelectItem>
                        <SelectItem value="secretary">OSCA Secretary</SelectItem>
                        <SelectItem value="treasurer">OSCA Treasurer</SelectItem>
                        <SelectItem value="department_head">Department Head</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="office">Assign Office</Label>
                    <SearchableSelect
                      value={selectedOfficeId}
                      onValueChange={setSelectedOfficeId}
                      options={offices}
                      placeholder="Select an office"
                      searchPlaceholder="Search office..."
                      emptyMessage="No office found."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || !selectedOfficeId}>
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>


      {/* Position Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'All Officials' },
          { key: 'oic', label: 'OIC Head' },
          { key: 'vice_president', label: 'Vice President' },
          { key: 'secretary', label: 'Secretary' },
          { key: 'treasurer', label: 'Treasurer' },
          { key: 'department_head', label: 'Dept Heads' },
        ].map((tab) => (
          <Button
            key={tab.key}
            variant={filterPosition === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterPosition(tab.key)}
            className="rounded-full text-xs h-7 px-3 shrink-0"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        viewMode === 'grid' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-2xl" />
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
      ) : deptHeads && deptHeads.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredHeads.map((profile) => (
              <Card key={profile.id} className="border-0 shadow-lg shadow-primary/5 bg-card/80 backdrop-blur-xl relative overflow-hidden group flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                      <span className="text-primary font-bold text-lg">
                        {profile.full_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {profile.force_password_reset && (
                      <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-1 rounded-full shrink-0">
                        <ShieldAlert className="h-3 w-3" />
                        Must Reset
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-3 truncate">{profile.full_name}</CardTitle>
                  <div className="flex items-center gap-2">
                     <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary uppercase tracking-wider">
                       {profile.role === 'oic' ? 'OIC' : 'Dept Head'}
                     </span>
                  </div>
                </CardHeader>
                
                <CardContent className="pb-4 space-y-3 flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{profile.offices?.name || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>Joined {format(new Date(profile.created_at), 'MMM yyyy')}</span>
                  </div>
                </CardContent>
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
                    <TableHead>Position</TableHead>
                    <TableHead>Office</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHeads.map((profile) => (
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
                        <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-primary/10 text-primary uppercase tracking-wider">
                          {profile.role === 'oic' ? 'OIC' : 'Dept Head'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {profile.offices?.name || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(profile.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {profile.force_password_reset ? (
                          <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 uppercase tracking-wider flex items-center w-fit gap-1">
                            <ShieldAlert className="h-3 w-3" />
                            Must Reset
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 uppercase tracking-wider">
                            Active
                          </span>
                        )}
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
          <h3 className="text-xl font-medium text-foreground">No Department Heads found</h3>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Create a Department Head or OIC account to assign them to an office.</p>
        </div>
      )}
    </div>
  );
}
