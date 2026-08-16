import { ROUTES } from '../constants/routes.js';

const NAVIGABLE_PATHS = new Set(
  Object.values(ROUTES).filter((value) => typeof value === 'string')
);

const SECTION_CONFIG = {
  accounting: { label: 'Accounting', to: ROUTES.accountingJournals },
  business: { label: 'Business', to: ROUTES.businessCustomers },
  transactions: { label: 'Operations', to: ROUTES.invoices },
  ar: { label: 'AR Operations', to: ROUTES.arCollections },
  reports: { label: 'Reporting', to: ROUTES.reportArAging },
  assets: { label: 'Fixed Assets', to: ROUTES.assetsRegister },
  inventory: { label: 'Inventory', to: ROUTES.inventoryItems },
  commerce: { label: 'Commerce', to: ROUTES.commercePos },
  planning: { label: 'Planning', to: ROUTES.planningDashboards },
  banking: { label: 'Banking', to: ROUTES.banking },
  automation: { label: 'Automation', to: ROUTES.automation },
  printing: { label: 'Printing', to: ROUTES.printingTemplates },
  compliance: { label: 'Compliance', to: ROUTES.compliance },
  workflow: { label: 'Workflow', to: ROUTES.documents },
  hr: { label: 'Human Resources', to: ROUTES.hr },
  admin: { label: 'Administration', to: ROUTES.adminOrg },
  utilities: { label: 'Utilities', to: ROUTES.utilitiesHealth },
  approvals: { label: 'Workflow', to: ROUTES.approvalsInbox },
};

