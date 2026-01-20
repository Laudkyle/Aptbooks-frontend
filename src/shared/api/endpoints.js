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


accounting: {
  accounts: {
    list: (qs) => `/core/accounting/accounts?${new URLSearchParams(qs ?? {}).toString()}`,
    create: '/core/accounting/accounts',
    detail: (id) => `/core/accounting/accounts/${id}`,
    update: (id) => `/core/accounting/accounts/${id}`,
    archive: (id) => `/core/accounting/accounts/${id}/archive`
  },
  periods: {
    list: '/core/accounting/periods',
    current: '/core/accounting/periods/current',
    create: '/core/accounting/periods',
    closePreview: (id) => `/core/accounting/periods/${id}/close-preview`,
    close: (id) => `/core/accounting/periods/${id}/close`,
    reopen: (id) => `/core/accounting/periods/${id}/reopen`,
    lock: (id) => `/core/accounting/periods/${id}/lock`,
    unlock: (id) => `/core/accounting/periods/${id}/unlock`,
    rollForward: (id) => `/core/accounting/periods/${id}/roll-forward`
  },
  journals: {
    list: (qs) => `/core/accounting/journals?${new URLSearchParams(qs ?? {}).toString()}`,
    create: '/core/accounting/journals',
    detail: (id) => `/core/accounting/journals/${id}`,
    update: (id) => `/core/accounting/journals/${id}`,
    replaceLines: (id) => `/core/accounting/journals/${id}/lines`,
    addLine: (id) => `/core/accounting/journals/${id}/lines`,
    updateLine: (id, lineNo) => `/core/accounting/journals/${id}/lines/${lineNo}`,
    deleteLine: (id, lineNo) => `/core/accounting/journals/${id}/lines/${lineNo}`,
    submit: (id) => `/core/accounting/journals/${id}/submit`,
    approve: (id) => `/core/accounting/journals/${id}/approve`,
    reject: (id) => `/core/accounting/journals/${id}/reject`,
    cancel: (id) => `/core/accounting/journals/${id}/cancel`,
    post: (id) => `/core/accounting/journals/${id}/post`,
    batchPost: '/core/accounting/journals/batch/post',
    void: (id) => `/core/accounting/journals/${id}/void`
  },
  balances: {
    trialBalance: (qs) => `/core/accounting/balances/trial-balance?${new URLSearchParams(qs ?? {}).toString()}`,
    gl: (qs) => `/core/accounting/balances/gl?${new URLSearchParams(qs ?? {}).toString()}`,
    accountActivity: (qs) => `/core/accounting/balances/account-activity?${new URLSearchParams(qs ?? {}).toString()}`
  },
  statements: {
    trialBalance: (qs) => `/core/accounting/statements/trial-balance?${new URLSearchParams(qs ?? {}).toString()}`,
    incomeStatement: (qs) => `/core/accounting/statements/income-statement?${new URLSearchParams(qs ?? {}).toString()}`,
    balanceSheet: (qs) => `/core/accounting/statements/balance-sheet?${new URLSearchParams(qs ?? {}).toString()}`,
    cashFlow: (qs) => `/core/accounting/statements/cash-flow?${new URLSearchParams(qs ?? {}).toString()}`,
    changesInEquity: (qs) => `/core/accounting/statements/changes-in-equity?${new URLSearchParams(qs ?? {}).toString()}`
  },
  exports: {
    trialBalance: (qs) => `/core/accounting/exports/trial-balance?${new URLSearchParams(qs ?? {}).toString()}`,
    generalLedger: (qs) => `/core/accounting/exports/general-ledger?${new URLSearchParams(qs ?? {}).toString()}`,
    accountActivity: (qs) => `/core/accounting/exports/account-activity?${new URLSearchParams(qs ?? {}).toString()}`
  },
  imports: {
    coa: (qs) => `/core/accounting/imports/coa?${new URLSearchParams(qs ?? {}).toString()}`,
    journals: (qs) => `/core/accounting/imports/journals?${new URLSearchParams(qs ?? {}).toString()}`
  },
  fx: {
    rateTypes: '/core/accounting/fx/rate-types',
    createRateType: '/core/accounting/fx/rate-types',
    rates: (qs) => `/core/accounting/fx/rates?${new URLSearchParams(qs ?? {}).toString()}`,
    upsertRate: '/core/accounting/fx/rates',
    effectiveRate: (qs) => `/core/accounting/fx/rates/effective?${new URLSearchParams(qs ?? {}).toString()}`
  },
  reconciliation: {
    period: (qs) => `/core/accounting/reconciliation/period?${new URLSearchParams(qs ?? {}).toString()}`
  },
  tax: {
    jurisdictions: '/core/accounting/tax/jurisdictions',
    jurisdictionUpdate: (id) => `/core/accounting/tax/jurisdictions/${id}`,
    jurisdictionDelete: (id) => `/core/accounting/tax/jurisdictions/${id}`,
    codes: (qs) => `/core/accounting/tax/codes?${new URLSearchParams(qs ?? {}).toString()}`,
    codeUpdate: (id) => `/core/accounting/tax/codes/${id}`,
    codeDelete: (id) => `/core/accounting/tax/codes/${id}`,
    settingsGet: '/core/accounting/tax/settings',
    settingsPut: '/core/accounting/tax/settings'
  },
  accruals: {
    rules: '/core/accounting/accruals',
    ruleDetail: (id) => `/core/accounting/accruals/${id}`,
    createRule: '/core/accounting/accruals',
    runDue: '/core/accounting/accruals/run/due',
    runReversals: '/core/accounting/accruals/run/reversals',
    runPeriodEnd: '/core/accounting/accruals/run/period-end',
    runs: (qs) => `/core/accounting/accruals/runs?${new URLSearchParams(qs ?? {}).toString()}`,
    runDetail: (runId) => `/core/accounting/accruals/runs/${runId}`
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
