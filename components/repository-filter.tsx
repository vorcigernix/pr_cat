"use client"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

type Repository = {
  value: string;
  label: string;
  id?: number;
};

interface RepositoryFilterProps {
  onRepositoryChange?: (repositoryId: string) => void;
  selectedRepository?: string;
}

export function RepositoryFilter({ onRepositoryChange, selectedRepository = "all" }: RepositoryFilterProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(selectedRepository);
  const [repositories, setRepositories] = useState<Repository[]>([
    { value: "all", label: "All Repositories" }
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/repositories');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch repositories: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Handle both success and error responses
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Extract repositories array from the response
        const repositories = data.repositories || [];
        
        // Format repositories for the dropdown
        const formattedRepos: Repository[] = [
          { value: "all", label: "All Repositories" }
        ];
        
        if (repositories.length > 0) {
          formattedRepos.push(...repositories.map((repo: any) => ({
            value: repo.id.toString(),
            label: repo.full_name || repo.name,
            id: repo.id
          })));
        }
        
        setRepositories(formattedRepos);
        
        // If no repositories found, that's not necessarily an error - user might not have any repos yet
        if (repositories.length === 0) {
          console.log("No repositories found for user");
        }
      } catch (error) {
        console.error("Failed to load repositories:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchRepositories();
  }, []);

  const handleRepositorySelect = (currentValue: string) => {
    const newValue = currentValue === value ? "all" : currentValue;
    setValue(newValue);
    setOpen(false);
    
    // Call the callback if provided
    if (onRepositoryChange) {
      onRepositoryChange(newValue);
    }
  };

  if (error) {
    return (
      <Button variant="outline" disabled className="min-w-[200px] justify-between">
        Error loading repos
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="min-w-[200px] justify-between"
          disabled={loading}
        >
          {loading ? "Loading repositories..." : (
            value
              ? repositories.find((repository) => repository.value === value)?.label
              : "Select repository..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search repository..." />
          <CommandEmpty>No repository found.</CommandEmpty>
          <CommandGroup>
            {repositories.map((repository) => (
              <CommandItem
                key={repository.value}
                value={repository.value}
                onSelect={handleRepositorySelect}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === repository.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {repository.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 