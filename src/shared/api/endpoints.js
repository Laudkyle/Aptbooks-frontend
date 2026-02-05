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
  period: (qs) => `/core/accounting/reconciliation/period?${new URLSearchParams(qs ?? {}).toString()}`,
  
  discrepancyDetails: (qs) => `/core/accounting/reconciliation/discrepancy-details?${new URLSearchParams(qs ?? {}).toString()}`,
  
  autoCorrect: '/core/accounting/reconciliation/auto-correct'
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

modules: {
  business: {
    partners: {
      list: (qs) => `/modules/business/partners?${new URLSearchParams(qs ?? {}).toString()}`,
      create: '/modules/business/partners',
      detail: (id) => `/modules/business/partners/${id}`,
      update: (id) => `/modules/business/partners/${id}`,
      creditPolicy: (id) => `/modules/business/partners/${id}/credit-policy`,
      contacts: (id) => `/modules/business/partners/${id}/contacts`,
      contact: (id, contactId) => `/modules/business/partners/${id}/contacts/${contactId}`,
      addresses: (id) => `/modules/business/partners/${id}/addresses`,
      address: (id, addressId) => `/modules/business/partners/${id}/addresses/${addressId}`
    },
    paymentConfig: {
      paymentTerms: '/modules/business/payment-config/payment-terms',
      paymentTerm: (id) => `/modules/business/payment-config/payment-terms/${id}`,
      paymentMethods: '/modules/business/payment-config/payment-methods',
      paymentSettings: '/modules/business/payment-config/payment-settings'
    }
  },
  transactions: {
    invoices: {
      list: (qs) => `/modules/transactions/invoices?${new URLSearchParams(qs ?? {}).toString()}`,
      create: '/modules/transactions/invoices',
      detail: (id) => `/modules/transactions/invoices/${id}`,
      submitForApproval: (id) => `/modules/transactions/invoices/${id}/submit-for-approval`,
      approve: (id) => `/modules/transactions/invoices/${id}/approve`,
      reject: (id) => `/modules/transactions/invoices/${id}/reject`,
      issue: (id) => `/modules/transactions/invoices/${id}/issue`,
      void: (id) => `/modules/transactions/invoices/${id}/void`
    },
    bills: {
      list: (qs) => `/modules/transactions/bills?${new URLSearchParams(qs ?? {}).toString()}`,
      create: '/modules/transactions/bills',
      detail: (id) => `/modules/transactions/bills/${id}`,
      submitForApproval: (id) => `/modules/transactions/bills/${id}/submit-for-approval`,
      approve: (id) => `/modules/transactions/bills/${id}/approve`,
      reject: (id) => `/modules/transactions/bills/${id}/reject`,
      issue: (id) => `/modules/transactions/bills/${id}/issue`,
      void: (id) => `/modules/transactions/bills/${id}/void`
    },
    customerReceipts: {
      list: (qs) => `/modules/transactions/customer-receipts?${new URLSearchParams(qs ?? {}).toString()}`,
      create: '/modules/transactions/customer-receipts',
      detail: (id) => `/modules/transactions/customer-receipts/${id}`,
      autoAllocate: (id) => `/modules/transactions/customer-receipts/${id}/auto-allocate`,
      reallocate: (id) => `/modules/transactions/customer-receipts/${id}/reallocate`,
      post: (id) => `/modules/transactions/customer-receipts/${id}/post`,
      void: (id) => `/modules/transactions/customer-receipts/${id}/void`
    },
    vendorPayments: {
      list: (qs) => `/modules/transactions/vendor-payments?${new URLSearchParams(qs ?? {}).toString()}`,
      create: '/modules/transactions/vendor-payments',
      detail: (id) => `/modules/transactions/vendor-payments/${id}`,
      autoAllocate: (id) => `/modules/transactions/vendor-payments/${id}/auto-allocate`,
      reallocate: (id) => `/modules/transactions/vendor-payments/${id}/reallocate`,
      post: (id) => `/modules/transactions/vendor-payments/${id}/post`,
      void: (id) => `/modules/transactions/vendor-payments/${id}/void`
    },
    creditNotes: {
      list: (qs) => `/modules/transactions/credit-notes?${new URLSearchParams(qs ?? {}).toString()}`,
      create: '/modules/transactions/credit-notes',
      detail: (id) => `/modules/transactions/credit-notes/${id}`,
      issue: (id) => `/modules/transactions/credit-notes/${id}/issue`,
      apply: (id) => `/modules/transactions/credit-notes/${id}/apply`,
      void: (id) => `/modules/transactions/credit-notes/${id}/void`
    },
    debitNotes: {
      list: (qs) => `/modules/transactions/debit-notes?${new URLSearchParams(qs ?? {}).toString()}`,
      create: '/modules/transactions/debit-notes',
      detail: (id) => `/modules/transactions/debit-notes/${id}`,
      issue: (id) => `/modules/transactions/debit-notes/${id}/issue`,
      apply: (id) => `/modules/transactions/debit-notes/${id}/apply`,
      void: (id) => `/modules/transactions/debit-notes/${id}/void`
    }
  },
  ar: {
    collections: {
      queue: (qs) => `/modules/ar/collections/queue?${new URLSearchParams(qs ?? {}).toString()}`,
      queuePartner: (partnerId, qs) => `/modules/ar/collections/queue/${partnerId}?${new URLSearchParams(qs ?? {}).toString()}`,
      dunningTemplates: '/modules/ar/collections/dunning/templates',
      dunningTemplate: (id) => `/modules/ar/collections/dunning/templates/${id}`,
      dunningRules: '/modules/ar/collections/dunning/rules',
      dunningRule: (id) => `/modules/ar/collections/dunning/rules/${id}`,
      cases: (qs) => `/modules/ar/collections/cases?${new URLSearchParams(qs ?? {}).toString()}`,
      case: (id) => `/modules/ar/collections/cases/${id}`,
      caseActions: (id) => `/modules/ar/collections/cases/${id}/actions`,
      dunningRuns: '/modules/ar/collections/dunning/runs',
      dunningRun: (id) => `/modules/ar/collections/dunning/runs/${id}`
    },
    disputes: {
      reasonCodes: '/modules/ar/disputes/reason-codes',
      reasonCode: (code) => `/modules/ar/disputes/reason-codes/${code}`,
      list: (qs) => `/modules/ar/disputes?${new URLSearchParams(qs ?? {}).toString()}`,
      detail: (id) => `/modules/ar/disputes/${id}`,
      create: '/modules/ar/disputes',
      actions: (id) => `/modules/ar/disputes/${id}/actions`,
      resolve: (id) => `/modules/ar/disputes/${id}/resolve`,
      void: (id) => `/modules/ar/disputes/${id}/void`
    },
    writeoffs: {
      reasonCodes: '/modules/ar/writeoffs/reason-codes',
      reasonCode: (code) => `/modules/ar/writeoffs/reason-codes/${code}`,
      settings: '/modules/ar/writeoffs/settings',
      list: (qs) => `/modules/ar/writeoffs?${new URLSearchParams(qs ?? {}).toString()}`,
      detail: (id) => `/modules/ar/writeoffs/${id}`,
      create: '/modules/ar/writeoffs',
      submit: (id) => `/modules/ar/writeoffs/${id}/submit`,
      approve: (id) => `/modules/ar/writeoffs/${id}/approve`,
      reject: (id) => `/modules/ar/writeoffs/${id}/reject`,
      post: (id) => `/modules/ar/writeoffs/${id}/post`,
      void: (id) => `/modules/ar/writeoffs/${id}/void`
    },
    paymentPlans: {
      list: (qs) => `/modules/ar/payment-plans?${new URLSearchParams(qs ?? {}).toString()}`,
      detail: (id) => `/modules/ar/payment-plans/${id}`,
      create: '/modules/ar/payment-plans',
      cancel: (id) => `/modules/ar/payment-plans/${id}/cancel`,
      markInstallmentPaid: (id, installmentId) =>
        `/modules/ar/payment-plans/${id}/installments/${installmentId}/mark-paid`
    }
  }
},

