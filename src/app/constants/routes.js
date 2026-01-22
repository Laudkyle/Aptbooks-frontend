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

,
  // Phase 5 — Business (Partners) & Payment Config
  businessCustomers: '/business/customers',
  businessVendors: '/business/vendors',
  businessPartnerDetail: (id=':id') => `/business/partners/${id}`,
  businessPartnerNew: '/business/partners/new',
  businessPaymentConfig: '/business/payment-config',

  // Phase 5 — Transactions (AR/AP)
  invoices: '/transactions/invoices',
  invoiceNew: '/transactions/invoices/new',
  invoiceDetail: (id=':id') => `/transactions/invoices/${id}`,

  bills: '/transactions/bills',
  billNew: '/transactions/bills/new',
  billDetail: (id=':id') => `/transactions/bills/${id}`,

  customerReceipts: '/transactions/customer-receipts',
  customerReceiptNew: '/transactions/customer-receipts/new',
  customerReceiptDetail: (id=':id') => `/transactions/customer-receipts/${id}`,

  vendorPayments: '/transactions/vendor-payments',
  vendorPaymentNew: '/transactions/vendor-payments/new',
  vendorPaymentDetail: (id=':id') => `/transactions/vendor-payments/${id}`,

  creditNotes: '/transactions/credit-notes',
  creditNoteNew: '/transactions/credit-notes/new',
  creditNoteDetail: (id=':id') => `/transactions/credit-notes/${id}`,

  debitNotes: '/transactions/debit-notes',
  debitNoteNew: '/transactions/debit-notes/new',
  debitNoteDetail: (id=':id') => `/transactions/debit-notes/${id}`,

  // Phase 5 — AR Ops
  arCollections: '/ar/collections',
  arDisputes: '/ar/disputes',
  arWriteoffs: '/ar/writeoffs',
  arPaymentPlans: '/ar/payment-plans',
  arDunning: '/ar/dunning',

  // Phase 5 — Reporting (AR/AP/Tax)
  reportArAging: '/reports/ar/aging',
  reportArOpenItems: '/reports/ar/open-items',
  reportArCustomerStatement: '/reports/ar/customer-statement',
  reportApAging: '/reports/ap/aging',
  reportApOpenItems: '/reports/ap/open-items',
  reportApVendorStatement: '/reports/ap/vendor-statement',
  reportTax: '/reports/tax',

  // Phase 6 — Assets
  assetsCategories: '/assets/categories',
  assetsRegister: '/assets/register',
  assetsAssetDetail: (id = ':id') => `/assets/register/${id}`,
  assetsDepreciation: '/assets/depreciation',

  // Phase 6 — Inventory
  inventoryItems: '/inventory/items',
  inventoryWarehouses: '/inventory/warehouses',
  inventoryCategories: '/inventory/categories',
  inventoryUnits: '/inventory/units',
  inventoryTransactions: '/inventory/transactions',
  inventoryTransactionDetail: (id = ':id') => `/inventory/transactions/${id}`,
  inventoryStockCounts: '/inventory/stock-counts',
  inventoryStockCountDetail: (id = ':id') => `/inventory/stock-counts/${id}`,
  inventoryReports: '/inventory/reports',

  // Phase 7 — Reporting & Planning
  planningCenters: (type = ':type') => `/planning/centers/${type}`,
  planningProjects: '/planning/projects',
  planningProjectDetail: (id = ':projectId') => `/planning/projects/${id}`,
  planningBudgets: '/planning/budgets',
  planningBudgetDetail: (id = ':id') => `/planning/budgets/${id}`,
  planningForecasts: '/planning/forecasts',
  planningForecastDetail: (id = ':id') => `/planning/forecasts/${id}`,
  planningAllocations: '/planning/allocations',
  planningKpis: '/planning/kpis',
  planningDashboards: '/planning/dashboards',
  planningSavedReports: '/planning/reports',
  planningManagement: '/planning/management',

  // Phase 8 — Banking
  banking: '/banking',
  bankingAccounts: '/banking/accounts',
  bankingStatements: '/banking/statements',
  bankingStatementDetail: (statementId = ':statementId') => `/banking/statements/${statementId}`,
  bankingMatchingRules: '/banking/matching/rules',
  bankingCashbook: '/banking/cashbook',
  bankingReconciliations: '/banking/reconciliations',
  bankingReconciliationDetail: (id = ':id') => `/banking/reconciliations/${id}`,
  bankingStatementStatusReport: '/banking/reports/statement-status',

  // Phase 8 — Compliance
  compliance: '/compliance',
  complianceIFRS16: '/compliance/ifrs16',
  complianceIFRS16LeaseDetail: (id = ':leaseId') => `/compliance/ifrs16/${id}`,
  complianceIFRS15: '/compliance/ifrs15',
  complianceIFRS15ContractDetail: (id = ':contractId') => `/compliance/ifrs15/${id}`,
  complianceIFRS9: '/compliance/ifrs9',
  complianceIAS12: '/compliance/ias12',

  // Phase 8 — Workflow & Documents
  documents: '/workflow/documents',
  documentTypes: '/workflow/documents/types',
  documentApprovalLevels: '/workflow/documents/approval-levels',
  documentDetail: (id = ':id') => `/workflow/documents/${id}`,

  // Phase 8 — Utilities
  utilities: '/utilities',
  utilitiesScheduledTasks: '/utilities/scheduled-tasks',
  utilitiesErrors: '/utilities/errors',
  utilitiesClientLogs: '/utilities/client-logs',
  utilitiesI18n: '/utilities/i18n',
  utilitiesA11y: '/utilities/a11y',
  utilitiesRelease: '/utilities/release',
  utilitiesTests: '/utilities/tests'

};