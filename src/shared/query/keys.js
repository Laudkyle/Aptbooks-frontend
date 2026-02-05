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

,
  // Phase 6 — Assets
  assetCategories: ['assets', 'categories'],
  assetCategory: (id) => ['assets', 'categories', id],
  fixedAssets: (qs) => ['assets', 'fixedAssets', qs ?? {}],
  fixedAsset: (id) => ['assets', 'fixedAssets', id],
  depreciationSchedules: (qs) => ['assets', 'depreciation', 'schedules', qs ?? {}],
  depreciationSchedule: (id) => ['assets', 'depreciation', 'schedules', id],
  depreciationPreview: (periodId) => ['assets', 'depreciation', 'preview', periodId],

  // Phase 6 — Inventory
  inventoryCategories: ['inventory', 'categories'],
  inventoryCategory: (id) => ['inventory', 'categories', id],
  inventoryUnits: ['inventory', 'units'],
  inventoryItems: ['inventory', 'items'],
  inventoryItem: (id) => ['inventory', 'items', id],
  inventoryWarehouses: ['inventory', 'warehouses'],
  inventoryTransactions: (qs) => ['inventory', 'transactions', qs ?? {}],
  inventoryTransaction: (id) => ['inventory', 'transactions', id],
  inventoryCostMethod: ['inventory', 'transactions', 'costMethod'],
  stockCounts: (qs) => ['inventory', 'stockCounts', qs ?? {}],
  stockCount: (id) => ['inventory', 'stockCounts', id],
  inventoryValuationReport: (qs) => ['inventory', 'reports', 'valuation', qs ?? {}],
  inventoryMovementsReport: (qs) => ['inventory', 'reports', 'movements', qs ?? {}],

  // Phase 8 — Compliance
  ifrs16Leases: (qs) => ['compliance', 'ifrs16', 'leases', qs ?? {}],
  ifrs16Lease: (id) => ['compliance', 'ifrs16', 'leases', id],
  ifrs16LeaseSchedule: (leaseId) => ['compliance', 'ifrs16', 'lease', leaseId, 'schedule'],

  ifrs15Settings: ['compliance', 'ifrs15', 'settings'],
  ifrs15Contracts: (qs) => ['compliance', 'ifrs15', 'contracts', qs ?? {}],
  ifrs15Contract: (id) => ['compliance', 'ifrs15', 'contracts', id],
  ifrs15ContractSchedule: (id) => ['compliance', 'ifrs15', 'contracts', id, 'schedule'],
  ifrs15ContractCosts: (id) => ['compliance', 'ifrs15', 'contracts', id, 'costs'],

  ias12Settings: ['compliance', 'ias12', 'settings'],
  ias12Authorities: ['compliance', 'ias12', 'authorities'],
  ias12RateSets: ['compliance', 'ias12', 'rateSets'],
  ias12RateSetLines: (rateSetId) => ['compliance', 'ias12', 'rateSets', rateSetId, 'lines'],
  ias12TempDiffCategories: ['compliance', 'ias12', 'tempDiffCategories'],
  ias12TempDifferences: (qs) => ['compliance', 'ias12', 'tempDifferences', qs ?? {}],
  ias12DeferredTaxRuns: (qs) => ['compliance', 'ias12', 'deferredTaxRuns', qs ?? {}],
  ias12DeferredTaxRun: (runId) => ['compliance', 'ias12', 'deferredTaxRuns', runId],

  ifrs9Settings: ['compliance', 'ifrs9', 'settings'],
  ifrs9Models: ['compliance', 'ifrs9', 'models'],
  ifrs9Runs: (qs) => ['compliance', 'ifrs9', 'runs', qs ?? {}],
  ifrs9Run: (runId) => ['compliance', 'ifrs9', 'runs', runId],
  coaAccounts: (qs) => ['coa', 'accounts', qs ?? {}],

};
