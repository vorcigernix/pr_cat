// Import and re-export all repositories for easier imports

export { 
  findUserById, 
  findUserByEmail, 
  createUser, 
  updateUser, 
  updateOrganizationRole,
  getUserOrganizations,
  addUserToOrganization,
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
  createPullRequestReview,
  findReviewByGitHubId,
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
  findTeamById,
  findTeamsByOrganization,
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

// Commented out sections for missing files remain for user to address
// export { 
//   getSettings, 
//   updateSetting, 
//   getOrganizationSettings, 
//   updateOrganizationSetting 
// } from './settings-repository'; 
// export { 
//   createRecommendation, 
//   getRecommendationsByOrganizationId, 
//   updateRecommendationStatus 
// } from './recommendation-repository'; 

// export * from './schema-version-repository';