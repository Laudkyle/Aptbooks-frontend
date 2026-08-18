import {
  Activity,
  AlertCircle,
  ArrowLeftRight,
  BadgeDollarSign,
  Banknote,
  BarChart3,
  BarChart4,
  Bell,
  BookMarked,
  BookOpen,
  Briefcase,
  BrushCleaning,
  Building2,
  Calculator,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Coins,
  CreditCard,
  Database,
  Download,
  Eye,
  FileBarChart,
  FileCheck,
  FileMinus,
  FilePlus2,
  FileSpreadsheet,
  FileStack,
  FileText,
  FileWarning,
  FlaskConical,
  FolderTree,
  Folders,
  Gauge,
  GitCompare,
  Globe,
  HandCoins,
  Handshake,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LineChart,
  List,
  Lock,
  MailWarning,
  Merge,
  Network,
  Newspaper,
  Package,
  PackageCheck,
  Percent,
  PieChart,
  PiggyBank,
  Printer,
  Receipt,
  ReceiptIndianRupee,
  RefreshCw,
  Repeat,
  RotateCcw,
  Ruler,
  Scale,
  ScaleIcon,
  ScrollText,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Stamp,
  TrendingDown,
  TrendingUp,
  Upload,
  UserCog,
  Users,
  Wallet,
  Warehouse,
  Workflow,
  Wrench,
} from "lucide-react";
import { ROUTES } from "../constants/routes.js";
import { PERMISSIONS } from "../constants/permissions.js";

