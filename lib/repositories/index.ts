// Import and re-export all repositories for easier imports

export { 
  findUserById, 
  findUserByEmail, 
  createUser, 
  updateUser, 
  updateOrganizationRole,
  getUserOrganizations,
  removeUserFromOrganization,
  getOrganizationRole,
  findOrCreateUserByGitHubId,
  findUserWithOrganizations,
} from './user-repository';
export { 
  findOrCreateOrganization, 
  findOrganizationById, 
  updateOrganization, 
} from './organization-repository';
export { 
  findRepositoryById, 
  findRepositoryByGitHubId, 
  findOrCreateRepository, 
  updateRepository, 
  getOrganizationRepositories,
  setRepositoryTracking, 
  getTrackedRepositories,
  findRepositoryByFullName,
} from './repository-repository';
export { 
  createPullRequest, 
  findPullRequestById, 
  findPullRequestByNumber, 
  updatePullRequest, 
  getRepositoryPullRequests,
  updatePullRequestReview,
  updatePullRequestCategory,
} from './pr-repository';
export { 
  getDefaultCategories, 
  getOrganizationCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory, 
  findCategoryById,
  findCategoryByNameAndOrg,
} from './category-repository';

// Export settings repository functions
export {
  getOrganizationAiSettings,
  updateOrganizationAiSettings,
  getOrganizationApiKey,
  type AiSettings,
  type UpdateAiSettingsPayload,
} from './settings-repository';

// Export team repository functions
export {
  findTeamsByOrganizationWithMembers,
  findTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  findTeamMember,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  getTeamMembers,
  getTeamWithMembers,
  getTeamsByOrganizationWithMembers,
  getUserTeams,
  getOrganizationMembers,
  searchUsers,
} from './team-repository';
