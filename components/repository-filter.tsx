"use client"

import { useTeamFilter } from "@/hooks/use-team-filter"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function RepositoryFilter() {
  const { repositories, selectedRepositoryId, setSelectedRepositoryId, loading, selectedOrganization } = useTeamFilter()
  return <Select value={selectedRepositoryId} onValueChange={setSelectedRepositoryId} disabled={loading || !selectedOrganization}>
    <SelectTrigger aria-label="Repository" className="h-9 w-[200px]"><SelectValue placeholder="Repository" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Repositories</SelectItem>
      {repositories.map(repository => <SelectItem key={repository.id} value={String(repository.id)}>{repository.full_name || repository.name}</SelectItem>)}
    </SelectContent>
  </Select>
}
