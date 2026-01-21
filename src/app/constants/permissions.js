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
reportingTaxRead: 'reporting.tax.read'

};