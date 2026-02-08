import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS, ROLE_COLORS, type AppRole } from '@/types/roles';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: AppRole;
}

export default function UserManagement() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('*'),
    ]);
    setProfiles(profilesRes.data ?? []);
    setUserRoles(rolesRes.data as UserRole[] ?? []);
    setLoading(false);
  };

  const assignRole = async (userId: string, role: AppRole) => {
    // Remove existing roles first
    await supabase.from('user_roles').delete().eq('user_id', userId);
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Role assigned: ${ROLE_LABELS[role]}` });
      fetchData();
    }
  };

  const getRoleForUser = (userId: string): AppRole | undefined => {
    return userRoles.find(r => r.user_id === userId)?.role;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground text-sm mt-1">{profiles.length} registered users</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Assign Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map(profile => {
                const role = getRoleForUser(profile.id);
                return (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.full_name || 'Unnamed'}</TableCell>
                    <TableCell>{profile.email}</TableCell>
                    <TableCell>
                      {role ? (
                        <Badge variant="outline" className={`status-badge ${ROLE_COLORS[role]}`}>
                          {ROLE_LABELS[role]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No role</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Select onValueChange={v => assignRole(profile.id, v as AppRole)} value={role}>
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="supplier">Supplier</SelectItem>
                          <SelectItem value="pharmacist">Pharmacist</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
