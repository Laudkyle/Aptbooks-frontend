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
,
  // Phase 4 — Accounting
  accountingCoa: '/accounting/coa',
  accountingCoaNew: '/accounting/coa/new',
  accountingCoaDetail: (id = ':id') => `/accounting/coa/${id}`,
  accountingCoaEdit: (id = ':id') => `/accounting/coa/${id}/edit`,

  accountingPeriods: '/accounting/periods',
  accountingPeriodClose: (id = ':id') => `/accounting/periods/${id}/close`,

  accountingJournals: '/accounting/journals',
  accountingJournalNew: '/accounting/journals/new',
  accountingJournalDetail: (id = ':id') => `/accounting/journals/${id}`,

  accountingTrialBalance: '/accounting/balances/trial-balance',
  accountingAccountActivity: '/accounting/balances/account-activity',

  accountingPnL: '/accounting/statements/pnl',
  accountingBalanceSheet: '/accounting/statements/balance-sheet',
  accountingCashflow: '/accounting/statements/cash-flow',
  accountingChangesEquity: '/accounting/statements/changes-in-equity',

  accountingExports: '/accounting/exports',
  accountingImports: '/accounting/imports',
  accountingFx: '/accounting/fx',
  accountingTax: '/accounting/tax',
  accountingAccruals: '/accounting/accruals',
  accountingAccrualNew: '/accounting/accruals/new',
  accountingReconciliation: '/accounting/reconciliation'

};