const EXACT_LABELS = {
  [ROUTES.dashboard]: 'Dashboard',
  [ROUTES.me]: 'My Account',
  [ROUTES.search]: 'Search',
  [ROUTES.notifications]: 'Inbox',
  [ROUTES.approvalsInbox]: 'Approval Inbox',

  [ROUTES.accountingCoa]: 'Chart of Accounts',
  [ROUTES.accountingCoaNew]: 'New Account',
  [ROUTES.accountingPeriods]: 'Accounting Periods',
  [ROUTES.accountingJournals]: 'Journals',
  [ROUTES.accountingJournalNew]: 'New Journal',
  [ROUTES.accountingTrialBalance]: 'Trial Balance',
  [ROUTES.accountingAccountActivity]: 'Account Activity',
  [ROUTES.accountingPnL]: 'Profit and Loss',
  [ROUTES.accountingBalanceSheet]: 'Balance Sheet',
  [ROUTES.accountingCashflow]: 'Cash Flow',
  [ROUTES.accountingChangesEquity]: 'Changes in Equity',
  [ROUTES.accountingExports]: 'Exports',
  [ROUTES.accountingImports]: 'Imports',
  [ROUTES.accountingFx]: 'FX Rates',
  [ROUTES.accountingTax]: 'Tax Configuration',
  [ROUTES.accountingTaxGhana]: 'Ghana Compliance',
  [ROUTES.accountingTaxGhanaLedger]: 'Tax Ledger',
  [ROUTES.accountingTaxGhanaCatalogProfiles]: 'Tax Catalog Profiles',
  [ROUTES.accountingTaxGhanaPartnerProfiles]: 'Partner Tax Profiles',
  [ROUTES.accountingTaxGhanaVat]: 'VAT',
  [ROUTES.accountingTaxGhanaVatReturn]: 'VAT Return',
  [ROUTES.accountingTaxGhanaVatApportionment]: 'Input VAT Apportionment',
  [ROUTES.accountingTaxGhanaImportedServices]: 'Imported Services',
  [ROUTES.accountingTaxGhanaVatReconciliation]: 'VAT Reconciliation',
  [ROUTES.accountingTaxGhanaWithholding]: 'Withholding',
  [ROUTES.accountingTaxGhanaWithholdingEvents]: 'Withholding Events',
  [ROUTES.accountingTaxGhanaWithholdingCertificates]: 'Withholding Certificates',
  [ROUTES.accountingTaxGhanaWithholdingReturns]: 'Withholding Returns',
  [ROUTES.accountingTaxGhanaWithholdingRemittances]: 'Withholding Remittances',
  [ROUTES.accountingTaxGhanaWithholdingReconciliation]: 'Withholding Reconciliation',
  [ROUTES.accountingTaxGhanaEvat]: 'GRA E-VAT',
  [ROUTES.accountingTaxGhanaEvatDocuments]: 'Fiscal Documents',
  [ROUTES.accountingTaxGhanaEvatQueue]: 'Transmission Queue',
  [ROUTES.accountingTaxGhanaEvatDevices]: 'Locations & Devices',
  [ROUTES.accountingTaxGhanaEvatLogs]: 'Fiscal System Logs',
  [ROUTES.accountingTaxGhanaEvatSettings]: 'E-VAT Settings',
  [ROUTES.accountingTaxGhanaCit]: 'Corporate Income Tax',
  [ROUTES.accountingTaxGhanaCapitalAllowances]: 'Capital Allowances',
  [ROUTES.accountingTaxGhanaIndustryProfile]: 'Industry Profile',
  [ROUTES.accountingTaxWithholding]: 'Withholding Tax',
  [ROUTES.accountingAccruals]: 'Accruals',
  [ROUTES.accountingAccrualNew]: 'New Accrual',
  [ROUTES.accountingReconciliation]: 'Reconciliation',

  [ROUTES.businessCustomers]: 'Customers',
  [ROUTES.businessVendors]: 'Vendors',
  [ROUTES.businessPartnerNew]: 'New Business Partner',
  [ROUTES.businessPaymentConfig]: 'Payment Configuration',

  [ROUTES.invoices]: 'Invoices',
  [ROUTES.invoiceNew]: 'New Invoice',
  [ROUTES.bills]: 'Bills',
  [ROUTES.billNew]: 'New Bill',
  [ROUTES.customerReceipts]: 'Customer Receipts',
  [ROUTES.customerReceiptNew]: 'New Customer Receipt',
  [ROUTES.vendorPayments]: 'Payments',
  [ROUTES.vendorPaymentNew]: 'New Payment',
  [ROUTES.creditNotes]: 'Credit Notes',
  [ROUTES.creditNoteNew]: 'New Credit Note',
  [ROUTES.debitNotes]: 'Debit Notes',
  [ROUTES.debitNoteNew]: 'New Debit Note',
  [ROUTES.quotations]: 'Quotations',
  [ROUTES.quotationNew]: 'New Quotation',
  [ROUTES.salesOrders]: 'Sales Orders',
  [ROUTES.salesOrderNew]: 'New Sales Order',
  [ROUTES.purchaseRequisitions]: 'Purchase Requisitions',
  [ROUTES.purchaseRequisitionNew]: 'New Purchase Requisition',
  [ROUTES.purchaseOrders]: 'Purchase Orders',
  [ROUTES.purchaseOrderNew]: 'New Purchase Order',
  [ROUTES.goodsReceipts]: 'Goods Receipts',
  [ROUTES.goodsReceiptNew]: 'New Goods Receipt',
  [ROUTES.expenses]: 'Expenses',
  [ROUTES.expenseNew]: 'New Expense',
  [ROUTES.pettyCash]: 'Petty Cash',
  [ROUTES.pettyCashNew]: 'New Petty Cash Entry',
  [ROUTES.advances]: 'Advances',
  [ROUTES.advanceNew]: 'New Advance',
  [ROUTES.returns]: 'Returns',
  [ROUTES.returnNew]: 'New Return',
  [ROUTES.refunds]: 'Refunds',
  [ROUTES.refundNew]: 'New Refund',

  [ROUTES.arCollections]: 'Collections',
  [ROUTES.arDisputes]: 'Disputes',
  [ROUTES.arWriteoffs]: 'Write-offs',
  [ROUTES.arPaymentPlans]: 'Payment Plans',
  [ROUTES.arDunning]: 'Dunning',

  [ROUTES.reportArAging]: 'AR Aging',
  [ROUTES.reportArOpenItems]: 'AR Open Items',
  [ROUTES.reportArCustomerStatement]: 'Customer Statements',
  [ROUTES.reportApAging]: 'AP Aging',
  [ROUTES.reportApOpenItems]: 'AP Open Items',
  [ROUTES.reportApVendorStatement]: 'Vendor Statements',
  [ROUTES.reportTax]: 'Tax Reports',

  [ROUTES.assetsCategories]: 'Asset Categories',
  [ROUTES.assetsRegister]: 'Asset Register',
  [ROUTES.assetsRegisterNew]: 'New Fixed Asset',
  [ROUTES.assetsCategoriesNew]: 'New Asset Category',
  [ROUTES.assetsDepreciation]: 'Depreciation',

  [ROUTES.inventoryItems]: 'Items',
  [ROUTES.inventoryItemsNew]: 'New Item',
  [ROUTES.inventoryWarehouses]: 'Warehouses',
  [ROUTES.inventoryWarehousesNew]: 'New Warehouse',
  [ROUTES.inventoryCategories]: 'Categories',
  [ROUTES.inventoryCategoriesNew]: 'New Category',
  [ROUTES.inventoryUnits]: 'Units of Measure',
  [ROUTES.inventoryUnitsNew]: 'New Unit',
  [ROUTES.inventoryTransactions]: 'Inventory Transactions',
  [ROUTES.inventoryTransactionsNew]: 'New Inventory Transaction',
  [ROUTES.inventoryStockCounts]: 'Stock Counts',
  [ROUTES.inventoryStockCountsNew]: 'New Stock Count',
  [ROUTES.inventoryReports]: 'Inventory Reports',
  [ROUTES.inventoryBins]: 'Warehouse Bins',
  [ROUTES.inventoryBinsNew]: 'New Bin',
  [ROUTES.inventoryReservations]: 'Reservations',
  [ROUTES.inventoryReservationsNew]: 'New Reservation',
  [ROUTES.inventoryTransfers]: 'Transfers',
  [ROUTES.inventoryTransfersNew]: 'New Transfer',
  [ROUTES.inventoryTraceability]: 'Traceability',
  [ROUTES.inventoryReorder]: 'Reorder',

  [ROUTES.commercePos]: 'POS Register',
  [ROUTES.commerceSetup]: 'POS Setup',
  [ROUTES.commerceOrders]: 'Online Orders',
  [ROUTES.commerceReturns]: 'Returns & Refunds',
  [ROUTES.commercePromotions]: 'Promotions',
  [ROUTES.commerceReports]: 'Commerce Reports',

  [ROUTES.planningProjects]: 'Projects',
  [ROUTES.planningBudgets]: 'Budgets',
  [ROUTES.planningForecasts]: 'Forecasts',
  [ROUTES.planningAllocations]: 'Allocations',
  [ROUTES.planningKpis]: 'KPIs',
  [ROUTES.planningDashboards]: 'Dashboards',
  [ROUTES.planningSavedReports]: 'Saved Reports',
  [ROUTES.planningManagement]: 'Planning Management',

  [ROUTES.banking]: 'Banking Overview',
  [ROUTES.bankingAccounts]: 'Bank Accounts',
  [ROUTES.bankingStatements]: 'Bank Statements',
  [ROUTES.bankingMatchingRules]: 'Matching Rules',
  [ROUTES.bankingCashbook]: 'Cashbook',
  [ROUTES.bankingReconciliations]: 'Reconciliations',
  [ROUTES.treasury]: 'Treasury',
  [ROUTES.treasuryDashboard]: 'Treasury Dashboard',
  [ROUTES.paymentRuns]: 'Payment Runs',
  [ROUTES.bankTransfers]: 'Bank Transfers',
  [ROUTES.paymentApprovalBatches]: 'Approval Batches',
  [ROUTES.cheques]: 'Cheques',
  [ROUTES.cashForecast]: 'Cash Forecast',

  [ROUTES.automation]: 'Automation Overview',
  [ROUTES.automationRecurringTransactions]: 'Recurring Transactions',
  [ROUTES.automationAccountingJobs]: 'Accounting Jobs',
  [ROUTES.automationAutoReconciliation]: 'Auto Reconciliation',
  [ROUTES.automationDocumentMatching]: 'Document Matching',
  [ROUTES.automationAiClassification]: 'AI Classification',
  [ROUTES.automationSmartNotifications]: 'Smart Notifications',

  [ROUTES.printingTemplates]: 'Document Templates',
  [ROUTES.printingAssignments]: 'Print Assignments',

  [ROUTES.compliance]: 'Compliance Overview',
  [ROUTES.complianceIFRS16]: 'IFRS 16 Leases',
  [ROUTES.complianceIFRS15]: 'IFRS 15 Contracts',
  [ROUTES.complianceIFRS9]: 'IFRS 9 ECL',
  [ROUTES.complianceIAS12]: 'IAS 12 Tax',

  [ROUTES.documents]: 'Documents',
  [ROUTES.documentCreate]: 'New Document',
  [ROUTES.documentTypes]: 'Document Types',
  [ROUTES.documentApprovalLevels]: 'Approval Levels',

  [ROUTES.hr]: 'HR Overview',
  [ROUTES.hrEmployees]: 'Employees',
  [ROUTES.hrDepartments]: 'Departments',
  [ROUTES.hrGrades]: 'Grades',
  [ROUTES.hrPositions]: 'Positions',
  [ROUTES.hrCompensationBands]: 'Compensation Bands',
  [ROUTES.hrPayroll]: 'Payroll',
  [ROUTES.hrPayrollGhana]: 'Ghana Payroll',
  [ROUTES.hrPayrollGhanaReturns]: 'PAYE Returns',
  [ROUTES.hrPayrollGhanaPensions]: 'SSNIT / Tier 2',
  [ROUTES.hrPayrollGhanaDisengaged]: 'Disengaged Employees',
  [ROUTES.hrPayrollGhanaRemittances]: 'Statutory Remittances',
  [ROUTES.hrLeave]: 'Leave',
  [ROUTES.hrBenefits]: 'Benefits',
  [ROUTES.hrStatutory]: 'Statutory Rules',
  [ROUTES.hrReports]: 'HR Reports',

  [ROUTES.adminOrg]: 'Organization',
  [ROUTES.adminUsers]: 'Users',
  [ROUTES.adminRoles]: 'Roles',
  [ROUTES.adminPermissions]: 'Permissions',
  [ROUTES.adminSettings]: 'System Settings',
  [ROUTES.adminDimensionSecurity]: 'Dimension Security',
  [ROUTES.adminApiKeys]: 'API Keys',

  [ROUTES.utilitiesHealth]: 'System Health',
  [ROUTES.utilitiesScheduler]: 'Scheduled Tasks',
  [ROUTES.utilitiesErrors]: 'Error Logs',
  [ROUTES.utilitiesClientLogs]: 'Client Logs',
  [ROUTES.utilitiesI18n]: 'Internationalization',
  [ROUTES.utilitiesA11y]: 'Accessibility',
  [ROUTES.utilitiesRelease]: 'Release Info',
  [ROUTES.utilitiesTests]: 'Test Console',
};

