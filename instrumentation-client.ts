import { initBotId } from 'botid/client/core';
 
initBotId({
  protect: [
    // Only protect actual mutations (POST, PUT, DELETE) - not GET requests
    // Team management mutations
    {
      path: '/api/organizations/*/teams',
      method: 'POST',
    },
    {
      path: '/api/organizations/*/teams/*',
      method: 'PUT',
    },
    {
      path: '/api/organizations/*/teams/*',
      method: 'DELETE',
    },
    {
      path: '/api/organizations/*/teams/*/members',
      method: 'POST',
    },
    {
      path: '/api/organizations/*/teams/*/members',
      method: 'PUT',
    },
    {
      path: '/api/organizations/*/teams/*/members',
      method: 'DELETE',
    },
    // Settings mutations
    {
      path: '/api/organizations/*/ai-settings',
      method: 'PUT',
    },
    {
      path: '/api/organizations/*/categories',
      method: 'POST',
    },
    {
      path: '/api/categories/*',
      method: 'PUT',
    },
    {
      path: '/api/categories/*',
      method: 'DELETE',
    },
    // GitHub sync mutations
    {
      path: '/api/github/repositories/sync',
      method: 'POST',
    },
    {
      path: '/api/github-app/installations',
      method: 'POST',
    },
    {
      path: '/api/github-app/installations/*',
      method: 'POST',
    },
    // Webhook management
    {
      path: '/api/github/repositories/*/webhook',
      method: 'POST',
    },
    {
      path: '/api/github/repositories/*/webhook',
      method: 'DELETE',
    },
  ],
});