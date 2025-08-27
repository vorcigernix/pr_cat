import { initBotId } from 'botid/client/core';
 
initBotId({
  protect: [
    // Routes using withAuth middleware (all have server-side BotId verification)
    {
      path: '/api/organizations',
      method: 'GET',
    },
    {
      path: '/api/organizations/*/teams',
      method: 'GET',
    },
    {
      path: '/api/organizations/*/teams',
      method: 'POST',
    },
    {
      path: '/api/organizations/*/teams/*',
      method: 'GET',
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
      method: 'GET',
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
    {
      path: '/api/repositories',
      method: 'GET',
    },
    {
      path: '/api/metrics/summary',
      method: 'GET',
    },
    {
      path: '/api/metrics/recommendations',
      method: 'GET',
    },
    {
      path: '/api/metrics/team-performance',
      method: 'GET',
    },
    {
      path: '/api/metrics/time-series',
      method: 'GET',
    },
    {
      path: '/api/metrics/repository-insights',
      method: 'GET',
    },
    {
      path: '/api/pull-requests/category-distribution',
      method: 'GET',
    },
    {
      path: '/api/pull-requests/recent',
      method: 'GET',
    },
    // Routes with manual verifyBotId() calls
    {
      path: '/api/github/user',
      method: 'GET',
    },
    {
      path: '/api/github/organizations',
      method: 'GET',
    },
    {
      path: '/api/github/organizations/*/repositories',
      method: 'GET',
    },
    {
      path: '/api/github/repositories/sync',
      method: 'POST',
    },
    {
      path: '/api/organizations/*/ai-settings',
      method: 'GET',
    },
    {
      path: '/api/organizations/*/ai-settings',
      method: 'PUT',
    },
    {
      path: '/api/organizations/*/members',
      method: 'GET',
    },
    {
      path: '/api/organizations/*/categories',
      method: 'POST',
    },
    {
      path: '/api/categories/*',
      method: 'GET',
    },
    {
      path: '/api/categories/*',
      method: 'PUT',
    },
    {
      path: '/api/categories/*',
      method: 'DELETE',
    },
    {
      path: '/api/dashboard/data',
      method: 'GET',
    },
    {
      path: '/api/github-app/installations',
      method: 'GET',
    },
    {
      path: '/api/github-app/installations',
      method: 'POST',
    },
    {
      path: '/api/github-app/installations/*',
      method: 'GET',
    },
    {
      path: '/api/github-app/installations/*',
      method: 'POST',
    },
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