const GROUPS = [
  { prefix: '/accounting/tax/ghana/', label: 'Ghana Compliance', to: ROUTES.accountingTaxGhana },
  { prefix: '/accounting/statements/', label: 'Financial Statements', to: ROUTES.accountingPnL },
  { prefix: '/accounting/balances/', label: 'Balances & Ledger', to: ROUTES.accountingTrialBalance },
  { prefix: '/reports/ar/', label: 'Accounts Receivable', to: ROUTES.reportArAging },
  { prefix: '/reports/ap/', label: 'Accounts Payable', to: ROUTES.reportApAging },
];

const ACTION_LABELS = {
  new: 'New',
  edit: 'Edit',
  close: 'Close Period',
  acquire: 'Acquire Asset',
  dispose: 'Dispose Asset',
  transfer: 'Transfer',
  revalue: 'Revalue Asset',
  impair: 'Impair Asset',
  depreciation: 'Depreciation Schedule',
  create: 'New',
};

const DETAIL_LABELS = {
  '/accounting/coa/': 'Account Details',
  '/accounting/journals/': 'Journal Details',
  '/accounting/tax/ghana/vat/imported-services/': 'Imported Service Details',
  '/accounting/tax/ghana/withholding/returns/': 'Withholding Return Details',
  '/business/partners/': 'Business Partner Details',
  '/transactions/invoices/': 'Invoice Details',
  '/transactions/bills/': 'Bill Details',
  '/transactions/customer-receipts/': 'Customer Receipt Details',
  '/transactions/vendor-payments/': 'Payment Details',
  '/transactions/credit-notes/': 'Credit Note Details',
  '/transactions/debit-notes/': 'Debit Note Details',
  '/transactions/quotations/': 'Quotation Details',
  '/transactions/sales-orders/': 'Sales Order Details',
  '/transactions/purchase-requisitions/': 'Purchase Requisition Details',
  '/transactions/purchase-orders/': 'Purchase Order Details',
  '/transactions/goods-receipts/': 'Goods Receipt Details',
  '/transactions/expenses/': 'Expense Details',
  '/transactions/petty-cash/': 'Petty Cash Details',
  '/transactions/advances/': 'Advance Details',
  '/transactions/returns/': 'Return Details',
  '/transactions/refunds/': 'Refund Details',
  '/assets/register/': 'Asset Details',
  '/inventory/transactions/': 'Inventory Transaction Details',
  '/inventory/stock-counts/': 'Stock Count Details',
  '/inventory/transfers/': 'Transfer Details',
  '/planning/projects/': 'Project Details',
  '/planning/budgets/': 'Budget Details',
  '/planning/forecasts/': 'Forecast Details',
  '/banking/statements/': 'Statement Details',
  '/banking/reconciliations/': 'Reconciliation Details',
  '/banking/treasury/payment-runs/': 'Payment Run Details',
  '/banking/treasury/bank-transfers/': 'Bank Transfer Details',
  '/banking/treasury/approval-batches/': 'Approval Batch Details',
  '/compliance/ifrs16/': 'Lease Details',
  '/compliance/ifrs15/': 'Contract Details',
  '/workflow/documents/': 'Document Details',
  '/admin/users/': 'User Details',
  '/admin/roles/': 'Role Details',
};

