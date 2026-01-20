export const endpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    logoutAll: '/auth/logout-all',
    twofa: {
      enroll: '/auth/2fa/enroll',
      verify: '/auth/2fa/verify',
      disable: '/auth/2fa/disable'
    }
  },

  core: {
    users: {
      me: '/core/users/me',
      meOrganizations: '/core/users/me/organizations',
      switchOrganization: '/core/users/me/switch-organization',
      meLoginHistory: (limit = 50) => `/core/users/me/login-history?limit=${limit}`,
      list: '/core/users',
      create: '/core/users/create/',
      detail: (id) => `/core/users/${id}`,
      update: (id) => `/core/users/${id}`,
      disable: (id) => `/core/users/${id}/disable`,
      enable: (id) => `/core/users/${id}/enable`,
      remove: (id) => `/core/users/${id}`,
      assignRoles: (id) => `/core/users/${id}/roles`,
      removeRoles: (id) => `/core/users/${id}/roles`,
      loginHistoryAdmin: (userId, qs) => {
        const u = new URLSearchParams(qs ?? {});
        return `/core/users/${userId}/login-history?${u.toString()}`;
      }
    },
    organizations: {
      me: '/core/organizations/me',
      updateMe: '/core/organizations/me',
      uploadLogo: '/core/organizations/me/logo'
    },
    permissions: {
      list: '/core/permissions'
    },
    roles: {
      list: '/core/roles',
      create: '/core/roles',
      update: (id) => `/core/roles/${id}`,
      remove: (id) => `/core/roles/${id}`,
      matrix: '/core/roles/matrix',
      permissions: (id) => `/core/roles/${id}/permissions`,
      attachPermissions: (id) => `/core/roles/${id}/permissions`,
      detachPermissions: (id) => `/core/roles/${id}/permissions`,
      templates: '/core/roles/templates'
    },
    settings: {
      list: (qs) => `/core/settings?${new URLSearchParams(qs ?? {}).toString()}`,
      get: (key) => `/core/settings/${encodeURIComponent(key)}`,
      put: (key) => `/core/settings/${encodeURIComponent(key)}`,
      bulk: '/core/settings/bulk'
    },
    dimensionSecurity: {
      rules: (qs) => `/core/dimension-security/rules?${new URLSearchParams(qs ?? {}).toString()}`,
      createRule: '/core/dimension-security/rules',
      updateRule: (ruleId) => `/core/dimension-security/rules/${ruleId}`,
      removeRule: (ruleId) => `/core/dimension-security/rules/${ruleId}`
    },
    apiKeys: {
      list: '/core/api-keys',
      create: '/core/api-keys',
      revoke: (id) => `/core/api-keys/${id}/revoke`
    },
    notifications: {
      list: '/core/notifications',
      markRead: (id) => `/core/notifications/${id}/read`,
      bulkMarkRead: '/core/notifications/mark-read',
      smtpGet: '/core/notifications/smtp',
      smtpPut: '/core/notifications/smtp',
      smtpTest: '/core/notifications/smtp/test'
    }
  },

  search: (qs) => `/search?${new URLSearchParams(qs ?? {}).toString()}`,

  workflow: {
    approvalsInbox: (qs) => `/workflow/approvals/inbox?${new URLSearchParams(qs ?? {}).toString()}`
  },

  health: {
    healthz: '/healthz',
    readyz: '/readyz',
    system: '/health/system'
  },

  utilities: {
    scheduledTasks: '/utilities/scheduled-tasks',
    scheduledTaskToggle: (code, status) => `/utilities/scheduled-tasks/${code}/${status}/toggle`,
    scheduledTaskRuns: (code, qs) => `/utilities/scheduled-tasks/${code}/runs?${new URLSearchParams(qs ?? {}).toString()}`,
    scheduledTaskRunNow: (code) => `/utilities/scheduled-tasks/${code}/run`,
    scheduledTaskRunDetail: (code, runId) => `/utilities/scheduled-tasks/${code}/runs/${runId}`,

    errors: (qs) => `/utilities/errors?${new URLSearchParams(qs ?? {}).toString()}`,
    errorStats: (qs) => `/utilities/errors/stats/summary/?${new URLSearchParams(qs ?? {}).toString()}`,
    errorCorrelation: (correlationId) => `/utilities/errors/${correlationId}`,

    clientLogs: (qs) => `/utilities/client-logs?${new URLSearchParams(qs ?? {}).toString()}`,
    clientLogsIngest: '/utilities/client-logs',

    i18nLocales: '/utilities/i18n/locales',
    i18nMessages: (locale) => `/utilities/i18n/messages/${locale}`,
    a11yStatus: '/utilities/a11y/status',
    releaseInfo: '/utilities/release/info',
    testsList: '/utilities/tests/list',
    testsRun: '/utilities/tests/run'
  }
};