compliance: {
  health: '/compliance/health',
  ifrs16: {
    leases: {
      list: (qs) => `/compliance/ifrs16/leases?${new URLSearchParams(qs ?? {}).toString()}`,
      create: '/compliance/ifrs16/leases',
      detail: (leaseId) => `/compliance/ifrs16/leases/${leaseId}`,
      status: (leaseId) => `/compliance/ifrs16/leases/${leaseId}/status`,
      scheduleGenerate: (leaseId) => `/compliance/ifrs16/leases/${leaseId}/schedule/generate`,
      schedule: (leaseId) => `/compliance/ifrs16/leases/${leaseId}/schedule`,
      post: (leaseId) => `/compliance/ifrs16/leases/${leaseId}/post`,
      initialRecognitionPost: (leaseId) => `/compliance/ifrs16/leases/${leaseId}/initial-recognition/post`
    }
  },
  ifrs15: {
    settings: {
      get: '/compliance/ifrs15/settings',
      put: '/compliance/ifrs15/settings'
    },
    contracts: {
      list: (qs) => `/compliance/ifrs15/contracts?${new URLSearchParams(qs ?? {}).toString()}`,
      create: '/compliance/ifrs15/contracts',
      detail: (contractId) => `/compliance/ifrs15/contracts/${contractId}`,
      activate: (contractId) => `/compliance/ifrs15/contracts/${contractId}/activate`,
      obligations: (contractId) => `/compliance/ifrs15/contracts/${contractId}/obligations`,
      scheduleGenerate: (contractId) => `/compliance/ifrs15/contracts/${contractId}/schedule/generate`,
      schedule: (contractId) => `/compliance/ifrs15/contracts/${contractId}/schedule`,
      post: (contractId) => `/compliance/ifrs15/contracts/${contractId}/post`,
      costs: (contractId) => `/compliance/ifrs15/contracts/${contractId}/costs`,
      costScheduleGenerate: (contractId, costId) => `/compliance/ifrs15/contracts/${contractId}/costs/${costId}/schedule/generate`,
      costPost: (contractId, costId) => `/compliance/ifrs15/contracts/${contractId}/costs/${costId}/post`
    }
  },
  ias12: {
    health: '/compliance/ias12/health',
    settings: { get: '/compliance/ias12/settings', put: '/compliance/ias12/settings' },
    authorities: {
      list: '/compliance/ias12/authorities',
      create: '/compliance/ias12/authorities',
      update: (authorityId) => `/compliance/ias12/authorities/${authorityId}`
    },
    rateSets: {
      list: '/compliance/ias12/rate-sets',
      create: '/compliance/ias12/rate-sets',
      lines: (rateSetId) => `/compliance/ias12/rate-sets/${rateSetId}/lines`,
      addLine: (rateSetId) => `/compliance/ias12/rate-sets/${rateSetId}/lines`
    },
    tempDiffCategories: {
      list: '/compliance/ias12/temp-difference-categories',
      create: '/compliance/ias12/temp-difference-categories'
    },
    tempDifferences: {
      list: (qs) => `/compliance/ias12/temp-differences?${new URLSearchParams(qs ?? {}).toString()}`,
      create: '/compliance/ias12/temp-differences',
      update: (id) => `/compliance/ias12/temp-differences/${id}`,
      remove: (id) => `/compliance/ias12/temp-differences/${id}`,
      import: '/compliance/ias12/temp-differences/import',
      copyForward: '/compliance/ias12/temp-differences/copy-forward'
    },
    deferredTax: {
      compute: '/compliance/ias12/deferred-tax/compute',
      runs: (qs) => `/compliance/ias12/deferred-tax/runs?${new URLSearchParams(qs ?? {}).toString()}`,
      runDetail: (runId) => `/compliance/ias12/deferred-tax/runs/${runId}`,
      finalize: (runId) => `/compliance/ias12/deferred-tax/runs/${runId}/finalize`,
      post: '/compliance/ias12/deferred-tax/post',
      reverse: '/compliance/ias12/deferred-tax/reverse'
    },
    reports: {
      rollForward: (qs) => `/compliance/ias12/reports/roll-forward?${new URLSearchParams(qs ?? {}).toString()}`,
      byCategory: (qs) => `/compliance/ias12/reports/by-category?${new URLSearchParams(qs ?? {}).toString()}`,
      unrecognised: (qs) => `/compliance/ias12/reports/unrecognised?${new URLSearchParams(qs ?? {}).toString()}`
    }
  },
  ifrs9: {
    settings: { get: '/compliance/ifrs9/settings', put: '/compliance/ifrs9/settings' },
    models: {
      list: '/compliance/ifrs9/ecl-models',
      create: '/compliance/ifrs9/ecl-models',
      addBucket: (modelId) => `/compliance/ifrs9/ecl-models/${modelId}/buckets`
    },
    counterparties: {
      upsertProfile: '/compliance/ifrs9/counterparties/profile',
      profile: (businessPartnerId) => `/compliance/ifrs9/counterparties/${businessPartnerId}/profile`
    },
    ecl: {
      compute: '/compliance/ifrs9/ecl/compute',
      runs: (qs) => `/compliance/ifrs9/ecl/runs?${new URLSearchParams(qs ?? {}).toString()}`,
      runDetail: (runId) => `/compliance/ifrs9/ecl/runs/${runId}`,
      finalize: (runId) => `/compliance/ifrs9/ecl/runs/${runId}/finalize`,
      post: '/compliance/ifrs9/ecl/post',
      reverse: '/compliance/ifrs9/ecl/reverse'
    },
    reports: {
      allowanceMovement: (qs) => `/compliance/ifrs9/reports/allowance-movement?${new URLSearchParams(qs ?? {}).toString()}`,
      disclosures: (qs) => `/compliance/ifrs9/reports/disclosures?${new URLSearchParams(qs ?? {}).toString()}`
    }
  }
},
reporting: {
  ar: {
    agedReceivables: (qs) => `/reporting/ar/aged-receivables?${new URLSearchParams(qs ?? {}).toString()}`,
    openItems: (qs) => `/reporting/ar/open-items?${new URLSearchParams(qs ?? {}).toString()}`,
    customerStatement: (qs) => `/reporting/ar/customer-statement?${new URLSearchParams(qs ?? {}).toString()}`
  },
  ap: {
    agedPayables: (qs) => `/reporting/ap/aged-payables?${new URLSearchParams(qs ?? {}).toString()}`,
    openItems: (qs) => `/reporting/ap/open-items?${new URLSearchParams(qs ?? {}).toString()}`,
    vendorStatement: (qs) => `/reporting/ap/vendor-statement?${new URLSearchParams(qs ?? {}).toString()}`
  },
  tax: {
    vatSummary: (qs) => `/reporting/tax/vat-summary?${new URLSearchParams(qs ?? {}).toString()}`,
    vatReturn: (qs) => `/reporting/tax/vat-return?${new URLSearchParams(qs ?? {}).toString()}`,
    returns: (qs) => `/reporting/tax/returns?${new URLSearchParams(qs ?? {}).toString()}`
  }
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