// Declarative sidebar manifest. Navigation-specific gates are kept in anyGroups.
// routeAny/routeAll mirror the route registry so links cannot be more permissive than their route.
export const SIDE_NAV_GROUPS = [
  { label: "CORE", major: true,
    items: [
      { to: ROUTES.dashboard, routeKey: "dashboard", icon: Gauge, label: "Dashboard" },
      { to: ROUTES.search, routeKey: "search", icon: Search, label: "Search" },
      { to: ROUTES.notifications, routeKey: "notifications", icon: Bell, label: "Inbox" },
      { to: ROUTES.approvalsInbox, routeKey: "approvalsInbox", icon: FileCheck, label: "Approvals", routeAny: [PERMISSIONS.approvalsInboxRead, PERMISSIONS.approvalsAct] },
    ],
  },
  { label: "ACCOUNTING", major: true,
    items: [
      { to: ROUTES.accountingCoa, routeKey: "accountingCoa", icon: BookMarked, label: "Chart of Accounts", routeAny: [PERMISSIONS.accountingCoaRead] },
      { to: ROUTES.accountingPeriods, routeKey: "accountingPeriods", icon: CalendarRange, label: "Periods", routeAny: [PERMISSIONS.accountingPeriodRead] },
      { to: ROUTES.accountingJournals, routeKey: "accountingJournals", icon: ScrollText, label: "Journals", routeAll: [PERMISSIONS.accountingJournalRead, PERMISSIONS.accountingPeriodRead] },
      { to: ROUTES.accountingTrialBalance, routeKey: "accountingTrialBalance", icon: ScaleIcon, label: "Trial Balance", routeAll: [PERMISSIONS.accountingBalancesRead, PERMISSIONS.accountingPeriodRead] },
      { to: ROUTES.accountingAccountActivity, routeKey: "accountingAccountActivity", icon: List, label: "Account ledgers", routeAll: [PERMISSIONS.accountingBalancesRead, PERMISSIONS.accountingPeriodRead] },
      { to: ROUTES.accountingBalanceSheet, routeKey: "accountingBalanceSheet", icon: FileBarChart, label: "Balance Sheet", routeAll: [PERMISSIONS.accountingBalancesRead, PERMISSIONS.accountingPeriodRead] },
      { to: ROUTES.accountingChangesEquity, routeKey: "accountingChangesEquity", icon: TrendingUp, label: "Changes In Equity", routeAll: [PERMISSIONS.accountingBalancesRead, PERMISSIONS.accountingPeriodRead] },
      { to: ROUTES.accountingCashflow, routeKey: "accountingCashflow", icon: RefreshCw, label: "Cashflow", routeAll: [PERMISSIONS.accountingBalancesRead, PERMISSIONS.accountingPeriodRead] },
      { to: ROUTES.accountingPnL, routeKey: "accountingPnL", icon: BarChart4, label: "Profit and Loss", routeAll: [PERMISSIONS.accountingBalancesRead, PERMISSIONS.accountingPeriodRead] },
      { to: ROUTES.accountingFx, routeKey: "accountingFx", icon: Globe, label: "FX", routeAny: [PERMISSIONS.accountingFxRead] },
      { to: ROUTES.accountingTaxGhana, routeKey: "accountingTaxGhana", icon: Shield, label: "Ghana Compliance", routeAny: [PERMISSIONS.taxGhanaReadinessRead], anyGroups: [
        [PERMISSIONS.taxRead, PERMISSIONS.taxGhanaReadinessRead],
        [PERMISSIONS.taxGhanaReadinessRead],
      ] },
      { to: ROUTES.accountingTax, routeKey: "accountingTax", icon: ReceiptIndianRupee, label: "Tax Configuration", routeAny: [PERMISSIONS.taxRead], anyGroups: [
        [PERMISSIONS.taxRead, PERMISSIONS.taxGhanaReadinessRead],
        [PERMISSIONS.taxRead],
      ] },
      { to: ROUTES.accountingTaxWithholding, routeKey: "accountingTaxWithholding", icon: ReceiptIndianRupee, label: "Withholding", routeAny: [PERMISSIONS.taxRead], anyGroups: [
        [PERMISSIONS.taxRead, PERMISSIONS.taxGhanaReadinessRead],
        [PERMISSIONS.taxRead],
      ] },
      { to: ROUTES.accountingAccruals, routeKey: "accountingAccruals", icon: CalendarClock, label: "Accruals", routeAny: [PERMISSIONS.accountingAccrualsRead] },
      { to: ROUTES.accountingImports, routeKey: "accountingImports", icon: Upload, label: "Imports", routeAny: [PERMISSIONS.accountingImportsRun] },
      { to: ROUTES.accountingExports, routeKey: "accountingExports", icon: Download, label: "Exports", routeAll: [PERMISSIONS.accountingExportsRun, PERMISSIONS.accountingPeriodRead] },
      { to: ROUTES.accountingReconciliation, routeKey: "accountingReconciliation", icon: Merge, label: "Reconciliation", routeAll: [PERMISSIONS.accountingReconcileRun, PERMISSIONS.accountingPeriodRead] },
    ],
  },
  { label: "COMMERCE / POS", major: false, section: "OPERATIONS",
    anyGroups: [
      [PERMISSIONS.partnersRead, PERMISSIONS.partnersManage, PERMISSIONS.transactionsInvoiceRead, PERMISSIONS.transactionsBillRead, PERMISSIONS.collectionsRead, PERMISSIONS.reportingArRead],
      [PERMISSIONS.commercePosRead, PERMISSIONS.commercePosSell, PERMISSIONS.commerceSetupRead, PERMISSIONS.commerceOrdersRead, PERMISSIONS.commerceReturnsRead, PERMISSIONS.commercePromotionsRead, PERMISSIONS.commerceReportsRead],
    ],
    items: [
      { to: ROUTES.commercePos, routeKey: "commercePos", icon: ShoppingCart, label: "POS Register", routeAny: [PERMISSIONS.commercePosRead, PERMISSIONS.commercePosSell, PERMISSIONS.commercePosPost], anyGroups: [
        [PERMISSIONS.commercePosRead, PERMISSIONS.commercePosSell],
      ] },
      { to: ROUTES.commerceSetup, routeKey: "commerceSetup", icon: Settings, label: "POS Setup", routeAny: [PERMISSIONS.commerceSetupRead, PERMISSIONS.commerceSetupManage], anyGroups: [
        [PERMISSIONS.commerceSetupRead, PERMISSIONS.commerceSetupManage],
      ] },
      { to: ROUTES.commerceOrders, routeKey: "commerceOrders", icon: PackageCheck, label: "Online Orders", routeAny: [PERMISSIONS.commerceOrdersRead, PERMISSIONS.commerceOrdersManage], anyGroups: [
        [PERMISSIONS.commerceOrdersRead, PERMISSIONS.commerceOrdersManage],
      ] },
      { to: ROUTES.commerceReturns, routeKey: "commerceReturns", icon: RotateCcw, label: "Returns & Refunds", routeAny: [PERMISSIONS.commerceReturnsRead, PERMISSIONS.commerceReturnsManage], anyGroups: [
        [PERMISSIONS.commerceReturnsRead, PERMISSIONS.commerceReturnsManage],
      ] },
      { to: ROUTES.commercePromotions, routeKey: "commercePromotions", icon: Percent, label: "Promotions", routeAny: [PERMISSIONS.commercePromotionsRead, PERMISSIONS.commercePromotionsManage], anyGroups: [
        [PERMISSIONS.commercePromotionsRead, PERMISSIONS.commercePromotionsManage],
      ] },
      { to: ROUTES.commerceReports, routeKey: "commerceReports", icon: BarChart3, label: "Commerce Reports", routeAny: [PERMISSIONS.commerceReportsRead], anyGroups: [
        [PERMISSIONS.commerceReportsRead],
      ] },
    ],
  },
  { label: "BUSINESS", major: false, section: "OPERATIONS",
    anyGroups: [
      [PERMISSIONS.partnersRead, PERMISSIONS.partnersManage, PERMISSIONS.transactionsInvoiceRead, PERMISSIONS.transactionsBillRead, PERMISSIONS.collectionsRead, PERMISSIONS.reportingArRead],
      [PERMISSIONS.partnersRead, PERMISSIONS.partnersManage, PERMISSIONS.paymentConfigManage],
    ],
    items: [
      { to: ROUTES.businessCustomers, routeKey: "businessCustomers", icon: Handshake, label: "Customers", routeAny: [PERMISSIONS.partnersRead, PERMISSIONS.partnersManage] },
      { to: ROUTES.businessVendors, routeKey: "businessVendors", icon: Briefcase, label: "Vendors", routeAny: [PERMISSIONS.partnersRead, PERMISSIONS.partnersManage] },
      { to: ROUTES.businessPaymentConfig, routeKey: "businessPaymentConfig", icon: Settings, label: "Payment Config", routeAny: [PERMISSIONS.paymentConfigManage, PERMISSIONS.partnersRead], anyGroups: [
        [PERMISSIONS.paymentConfigManage, PERMISSIONS.partnersRead],
      ] },
    ],
  },
  { label: "TRANSACTIONS", major: false, section: "OPERATIONS",
    anyGroups: [
      [PERMISSIONS.partnersRead, PERMISSIONS.partnersManage, PERMISSIONS.transactionsInvoiceRead, PERMISSIONS.transactionsBillRead, PERMISSIONS.collectionsRead, PERMISSIONS.reportingArRead],
      [PERMISSIONS.transactionsInvoiceRead, PERMISSIONS.transactionsInvoiceManage, PERMISSIONS.transactionsBillRead, PERMISSIONS.transactionsBillManage, PERMISSIONS.customerReceiptRead, PERMISSIONS.vendorPaymentRead, PERMISSIONS.creditNoteRead, PERMISSIONS.debitNoteRead, PERMISSIONS.quotationRead, PERMISSIONS.salesOrderRead, PERMISSIONS.purchaseRequisitionRead, PERMISSIONS.purchaseOrderRead, PERMISSIONS.goodsReceiptRead, PERMISSIONS.expenseRead, PERMISSIONS.pettyCashRead, PERMISSIONS.advanceRead, PERMISSIONS.returnRead, PERMISSIONS.refundRead],
    ],
    items: [
      { to: ROUTES.invoices, routeKey: "invoices", icon: Receipt, label: "Invoices", routeAny: [PERMISSIONS.transactionsInvoiceRead, PERMISSIONS.transactionsInvoiceManage], anyGroups: [
        [PERMISSIONS.transactionsInvoiceRead, PERMISSIONS.transactionsInvoiceManage],
      ] },
      { to: ROUTES.bills, routeKey: "bills", icon: FileText, label: "Bills", routeAny: [PERMISSIONS.transactionsBillRead, PERMISSIONS.transactionsBillManage], anyGroups: [
        [PERMISSIONS.transactionsBillRead, PERMISSIONS.transactionsBillManage],
      ] },
      { to: ROUTES.customerReceipts, routeKey: "customerReceipts", icon: Banknote, label: "Customer Receipts", routeAny: [PERMISSIONS.customerReceiptRead, PERMISSIONS.customerReceiptManage], anyGroups: [
        [PERMISSIONS.customerReceiptRead, PERMISSIONS.customerReceiptManage],
      ] },
      { to: ROUTES.vendorPayments, routeKey: "vendorPayments", icon: Wallet, label: "Payments", routeAny: [PERMISSIONS.vendorPaymentRead, PERMISSIONS.vendorPaymentManage], anyGroups: [
        [PERMISSIONS.vendorPaymentRead, PERMISSIONS.vendorPaymentManage],
      ] },
      { to: ROUTES.creditNotes, routeKey: "creditNotes", icon: FileMinus, label: "Credit Notes", routeAny: [PERMISSIONS.creditNoteRead, PERMISSIONS.creditNoteManage], anyGroups: [
        [PERMISSIONS.creditNoteRead, PERMISSIONS.creditNoteManage],
      ] },
      { to: ROUTES.debitNotes, routeKey: "debitNotes", icon: FilePlus2, label: "Debit Notes", routeAny: [PERMISSIONS.debitNoteRead, PERMISSIONS.debitNoteManage], anyGroups: [
        [PERMISSIONS.debitNoteRead, PERMISSIONS.debitNoteManage],
      ] },
      { to: ROUTES.quotations, routeKey: "quotations", icon: FileText, label: "Quotations", routeAny: [PERMISSIONS.quotationRead, PERMISSIONS.quotationManage], anyGroups: [
        [PERMISSIONS.quotationRead, PERMISSIONS.quotationManage],
      ] },
      { to: ROUTES.salesOrders, routeKey: "salesOrders", icon: ShoppingCart, label: "Sales Orders", routeAny: [PERMISSIONS.salesOrderRead, PERMISSIONS.salesOrderManage], anyGroups: [
        [PERMISSIONS.salesOrderRead, PERMISSIONS.salesOrderManage],
      ] },
      { to: ROUTES.purchaseRequisitions, routeKey: "purchaseRequisitions", icon: ClipboardList, label: "Purchase Requisitions", routeAny: [PERMISSIONS.purchaseRequisitionRead, PERMISSIONS.purchaseRequisitionManage], anyGroups: [
        [PERMISSIONS.purchaseRequisitionRead, PERMISSIONS.purchaseRequisitionManage],
      ] },
      { to: ROUTES.purchaseOrders, routeKey: "purchaseOrders", icon: ShoppingCart, label: "Purchase Orders", routeAny: [PERMISSIONS.purchaseOrderRead, PERMISSIONS.purchaseOrderManage], anyGroups: [
        [PERMISSIONS.purchaseOrderRead, PERMISSIONS.purchaseOrderManage],
      ] },
      { to: ROUTES.goodsReceipts, routeKey: "goodsReceipts", icon: PackageCheck, label: "Goods Receipts", routeAny: [PERMISSIONS.goodsReceiptRead, PERMISSIONS.goodsReceiptManage], anyGroups: [
        [PERMISSIONS.goodsReceiptRead, PERMISSIONS.goodsReceiptManage],
      ] },
      { to: ROUTES.expenses, routeKey: "expenses", icon: Receipt, label: "Expenses", routeAny: [PERMISSIONS.expenseRead, PERMISSIONS.expenseManage], anyGroups: [
        [PERMISSIONS.expenseRead, PERMISSIONS.expenseManage],
      ] },
      { to: ROUTES.pettyCash, routeKey: "pettyCash", icon: Wallet, label: "Petty Cash", routeAny: [PERMISSIONS.pettyCashRead, PERMISSIONS.pettyCashManage], anyGroups: [
        [PERMISSIONS.pettyCashRead, PERMISSIONS.pettyCashManage],
      ] },
      { to: ROUTES.advances, routeKey: "advances", icon: Landmark, label: "Advances", routeAny: [PERMISSIONS.advanceRead, PERMISSIONS.advanceManage], anyGroups: [
        [PERMISSIONS.advanceRead, PERMISSIONS.advanceManage],
      ] },
      { to: ROUTES.returns, routeKey: "returns", icon: RotateCcw, label: "Returns", routeAny: [PERMISSIONS.returnRead, PERMISSIONS.returnManage], anyGroups: [
        [PERMISSIONS.returnRead, PERMISSIONS.returnManage],
      ] },
      { to: ROUTES.refunds, routeKey: "refunds", icon: CircleDollarSign, label: "Refunds", routeAny: [PERMISSIONS.refundRead, PERMISSIONS.refundManage], anyGroups: [
        [PERMISSIONS.refundRead, PERMISSIONS.refundManage],
      ] },
    ],
  },
  { label: "AR OPS", major: false, section: "OPERATIONS",
    anyGroups: [
      [PERMISSIONS.partnersRead, PERMISSIONS.partnersManage, PERMISSIONS.transactionsInvoiceRead, PERMISSIONS.transactionsBillRead, PERMISSIONS.collectionsRead, PERMISSIONS.reportingArRead],
      [PERMISSIONS.collectionsRead, PERMISSIONS.disputesRead, PERMISSIONS.writeoffsRead, PERMISSIONS.paymentPlansRead],
    ],
    items: [
      { to: ROUTES.arCollections, routeKey: "arCollections", icon: Coins, label: "Collections", routeAny: [PERMISSIONS.collectionsRead, PERMISSIONS.collectionsManage], anyGroups: [
        [PERMISSIONS.collectionsRead, PERMISSIONS.collectionsManage],
      ] },
      { to: ROUTES.arDunning, routeKey: "arDunning", icon: MailWarning, label: "Dunning", routeAny: [PERMISSIONS.collectionsRead, PERMISSIONS.collectionsManage], anyGroups: [
        [PERMISSIONS.collectionsRead, PERMISSIONS.collectionsManage],
      ] },
      { to: ROUTES.arDisputes, routeKey: "arDisputes", icon: FileWarning, label: "Disputes", routeAny: [PERMISSIONS.disputesRead, PERMISSIONS.disputesManage], anyGroups: [
        [PERMISSIONS.disputesRead, PERMISSIONS.disputesManage],
      ] },
      { to: ROUTES.arWriteoffs, routeKey: "arWriteoffs", icon: FileMinus, label: "Write-offs", routeAny: [PERMISSIONS.writeoffsRead, PERMISSIONS.writeoffsManage], anyGroups: [
        [PERMISSIONS.writeoffsRead, PERMISSIONS.writeoffsManage],
      ] },
      { to: ROUTES.arPaymentPlans, routeKey: "arPaymentPlans", icon: CalendarClock, label: "Payment Plans", routeAny: [PERMISSIONS.paymentPlansRead, PERMISSIONS.paymentPlansManage], anyGroups: [
        [PERMISSIONS.paymentPlansRead, PERMISSIONS.paymentPlansManage],
      ] },
    ],
  },
  { label: "ASSETS & INVENTORY", major: false, section: "OPERATIONS",
    anyGroups: [
      [PERMISSIONS.partnersRead, PERMISSIONS.partnersManage, PERMISSIONS.transactionsInvoiceRead, PERMISSIONS.transactionsBillRead, PERMISSIONS.collectionsRead, PERMISSIONS.reportingArRead],
      [PERMISSIONS.assetsFixedAssetsRead, PERMISSIONS.inventoryItemsRead, PERMISSIONS.inventoryTransactionsRead],
    ],
    items: [
      { to: ROUTES.assetsCategories, routeKey: "assetsCategories", icon: FolderTree, label: "Asset Categories", routeAny: [PERMISSIONS.assetsCategoriesRead, PERMISSIONS.assetsCategoriesManage], anyGroups: [
        [PERMISSIONS.assetsCategoriesRead, PERMISSIONS.assetsCategoriesManage],
      ] },
      { to: ROUTES.assetsRegister, routeKey: "assetsRegister", icon: Database, label: "Fixed Assets", routeAny: [PERMISSIONS.assetsFixedAssetsRead, PERMISSIONS.assetsFixedAssetsManage], anyGroups: [
        [PERMISSIONS.assetsFixedAssetsRead, PERMISSIONS.assetsFixedAssetsManage],
      ] },
      { to: ROUTES.assetsDepreciation, routeKey: "assetsDepreciation", icon: TrendingDown, label: "Depreciation", routeAny: [PERMISSIONS.assetsDepreciationRun, PERMISSIONS.assetsFixedAssetsRead], anyGroups: [
        [PERMISSIONS.assetsFixedAssetsRead, PERMISSIONS.assetsFixedAssetsManage],
      ] },
      { to: ROUTES.inventoryCategories, routeKey: "inventoryCategories", icon: Folders, label: "Item Categories", routeAny: [PERMISSIONS.inventoryCategoriesRead, PERMISSIONS.inventoryCategoriesManage], anyGroups: [
        [PERMISSIONS.inventoryCategoriesRead, PERMISSIONS.inventoryCategoriesManage],
      ] },
      { to: ROUTES.inventoryUnits, routeKey: "inventoryUnits", icon: Ruler, label: "Units", routeAny: [PERMISSIONS.inventoryUnitsRead, PERMISSIONS.inventoryUnitsManage], anyGroups: [
        [PERMISSIONS.inventoryUnitsRead, PERMISSIONS.inventoryUnitsManage],
      ] },
      { to: ROUTES.inventoryItems, routeKey: "inventoryItems", icon: Package, label: "Items", routeAny: [PERMISSIONS.inventoryItemsRead, PERMISSIONS.inventoryItemsManage], anyGroups: [
        [PERMISSIONS.inventoryItemsRead, PERMISSIONS.inventoryItemsManage],
      ] },
      { to: ROUTES.inventoryWarehouses, routeKey: "inventoryWarehouses", icon: Warehouse, label: "Warehouses", routeAny: [PERMISSIONS.inventoryWarehousesRead, PERMISSIONS.inventoryWarehousesManage], anyGroups: [
        [PERMISSIONS.inventoryWarehousesRead, PERMISSIONS.inventoryWarehousesManage],
      ] },
      { to: ROUTES.inventoryTransactions, routeKey: "inventoryTransactions", icon: ArrowLeftRight, label: "Inventory Txns", routeAny: [PERMISSIONS.inventoryTransactionsRead, PERMISSIONS.inventoryTransactionsManage, PERMISSIONS.inventoryTransactionsApprove, PERMISSIONS.inventoryTransactionsPost], anyGroups: [
        [PERMISSIONS.inventoryTransactionsRead, PERMISSIONS.inventoryTransactionsManage],
      ] },
      { to: ROUTES.inventoryStockCounts, routeKey: "inventoryStockCounts", icon: ClipboardList, label: "Stock Counts", routeAny: [PERMISSIONS.inventoryTransactionsRead, PERMISSIONS.inventoryTransactionsManage, PERMISSIONS.inventoryTransactionsApprove, PERMISSIONS.inventoryTransactionsPost], anyGroups: [
        [PERMISSIONS.inventoryTransactionsRead, PERMISSIONS.inventoryTransactionsManage],
      ] },
      { to: ROUTES.inventoryReports, routeKey: "inventoryReports", icon: BarChart4, label: "Inventory Reports", routeAny: [PERMISSIONS.inventoryTransactionsRead, PERMISSIONS.inventoryTransactionsManage], anyGroups: [
        [PERMISSIONS.inventoryTransactionsRead, PERMISSIONS.inventoryTransactionsManage],
      ] },
      { to: ROUTES.inventoryBins, routeKey: "inventoryBins", icon: Folders, label: "Warehouse Bins", routeAny: [PERMISSIONS.inventoryWarehousesRead, PERMISSIONS.inventoryWarehousesManage], anyGroups: [
        [PERMISSIONS.inventoryWarehousesRead, PERMISSIONS.inventoryWarehousesManage],
      ] },
      { to: ROUTES.inventoryReservations, routeKey: "inventoryReservations", icon: Package, label: "Reservations", routeAny: [PERMISSIONS.inventoryReservationsRead, PERMISSIONS.inventoryReservationsManage], anyGroups: [
        [PERMISSIONS.inventoryReservationsRead, PERMISSIONS.inventoryReservationsManage],
      ] },
      { to: ROUTES.inventoryTransfers, routeKey: "inventoryTransfers", icon: ArrowLeftRight, label: "Transfers", routeAny: [PERMISSIONS.inventoryTransfersRead, PERMISSIONS.inventoryTransfersManage, PERMISSIONS.inventoryTransfersApprove, PERMISSIONS.inventoryTransfersPost], anyGroups: [
        [PERMISSIONS.inventoryTransfersRead, PERMISSIONS.inventoryTransfersManage, PERMISSIONS.inventoryTransfersApprove, PERMISSIONS.inventoryTransfersPost],
      ] },
      { to: ROUTES.inventoryTraceability, routeKey: "inventoryTraceability", icon: ClipboardList, label: "Traceability", routeAny: [PERMISSIONS.inventoryTraceabilityRead, PERMISSIONS.inventoryTraceabilityManage], anyGroups: [
        [PERMISSIONS.inventoryTraceabilityRead, PERMISSIONS.inventoryTraceabilityManage],
      ] },
      { to: ROUTES.inventoryReorder, routeKey: "inventoryReorder", icon: BarChart4, label: "Reorder", routeAny: [PERMISSIONS.inventoryReorderRead, PERMISSIONS.inventoryReorderManage], anyGroups: [
        [PERMISSIONS.inventoryReorderRead, PERMISSIONS.inventoryReorderManage],
      ] },
    ],
  },
  { label: "REPORTING", major: false, section: "OPERATIONS",
    anyGroups: [
      [PERMISSIONS.partnersRead, PERMISSIONS.partnersManage, PERMISSIONS.transactionsInvoiceRead, PERMISSIONS.transactionsBillRead, PERMISSIONS.collectionsRead, PERMISSIONS.reportingArRead],
      [PERMISSIONS.reportingArRead, PERMISSIONS.reportingApRead, PERMISSIONS.reportingTaxRead],
    ],
    items: [
      { to: ROUTES.reportArAging, routeKey: "reportArAging", icon: PieChart, label: "AR Aging", routeAny: [PERMISSIONS.reportingArRead], anyGroups: [
        [PERMISSIONS.reportingArRead],
      ] },
      { to: ROUTES.reportArOpenItems, routeKey: "reportArOpenItems", icon: List, label: "AR Open Items", routeAny: [PERMISSIONS.reportingArRead], anyGroups: [
        [PERMISSIONS.reportingArRead],
      ] },
      { to: ROUTES.reportArCustomerStatement, routeKey: "reportArCustomerStatement", icon: ScrollText, label: "Customer Statements", routeAny: [PERMISSIONS.reportingArRead], anyGroups: [
        [PERMISSIONS.reportingArRead],
      ] },
      { to: ROUTES.reportApAging, routeKey: "reportApAging", icon: PieChart, label: "AP Aging", routeAny: [PERMISSIONS.reportingApRead], anyGroups: [
        [PERMISSIONS.reportingApRead],
      ] },
      { to: ROUTES.reportApOpenItems, routeKey: "reportApOpenItems", icon: List, label: "AP Open Items", routeAny: [PERMISSIONS.reportingApRead], anyGroups: [
        [PERMISSIONS.reportingApRead],
      ] },
      { to: ROUTES.reportApVendorStatement, routeKey: "reportApVendorStatement", icon: Newspaper, label: "Vendor Statements", routeAny: [PERMISSIONS.reportingApRead], anyGroups: [
        [PERMISSIONS.reportingApRead],
      ] },
      { to: ROUTES.reportTax, routeKey: "reportTax", icon: ReceiptIndianRupee, label: "Tax Reports", routeAny: [PERMISSIONS.reportingTaxRead], anyGroups: [
        [PERMISSIONS.reportingTaxRead],
      ] },
    ],
  },
  { label: "PLANNING", major: false, section: "OPERATIONS",
    anyGroups: [
      [PERMISSIONS.partnersRead, PERMISSIONS.partnersManage, PERMISSIONS.transactionsInvoiceRead, PERMISSIONS.transactionsBillRead, PERMISSIONS.collectionsRead, PERMISSIONS.reportingArRead],
      [PERMISSIONS.reportingBudgetsRead, PERMISSIONS.reportingForecastsRead, PERMISSIONS.reportingKpisRead, PERMISSIONS.reportingReportsRead],
    ],
    items: [
      { to: ROUTES.planningCenters, routeKey: "planningCenters", icon: Network, label: "Centers", routeAny: [PERMISSIONS.reportingCentersRead, PERMISSIONS.reportingCentersManage], anyGroups: [
        [PERMISSIONS.reportingCentersRead],
      ] },
      { to: ROUTES.planningProjects, routeKey: "planningProjects", icon: Briefcase, label: "Projects", routeAny: [PERMISSIONS.reportingProjectsRead, PERMISSIONS.reportingProjectsManage], anyGroups: [
        [PERMISSIONS.reportingProjectsRead],
      ] },
      { to: ROUTES.planningBudgets, routeKey: "planningBudgets", icon: PiggyBank, label: "Budgets", routeAny: [PERMISSIONS.reportingBudgetsRead, PERMISSIONS.reportingBudgetsManage], anyGroups: [
        [PERMISSIONS.reportingBudgetsRead],
      ] },
      { to: ROUTES.planningForecasts, routeKey: "planningForecasts", icon: LineChart, label: "Forecasts", routeAny: [PERMISSIONS.reportingForecastsRead, PERMISSIONS.reportingForecastsManage], anyGroups: [
        [PERMISSIONS.reportingForecastsRead],
      ] },
      { to: ROUTES.planningAllocations, routeKey: "planningAllocations", icon: Merge, label: "Allocations", routeAny: [PERMISSIONS.reportingAllocationsRead, PERMISSIONS.reportingAllocationsManage], anyGroups: [
        [PERMISSIONS.reportingAllocationsRead],
      ] },
      { to: ROUTES.planningKpis, routeKey: "planningKpis", icon: Gauge, label: "KPIs", routeAny: [PERMISSIONS.reportingKpisRead, PERMISSIONS.reportingKpisManage], anyGroups: [
        [PERMISSIONS.reportingKpisRead],
      ] },
      { to: ROUTES.planningDashboards, routeKey: "planningDashboards", icon: LayoutDashboard, label: "Dashboards", routeAny: [PERMISSIONS.reportingDashboardsRead, PERMISSIONS.reportingDashboardsManage], anyGroups: [
        [PERMISSIONS.reportingDashboardsRead],
      ] },
      { to: ROUTES.planningSavedReports, routeKey: "planningSavedReports", icon: FileSpreadsheet, label: "Saved Reports", routeAny: [PERMISSIONS.reportingReportsRead, PERMISSIONS.reportingReportsManage], anyGroups: [
        [PERMISSIONS.reportingReportsRead],
      ] },
      { to: ROUTES.planningManagement, routeKey: "planningManagement", icon: UserCog, label: "Management", routeAny: [PERMISSIONS.reportingManagementRead], anyGroups: [
        [PERMISSIONS.reportingManagementRead],
      ] },
    ],
  },
  { label: "BANKING", major: true,
    items: [
      { to: ROUTES.banking, routeKey: "banking", icon: Landmark, label: "Overview", routeAny: [PERMISSIONS.bankingAccountsRead, PERMISSIONS.bankingStatementsRead], anyGroups: [
        [PERMISSIONS.bankingAccountsRead, PERMISSIONS.bankingStatementsRead, PERMISSIONS.bankingReconciliationsRead],
      ] },
      { to: ROUTES.bankingAccounts, routeKey: "bankingAccounts", icon: CreditCard, label: "Bank Accounts", routeAny: [PERMISSIONS.bankingAccountsRead], anyGroups: [
        [PERMISSIONS.bankingAccountsRead],
      ] },
      { to: ROUTES.bankingStatements, routeKey: "bankingStatements", icon: ScrollText, label: "Statements", routeAny: [PERMISSIONS.bankingStatementsRead], anyGroups: [
        [PERMISSIONS.bankingStatementsRead],
      ] },
      { to: ROUTES.bankingMatchingRules, routeKey: "bankingMatchingRules", icon: GitCompare, label: "Matching Rules", routeAny: [PERMISSIONS.bankingMatchingRulesManage], anyGroups: [
        [PERMISSIONS.bankingMatchingRulesManage],
      ] },
      { to: ROUTES.bankingCashbook, routeKey: "bankingCashbook", icon: BookOpen, label: "Cashbook", routeAny: [PERMISSIONS.bankingCashbookRead], anyGroups: [
        [PERMISSIONS.bankingCashbookRead],
      ] },
      { to: ROUTES.bankingReconciliations, routeKey: "bankingReconciliations", icon: CheckCircle2, label: "Reconciliations", routeAny: [PERMISSIONS.bankingReconciliationsRead], anyGroups: [
        [PERMISSIONS.bankingReconciliationsRead],
      ] },
    ],
  },
  { label: "TREASURY", major: false,
    anyGroups: [
      [PERMISSIONS.bankingTreasuryRead],
    ],
    items: [
      { to: ROUTES.treasury, routeKey: "treasury", icon: Wallet, label: "Overview", routeAny: [PERMISSIONS.bankingTreasuryRead] },
      { to: ROUTES.treasuryDashboard, routeKey: "treasuryDashboard", icon: PieChart, label: "Dashboard", routeAny: [PERMISSIONS.bankingTreasuryRead] },
      { to: ROUTES.paymentRuns, routeKey: "paymentRuns", icon: HandCoins, label: "Payment Runs", routeAny: [PERMISSIONS.bankingTreasuryRead] },
      { to: ROUTES.bankTransfers, routeKey: "bankTransfers", icon: ArrowLeftRight, label: "Bank Transfers", routeAny: [PERMISSIONS.bankingTreasuryRead] },
      { to: ROUTES.paymentApprovalBatches, routeKey: "paymentApprovalBatches", icon: FileStack, label: "Approval Batches", routeAny: [PERMISSIONS.bankingTreasuryRead] },
      { to: ROUTES.cheques, routeKey: "cheques", icon: Receipt, label: "Cheques", routeAny: [PERMISSIONS.bankingTreasuryRead] },
      { to: ROUTES.cashForecast, routeKey: "cashForecast", icon: LineChart, label: "Cash Forecast", routeAny: [PERMISSIONS.bankingTreasuryRead] },
    ],
  },
  { label: "AUTOMATION", major: true,
    items: [
      { to: ROUTES.automation, routeKey: "automation", icon: Wrench, label: "Overview", routeAny: [PERMISSIONS.automationRead, PERMISSIONS.automationManage], anyGroups: [
        [PERMISSIONS.automationRead, PERMISSIONS.automationManage],
      ] },
      { to: ROUTES.automationRecurringTransactions, routeKey: "automationRecurringTransactions", icon: Repeat, label: "Recurring", routeAny: [PERMISSIONS.automationRead, PERMISSIONS.automationManage], anyGroups: [
        [PERMISSIONS.automationRead, PERMISSIONS.automationManage],
      ] },
      { to: ROUTES.automationAutoReconciliation, routeKey: "automationAutoReconciliation", icon: Merge, label: "Auto Reconciliation", routeAny: [PERMISSIONS.automationRead, PERMISSIONS.automationManage, PERMISSIONS.automationRun], anyGroups: [
        [PERMISSIONS.automationRead, PERMISSIONS.automationRun, PERMISSIONS.automationManage],
      ] },
      { to: ROUTES.automationDocumentMatching, routeKey: "automationDocumentMatching", icon: GitCompare, label: "Document Matching", routeAny: [PERMISSIONS.automationRead, PERMISSIONS.automationManage, PERMISSIONS.automationRun], anyGroups: [
        [PERMISSIONS.automationRead, PERMISSIONS.automationRun, PERMISSIONS.automationManage],
      ] },
      { to: ROUTES.automationAiClassification, routeKey: "automationAiClassification", icon: FlaskConical, label: "AI Classification", routeAny: [PERMISSIONS.automationRead, PERMISSIONS.automationManage], anyGroups: [
        [PERMISSIONS.automationRead, PERMISSIONS.automationManage],
      ] },
      { to: ROUTES.automationSmartNotifications, routeKey: "automationSmartNotifications", icon: MailWarning, label: "Smart Notifications", routeAny: [PERMISSIONS.automationRead, PERMISSIONS.automationNotificationsManage, PERMISSIONS.automationManage], anyGroups: [
        [PERMISSIONS.automationRead, PERMISSIONS.automationNotificationsManage, PERMISSIONS.automationManage],
      ] },
    ],
  },
  { label: "COMPLIANCE", major: true,
    items: [
      { to: ROUTES.compliance, routeKey: "compliance", icon: Stamp, label: "Overview", routeAny: [PERMISSIONS.complianceIfrs16Read, PERMISSIONS.complianceIfrs15Read, PERMISSIONS.complianceIfrs9Read, PERMISSIONS.complianceIas12Read], anyGroups: [
        [PERMISSIONS.complianceIfrs16Read, PERMISSIONS.complianceIfrs15Read, PERMISSIONS.complianceIfrs9Read, PERMISSIONS.complianceIas12Read],
      ] },
      { to: ROUTES.complianceIFRS16, routeKey: "complianceIFRS16", icon: FileText, label: "IFRS 16 (Leases)", routeAny: [PERMISSIONS.complianceIfrs16Read], anyGroups: [
        [PERMISSIONS.complianceIfrs16Read],
      ] },
      { to: ROUTES.complianceIFRS15, routeKey: "complianceIFRS15", icon: Receipt, label: "IFRS 15 (Revenue)", routeAny: [PERMISSIONS.complianceIfrs15Read], anyGroups: [
        [PERMISSIONS.complianceIfrs15Read],
      ] },
      { to: ROUTES.complianceIFRS9, routeKey: "complianceIFRS9", icon: Calculator, label: "IFRS 9 (ECL)", routeAny: [PERMISSIONS.complianceIfrs9Read], anyGroups: [
        [PERMISSIONS.complianceIfrs9Read],
      ] },
      { to: ROUTES.complianceIAS12, routeKey: "complianceIAS12", icon: ReceiptIndianRupee, label: "IAS 12 (Taxes)", routeAny: [PERMISSIONS.complianceIas12Read], anyGroups: [
        [PERMISSIONS.complianceIas12Read],
      ] },
    ],
  },
  { label: "WORKFLOW", major: true,
    items: [
      { to: ROUTES.documents, routeKey: "documents", icon: FileStack, label: "Documents", routeAny: [PERMISSIONS.documentsRead], anyGroups: [
        [PERMISSIONS.documentsRead],
      ] },
      { to: ROUTES.documentTypes, routeKey: "documentTypes", icon: Folders, label: "Document Types", routeAny: [PERMISSIONS.documentsManage], anyGroups: [
        [PERMISSIONS.documentsManage],
      ] },
      { to: ROUTES.documentApprovalLevels, routeKey: "documentApprovalLevels", icon: Workflow, label: "Approval Levels", routeAny: [PERMISSIONS.documentsManage], anyGroups: [
        [PERMISSIONS.documentsManage],
      ] },
    ],
  },
  { label: "HR", major: true,
    items: [
      { to: ROUTES.hrEmployees, routeKey: "hrEmployees", icon: Users, label: "Employees", routeAny: [PERMISSIONS.hrEmployeesRead, PERMISSIONS.hrEmployeesManage], anyGroups: [
        [PERMISSIONS.hrEmployeesRead, PERMISSIONS.hrDepartmentsRead, PERMISSIONS.hrPayrollRead, PERMISSIONS.hrPayrollGhanaRead, PERMISSIONS.hrReportsRead],
        [PERMISSIONS.hrEmployeesRead, PERMISSIONS.hrEmployeesManage],
      ] },
      { to: ROUTES.hrDepartments, routeKey: "hrDepartments", icon: Building2, label: "Departments", routeAny: [PERMISSIONS.hrDepartmentsRead, PERMISSIONS.hrDepartmentsManage], anyGroups: [
        [PERMISSIONS.hrEmployeesRead, PERMISSIONS.hrDepartmentsRead, PERMISSIONS.hrPayrollRead, PERMISSIONS.hrPayrollGhanaRead, PERMISSIONS.hrReportsRead],
        [PERMISSIONS.hrDepartmentsRead, PERMISSIONS.hrDepartmentsManage],
      ] },
      { to: ROUTES.hrPositions, routeKey: "hrPositions", icon: Briefcase, label: "Positions", routeAny: [PERMISSIONS.hrPositionsRead, PERMISSIONS.hrPositionsManage], anyGroups: [
        [PERMISSIONS.hrEmployeesRead, PERMISSIONS.hrDepartmentsRead, PERMISSIONS.hrPayrollRead, PERMISSIONS.hrPayrollGhanaRead, PERMISSIONS.hrReportsRead],
        [PERMISSIONS.hrPositionsRead, PERMISSIONS.hrPositionsManage],
      ] },
      { to: ROUTES.hrGrades, routeKey: "hrGrades", icon: BadgeDollarSign, label: "Grades", routeAny: [PERMISSIONS.hrGradesRead, PERMISSIONS.hrGradesManage], anyGroups: [
        [PERMISSIONS.hrEmployeesRead, PERMISSIONS.hrDepartmentsRead, PERMISSIONS.hrPayrollRead, PERMISSIONS.hrPayrollGhanaRead, PERMISSIONS.hrReportsRead],
        [PERMISSIONS.hrGradesRead, PERMISSIONS.hrGradesManage],
      ] },
      { to: ROUTES.hrCompensationBands, routeKey: "hrCompensationBands", icon: Wallet, label: "Compensation Bands", routeAny: [PERMISSIONS.hrCompensationBandsRead, PERMISSIONS.hrCompensationBandsManage], anyGroups: [
        [PERMISSIONS.hrEmployeesRead, PERMISSIONS.hrDepartmentsRead, PERMISSIONS.hrPayrollRead, PERMISSIONS.hrPayrollGhanaRead, PERMISSIONS.hrReportsRead],
        [PERMISSIONS.hrCompensationBandsRead, PERMISSIONS.hrCompensationBandsManage],
      ] },
      { to: ROUTES.hrPayroll, routeKey: "hrPayroll", icon: Landmark, label: "Payroll", routeAny: [PERMISSIONS.hrPayrollRead, PERMISSIONS.hrPayrollManage, PERMISSIONS.hrPayrollPost], anyGroups: [
        [PERMISSIONS.hrEmployeesRead, PERMISSIONS.hrDepartmentsRead, PERMISSIONS.hrPayrollRead, PERMISSIONS.hrPayrollGhanaRead, PERMISSIONS.hrReportsRead],
        [PERMISSIONS.hrPayrollRead, PERMISSIONS.hrPayrollManage, PERMISSIONS.hrPayrollPost],
      ] },
      { to: ROUTES.hrPayrollGhana, routeKey: "hrPayrollGhana", icon: Landmark, label: "Ghana PAYE & Pensions", routeAny: [PERMISSIONS.hrPayrollGhanaRead, PERMISSIONS.hrPayrollGhanaManage, PERMISSIONS.hrPayrollGhanaFile], anyGroups: [
        [PERMISSIONS.hrEmployeesRead, PERMISSIONS.hrDepartmentsRead, PERMISSIONS.hrPayrollRead, PERMISSIONS.hrPayrollGhanaRead, PERMISSIONS.hrReportsRead],
        [PERMISSIONS.hrPayrollGhanaRead, PERMISSIONS.hrPayrollGhanaManage, PERMISSIONS.hrPayrollGhanaFile],
      ] },
      { to: ROUTES.hrLeave, routeKey: "hrLeave", icon: CalendarRange, label: "Leave", routeAny: [PERMISSIONS.hrLeaveRead, PERMISSIONS.hrLeaveManage], anyGroups: [
        [PERMISSIONS.hrEmployeesRead, PERMISSIONS.hrDepartmentsRead, PERMISSIONS.hrPayrollRead, PERMISSIONS.hrPayrollGhanaRead, PERMISSIONS.hrReportsRead],
        [PERMISSIONS.hrLeaveRead, PERMISSIONS.hrLeaveManage],
      ] },
      { to: ROUTES.hrBenefits, routeKey: "hrBenefits", icon: HandCoins, label: "Benefits", routeAny: [PERMISSIONS.hrBenefitsRead, PERMISSIONS.hrBenefitsManage], anyGroups: [
        [PERMISSIONS.hrEmployeesRead, PERMISSIONS.hrDepartmentsRead, PERMISSIONS.hrPayrollRead, PERMISSIONS.hrPayrollGhanaRead, PERMISSIONS.hrReportsRead],
        [PERMISSIONS.hrBenefitsRead, PERMISSIONS.hrBenefitsManage],
      ] },
      { to: ROUTES.hrStatutory, routeKey: "hrStatutory", icon: Scale, label: "Statutory", routeAny: [PERMISSIONS.hrStatutoryRead, PERMISSIONS.hrStatutoryManage], anyGroups: [
        [PERMISSIONS.hrEmployeesRead, PERMISSIONS.hrDepartmentsRead, PERMISSIONS.hrPayrollRead, PERMISSIONS.hrPayrollGhanaRead, PERMISSIONS.hrReportsRead],
        [PERMISSIONS.hrStatutoryRead, PERMISSIONS.hrStatutoryManage],
      ] },
      { to: ROUTES.hrReports, routeKey: "hrReports", icon: BarChart3, label: "HR Reports", routeAny: [PERMISSIONS.hrReportsRead], anyGroups: [
        [PERMISSIONS.hrEmployeesRead, PERMISSIONS.hrDepartmentsRead, PERMISSIONS.hrPayrollRead, PERMISSIONS.hrPayrollGhanaRead, PERMISSIONS.hrReportsRead],
        [PERMISSIONS.hrReportsRead],
      ] },
    ],
  },
  { label: "ADMIN", major: true,
    anyGroups: [
      [PERMISSIONS.settingsRead, PERMISSIONS.usersRead, PERMISSIONS.rbacRolesRead],
    ],
    items: [
      { to: ROUTES.adminOrg, routeKey: "adminOrg", icon: Building2, label: "Organization", routeAny: [PERMISSIONS.settingsRead, PERMISSIONS.settingsManage], anyGroups: [
        [PERMISSIONS.settingsRead],
      ] },
      { to: ROUTES.adminUsers, routeKey: "adminUsers", icon: Users, label: "Users", routeAny: [PERMISSIONS.usersRead, PERMISSIONS.usersManage], anyGroups: [
        [PERMISSIONS.usersRead],
      ] },
      { to: ROUTES.adminRoles, routeKey: "adminRoles", icon: UserCog, label: "Roles", routeAny: [PERMISSIONS.rbacRolesRead, PERMISSIONS.rbacRolesManage], anyGroups: [
        [PERMISSIONS.rbacRolesRead, PERMISSIONS.rbacPermissionsRead],
      ] },
      { to: ROUTES.adminPermissions, routeKey: "adminPermissions", icon: Lock, label: "Permissions", routeAny: [PERMISSIONS.rbacPermissionsRead, PERMISSIONS.rbacRolesRead], anyGroups: [
        [PERMISSIONS.rbacRolesRead, PERMISSIONS.rbacPermissionsRead],
      ] },
      { to: ROUTES.adminSettings, routeKey: "adminSettings", icon: Settings, label: "Settings", routeAny: [PERMISSIONS.settingsRead, PERMISSIONS.settingsManage], anyGroups: [
        [PERMISSIONS.settingsRead],
      ] },
      { to: ROUTES.adminDimensionSecurity, routeKey: "adminDimensionSecurity", icon: Shield, label: "Dimension Security", routeAny: [PERMISSIONS.dimensionSecurityRead, PERMISSIONS.dimensionSecurityManage], anyGroups: [
        [PERMISSIONS.dimensionSecurityRead],
      ] },
      { to: ROUTES.adminApiKeys, routeKey: "adminApiKeys", icon: KeyRound, label: "API Keys", routeAny: [PERMISSIONS.settingsRead, PERMISSIONS.settingsManage], anyGroups: [
        [PERMISSIONS.settingsRead],
      ] },
      { to: ROUTES.printingTemplates, routeKey: "printingTemplates", icon: BrushCleaning, label: "Document Templates", routeAny: [PERMISSIONS.printingTemplatesRead, PERMISSIONS.printingTemplatesManage], anyGroups: [
        [PERMISSIONS.printingTemplatesRead, PERMISSIONS.printingTemplatesManage],
      ] },
      { to: ROUTES.printingAssignments, routeKey: "printingAssignments", icon: Printer, label: "Print Assignments", routeAny: [PERMISSIONS.printingAssignmentsManage, PERMISSIONS.printingTemplatesManage], anyGroups: [
        [PERMISSIONS.printingAssignmentsManage, PERMISSIONS.printingTemplatesManage],
      ] },
    ],
  },
  { label: "UTILITIES", major: true,
    anyGroups: [
      [PERMISSIONS.settingsRead, PERMISSIONS.clientLogsRead, PERMISSIONS.releaseRead],
    ],
    items: [
      { to: ROUTES.utilitiesHealth, routeKey: "utilitiesHealth", icon: Activity, label: "Health", routeAny: [PERMISSIONS.settingsRead], anyGroups: [
        [PERMISSIONS.settingsRead],
      ] },
      { to: ROUTES.utilitiesErrors, routeKey: "utilitiesErrors", icon: AlertCircle, label: "Errors", routeAny: [PERMISSIONS.settingsRead], anyGroups: [
        [PERMISSIONS.settingsRead],
      ] },
      { to: ROUTES.utilitiesClientLogs, routeKey: "utilitiesClientLogs", icon: ScrollText, label: "Client Logs", routeAny: [PERMISSIONS.clientLogsRead], anyGroups: [
        [PERMISSIONS.clientLogsRead],
      ] },
      { to: ROUTES.utilitiesI18n, routeKey: "utilitiesI18n", icon: Globe, label: "i18n", routeAny: [PERMISSIONS.i18nRead], anyGroups: [
        [PERMISSIONS.i18nRead],
      ] },
      { to: ROUTES.utilitiesA11y, routeKey: "utilitiesA11y", icon: Eye, label: "A11y", routeAny: [PERMISSIONS.a11yRead], anyGroups: [
        [PERMISSIONS.a11yRead],
      ] },
      { to: ROUTES.utilitiesRelease, routeKey: "utilitiesRelease", icon: FlaskConical, label: "Release", routeAny: [PERMISSIONS.releaseRead], anyGroups: [
        [PERMISSIONS.releaseRead],
      ] },
    ],
  },
];

export function canSeeNavItem(item, hasAny, can, groupAnyGroups = []) {
  const navigationOk = [...groupAnyGroups, ...(item.anyGroups || [])].every((group) => hasAny(group));
  const routeAnyOk = !item.routeAny?.length || hasAny(item.routeAny);
  const routeAllOk = (item.routeAll || []).every((permission) => can(permission));
  return navigationOk && routeAnyOk && routeAllOk;
}
