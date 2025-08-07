// Optimized team repository functions that fix N+1 query issues
import { query, execute } from '@/lib/db';
import { Team, TeamMember, User, TeamWithMembers } from '@/lib/types';

/**
 * Get all teams for an organization with their members in a single query
 * This fixes the N+1 query problem by using a JOIN instead of multiple queries
 */
export async function getTeamsByOrganizationWithMembersOptimized(organizationId: number): Promise<TeamWithMembers[]> {
  // Single query to get all data
  const rows = await query<{
    team_id: number;
    team_name: string;
    team_description: string | null;
    team_color: string | null;
    team_created_at: string;
    team_updated_at: string;
    member_id: number | null;
    member_role: string | null;
    member_joined_at: string | null;
    user_id: string | null;
    user_name: string | null;
    user_email: string | null;
    user_image: string | null;
    user_created_at: string | null;
    user_updated_at: string | null;
  }>(`
    SELECT 
      t.id as team_id,
      t.name as team_name,
      t.description as team_description,
      t.color as team_color,
      t.created_at as team_created_at,
      t.updated_at as team_updated_at,
      tm.id as member_id,
      tm.role as member_role,
      tm.joined_at as member_joined_at,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      u.image as user_image,
      u.created_at as user_created_at,
      u.updated_at as user_updated_at
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    LEFT JOIN users u ON tm.user_id = u.id
    WHERE t.organization_id = ?
    ORDER BY t.name, u.name
  `, [organizationId]);
  
  // Group results in memory
  const teamsMap = new Map<number, TeamWithMembers>();
  
  for (const row of rows) {
    if (!teamsMap.has(row.team_id)) {
      teamsMap.set(row.team_id, {
        id: row.team_id,
        organization_id: organizationId,
        name: row.team_name,
        description: row.team_description,
        color: row.team_color,
        created_at: row.team_created_at,
        updated_at: row.team_updated_at,
        members: [],
        member_count: 0
      });
    }
    
    const team = teamsMap.get(row.team_id)!;
    
    // Only add member if there's actually a member (LEFT JOIN may return null)
    if (row.member_id && row.user_id) {
      team.members.push({
        id: row.member_id,
        team_id: row.team_id,
        user_id: row.user_id,
        role: row.member_role as 'member' | 'lead' | 'admin',
        joined_at: row.member_joined_at!,
        created_at: row.team_created_at, // Using team's created_at as fallback
        updated_at: row.team_updated_at, // Using team's updated_at as fallback
        user: {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email,
          image: row.user_image,
          created_at: row.user_created_at || '',
          updated_at: row.user_updated_at || ''
        }
      });
      team.member_count++;
    }
  }
  
  return Array.from(teamsMap.values());
}

/**
 * Batch fetch teams by IDs
 * Useful when you need to fetch multiple specific teams
 */
export async function getTeamsByIds(teamIds: number[]): Promise<Team[]> {
  if (teamIds.length === 0) return [];
  
  // Create placeholders for the IN clause
  const placeholders = teamIds.map(() => '?').join(',');
  
  return query<Team>(
    `SELECT * FROM teams WHERE id IN (${placeholders}) ORDER BY name`,
    teamIds
  );
}

/**
 * Batch fetch team members for multiple teams
 */
export async function getTeamMembersBatch(teamIds: number[]): Promise<Map<number, TeamMember[]>> {
  if (teamIds.length === 0) return new Map();
  
  const placeholders = teamIds.map(() => '?').join(',');
  
  const rows = await query<TeamMember & { user: User }>(`
    SELECT 
      tm.*,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      u.image as user_image,
      u.created_at as user_created_at,
      u.updated_at as user_updated_at
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id IN (${placeholders})
    ORDER BY tm.team_id, u.name
  `, teamIds);
  
  // Group by team_id
  const membersByTeam = new Map<number, TeamMember[]>();
  
  for (const row of rows) {
    if (!membersByTeam.has(row.team_id)) {
      membersByTeam.set(row.team_id, []);
    }
    membersByTeam.get(row.team_id)!.push(row);
  }
  
  return membersByTeam;
}

