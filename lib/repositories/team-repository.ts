import { query, execute, transaction } from '@/lib/db';
import { Team, TeamMember, User, TeamWithMembers, UserWithTeams } from '@/lib/types';

// Team CRUD operations

/**
 * Finds a team by its ID
 * @param id The team ID to search for
 * @returns The team object if found, null otherwise
 */
export async function findTeamById(id: number): Promise<Team | null> {
  const teams = await query<Team>('SELECT * FROM teams WHERE id = ?', [id]);
  return teams.length > 0 ? teams[0] : null;
}

/**
 * Retrieves all teams belonging to a specific organization
 * @param organizationId The organization ID to filter by
 * @returns Array of teams ordered by name
 */
export async function findTeamsByOrganization(organizationId: number): Promise<Team[]> {
  return query<Team>(
    'SELECT * FROM teams WHERE organization_id = ? ORDER BY name',
    [organizationId]
  );
}

/**
 * Creates a new team in the database
 * @param team Team data without id, created_at, and updated_at fields
 * @returns The newly created team with generated ID and timestamps
 * @throws Error if team creation fails
 */
export async function createTeam(team: Omit<Team, 'id' | 'created_at' | 'updated_at'>): Promise<Team> {
  const result = await execute(
    'INSERT INTO teams (organization_id, name, description, color) VALUES (?, ?, ?, ?)',
    [team.organization_id, team.name, team.description, team.color]
  );
  
  const id = result.lastInsertId;
  if (!id) {
    throw new Error('Failed to create team');
  }
  
  const createdTeam = await findTeamById(id);
  if (!createdTeam) {
    throw new Error('Failed to retrieve created team');
  }
  
  return createdTeam;
}

export async function updateTeam(
  id: number, 
  data: Partial<Omit<Team, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>
): Promise<Team | null> {
  const updates: string[] = [];
  const values: any[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  });
  
  if (updates.length === 0) {
    return findTeamById(id);
  }
  
  updates.push('updated_at = datetime("now")');
  
  await execute(
    `UPDATE teams SET ${updates.join(', ')} WHERE id = ?`,
    [...values, id]
  );
  
  return findTeamById(id);
}

export async function deleteTeam(id: number): Promise<boolean> {
  const result = await execute('DELETE FROM teams WHERE id = ?', [id]);
  return result.rowsAffected > 0;
}

// Team member operations
export async function findTeamMember(teamId: number, userId: string): Promise<TeamMember | null> {
  const members = await query<TeamMember>(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
    [teamId, userId]
  );
  return members.length > 0 ? members[0] : null;
}

export async function addTeamMember(teamMember: Omit<TeamMember, 'id' | 'created_at' | 'updated_at' | 'joined_at'> & { joined_at?: string }): Promise<TeamMember> {
  // Check if member already exists
  const existing = await findTeamMember(teamMember.team_id, teamMember.user_id);
  if (existing) {
    throw new Error('User is already a member of this team');
  }

  // Use provided joined_at or let database use default
  const result = teamMember.joined_at 
    ? await execute(
        'INSERT INTO team_members (team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
        [teamMember.team_id, teamMember.user_id, teamMember.role, teamMember.joined_at]
      )
    : await execute(
        'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
        [teamMember.team_id, teamMember.user_id, teamMember.role]
      );
  
  const id = result.lastInsertId;
  if (!id) {
    throw new Error('Failed to add team member');
  }
  
  const member = await query<TeamMember>('SELECT * FROM team_members WHERE id = ?', [id]);
  if (member.length === 0) {
    throw new Error('Failed to retrieve created team member');
  }
  
  return member[0];
}

export async function updateTeamMember(
  teamId: number,
  userId: string,
  data: Partial<Pick<TeamMember, 'role'>>
): Promise<TeamMember | null> {
  const updates: string[] = [];
  const values: any[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  });
  
  if (updates.length === 0) {
    return findTeamMember(teamId, userId);
  }
  
  updates.push('updated_at = datetime("now")');
  
  await execute(
    `UPDATE team_members SET ${updates.join(', ')} WHERE team_id = ? AND user_id = ?`,
    [...values, teamId, userId]
  );
  
  return findTeamMember(teamId, userId);
}

export async function removeTeamMember(teamId: number, userId: string): Promise<boolean> {
  const result = await execute(
    'DELETE FROM team_members WHERE team_id = ? AND user_id = ?',
    [teamId, userId]
  );
  return result.rowsAffected > 0;
}

export async function getTeamMembers(teamId: number): Promise<(TeamMember & { user: User })[]> {
  return query<TeamMember & { user: User }>(`
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
    WHERE tm.team_id = ?
    ORDER BY u.name
  `, [teamId]);
}

// Advanced queries
export async function getTeamWithMembers(teamId: number): Promise<TeamWithMembers | null> {
  const team = await findTeamById(teamId);
  if (!team) {
    return null;
  }

  const members = await getTeamMembers(teamId);
  
  return {
    ...team,
    members,
    member_count: members.length
  };
}

export async function getTeamsByOrganizationWithMembers(organizationId: number): Promise<TeamWithMembers[]> {
  const teams = await findTeamsByOrganization(organizationId);
  
  const teamsWithMembers = await Promise.all(
    teams.map(async (team) => {
      const members = await getTeamMembers(team.id);
      return {
        ...team,
        members,
        member_count: members.length
      };
    })
  );
  
  return teamsWithMembers;
}

export async function getUserTeams(userId: string): Promise<(TeamMember & { team: Team })[]> {
  return query<TeamMember & { team: Team }>(`
    SELECT 
      tm.*,
      t.id as team_id,
      t.organization_id as team_organization_id,
      t.name as team_name,
      t.description as team_description,
      t.color as team_color,
      t.created_at as team_created_at,
      t.updated_at as team_updated_at
    FROM team_members tm
    JOIN teams t ON tm.team_id = t.id
    WHERE tm.user_id = ?
    ORDER BY t.name
  `, [userId]);
}

export async function getOrganizationMembers(organizationId: number): Promise<User[]> {
  return query<User>(`
    SELECT DISTINCT u.* 
    FROM users u
    JOIN user_organizations uo ON u.id = uo.user_id
    WHERE uo.organization_id = ?
    ORDER BY u.name
  `, [organizationId]);
}

export async function searchUsers(organizationId: number, searchTerm: string): Promise<User[]> {
  return query<User>(`
    SELECT DISTINCT u.* 
    FROM users u
    JOIN user_organizations uo ON u.id = uo.user_id
    WHERE uo.organization_id = ? 
    AND (
      LOWER(u.name) LIKE LOWER(?) 
      OR LOWER(u.email) LIKE LOWER(?)
    )
    ORDER BY u.name
    LIMIT 20
  `, [organizationId, `%${searchTerm}%`, `%${searchTerm}%`]);
}