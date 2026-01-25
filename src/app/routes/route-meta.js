import { ROUTES } from '../constants/routes.js';

export const routeMeta = {
  [ROUTES.dashboard]: { title: 'Dashboard', breadcrumbs: ['Dashboard'] },
  [ROUTES.search]: { title: 'Search', breadcrumbs: ['Search'] },
  [ROUTES.notifications]: { title: 'Notifications', breadcrumbs: ['Inbox'] },
  [ROUTES.approvalsInbox]: { title: 'Approvals Inbox', breadcrumbs: ['Approvals', 'Inbox'] },
  [ROUTES.adminOrg]: { title: 'Organization', breadcrumbs: ['Admin', 'Organization'] },
  [ROUTES.adminUsers]: { title: 'Users', breadcrumbs: ['Admin', 'Users'] },
  [ROUTES.adminRoles]: { title: 'Roles', breadcrumbs: ['Admin', 'Roles'] },
  [ROUTES.adminPermissions]: { title: 'Permissions', breadcrumbs: ['Admin', 'Permissions'] },
  [ROUTES.adminSettings]: { title: 'Settings', breadcrumbs: ['Admin', 'Settings'] },
  [ROUTES.adminDimensionSecurity]: { title: 'Dimension Security', breadcrumbs: ['Admin', 'Dimension Security'] },
  [ROUTES.adminApiKeys]: { title: 'API Keys', breadcrumbs: ['Admin', 'API Keys'] },
  [ROUTES.utilitiesHealth]: { title: 'Health', breadcrumbs: ['Utilities', 'Health'] }
};
