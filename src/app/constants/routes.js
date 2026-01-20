export const ROUTES = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',

  app: '/',
  dashboard: '/',
  me: '/me',
  switchOrg: '/switch-org',
  search: '/search',
  notifications: '/inbox',
  approvalsInbox: '/approvals/inbox',

  adminOrg: '/admin/organization',
  adminUsers: '/admin/users',
  adminUserDetail: (id = ':id') => `/admin/users/${id}`,
  adminRoles: '/admin/roles',
  adminRoleDetail: (id = ':id') => `/admin/roles/${id}`,
  adminPermissions: '/admin/permissions',
  adminSettings: '/admin/settings',
  adminDimensionSecurity: '/admin/dimension-security',
  adminApiKeys: '/admin/api-keys',

  utilitiesHealth: '/utilities/health',
  utilitiesScheduler: '/utilities/scheduled-tasks',
  utilitiesErrors: '/utilities/errors',
  utilitiesClientLogs: '/utilities/client-logs',
  utilitiesI18n: '/utilities/i18n',
  utilitiesA11y: '/utilities/a11y',
  utilitiesRelease: '/utilities/release',
  utilitiesTests: '/utilities/tests'
};
