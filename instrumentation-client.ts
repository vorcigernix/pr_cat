import { initBotId } from 'botid/client/core';
 
initBotId({
  protect: [
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
    {
      path: '/api/github/organizations/sync',
      method: 'POST',
    },
    {
      path: '/api/github/organizations/*/sync',
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