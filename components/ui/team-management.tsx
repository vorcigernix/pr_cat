"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Users, Edit, Trash2, UserPlus, UserMinus } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TeamWithMembers, User } from '@/lib/types';
import { toast } from 'sonner';

interface TeamManagementProps {
  organizationId: number; // Database ID of the organization, not GitHub ID
  organizationMembers?: User[];
  onRefreshMembers?: (search?: string) => Promise<void> | void;
}

interface CreateTeamFormData {
  name: string;
  description: string;
  color: string;
}

interface AddMemberFormData {
  user_id: string;
  role: 'member' | 'lead' | 'admin';
}

const DEFAULT_TEAM_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

const getRoleColor = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    case 'lead': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
  }
};

export function TeamManagement({ organizationId, organizationMembers, onRefreshMembers }: TeamManagementProps) {
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [orgMembers, setOrgMembers] = useState<User[]>(organizationMembers || []);
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMembers | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);

  const [createForm, setCreateForm] = useState<CreateTeamFormData>({
    name: '',
    description: '',
    color: DEFAULT_TEAM_COLORS[0]
  });

  const [editForm, setEditForm] = useState<CreateTeamFormData>({
    name: '',
    description: '',
    color: DEFAULT_TEAM_COLORS[0]
  });

  const [addMemberForm, setAddMemberForm] = useState<AddMemberFormData>({
    user_id: '',
    role: 'member'
  });

  // Fetch teams
  const fetchTeams = async () => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/teams`);
      if (response.ok) {
        const data = await response.json();
        setTeams(Array.isArray(data) ? data : []);
      } else {
        toast.error('Failed to fetch teams');
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Failed to fetch teams');
    }
  };

  // Keep local member list in sync if parent provides it
  useEffect(() => {
    if (organizationMembers) {
      setOrgMembers(organizationMembers);
    }
  }, [organizationMembers]);

  // Fetch organization members
  const fetchOrgMembers = async () => {
    if (organizationMembers && organizationMembers.length > 0) {
      setOrgMembers(organizationMembers);
      return;
    }
    try {
      const qs = memberSearch ? `?search=${encodeURIComponent(memberSearch)}` : '';
      const response = await fetch(`/api/organizations/${organizationId}/members${qs}`);
      if (response.ok) {
        const data = await response.json();
        setOrgMembers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching organization members:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTeams(), fetchOrgMembers()]);
      setLoading(false);
    };
    loadData();
  }, [organizationId]);

  // When opening add-member dialog, refresh member list (and support search)
  useEffect(() => {
    if (showAddMemberDialog) {
      if (onRefreshMembers) {
        Promise.resolve(onRefreshMembers(memberSearch)).then(() => {
          // parent will update organizationMembers prop; sync will pick it up via effect
        });
      } else {
        fetchOrgMembers();
      }
    }
  }, [showAddMemberDialog, memberSearch]);

  // Create team
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/organizations/${organizationId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });

      if (response.ok) {
        toast.success('Team created successfully');
        setShowCreateDialog(false);
        setCreateForm({ name: '', description: '', color: DEFAULT_TEAM_COLORS[0] });
        fetchTeams();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create team');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    }
  };

  // Update team
  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    try {
      const response = await fetch(`/api/organizations/${organizationId}/teams/${selectedTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        toast.success('Team updated successfully');
        setShowEditDialog(false);
        setSelectedTeam(null);
        fetchTeams();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update team');
      }
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error('Failed to update team');
    }
  };

  // Delete team
  const handleDeleteTeam = async (team: TeamWithMembers) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/teams/${team.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Team deleted successfully');
        fetchTeams();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete team');
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Failed to delete team');
    }
  };

  // Add team member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    try {
      const response = await fetch(`/api/organizations/${organizationId}/teams/${selectedTeam.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addMemberForm)
      });

      if (response.ok) {
        toast.success('Member added successfully');
        setShowAddMemberDialog(false);
        setAddMemberForm({ user_id: '', role: 'member' });
        fetchTeams();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add member');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  // Remove team member
  const handleRemoveMember = async (teamId: number, userId: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/teams/${teamId}/members?user_id=${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Member removed successfully');
        fetchTeams();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  // Update member role
  const handleUpdateMemberRole = async (teamId: number, userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/teams/${teamId}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role: newRole })
      });

      if (response.ok) {
        toast.success('Member role updated successfully');
        fetchTeams();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update member role');
      }
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error('Failed to update member role');
    }
  };

  const openEditDialog = (team: TeamWithMembers) => {
    setSelectedTeam(team);
    setEditForm({
      name: team.name,
      description: team.description || '',
      color: team.color || DEFAULT_TEAM_COLORS[0]
    });
    setShowEditDialog(true);
  };

  const openAddMemberDialog = (team: TeamWithMembers) => {
    setSelectedTeam(team);
    setShowAddMemberDialog(true);
  };

  // Get available members (not already in the team)
  const getAvailableMembers = (team: TeamWithMembers) => {
    const teamMemberIds = new Set((team.members ?? []).map(m => m.user_id));
    const pool = Array.isArray(orgMembers) ? orgMembers : [];
    return pool.filter(member => !teamMemberIds.has(member.id));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team Management</h2>
          <p className="text-muted-foreground">
            Organize your team members into collaborative groups for better insights and metrics.
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Frontend Team"
                  required
                />
              </div>
              <div>
                <Label htmlFor="team-description">Description (Optional)</Label>
                <Textarea
                  id="team-description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Team responsible for frontend development..."
                />
              </div>
              <div>
                <Label htmlFor="team-color">Team Color</Label>
                <div className="flex gap-2 mt-2">
                  {DEFAULT_TEAM_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        createForm.color === color ? 'border-gray-900 dark:border-gray-100' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setCreateForm({ ...createForm, color })}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">Create Team</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first team to start organizing your members and tracking collaborative metrics.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id} className="relative hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: team.color || DEFAULT_TEAM_COLORS[0] }}
                    />
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(team)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Team</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{team.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteTeam(team)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {team.description && (
                  <p className="text-sm text-muted-foreground">{team.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {(team.member_count ?? (team.members?.length ?? 0))} {(team.member_count ?? (team.members?.length ?? 0)) === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openAddMemberDialog(team)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Manage
                    </Button>
                  </div>
                  
                  {(team.members?.length ?? 0) > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Members</span>
                        <div className="flex gap-1">
                          {(team.members ?? []).slice(0, 5).map((member) => (
                            <Avatar key={member.user_id} className="h-6 w-6 border-2 border-background">
                              <AvatarImage src={member.user?.image || undefined} />
                              <AvatarFallback className="text-xs">
                                {member.user?.name?.substring(0, 2).toUpperCase() || member.user?.email?.substring(0, 2).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {(team.members?.length ?? 0) > 5 && (
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-xs font-medium">+{(team.members?.length ?? 0) - 5}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        {(team.members ?? []).slice(0, 3).map((member) => (
                          <div key={member.user_id} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={member.user?.image || undefined} />
                                <AvatarFallback className="text-xs">
                                  {member.user?.name?.substring(0, 2).toUpperCase() || member.user?.email?.substring(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium truncate max-w-24">
                                {member.user?.name || member.user?.email || 'Unknown'}
                              </span>
                            </div>
                            <Badge variant="secondary" className={`text-xs ${getRoleColor(member.role)}`}>
                              {member.role}
                            </Badge>
                          </div>
                        ))}
                        {(team.members?.length ?? 0) > 3 && (
                          <p className="text-xs text-muted-foreground text-center pt-1">
                            +{(team.members?.length ?? 0) - 3} more members
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No members yet</p>
                      <p className="text-xs">Click "Manage" to add team members</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Team Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTeam} className="space-y-4">
            <div>
              <Label htmlFor="edit-team-name">Team Name</Label>
              <Input
                id="edit-team-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-team-description">Description (Optional)</Label>
              <Textarea
                id="edit-team-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-team-color">Team Color</Label>
              <div className="flex gap-2 mt-2">
                {DEFAULT_TEAM_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      editForm.color === color ? 'border-gray-900 dark:border-gray-100' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditForm({ ...editForm, color })}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">Update Team</Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Manage Team Members</DialogTitle>
            <DialogDescription>
              Add new members to "{selectedTeam?.name}" or manage existing ones
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Search and Filter Section */}
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="member-search">Search Members</Label>
                <Input
                  id="member-search"
                  placeholder="Search by name, email, or role..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="w-48">
                <Label htmlFor="role-filter">Filter by Role</Label>
                <Select 
                  value={roleFilter} 
                  onValueChange={(value) => setRoleFilter(value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Available Members Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Available Organization Members</h4>
                <Badge variant="secondary">
                  {selectedTeam ? getAvailableMembers(selectedTeam).length : 0} available
                </Badge>
              </div>
              
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {!selectedTeam || getAvailableMembers(selectedTeam).length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2" />
                    <p>No available members to add</p>
                    <p className="text-sm">All organization members are already part of this team</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {getAvailableMembers(selectedTeam)
                      .filter(user => {
                        const matchesSearch = !memberSearch || 
                          user.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                          user.email?.toLowerCase().includes(memberSearch.toLowerCase());
                        
                        const matchesRole = roleFilter === 'all' || true; // We don't have user roles in org members, so always show
                        
                        return matchesSearch && matchesRole;
                      })
                      .map((user) => (
                        <div key={user.id} className="p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.image || undefined} />
                                <AvatarFallback className="text-sm">
                                  {user.name?.substring(0, 2).toUpperCase() || user.email?.substring(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.name || 'No name'}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select 
                                value={addMemberForm.role} 
                                onValueChange={(value: 'member' | 'lead' | 'admin') => setAddMemberForm({ ...addMemberForm, role: value })}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="lead">Lead</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button 
                                size="sm"
                                onClick={() => {
                                  setAddMemberForm({ ...addMemberForm, user_id: user.id });
                                  handleAddMember({ preventDefault: () => {} } as React.FormEvent);
                                }}
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Current Team Members Section */}
            {selectedTeam && (selectedTeam.members?.length ?? 0) > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Current Team Members</h4>
                  <Badge variant="secondary">
                    {(selectedTeam.members?.length ?? 0)} members
                  </Badge>
                </div>
                
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  <div className="divide-y">
                    {(selectedTeam.members ?? [])
                      .filter(member => 
                        !memberSearch || 
                        member.user?.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                        member.user?.email?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                        member.role.toLowerCase().includes(memberSearch.toLowerCase())
                      )
                      .map((member) => (
                        <div key={member.user_id} className="p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.user?.image || undefined} />
                                <AvatarFallback className="text-sm">
                                  {member.user?.name?.substring(0, 2).toUpperCase() || member.user?.email?.substring(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.user?.name || 'No name'}</p>
                                <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className={getRoleColor(member.role)}>
                                {member.role}
                              </Badge>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleRemoveMember(selectedTeam.id, member.user_id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAddMemberDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}