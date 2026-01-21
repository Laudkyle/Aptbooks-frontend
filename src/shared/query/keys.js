export const qk = {
  me: ['me'],
  meOrganizations: ['me', 'organizations'],
  orgMe: ['org', 'me'],
  users: ['users'],
  user: (id) => ['users', id],
  roles: ['roles'],
  role: (id) => ['roles', id],
  permissions: ['permissions'],
  roleMatrix: ['roles', 'matrix'],
  rolePermissions: (id) => ['roles', id, 'permissions'],
  settingsList: (qs) => ['settings', qs],
  apiKeys: ['apiKeys'],
  dimensionRules: (qs) => ['dimensionSecurity', qs],
  notifications: (qs) => ['notifications', qs],
  approvalsInbox: (qs) => ['approvalsInbox', qs],
  utilitiesErrors: (qs) => ['utilitiesErrors', qs],
  utilitiesClientLogs: (qs) => ['utilitiesClientLogs', qs],
  healthSystem: ['healthSystem'],
  scheduledTasks: ['scheduledTasks'],
  scheduledTaskRuns: (code, qs) => ['scheduledTaskRuns', code, qs],
  i18nLocales: ['i18nLocales'],
  i18nMessages: (locale) => ['i18nMessages', locale],
  a11yStatus: ['a11yStatus'],
  releaseInfo: ['releaseInfo'],
  testsList: ['testsList']
,
  // Phase 5
  partners: (qs) => ['partners', qs ?? {}],
  partner: (id) => ['partners', id],
  partnerCreditPolicy: (id) => ['partners', id, 'creditPolicy'],

  paymentTerms: ['paymentConfig', 'paymentTerms'],
  paymentMethods: ['paymentConfig', 'paymentMethods'],
  paymentSettings: ['paymentConfig', 'paymentSettings'],

  invoices: (qs) => ['invoices', qs ?? {}],
  invoice: (id) => ['invoices', id],

  bills: (qs) => ['bills', qs ?? {}],
  bill: (id) => ['bills', id],

  customerReceipts: (qs) => ['customerReceipts', qs ?? {}],
  customerReceipt: (id) => ['customerReceipts', id],

  vendorPayments: (qs) => ['vendorPayments', qs ?? {}],
  vendorPayment: (id) => ['vendorPayments', id],

  creditNotes: (qs) => ['creditNotes', qs ?? {}],
  creditNote: (id) => ['creditNotes', id],

  debitNotes: (qs) => ['debitNotes', qs ?? {}],
  debitNote: (id) => ['debitNotes', id],

  collectionsQueue: (qs) => ['collections', 'queue', qs ?? {}],
  collectionsQueuePartner: (partnerId, qs) => ['collections', 'queue', partnerId, qs ?? {}],
  collectionsCases: (qs) => ['collections', 'cases', qs ?? {}],
  dunningTemplates: ['collections', 'dunning', 'templates'],
  dunningRules: ['collections', 'dunning', 'rules'],
  dunningRuns: ['collections', 'dunning', 'runs'],
  dunningRun: (id) => ['collections', 'dunning', 'runs', id],

  disputeReasonCodes: ['disputes', 'reasonCodes'],
  disputes: (qs) => ['disputes', qs ?? {}],
  dispute: (id) => ['disputes', id],

  writeoffReasonCodes: ['writeoffs', 'reasonCodes'],
  writeoffSettings: ['writeoffs', 'settings'],
  writeoffs: (qs) => ['writeoffs', qs ?? {}],
  writeoff: (id) => ['writeoffs', id],

  paymentPlans: (qs) => ['paymentPlans', qs ?? {}],
  paymentPlan: (id) => ['paymentPlans', id],

  reportArAging: (qs) => ['reports', 'ar', 'aging', qs ?? {}],
  reportArOpenItems: (qs) => ['reports', 'ar', 'openItems', qs ?? {}],
  reportArCustomerStatement: (qs) => ['reports', 'ar', 'customerStatement', qs ?? {}],
  reportApAging: (qs) => ['reports', 'ap', 'aging', qs ?? {}],
  reportApOpenItems: (qs) => ['reports', 'ap', 'openItems', qs ?? {}],
  reportApVendorStatement: (qs) => ['reports', 'ap', 'vendorStatement', qs ?? {}],
  reportTaxVatSummary: (qs) => ['reports', 'tax', 'vatSummary', qs ?? {}],
  reportTaxVatReturn: (qs) => ['reports', 'tax', 'vatReturn', qs ?? {}],
  reportTaxReturns: (qs) => ['reports', 'tax', 'returns', qs ?? {}]

};