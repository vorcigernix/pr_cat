"use client"

import * as React from "react"
import { IconUsers, IconGitBranch, IconPlus, IconEdit, IconTrash } from "@tabler/icons-react"

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

type Team = {
  id: string;
  name: string;
  description: string;
  color: string;
  repositories: number[];
  createdAt: string;
};

type TeamSelectorProps = {
  selectedTeamId?: string | null;
  onTeamSelect: (teamId: string | null) => void;
};

export function TeamSelector({ selectedTeamId, onTeamSelect }: TeamSelectorProps) {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [repositories, setRepositories] = React.useState<Repository[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [editingTeam, setEditingTeam] = React.useState<Team | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [repositorySearch, setRepositorySearch] = React.useState('');

  // Form state for team creation/editing
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

      // Fetch teams (from localStorage for now, could be API later)
      const savedTeams = localStorage.getItem('prcat-teams');
      if (savedTeams) {
        setTeams(JSON.parse(savedTeams));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const saveTeam = () => {
    if (!formData.name.trim()) return;

    const newTeam: Team = {
      id: editingTeam?.id || `team-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      color: formData.color,
      repositories: formData.selectedRepos,
      createdAt: editingTeam?.createdAt || new Date().toISOString()
    };

    let updatedTeams;
    if (editingTeam) {
      updatedTeams = teams.map(t => t.id === editingTeam.id ? newTeam : t);
    } else {
      updatedTeams = [...teams, newTeam];
    }

    setTeams(updatedTeams);
    localStorage.setItem('prcat-teams', JSON.stringify(updatedTeams));
    
    resetForm();
    setIsCreateDialogOpen(false);
    setEditingTeam(null);
  };

  const deleteTeam = (teamId: string) => {
    const updatedTeams = teams.filter(t => t.id !== teamId);
    setTeams(updatedTeams);
    localStorage.setItem('prcat-teams', JSON.stringify(updatedTeams));
    
    if (selectedTeamId === teamId) {
      onTeamSelect(null);
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

  const openEditDialog = (team: Team) => {
    setFormData({
      name: team.name,
      description: team.description,
      color: team.color,
      selectedRepos: team.repositories
    });
    setEditingTeam(team);
    setIsCreateDialogOpen(true);
  };

  const getRepositoryName = (repoId: number) => {
    const repo = repositories.find(r => r.id === repoId);
    return repo ? `${repo.organization?.name || 'Unknown'}/${repo.name}` : 'Unknown';
  };

  // Filter repositories based on search term
  const filteredRepositories = repositories.filter(repo => {
    if (!repositorySearch.trim()) return true;
    const searchTerm = repositorySearch.toLowerCase();
    const repoName = repo.name.toLowerCase();
    const orgName = repo.organization?.name.toLowerCase() || '';
    const fullName = `${orgName}/${repoName}`;
    return repoName.includes(searchTerm) || orgName.includes(searchTerm) || fullName.includes(searchTerm);
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center space-x-2">
            <div className="h-4 bg-muted rounded w-24"></div>
            <div className="h-4 bg-muted rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team View</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchData} variant="outline" size="sm">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Team View</CardTitle>
            <CardDescription>
              Select a team to view repository-focused metrics
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { resetForm(); setEditingTeam(null); }}>
                <IconPlus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-lg">
                  {editingTeam ? 'Edit Team' : 'Create New Team'}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Define a team by the repositories they own or primarily work on.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name" className="text-sm font-medium">
                    Team Name
                  </Label>
                  <Input
                    id="team-name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Frontend Team, API Team"
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="team-description" className="text-sm font-medium">
                    Description <span className="text-xs text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="team-description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brief description of the team"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team-color" className="text-sm font-medium">
                    Team Color
                  </Label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      id="team-color"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="w-12 h-10 rounded-md border border-input cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {formData.color}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Repositories
                  </Label>
                  
                  {/* Search input */}
                  <div className="space-y-2">
                    <Input
                      placeholder="Search repositories..."
                      value={repositorySearch}
                      onChange={(e) => setRepositorySearch(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Repository list */}
                  <div className="max-h-48 overflow-y-auto border rounded-md">
                    {filteredRepositories.length > 0 ? (
                      <div className="p-3 space-y-3">
                        {filteredRepositories.map((repo) => (
                          <div key={repo.id} className="flex items-center space-x-3">
                            <Checkbox
                              id={`repo-${repo.id}`}
                              checked={formData.selectedRepos.includes(repo.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({
                                    ...formData,
                                    selectedRepos: [...formData.selectedRepos, repo.id]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    selectedRepos: formData.selectedRepos.filter(id => id !== repo.id)
                                  });
                                }
                              }}
                            />
                            <Label 
                              htmlFor={`repo-${repo.id}`} 
                              className="text-sm cursor-pointer flex-1"
                            >
                              <span className="font-medium">{repo.organization?.name}</span>
                              <span className="text-muted-foreground">/</span>
                              <span>{repo.name}</span>
                            </Label>
                            {!repo.is_tracked && (
                              <Badge variant="outline" className="text-xs">
                                Not Tracked
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {repositorySearch.trim() ? 'No repositories match your search' : 'No repositories available'}
                      </div>
                    )}
                  </div>
                  
                  {formData.selectedRepos.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {formData.selectedRepos.length} repository{formData.selectedRepos.length !== 1 ? 'ies' : ''} selected
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveTeam} disabled={!formData.name.trim()}>
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* All Organization View */}
          <div 
            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
              !selectedTeamId ? 'bg-primary/10 border-primary/20 dark:bg-primary/10 dark:border-primary/30' : 'hover:bg-muted/50'
            }`}
            onClick={() => onTeamSelect(null)}
          >
            <div className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 rounded-full bg-muted-foreground"
              />
              <div>
                <p className="font-medium text-sm">All Repositories</p>
                <p className="text-xs text-muted-foreground">
                  Organization-wide view ({repositories.length} repos)
                </p>
              </div>
            </div>
            {!selectedTeamId && (
              <Badge variant="outline" className="text-primary border-primary/50">Selected</Badge>
            )}
          </div>

          {/* Team Views */}
          {teams.map((team) => (
            <div 
              key={team.id}
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedTeamId === team.id ? 'bg-primary/10 border-primary/20 dark:bg-primary/10 dark:border-primary/30' : 'hover:bg-muted/50'
              }`}
              onClick={() => onTeamSelect(team.id)}
            >
              <div className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <div>
                  <p className="font-medium text-sm">{team.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {team.repositories.length} repositories
                    {team.description && ` • ${team.description}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {selectedTeamId === team.id && (
                  <Badge variant="outline" className="text-primary border-primary/50">Selected</Badge>
                )}
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(team);
                  }}
                >
                  <IconEdit className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTeam(team.id);
                  }}
                >
                  <IconTrash className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {teams.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <IconUsers className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No teams defined yet</p>
              <p className="text-xs">Create teams to get repository-focused insights</p>
            </div>
          )}
        </div>

        {/* Selected Team Repository List */}
        {selectedTeamId && teams.find(t => t.id === selectedTeamId) && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Team Repositories:</p>
            <div className="flex flex-wrap gap-1">
              {teams.find(t => t.id === selectedTeamId)!.repositories.map((repoId) => (
                <Badge key={repoId} variant="outline" className="text-xs">
                  <IconGitBranch className="h-3 w-3 mr-1" />
                  {getRepositoryName(repoId)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 