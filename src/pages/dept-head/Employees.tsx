import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Users as UsersIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

export default function DeptEmployees() {
  const { profile } = useAuth();
  const officeId = profile?.office_id;
  const queryClient = useQueryClient();
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: employees, isLoading } = useQuery({
    queryKey: ['dept-employees', officeId],
    queryFn: async () => {
      if (!officeId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('office_id', officeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!officeId,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      // NOTE: This uses the admin RPC function. A department head cannot call this 
      // directly if is_admin() checks for 'admin' role in the SQL.
      // Wait, is_admin() in supabase-schema.sql checks for role = 'admin'.
      // If we want dept head to reset passwords, we need to update the RPC or 
      // just remove the action for Dept Heads for now to keep it simple.
      // We will leave the action but the user asked for them to see employees.
      toast.error("Contact an administrator to reset user passwords.");
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UsersIcon className="h-6 w-6 text-primary" />
          My Employees
        </h1>
        <p className="text-muted-foreground mt-1">View users assigned to your office</p>
      </div>

      <Card className="border-0 shadow-xl shadow-primary/5 rounded-2xl overflow-hidden bg-card/80 backdrop-blur-xl">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-primary" />
            Employees
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                    </TableRow>
                  ))
                ) : employees?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No employees found in your office.
                    </TableCell>
                  </TableRow>
                ) : (
                  employees?.map((emp) => (
                    <TableRow key={emp.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        {emp.full_name}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.role === 'department_head' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {emp.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(emp.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {emp.force_password_reset ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            Must Reset
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Active
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
