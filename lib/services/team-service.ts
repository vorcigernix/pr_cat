/**
 * Team Service - Business logic layer for team management
 * 
 * This service layer contains business rules, validation logic, and complex operations
 * that orchestrate multiple repository operations. It serves as an intermediary between
 * API routes and repository functions.
 */

import { 
  findTeamById, 
  findTeamsByOrganization, 
  createTeam, 
  updateTeam, 
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  getTeamWithMembers,
  getOrganizationMembers
} from '@/lib/repositories/team-repository';
import { getOrganizationRole } from '@/lib/repositories/user-repository';
import { Team, TeamMember } from '@/lib/types';

/**
 * Data Transfer Objects for clean API interfaces
 */
export interface CreateTeamRequest {
  name: string;
  description?: string;
  color?: string;
  organizationId: number;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  color?: string;
}

export interface AddMemberRequest {
  userId: string;
  role: 'member' | 'lead' | 'admin';
}

/**
 * Service layer error types for better error handling
 */
export class TeamServiceError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 400) {
    super(message);
    this.name = 'TeamServiceError';
  }
}

/**
 * Team Service class containing business logic
 */
export class TeamService {
  /**
   * Creates a new team with business rule validation
   */
  static async createTeam(userId: string, request: CreateTeamRequest): Promise<Team> {
    // Business rule: Only organization admins/owners can create teams
    const userRole = await getOrganizationRole(userId, request.organizationId);
    if (!userRole || !['admin', 'owner'].includes(userRole)) {
      throw new TeamServiceError(
        'Only organization administrators can create teams',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }

    // Business rule: Team name validation
    if (!request.name || request.name.trim().length === 0) {
      throw new TeamServiceError('Team name is required', 'INVALID_NAME');
    }

    if (request.name.length > 100) {
      throw new TeamServiceError('Team name must be 100 characters or less', 'NAME_TOO_LONG');
    }

    // Business rule: Color validation
    if (request.color && !/^#[0-9A-Fa-f]{6}$/.test(request.color)) {
      throw new TeamServiceError('Invalid color format. Use hex format like #FF0000', 'INVALID_COLOR');
    }

    try {
      return await createTeam({
        organization_id: request.organizationId,
        name: request.name.trim(),
        description: request.description || null,
        color: request.color || null,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
        throw new TeamServiceError(
          'A team with this name already exists in the organization',
          'DUPLICATE_NAME',
          409
        );
      }
      throw error;
    }
  }

  /**
   * Updates a team with authorization and validation
   */
  static async updateTeam(
    userId: string,
    teamId: number,
    organizationId: number,
    request: UpdateTeamRequest
  ): Promise<Team> {
    // Verify team exists and belongs to organization
    const team = await findTeamById(teamId);
    if (!team) {
      throw new TeamServiceError('Team not found', 'TEAM_NOT_FOUND', 404);
    }

    if (team.organization_id !== organizationId) {
      throw new TeamServiceError('Team does not belong to this organization', 'TEAM_NOT_FOUND', 404);
    }

    // Authorization: Check if user can modify this team
    const userRole = await getOrganizationRole(userId, organizationId);
    if (!userRole || !['admin', 'owner'].includes(userRole)) {
      throw new TeamServiceError(
        'Only organization administrators can modify teams',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }

    // Validation
    if (request.name !== undefined) {
      if (!request.name || request.name.trim().length === 0) {
        throw new TeamServiceError('Team name cannot be empty', 'INVALID_NAME');
      }
      if (request.name.length > 100) {
        throw new TeamServiceError('Team name must be 100 characters or less', 'NAME_TOO_LONG');
      }
    }

    if (request.color && !/^#[0-9A-Fa-f]{6}$/.test(request.color)) {
      throw new TeamServiceError('Invalid color format. Use hex format like #FF0000', 'INVALID_COLOR');
    }

    const updateData: any = {};
    if (request.name !== undefined) updateData.name = request.name.trim();
    if (request.description !== undefined) updateData.description = request.description;
    if (request.color !== undefined) updateData.color = request.color;

    const updatedTeam = await updateTeam(teamId, updateData);
    if (!updatedTeam) {
      throw new TeamServiceError('Failed to update team', 'UPDATE_FAILED', 500);
    }

    return updatedTeam;
  }

  /**
   * Adds a member to a team with business rules
   */
  static async addTeamMember(
    userId: string,
    teamId: number,
    organizationId: number,
    request: AddMemberRequest
  ): Promise<TeamMember> {
    // Verify team exists and belongs to organization
    const team = await findTeamById(teamId);
    if (!team || team.organization_id !== organizationId) {
      throw new TeamServiceError('Team not found', 'TEAM_NOT_FOUND', 404);
    }

    // Authorization: Check if user can add members
    const userRole = await getOrganizationRole(userId, organizationId);
    if (!userRole || !['admin', 'owner'].includes(userRole)) {
      throw new TeamServiceError(
        'Only organization administrators can add team members',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }

    // Business rule: User being added must be part of the organization
    const targetUserRole = await getOrganizationRole(request.userId, organizationId);
    if (!targetUserRole) {
      throw new TeamServiceError(
        'User is not part of this organization',
        'USER_NOT_IN_ORGANIZATION'
      );
    }

    try {
      return await addTeamMember({
        team_id: teamId,
        user_id: request.userId,
        role: request.role,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
        throw new TeamServiceError(
          'User is already a member of this team',
          'ALREADY_MEMBER',
          409
        );
      }
      throw error;
    }
  }

  /**
   * Gets teams for an organization with member count
   */
  static async getOrganizationTeams(userId: string, organizationId: number): Promise<Team[]> {
    // Authorization: User must be part of the organization
    const userRole = await getOrganizationRole(userId, organizationId);
    if (!userRole) {
      throw new TeamServiceError(
        'Access denied. User is not part of this organization',
        'ACCESS_DENIED',
        403
      );
    }

    return await findTeamsByOrganization(organizationId);
  }

  /**
   * Gets detailed team information with members
   */
  static async getTeamWithMembers(userId: string, teamId: number, organizationId: number) {
    // Verify team exists and belongs to organization
    const team = await findTeamById(teamId);
    if (!team || team.organization_id !== organizationId) {
      throw new TeamServiceError('Team not found', 'TEAM_NOT_FOUND', 404);
    }

    // Authorization: User must be part of the organization
    const userRole = await getOrganizationRole(userId, organizationId);
    if (!userRole) {
      throw new TeamServiceError(
        'Access denied. User is not part of this organization',
        'ACCESS_DENIED',
        403
      );
    }

    return await getTeamWithMembers(teamId);
  }
}