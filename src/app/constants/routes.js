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
  accountingTaxWithholding: '/accounting/tax/withholding',
  accountingTaxWithholdingRemittanceNew: '/accounting/tax/withholding/remittances/new',
  accountingTaxWithholdingRemittanceDetail: (id=':id') => `/accounting/tax/withholding/remittances/${id}`,
  accountingTaxWithholdingCertificateNew: '/accounting/tax/withholding/certificates/new',
  accountingTaxWithholdingCertificateDetail: (id=':id') => `/accounting/tax/withholding/certificates/${id}`,
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

  quotations: '/transactions/quotations',
  quotationNew: '/transactions/quotations/new',
  quotationDetail: (id=':id') => `/transactions/quotations/${id}`,

  salesOrders: '/transactions/sales-orders',
  salesOrderNew: '/transactions/sales-orders/new',
  salesOrderDetail: (id=':id') => `/transactions/sales-orders/${id}`,

  purchaseRequisitions: '/transactions/purchase-requisitions',
  purchaseRequisitionNew: '/transactions/purchase-requisitions/new',
  purchaseRequisitionDetail: (id=':id') => `/transactions/purchase-requisitions/${id}`,

  purchaseOrders: '/transactions/purchase-orders',
  purchaseOrderNew: '/transactions/purchase-orders/new',
  purchaseOrderDetail: (id=':id') => `/transactions/purchase-orders/${id}`,

  goodsReceipts: '/transactions/goods-receipts',
  goodsReceiptNew: '/transactions/goods-receipts/new',
  goodsReceiptDetail: (id=':id') => `/transactions/goods-receipts/${id}`,

  expenses: '/transactions/expenses',
  expenseNew: '/transactions/expenses/new',
  expenseDetail: (id=':id') => `/transactions/expenses/${id}`,

  pettyCash: '/transactions/petty-cash',
  pettyCashNew: '/transactions/petty-cash/new',
  pettyCashDetail: (id=':id') => `/transactions/petty-cash/${id}`,

  advances: '/transactions/advances',
  advanceNew: '/transactions/advances/new',
  advanceDetail: (id=':id') => `/transactions/advances/${id}`,

  returns: '/transactions/returns',
  returnNew: '/transactions/returns/new',
  returnDetail: (id=':id') => `/transactions/returns/${id}`,

  refunds: '/transactions/refunds',
  refundNew: '/transactions/refunds/new',
  refundDetail: (id=':id') => `/transactions/refunds/${id}`,

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
  assetsCategoriesNew: '/assets/categories/new',
  assetsCategoryEdit: (id = ':id') => `/assets/categories/${id}/edit`,
  assetsRegister: '/assets/register',
  assetsRegisterNew: '/assets/register/new',
  assetsAssetDetail: (id = ':id') => `/assets/register/${id}`,
  assetsAssetEdit: (id=':id')=>`/assets/register/${id}/edit`,
  assetsAssetAcquire: (id=':id')=>`/assets/register/${id}/acquire`,
  assetsAssetDispose: (id=':id')=>`/assets/register/${id}/dispose`,
  assetsAssetTransfer: (id=':id')=>`/assets/register/${id}/transfer`,
  assetsAssetRevalue: (id=':id')=>`/assets/register/${id}/revalue`,
  assetsAssetImpair: (id=':id')=>`/assets/register/${id}/impair`,
  assetsAssetDeprScheduleNew: (id=':id')=>`/assets/register/${id}/depreciation/new`,
  assetsDepreciation: '/assets/depreciation',

  // Phase 6 — Inventory
  inventoryItems: '/inventory/items',
  inventoryItemsNew: '/inventory/items/new',
  inventoryItemEdit: (id=':id')=>`/inventory/items/${id}/edit`,
  inventoryWarehouses: '/inventory/warehouses',
  inventoryWarehousesNew: '/inventory/warehouses/new',
  inventoryCategories: '/inventory/categories',
  inventoryCategoriesNew: '/inventory/categories/new',
  inventoryCategoryEdit: (id=':id')=>`/inventory/categories/${id}/edit`,
  inventoryUnits: '/inventory/units',
  inventoryUnitsNew: '/inventory/units/new',
  inventoryTransactions: '/inventory/transactions',
  inventoryTransactionsNew: '/inventory/transactions/new',
  inventoryTransactionDetail: (id = ':id') => `/inventory/transactions/${id}`,
  inventoryStockCounts: '/inventory/stock-counts',
  inventoryStockCountsNew: '/inventory/stock-counts/new',
  inventoryStockCountDetail: (id = ':id') => `/inventory/stock-counts/${id}`,
  inventoryReports: '/inventory/reports',
  inventoryBins: '/inventory/bins',
  inventoryBinsNew: '/inventory/bins/new',
  inventoryReservations: '/inventory/reservations',
  inventoryReservationsNew: '/inventory/reservations/new',
  inventoryTransfers: '/inventory/transfers',
  inventoryTransfersNew: '/inventory/transfers/new',
  inventoryTransferDetail: (id = ':id') => `/inventory/transfers/${id}`,
  inventoryTraceability: '/inventory/traceability',
  inventoryReorder: '/inventory/reorder',

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
  treasury: '/banking/treasury',
  treasuryDashboard: '/banking/treasury/dashboard',
  paymentRuns: '/banking/treasury/payment-runs',
  paymentRunDetail: (id = ':id') => `/banking/treasury/payment-runs/${id}`,
  bankTransfers: '/banking/treasury/bank-transfers',
  bankTransferDetail: (id = ':id') => `/banking/treasury/bank-transfers/${id}`,
  paymentApprovalBatches: '/banking/treasury/approval-batches',
  paymentApprovalBatchDetail: (id = ':id') => `/banking/treasury/approval-batches/${id}`,
  cheques: '/banking/treasury/cheques',
  cashForecast: '/banking/treasury/cash-forecast',

  // Phase 9 — Automation
  automation: '/automation',
  automationRecurringTransactions: '/automation/recurring-transactions',
  automationAccountingJobs: '/automation/accounting-jobs',
  automationAutoReconciliation: '/automation/auto-reconciliation',
  automationDocumentMatching: '/automation/document-matching',
  automationAiClassification: '/automation/ai-classification',
  automationSmartNotifications: '/automation/smart-notifications',


  // Phase 10 — Printing & Document Templates
  printingTemplates: '/printing/templates',
  printingAssignments: '/printing/assignments',
  printingPreview: (documentType = ':documentType', documentId = ':documentId') => `/printing/preview/${documentType}/${documentId}`,
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
  documentCreate: '/workflow/documents/create',
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