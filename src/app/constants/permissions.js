export const PERMISSIONS = {
  // Phase 2
  notificationsManage: 'notifications.manage',

  // Users
  usersRead: 'users.read',
  usersManage: 'users.manage',

  // RBAC
  rbacPermissionsRead: 'rbac.permissions.read',
  rbacRolesRead: 'rbac.roles.read',
  rbacRolesManage: 'rbac.roles.manage',

  // Settings
  settingsRead: 'settings.read',
  settingsManage: 'settings.manage',

  // Dimension security
  dimensionSecurityRead: 'core.dimension_security.read',
  dimensionSecurityManage: 'core.dimension_security.manage',

  // Utilities
  clientLogsRead: 'utilities.client_logs.read',
  clientLogsWrite: 'utilities.client_logs.write',
  i18nRead: 'utilities.i18n.read',
  a11yRead: 'utilities.a11y.read',
  releaseRead: 'utilities.release.read',
  testsRun: 'utilities.tests.run',

  // Accounting Phase 4
  taxRead: 'tax.read',
  taxManage: 'tax.manage',
  periodForceClose: 'accounting.period.force_close'
,

// Phase 5 — Partners & Transactions & AR Ops & Reporting
partnersRead: 'partners.read',
partnersManage: 'partners.manage',
paymentConfigManage: 'payment_config.manage',

transactionsInvoiceRead: 'transactions.invoice.read',
transactionsInvoiceManage: 'transactions.invoice.manage',
transactionsInvoiceIssue: 'transactions.invoice.issue',
transactionsInvoiceVoid: 'transactions.invoice.void',

transactionsBillRead: 'transactions.bill.read',
transactionsBillManage: 'transactions.bill.manage',
transactionsBillIssue: 'transactions.bill.issue',
transactionsBillVoid: 'transactions.bill.void',

customerReceiptRead: 'transactions.customer_receipt.read',
customerReceiptManage: 'transactions.customer_receipt.manage',
customerReceiptPost: 'transactions.customer_receipt.post',
customerReceiptVoid: 'transactions.customer_receipt.void',

vendorPaymentRead: 'transactions.vendor_payment.read',
vendorPaymentManage: 'transactions.vendor_payment.manage',
vendorPaymentPost: 'transactions.vendor_payment.post',
vendorPaymentVoid: 'transactions.vendor_payment.void',

allocationsReallocate: 'transactions.allocations.reallocate',

creditNoteRead: 'transactions.credit_note.read',
creditNoteManage: 'transactions.credit_note.manage',
creditNoteIssue: 'transactions.credit_note.issue',
creditNoteApply: 'transactions.credit_note.apply',
creditNoteVoid: 'transactions.credit_note.void',

debitNoteRead: 'transactions.debit_note.read',
debitNoteManage: 'transactions.debit_note.manage',
debitNoteIssue: 'transactions.debit_note.issue',
debitNoteApply: 'transactions.debit_note.apply',
debitNoteVoid: 'transactions.debit_note.void',

approvalsAct: 'approvals.act',

collectionsRead: 'collections.read',
collectionsManage: 'collections.manage',
collectionsDunningRun: 'collections.dunning.run',

disputesRead: 'disputes.read',
disputesManage: 'disputes.manage',

writeoffsRead: 'writeoffs.read',
writeoffsManage: 'writeoffs.manage',

paymentPlansRead: 'payment_plans.read',
paymentPlansManage: 'payment_plans.manage',

reportingArRead: 'reporting.ar.read',
reportingApRead: 'reporting.ap.read',
reportingTaxRead: 'reporting.tax.read',

// Phase 6 — Assets
assetsCategoriesRead: 'assets.categories.read',
assetsCategoriesManage: 'assets.categories.manage',
assetsFixedAssetsRead: 'assets.fixed_assets.read',
assetsFixedAssetsManage: 'assets.fixed_assets.manage',
assetsDepreciationRun: 'assets.depreciation.run',

// Phase 6 — Inventory
inventoryCategoriesRead: 'inventory.categories.read',
inventoryCategoriesManage: 'inventory.categories.manage',
inventoryUnitsRead: 'inventory.units.read',
inventoryUnitsManage: 'inventory.units.manage',
inventoryItemsRead: 'inventory.items.read',
inventoryItemsManage: 'inventory.items.manage',
inventoryWarehousesRead: 'inventory.warehouses.read',
inventoryWarehousesManage: 'inventory.warehouses.manage',
inventoryTransactionsRead: 'inventory.transactions.read',
inventoryTransactionsManage: 'inventory.transactions.manage',
inventoryTransactionsApprove: 'inventory.transactions.approve',
inventoryTransactionsPost: 'inventory.transactions.post',

// Phase 7 — Reporting & Planning
reportingCentersRead: 'reporting.centers.read',
reportingCentersManage: 'reporting.centers.manage',
reportingProjectsRead: 'reporting.projects.read',
reportingProjectsManage: 'reporting.projects.manage',
reportingBudgetsRead: 'reporting.budgets.read',
reportingBudgetsManage: 'reporting.budgets.manage',
reportingForecastsRead: 'reporting.forecasts.read',
reportingForecastsManage: 'reporting.forecasts.manage',
reportingAllocationsRead: 'reporting.allocations.read',
reportingAllocationsManage: 'reporting.allocations.manage',
reportingKpisRead: 'reporting.kpis.read',
reportingKpisManage: 'reporting.kpis.manage',
reportingDashboardsRead: 'reporting.dashboards.read',
reportingDashboardsManage: 'reporting.dashboards.manage',
reportingReportsRead: 'reporting.reports.read',
reportingReportsManage: 'reporting.reports.manage',
reportingManagementRead: 'reporting.management.read',

// Phase 8 — Banking
bankingAccountsRead: 'banking.accounts.read',
bankingAccountsManage: 'banking.accounts.manage',
bankingStatementsRead: 'banking.statements.read',
bankingStatementsManage: 'banking.statements.manage',
bankingMatchingAct: 'banking.matching.act',
bankingMatchingRulesManage: 'banking.matching.rules.manage',
bankingMatchingSuggest: 'banking.matching.suggest',
bankingCashbookRead: 'banking.cashbook.read',
bankingReconciliationsRead: 'banking.reconciliations.read',
bankingReconciliationRun: 'banking.reconciliation.run',
reportingBankingRead: 'reporting.banking.read',

// Phase 8 — Compliance
complianceIfrs16Read: 'compliance.ifrs16.read',
complianceIfrs16Manage: 'compliance.ifrs16.manage',
complianceIfrs16Post: 'compliance.ifrs16.post',
complianceIfrs15Read: 'compliance.ifrs15.read',
complianceIfrs15Manage: 'compliance.ifrs15.manage',
complianceIfrs15Post: 'compliance.ifrs15.post',
complianceIfrs9Read: 'compliance.ifrs9.read',
complianceIfrs9Manage: 'compliance.ifrs9.manage',
complianceIfrs9Post: 'compliance.ifrs9.post',
complianceIas12Read: 'compliance.ias12.read',
complianceIas12Manage: 'compliance.ias12.manage',
complianceIas12Post: 'compliance.ias12.post',

// Phase 8 — Workflow / Documents
documentsRead: 'documents.read',
documentsManage: 'documents.manage',
documentsCreate: 'documents.create',
approvalsInboxRead: 'approvals.inbox.read',
approvalsAct: 'approvals.act',

// Phase 8 — Utilities
settingsRead: 'settings.read',
settingsManage: 'settings.manage',
utilitiesClientLogsWrite: 'utilities.client_logs.write',
utilitiesClientLogsRead: 'utilities.client_logs.read',
utilitiesI18nRead: 'utilities.i18n.read',
utilitiesA11yRead: 'utilities.a11y.read',
utilitiesReleaseRead: 'utilities.release.read',
utilitiesTestsRun: 'utilities.tests.run'

};