function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  const clean = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '');
  return clean || '/';
}

function humanize(segment) {
  return decodeURIComponent(segment || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function currentDetailLabel(pathname, segments, lastNavigablePath) {
  if (pathname.startsWith('/printing/preview/')) return 'Document Preview';
  if (pathname.startsWith('/accounting/tax/withholding/open-items/')) return 'Withholding Open Item';
  if (pathname.startsWith('/accounting/tax/withholding/remittances/') && !pathname.endsWith('/new')) return 'Remittance Details';
  if (pathname.startsWith('/accounting/tax/withholding/certificates/') && !pathname.endsWith('/new')) return 'Certificate Details';

  if (pathname.startsWith('/planning/centers/')) {
    const type = segments.at(-1);
    return `${humanize(type)} Centers`;
  }

  const action = segments.at(-1);
  if (ACTION_LABELS[action]) {
    if (action === 'new' || action === 'edit' || action === 'create') {
      const baseLabel = EXACT_LABELS[lastNavigablePath] || humanize(segments.at(-2));
      const singular = baseLabel
        .replace(/ies$/, 'y')
        .replace(/s$/, '');
      return `${ACTION_LABELS[action]} ${singular}`;
    }
    return ACTION_LABELS[action];
  }

  const detailMatch = Object.entries(DETAIL_LABELS)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([prefix]) => pathname.startsWith(prefix) && pathname !== prefix.replace(/\/$/, ''));
  if (detailMatch) return detailMatch[1];

  return humanize(action) || 'Details';
}

function pushUnique(items, crumb) {
  if (!crumb?.label || !crumb?.to) return;
  if (items.some((item) => item.to === crumb.to && item.label === crumb.label)) return;
  items.push(crumb);
}

export function buildRouteNavigation(pathname) {
  const path = normalizePath(pathname);
  if (path === '/') return [{ label: 'Dashboard', to: ROUTES.dashboard, current: true }];

  if (EXACT_LABELS[path] && !path.includes('/', 1)) {
    return [{ label: EXACT_LABELS[path], to: path, current: true }];
  }

  const segments = path.split('/').filter(Boolean);
  const section = SECTION_CONFIG[segments[0]];
  const items = [];

  if (section) {
    pushUnique(items, { label: section.label, to: section.to });
  } else if (EXACT_LABELS[path]) {
    return [{ label: EXACT_LABELS[path], to: path, current: true }];
  } else {
    pushUnique(items, { label: humanize(segments[0]), to: path });
  }

  for (const group of GROUPS) {
    if (path.startsWith(group.prefix)) pushUnique(items, group);
  }

  let lastNavigablePath = section?.to || ROUTES.dashboard;
  for (let index = 1; index < segments.length; index += 1) {
    const candidate = `/${segments.slice(0, index + 1).join('/')}`;
    if (!NAVIGABLE_PATHS.has(candidate)) continue;

    const label = EXACT_LABELS[candidate] || humanize(segments[index]);
    pushUnique(items, { label, to: candidate });
    lastNavigablePath = candidate;
  }

  const currentAlreadyIncluded = items.some((item) => item.to === path);
  if (!currentAlreadyIncluded) {
    pushUnique(items, {
      label: currentDetailLabel(path, segments, lastNavigablePath),
      to: path,
    });
  }

  return items.map((item) => ({ ...item, current: item.to === path }));
}

export function getBackFallback(items) {
  if (!Array.isArray(items) || items.length <= 1) return ROUTES.dashboard;
  return items[items.length - 2]?.to || ROUTES.dashboard;
}