/**
 * Get teams with member count only (lightweight version)
 * Useful for dashboards where you don't need full member details
 */
export async function getTeamsWithMemberCount(organizationId: number): Promise<(Team & { member_count: number })[]> {
  return query<Team & { member_count: number }>(`
    SELECT 
      t.*,
      COUNT(tm.id) as member_count
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    WHERE t.organization_id = ?
    GROUP BY t.id
    ORDER BY t.name
  `, [organizationId]);
}

/**
 * Batch update teams' updated_at timestamp
 * Useful for bulk operations
 */
export async function updateTeamTimestamps(teamIds: number[]): Promise<void> {
  if (teamIds.length === 0) return;
  
  const placeholders = teamIds.map(() => '?').join(',');
  
  await execute(
    `UPDATE teams SET updated_at = datetime('now') WHERE id IN (${placeholders})`,
    teamIds
  );
}

/**
 * Get teams for multiple organizations in one query
 * Useful for cross-organization views
 */
export async function getTeamsByOrganizations(organizationIds: number[]): Promise<Map<number, Team[]>> {
  if (organizationIds.length === 0) return new Map();
  
  const placeholders = organizationIds.map(() => '?').join(',');
  
  const teams = await query<Team>(
    `SELECT * FROM teams WHERE organization_id IN (${placeholders}) ORDER BY organization_id, name`,
    organizationIds
  );
  
  // Group by organization_id
  const teamsByOrg = new Map<number, Team[]>();
  
  for (const team of teams) {
    if (!teamsByOrg.has(team.organization_id)) {
      teamsByOrg.set(team.organization_id, []);
    }
    teamsByOrg.get(team.organization_id)!.push(team);
  }
  
  return teamsByOrg;
}

/**
 * Search teams by name across organizations
 */
export async function searchTeams(searchTerm: string, organizationId?: number): Promise<Team[]> {
  const baseQuery = `
    SELECT * FROM teams 
    WHERE LOWER(name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?)
  `;
  
  if (organizationId) {
    return query<Team>(
      `${baseQuery} AND organization_id = ? ORDER BY name LIMIT 20`,
      [`%${searchTerm}%`, `%${searchTerm}%`, organizationId]
    );
  }
  
  return query<Team>(
    `${baseQuery} ORDER BY name LIMIT 20`,
    [`%${searchTerm}%`, `%${searchTerm}%`]
  );
}

/**
 * Get user's teams across all organizations
 * Optimized version that fetches everything in one query
 */
export async function getUserTeamsOptimized(userId: string): Promise<{
  teams: (TeamMember & { team: Team; organization: { id: number; name: string } })[];
  organizationCount: number;
  teamCount: number;
}> {
  const rows = await query<any>(`
    SELECT 
      tm.*,
      t.id as team_id,
      t.organization_id as team_organization_id,
      t.name as team_name,
      t.description as team_description,
      t.color as team_color,
      t.created_at as team_created_at,
      t.updated_at as team_updated_at,
      o.id as org_id,
      o.name as org_name
    FROM team_members tm
    JOIN teams t ON tm.team_id = t.id
    JOIN organizations o ON t.organization_id = o.id
    WHERE tm.user_id = ?
    ORDER BY o.name, t.name
  `, [userId]);
  
  const teams = rows.map(row => ({
    ...row,
    team: {
      id: row.team_id,
      organization_id: row.team_organization_id,
      name: row.team_name,
      description: row.team_description,
      color: row.team_color,
      created_at: row.team_created_at,
      updated_at: row.team_updated_at,
    },
    organization: {
      id: row.org_id,
      name: row.org_name,
    }
  }));
  
  const uniqueOrgs = new Set(teams.map(t => t.organization.id));
  
  return {
    teams,
    organizationCount: uniqueOrgs.size,
    teamCount: teams.length,
  };
}