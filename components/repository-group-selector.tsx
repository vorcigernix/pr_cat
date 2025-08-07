"use client"

import * as React from "react"
import { IconFolders, IconGitBranch, IconPlus, IconEdit, IconTrash } from "@tabler/icons-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

type Repository = {
  id: number;
  name: string;
  full_name: string;
  is_tracked: boolean;
  organization?: {
    id: number;
    name: string;
  };
};

type RepositoryGroup = {
  id: string;
  name: string;
  description: string;
  color: string;
  repositories: number[];
  createdAt: string;
};

type RepositoryGroupSelectorProps = {
  selectedGroupId?: string | null;
  onGroupSelect: (groupId: string | null) => void;
};

export function RepositoryGroupSelector({ selectedGroupId, onGroupSelect }: RepositoryGroupSelectorProps) {
  const [groups, setGroups] = React.useState<RepositoryGroup[]>([]);
  const [repositories, setRepositories] = React.useState<Repository[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<RepositoryGroup | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [repositorySearch, setRepositorySearch] = React.useState('');

  // Form state for group creation/editing
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    color: '#3b82f6',
    selectedRepos: [] as number[]
  });

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch repositories
      const reposResponse = await fetch('/api/repositories');
      if (reposResponse.ok) {
        const reposData = await reposResponse.json();
        console.log('Repositories response:', reposData);
        setRepositories(reposData.repositories || []);
      } else {
        const errorData = await reposResponse.json();
        setError(errorData.message || 'Failed to fetch repositories');
      }

      // Fetch repository groups (from localStorage for now, could be API later)
      const savedGroups = localStorage.getItem('prcat-repository-groups');
      if (savedGroups) {
        setGroups(JSON.parse(savedGroups));
      }
      
      // Migrate old teams data if it exists
      const oldTeams = localStorage.getItem('prcat-teams');
      if (oldTeams && !savedGroups) {
        localStorage.setItem('prcat-repository-groups', oldTeams);
        setGroups(JSON.parse(oldTeams));
        // Keep old data for backward compatibility temporarily
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load repository group data');
    } finally {
      setLoading(false);
    }
  };

  const saveGroup = () => {
    if (!formData.name.trim()) return;

    const newGroup: RepositoryGroup = {
      id: editingGroup?.id || `group-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      color: formData.color,
      repositories: formData.selectedRepos,
      createdAt: editingGroup?.createdAt || new Date().toISOString()
    };

    let updatedGroups;
    if (editingGroup) {
      updatedGroups = groups.map(g => g.id === editingGroup.id ? newGroup : g);
    } else {
      updatedGroups = [...groups, newGroup];
    }

    setGroups(updatedGroups);
    localStorage.setItem('prcat-repository-groups', JSON.stringify(updatedGroups));
    // Also update old key for backward compatibility
    localStorage.setItem('prcat-teams', JSON.stringify(updatedGroups));
    
    resetForm();
    setIsCreateDialogOpen(false);
    setEditingGroup(null);
  };

  const deleteGroup = (groupId: string) => {
    const updatedGroups = groups.filter(g => g.id !== groupId);
    setGroups(updatedGroups);
    localStorage.setItem('prcat-repository-groups', JSON.stringify(updatedGroups));
    // Also update old key for backward compatibility
    localStorage.setItem('prcat-teams', JSON.stringify(updatedGroups));
    
    if (selectedGroupId === groupId) {
      onGroupSelect(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3b82f6',
      selectedRepos: []
    });
    setRepositorySearch('');
  };

  const openEditDialog = (group: RepositoryGroup) => {
    setFormData({
      name: group.name,
      description: group.description,
      color: group.color,
      selectedRepos: group.repositories
    });
    setEditingGroup(group);
    setIsCreateDialogOpen(true);
  };

  const toggleRepoSelection = (repoId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedRepos: prev.selectedRepos.includes(repoId)
        ? prev.selectedRepos.filter(id => id !== repoId)
        : [...prev.selectedRepos, repoId]
    }));
  };

  const getGroupRepositoryCount = (group: RepositoryGroup) => {
    return group.repositories.filter(repoId => 
      repositories.find(r => r.id === repoId && r.is_tracked)
    ).length;
  };

  const filteredRepositories = repositories.filter(repo =>
    repo.name.toLowerCase().includes(repositorySearch.toLowerCase()) ||
    repo.full_name.toLowerCase().includes(repositorySearch.toLowerCase())
  );

  const predefinedColors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Repository Groups</CardTitle>
              <CardDescription>Loading repository groups...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repository Groups</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconFolders className="h-5 w-5" />
                Repository Groups
              </CardTitle>
              <CardDescription>
                Group repositories together for focused analytics and reporting
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm"
                  onClick={() => {
                    resetForm();
                    setEditingGroup(null);
                  }}
                >
                  <IconPlus className="h-4 w-4 mr-1" />
                  New Group
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingGroup ? 'Edit Repository Group' : 'Create Repository Group'}
                  </DialogTitle>
                  <DialogDescription>
                    Group repositories together to track metrics for specific projects or initiatives
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Group Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Frontend Team, Backend Services"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Brief description of this repository group"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-2">
                      {predefinedColors.map(color => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-md border-2 ${
                            formData.color === color ? 'border-primary' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setFormData(prev => ({ ...prev, color }))}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Select Repositories</Label>
                    <Input
                      placeholder="Search repositories..."
                      value={repositorySearch}
                      onChange={(e) => setRepositorySearch(e.target.value)}
                    />
                    <div className="border rounded-md max-h-64 overflow-y-auto">
                      {filteredRepositories.length === 0 ? (
                        <p className="p-4 text-center text-muted-foreground">
                          No repositories found
                        </p>
                      ) : (
                        <div className="p-2 space-y-1">
                          {filteredRepositories.map(repo => (
                            <div
                              key={repo.id}
                              className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                              onClick={() => toggleRepoSelection(repo.id)}
                            >
                              <Checkbox
                                checked={formData.selectedRepos.includes(repo.id)}
                                onCheckedChange={() => toggleRepoSelection(repo.id)}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{repo.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {repo.organization?.name || repo.full_name}
                                </p>
                              </div>
                              {!repo.is_tracked && (
                                <Badge variant="outline" className="text-xs">
                                  Not tracked
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selected: {formData.selectedRepos.length} repositories
                    </p>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setIsCreateDialogOpen(false);
                      setEditingGroup(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={saveGroup}
                    disabled={!formData.name.trim() || formData.selectedRepos.length === 0}
                  >
                    {editingGroup ? 'Update' : 'Create'} Group
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-8">
              <IconFolders className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No repository groups created yet
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Create groups to organize repositories by project, team, or any other criteria
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* All repositories option */}
              <div
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedGroupId === null
                    ? 'bg-accent border-primary'
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => onGroupSelect(null)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-muted">
                      <IconGitBranch className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">All Repositories</p>
                      <p className="text-sm text-muted-foreground">
                        View metrics for all tracked repositories
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {repositories.filter(r => r.is_tracked).length} repos
                  </Badge>
                </div>
              </div>

              {/* Repository groups */}
              {groups.map(group => (
                <div
                  key={group.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedGroupId === group.id
                      ? 'bg-accent border-primary'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => onGroupSelect(group.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-md"
                        style={{ backgroundColor: group.color + '20' }}
                      >
                        <IconFolders 
                          className="h-4 w-4"
                          style={{ color: group.color }}
                        />
                      </div>
                      <div>
                        <p className="font-medium">{group.name}</p>
                        {group.description && (
                          <p className="text-sm text-muted-foreground">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {getGroupRepositoryCount(group)} repos
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(group);
                        }}
                      >
                        <IconEdit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete repository group "${group.name}"?`)) {
                            deleteGroup(group.id);
                          }
                        }}
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}