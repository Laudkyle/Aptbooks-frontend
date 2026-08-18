import { lazy } from "react";

export const Login = lazy(() => import("../../features/auth/pages/Login.jsx"));
export const Register = lazy(() => import("../../features/auth/pages/Register.jsx"));
export const ForgotPassword = lazy(() =>
  import("../../features/auth/pages/ForgotPassword.jsx")
);
export const ResetPassword = lazy(() =>
  import("../../features/auth/pages/ResetPassword.jsx")
);

export const GlobalSearch = lazy(() =>
  import("../../features/search/pages/GlobalSearch.jsx")
);
export const NotificationCenter = lazy(() =>
  import("../../features/notifications/pages/NotificationCenter.jsx")
);
export const ApprovalQueue = lazy(() =>
  import("../../features/workflow/approvals/pages/ApprovalQueue.jsx")
);

export const OrganizationSettings = lazy(() =>
  import(
    "../../features/foundation/organizations/pages/OrganizationSettings.jsx"
  )
);
export const UserList = lazy(() =>
  import("../../features/foundation/users/pages/UserList.jsx")
);
export const UserDetail = lazy(() =>
  import("../../features/foundation/users/pages/UserDetail.jsx")
);
export const RoleList = lazy(() =>
  import("../../features/foundation/roles/pages/RoleList.jsx")
);
export const RoleDetail = lazy(() =>
  import("../../features/foundation/roles/pages/RoleDetail.jsx")
);
export const PermissionMatrix = lazy(() =>
  import("../../features/foundation/permissions/pages/PermissionMatrix.jsx")
);
export const SystemSettings = lazy(() =>
  import("../../features/foundation/settings/pages/SystemSettings.jsx")
);
export const DimensionRules = lazy(() =>
  import("../../features/foundation/dimensionSecurity/pages/DimensionRules.jsx")
);
export const ApiKeyList = lazy(() =>
  import("../../features/foundation/apiKeys/pages/ApiKeyList.jsx")
);

export const SystemHealth = lazy(() =>
  import("../../features/utilities/pages/SystemHealth.jsx")
);
export const ErrorLogs = lazy(() =>
  import("../../features/utilities/pages/ErrorLogs.jsx")
);
export const ClientLogs = lazy(() =>
  import("../../features/utilities/pages/ClientLogs.jsx")
);
export const I18nAdmin = lazy(() =>
  import("../../features/utilities/pages/I18nAdmin.jsx")
);
export const A11yChecks = lazy(() =>
  import("../../features/utilities/pages/A11yChecks.jsx")
);
export const ReleaseInfo = lazy(() =>
  import("../../features/utilities/pages/ReleaseInfo.jsx")
);

// Phase 8 — Banking
export const BankingOverview = lazy(() =>
  import("../../features/banking/pages/BankingOverview.jsx")
);
export const BankAccountsPage = lazy(() =>
  import("../../features/banking/pages/BankAccountsPage.jsx")
);
export const BankStatementsPage = lazy(() =>
  import("../../features/banking/pages/BankStatementsPage.jsx")
);
export const BankStatementDetailPage = lazy(() =>
  import("../../features/banking/pages/BankStatementDetailPage.jsx")
);
export const BankMatchingRulesPage = lazy(() =>
  import("../../features/banking/pages/MatchingRulesPage.jsx")
);
export const BankCashbookPage = lazy(() =>
  import("../../features/banking/pages/CashbookPage.jsx")
);
export const BankReconciliationsPage = lazy(() =>
  import("../../features/banking/pages/ReconciliationsPage.jsx")
);
export const TreasuryOverview = lazy(() =>
  import("../../features/banking/pages/TreasuryOverview.jsx")
);
export const TreasuryDashboardPage = lazy(() =>
  import("../../features/banking/pages/TreasuryDashboardPage.jsx")
);
export const PaymentRunsPage = lazy(() =>
  import("../../features/banking/pages/PaymentRunsPage.jsx")
);
export const PaymentRunDetailPage = lazy(() =>
  import("../../features/banking/pages/PaymentRunDetailPage.jsx")
);
export const BankTransfersPage = lazy(() =>
  import("../../features/banking/pages/BankTransfersPage.jsx")
);
export const BankTransferDetailPage = lazy(() =>
  import("../../features/banking/pages/BankTransferDetailPage.jsx")
);
export const ApprovalBatchesPage = lazy(() =>
  import("../../features/banking/pages/ApprovalBatchesPage.jsx")
);
export const ApprovalBatchDetailPage = lazy(() =>
  import("../../features/banking/pages/ApprovalBatchDetailPage.jsx")
);
export const ChequesPage = lazy(() =>
  import("../../features/banking/pages/ChequesPage.jsx")
);
export const CashForecastPage = lazy(() =>
  import("../../features/banking/pages/CashForecastPage.jsx")
);

// Phase 9 — Automation
export const AutomationOverview = lazy(() =>
  import("../../features/automation/pages/Overview.jsx")
);
export const RecurringTransactionsPage = lazy(() =>
  import("../../features/automation/pages/RecurringTransactionsPage.jsx")
);
export const AutoReconciliationPage = lazy(() =>
  import("../../features/automation/pages/AutoReconciliationPage.jsx")
);
export const DocumentMatchingPage = lazy(() =>
  import("../../features/automation/pages/DocumentMatchingPage.jsx")
);
export const AIClassificationPage = lazy(() =>
  import("../../features/automation/pages/AIClassificationPage.jsx")
);
export const SmartNotificationsPage = lazy(() =>
  import("../../features/automation/pages/SmartNotificationsPage.jsx")
);

// Phase 10 — Printing
export const TemplatesPage = lazy(() =>
  import("../../features/printing/pages/TemplatesPage.jsx")
);
export const PrintAssignmentsPage = lazy(() =>
  import("../../features/printing/pages/AssignmentsPage.jsx")
);
export const PrintPreviewPage = lazy(() =>
  import("../../features/printing/pages/PreviewPage.jsx")
);

// Phase 8 — Compliance
export const ComplianceOverview = lazy(() =>
  import("../../features/compliance/pages/ComplianceOverview.jsx")
);
export const IFRS16LeasesPage = lazy(() =>
  import("../../features/compliance/pages/IFRS16LeasesPage.jsx")
);
export const IFRS16LeaseDetailPage = lazy(() =>
  import("../../features/compliance/pages/IFRS16LeaseDetailPage.jsx")
);
export const IFRS15ContractsPage = lazy(() =>
  import("../../features/compliance/pages/IFRS15ContractsPage.jsx")
);
export const IFRS15ContractDetailPage = lazy(() =>
  import("../../features/compliance/pages/IFRS15ContractDetailPage.jsx")
);
export const IFRS9EclPage = lazy(() =>
  import("../../features/compliance/pages/IFRS9ECLPage.jsx")
);
export const IAS12TaxPage = lazy(() =>
  import("../../features/compliance/pages/IAS12TaxPage.jsx")
);

// Phase 8 — Workflow Documents
export const DocumentsLibraryPage = lazy(() =>
  import("../../features/workflow/pages/DocumentsLibraryPage.jsx")
);
export const DocumentDetailPage = lazy(() =>
  import("../../features/workflow/pages/DocumentDetailPage.jsx")
);
export const DocumentTypesPage = lazy(() =>
  import("../../features/workflow/pages/DocumentTypesPage.jsx")
);
export const ApprovalLevelsPage = lazy(() =>
  import("../../features/workflow/pages/ApprovalLevelsPage.jsx")
);
export const DocumentCreatePage = lazy(() =>
  import("../../features/workflow/pages/DocumentCreatePage.jsx")
);

// Phase 4 — Accounting
export const AccountList = lazy(() =>
  import("../../features/accounting/chartOfAccounts/pages/AccountList.jsx")
);
export const AccountCreate = lazy(() =>
  import("../../features/accounting/chartOfAccounts/pages/AccountCreate.jsx")
);
export const AccountDetail = lazy(() =>
  import("../../features/accounting/chartOfAccounts/pages/AccountDetail.jsx")
);

export const PeriodList = lazy(() =>
  import("../../features/accounting/periods/pages/PeriodList.jsx")
);
export const PeriodClose = lazy(() =>
  import("../../features/accounting/periods/pages/PeriodClose.jsx")
);

export const JournalList = lazy(() =>
  import("../../features/accounting/journals/pages/JournalList.jsx")
);
export const JournalCreate = lazy(() =>
  import("../../features/accounting/journals/pages/JournalCreate.jsx")
);
export const JournalDetail = lazy(() =>
  import("../../features/accounting/journals/pages/JournalDetail.jsx")
);

export const TrialBalance = lazy(() =>
  import("../../features/accounting/balances/pages/TrialBalance.jsx")
);
export const BalanceByAccount = lazy(() =>
  import("../../features/accounting/balances/pages/BalanceByAccount.jsx")
);

export const PnL = lazy(() =>
  import("../../features/accounting/statements/pages/PnL.jsx")
);
export const BalanceSheet = lazy(() =>
  import("../../features/accounting/statements/pages/BalanceSheet.jsx")
);
export const Cashflow = lazy(() =>
  import("../../features/accounting/statements/pages/Cashflow.jsx")
);
export const ChangesInEquity = lazy(() =>
  import("../../features/accounting/statements/pages/ChangesInEquity.jsx")
);

export const ExportsHub = lazy(() =>
  import("../../features/accounting/exports/pages/ExportsHub.jsx")
);
export const ImportsHub = lazy(() =>
  import("../../features/accounting/imports/pages/ImportsHub.jsx")
);

export const FxRates = lazy(() =>
  import("../../features/accounting/fx/pages/FxRates.jsx")
);
export const TaxAdmin = lazy(() =>
  import("../../features/accounting/tax/pages/TaxAdmin.jsx")
);
export const GhanaComplianceOverview = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/GhanaComplianceOverview.jsx")
);
export const GhanaTaxLedger = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/TaxLedger.jsx")
);
export const GhanaTaxCatalogProfiles = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/TaxCatalogProfiles.jsx")
);
export const GhanaPartnerTaxProfiles = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/PartnerTaxProfiles.jsx")
);
export const GhanaVatOverview = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/GhanaVatOverview.jsx")
);
export const GhanaVatReturn = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/GhanaVatReturn.jsx")
);
export const GhanaVatApportionment = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/GhanaVatApportionment.jsx")
);
export const GhanaImportedServices = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/GhanaImportedServices.jsx")
);
export const GhanaImportedServiceDetail = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/GhanaImportedServiceDetail.jsx")
);
export const GhanaVatReconciliation = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/GhanaVatReconciliation.jsx")
);
export const GhanaWithholdingOverview = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/GhanaWithholdingOverview.jsx")
);
export const GhanaWithholdingEvents = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/GhanaWithholdingEvents.jsx")
);
export const GhanaWithholdingCertificates = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/GhanaWithholdingCertificates.jsx")
);
export const GhanaWithholdingReturns = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/GhanaWithholdingReturns.jsx")
);
export const GhanaWithholdingReturnDetail = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/GhanaWithholdingReturnDetail.jsx")
);
export const GhanaWithholdingRemittances = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/GhanaWithholdingRemittances.jsx")
);
export const GhanaWithholdingReconciliation = lazy(() =>
  import("../../features/accounting/tax/pages/ghana/GhanaWithholdingReconciliation.jsx")
);
export const GhanaEvatOverview = lazy(() => import("../../features/accounting/tax/pages/ghana/advanced/GhanaEvatOverview.jsx"));
export const GhanaEvatDocuments = lazy(() => import("../../features/accounting/tax/pages/ghana/advanced/GhanaEvatDocuments.jsx"));
export const GhanaEvatDocumentDetail = lazy(() => import("../../features/accounting/tax/pages/ghana/advanced/GhanaEvatDocumentDetail.jsx"));
export const GhanaEvatQueue = lazy(() => import("../../features/accounting/tax/pages/ghana/advanced/GhanaEvatQueue.jsx"));
export const GhanaEvatDevices = lazy(() => import("../../features/accounting/tax/pages/ghana/advanced/GhanaEvatDevices.jsx"));
export const GhanaEvatLogs = lazy(() => import("../../features/accounting/tax/pages/ghana/advanced/GhanaEvatLogs.jsx"));
export const GhanaEvatSettings = lazy(() => import("../../features/accounting/tax/pages/ghana/advanced/GhanaEvatSettings.jsx"));
export const GhanaCit = lazy(() => import("../../features/accounting/tax/pages/ghana/advanced/GhanaCit.jsx"));
export const GhanaCitComputation = lazy(() => import("../../features/accounting/tax/pages/ghana/advanced/GhanaCitComputation.jsx"));
export const GhanaCapitalAllowances = lazy(() => import("../../features/accounting/tax/pages/ghana/advanced/GhanaCapitalAllowances.jsx"));
export const GhanaIndustryProfiles = lazy(() => import("../../features/accounting/tax/pages/ghana/advanced/GhanaIndustryProfiles.jsx"));
export const WithholdingWorkspace = lazy(() =>
  import("../../features/accounting/tax/pages/WithholdingWorkspace.jsx")
);
export const WithholdingOpenItemDetail = lazy(() =>
  import("../../features/accounting/tax/pages/WithholdingOpenItemDetail.jsx")
);
export const WithholdingRemittanceCreate = lazy(() =>
  import("../../features/accounting/tax/pages/WithholdingRemittanceCreate.jsx")
);
export const WithholdingRemittanceDetail = lazy(() =>
  import("../../features/accounting/tax/pages/WithholdingRemittanceDetail.jsx")
);
export const WithholdingCertificateCreate = lazy(() =>
  import("../../features/accounting/tax/pages/WithholdingCertificateCreate.jsx")
);
export const WithholdingCertificateDetail = lazy(() =>
  import("../../features/accounting/tax/pages/WithholdingCertificateDetail.jsx")
);

export const AccrualsHub = lazy(() =>
  import("../../features/accounting/accruals/pages/AccrualsHub.jsx")
);
export const AccrualCreate = lazy(() =>
  import("../../features/accounting/accruals/pages/AccrualCreate.jsx")
);

export const Reconciliation = lazy(() =>
  import("../../features/accounting/reconciliation/pages/Reconciliation.jsx")
);

// Phase 5 — Business / Transactions / AR Ops / Reporting
export const Customers = lazy(() =>
  import("../../features/business/pages/Customers.jsx")
);
export const Vendors = lazy(() => import("../../features/business/pages/Vendors.jsx"));
export const PartnerDetail = lazy(() =>
  import("../../features/business/pages/PartnerDetail.jsx")
);
export const PartnerCreate = lazy(() =>
  import("../../features/business/pages/PartnerCreate.jsx")
);
export const PaymentConfig = lazy(() =>
  import("../../features/business/pages/PaymentConfig.jsx")
);

export const InvoiceList = lazy(() =>
  import("../../features/transactions/pages/InvoiceList.jsx")
);
export const InvoiceCreate = lazy(() =>
  import("../../features/transactions/pages/InvoiceCreate.jsx")
);
export const InvoiceDetail = lazy(() =>
  import("../../features/transactions/pages/InvoiceDetail.jsx")
);

export const BillList = lazy(() =>
  import("../../features/transactions/pages/BillList.jsx")
);
export const BillCreate = lazy(() =>
  import("../../features/transactions/pages/BillCreate.jsx")
);
export const BillDetail = lazy(() =>
  import("../../features/transactions/pages/BillDetail.jsx")
);

export const CustomerReceiptList = lazy(() =>
  import("../../features/transactions/pages/CustomerReceiptList.jsx")
);
export const CustomerReceiptCreate = lazy(() =>
  import("../../features/transactions/pages/CustomerReceiptCreate.jsx")
);
export const CustomerReceiptDetail = lazy(() =>
  import("../../features/transactions/pages/CustomerReceiptDetail.jsx")
);

export const VendorPaymentList = lazy(() =>
  import("../../features/transactions/pages/VendorPaymentList.jsx")
);
export const VendorPaymentCreate = lazy(() =>
  import("../../features/transactions/pages/VendorPaymentCreate.jsx")
);
export const VendorPaymentDetail = lazy(() =>
  import("../../features/transactions/pages/VendorPaymentDetail.jsx")
);

export const CreditNoteList = lazy(() =>
  import("../../features/transactions/pages/CreditNoteList.jsx")
);
export const CreditNoteCreate = lazy(() =>
  import("../../features/transactions/pages/CreditNoteCreate.jsx")
);
export const CreditNoteDetail = lazy(() =>
  import("../../features/transactions/pages/CreditNoteDetail.jsx")
);

export const DebitNoteList = lazy(() =>
  import("../../features/transactions/pages/DebitNoteList.jsx")
);
export const DebitNoteCreate = lazy(() =>
  import("../../features/transactions/pages/DebitNoteCreate.jsx")
);
export const DebitNoteDetail = lazy(() =>
  import("../../features/transactions/pages/DebitNoteDetail.jsx")
);

export const QuotationList = lazy(() => import('../../features/transactions/pages/QuotationList.jsx'));
export const QuotationCreate = lazy(() => import('../../features/transactions/pages/QuotationCreate.jsx'));
export const QuotationDetail = lazy(() => import('../../features/transactions/pages/QuotationDetail.jsx'));
export const SalesOrderList = lazy(() => import('../../features/transactions/pages/SalesOrderList.jsx'));
export const SalesOrderCreate = lazy(() => import('../../features/transactions/pages/SalesOrderCreate.jsx'));
export const SalesOrderDetail = lazy(() => import('../../features/transactions/pages/SalesOrderDetail.jsx'));
export const PurchaseRequisitionList = lazy(() => import('../../features/transactions/pages/PurchaseRequisitionList.jsx'));
export const PurchaseRequisitionCreate = lazy(() => import('../../features/transactions/pages/PurchaseRequisitionCreate.jsx'));
export const PurchaseRequisitionDetail = lazy(() => import('../../features/transactions/pages/PurchaseRequisitionDetail.jsx'));
export const PurchaseOrderList = lazy(() => import('../../features/transactions/pages/PurchaseOrderList.jsx'));
export const PurchaseOrderCreate = lazy(() => import('../../features/transactions/pages/PurchaseOrderCreate.jsx'));
export const PurchaseOrderDetail = lazy(() => import('../../features/transactions/pages/PurchaseOrderDetail.jsx'));
export const GoodsReceiptList = lazy(() => import('../../features/transactions/pages/GoodsReceiptList.jsx'));
export const GoodsReceiptCreate = lazy(() => import('../../features/transactions/pages/GoodsReceiptCreate.jsx'));
export const GoodsReceiptDetail = lazy(() => import('../../features/transactions/pages/GoodsReceiptDetail.jsx'));
export const ExpenseList = lazy(() => import('../../features/transactions/pages/ExpenseList.jsx'));
export const ExpenseCreate = lazy(() => import('../../features/transactions/pages/ExpenseCreate.jsx'));
export const ExpenseDetail = lazy(() => import('../../features/transactions/pages/ExpenseDetail.jsx'));
export const PettyCashList = lazy(() => import('../../features/transactions/pages/PettyCashList.jsx'));
export const PettyCashCreate = lazy(() => import('../../features/transactions/pages/PettyCashCreate.jsx'));
export const PettyCashDetail = lazy(() => import('../../features/transactions/pages/PettyCashDetail.jsx'));
export const AdvanceList = lazy(() => import('../../features/transactions/pages/AdvanceList.jsx'));
export const AdvanceCreate = lazy(() => import('../../features/transactions/pages/AdvanceCreate.jsx'));
export const AdvanceDetail = lazy(() => import('../../features/transactions/pages/AdvanceDetail.jsx'));
export const ReturnList = lazy(() => import('../../features/transactions/pages/ReturnList.jsx'));
export const ReturnCreate = lazy(() => import('../../features/transactions/pages/ReturnCreate.jsx'));
export const ReturnDetail = lazy(() => import('../../features/transactions/pages/ReturnDetail.jsx'));
export const RefundList = lazy(() => import('../../features/transactions/pages/RefundList.jsx'));
export const RefundCreate = lazy(() => import('../../features/transactions/pages/RefundCreate.jsx'));
export const RefundDetail = lazy(() => import('../../features/transactions/pages/RefundDetail.jsx'));

export const CollectionsHub = lazy(() =>
  import("../../features/ar/pages/CollectionsHub.jsx")
);
export const Disputes = lazy(() => import("../../features/ar/pages/Disputes.jsx"));
export const Writeoffs = lazy(() => import("../../features/ar/pages/Writeoffs.jsx"));
export const PaymentPlans = lazy(() =>
  import("../../features/ar/pages/PaymentPlans.jsx")
);

export const ReportArAging = lazy(() =>
  import("../../features/reporting/pages/ReportArAging.jsx")
);
export const ReportArOpenItems = lazy(() =>
  import("../../features/reporting/pages/ReportArOpenItems.jsx")
);
export const ReportArCustomerStatement = lazy(() =>
  import("../../features/reporting/pages/ReportArCustomerStatement.jsx")
);
export const ReportApAging = lazy(() =>
  import("../../features/reporting/pages/ReportApAging.jsx")
);
export const ReportApOpenItems = lazy(() =>
  import("../../features/reporting/pages/ReportApOpenItems.jsx")
);
export const ReportApVendorStatement = lazy(() =>
  import("../../features/reporting/pages/ReportApVendorStatement.jsx")
);
export const ReportTax = lazy(() =>
  import("../../features/reporting/pages/ReportTax.jsx")
);

// Phase 6 — Assets + Inventory
export const AssetRegister = lazy(() =>
  import("../../features/assets/pages/AssetRegister.jsx")
);
export const AssetCategories = lazy(() =>
  import("../../features/assets/pages/AssetCategories.jsx")
);
export const AssetDetail = lazy(() =>
  import("../../features/assets/pages/AssetDetail.jsx")
);
export const AssetDepreciation = lazy(() =>
  import("../../features/assets/pages/AssetDepreciation.jsx")
);
export const DepreciationRuns = lazy(() =>
  import("../../features/assets/pages/DepreciationRuns.jsx")
);
export const AssetRegisterNew = lazy(() =>
  import("../../features/assets/pages/FixedAssetCreate.jsx")
);
export const AssetCategoryNew = lazy(() =>
  import("../../features/assets/pages/AssetCategoryCreate.jsx")
);
export const AssetCategoryEdit = lazy(() =>
  import("../../features/assets/pages/AssetCategoryEdit.jsx")
);
export const AssetAcquire = lazy(() =>
  import("../../features/assets/pages/AssetAcquire.jsx")
);
export const AssetDispose = lazy(() =>
  import("../../features/assets/pages/AssetDispose.jsx")
);
export const AssetTransfer = lazy(() =>
  import("../../features/assets/pages/AssetTransfer.jsx")
);
export const AssetRevalue = lazy(() =>
  import("../../features/assets/pages/AssetRevalue.jsx")
);
export const AssetImpair = lazy(() =>
  import("../../features/assets/pages/AssetImpair.jsx")
);
export const DepreciationScheduleNew = lazy(() =>
  import("../../features/assets/pages/DepreciationScheduleCreate.jsx")
);

export const InventoryCategoryNew = lazy(() =>
  import("../../features/inventory/pages/CategoryCreate.jsx")
);
export const InventoryUnitNew = lazy(() =>
  import("../../features/inventory/pages/UnitCreate.jsx")
);
export const InventoryItemNew = lazy(() =>
  import("../../features/inventory/pages/ItemCreate.jsx")
);
export const InventoryWarehouseNew = lazy(() =>
  import("../../features/inventory/pages/WarehouseCreate.jsx")
);
export const InventoryTransactionNew = lazy(() =>
  import("../../features/inventory/pages/TransactionCreate.jsx")
);
export const InventoryStockCountNew = lazy(() =>
  import("../../features/inventory/pages/StockCountCreate.jsx")
);
export const InventoryItems = lazy(() =>
  import("../../features/inventory/pages/Items.jsx")
);
export const InventoryWarehouses = lazy(() =>
  import("../../features/inventory/pages/Warehouses.jsx")
);
export const InventoryCategories = lazy(() =>
  import("../../features/inventory/pages/Categories.jsx")
);
export const InventoryUnits = lazy(() =>
  import("../../features/inventory/pages/Units.jsx")
);
export const InventoryTransactions = lazy(() =>
  import("../../features/inventory/pages/Transactions.jsx")
);
export const InventoryTransactionDetail = lazy(() =>
  import("../../features/inventory/pages/TransactionDetail.jsx")
);
export const InventoryStockCounts = lazy(() =>
  import("../../features/inventory/pages/StockCounts.jsx")
);
export const InventoryStockCountDetail = lazy(() =>
  import("../../features/inventory/pages/StockCountDetail.jsx")
);
export const InventoryReports = lazy(() =>
  import("../../features/inventory/pages/Reports.jsx")
);
export const InventoryBins = lazy(() =>
  import("../../features/inventory/pages/Bins.jsx")
);
export const InventoryBinNew = lazy(() =>
  import("../../features/inventory/pages/BinCreate.jsx")
);
export const InventoryReservations = lazy(() =>
  import("../../features/inventory/pages/Reservations.jsx")
);
export const InventoryReservationNew = lazy(() =>
  import("../../features/inventory/pages/ReservationCreate.jsx")
);
export const InventoryTransfers = lazy(() =>
  import("../../features/inventory/pages/Transfers.jsx")
);
export const InventoryTransferNew = lazy(() =>
  import("../../features/inventory/pages/TransferCreate.jsx")
);
export const InventoryTransferDetail = lazy(() =>
  import("../../features/inventory/pages/TransferDetail.jsx")
);
export const InventoryTraceability = lazy(() =>
  import("../../features/inventory/pages/Traceability.jsx")
);
export const InventoryReorder = lazy(() =>
  import("../../features/inventory/pages/Reorder.jsx")
);


// Phase 12 — Commerce / POS
export const POSRegister = lazy(() => import("../../features/commerce/pages/POSRegister.jsx"));
export const POSSetup = lazy(() => import("../../features/commerce/pages/POSSetup.jsx"));
export const CommerceOrders = lazy(() => import("../../features/commerce/pages/CommerceOrders.jsx"));
export const CommerceReturns = lazy(() => import("../../features/commerce/pages/CommerceReturns.jsx"));
export const CommercePromotions = lazy(() => import("../../features/commerce/pages/CommercePromotions.jsx"));
export const CommerceReports = lazy(() => import("../../features/commerce/pages/CommerceReports.jsx"));

// Phase 7 — Reporting & Planning
export const Centers = lazy(() =>
  import("../../features/reporting/pages/Centers.jsx")
);
export const Projects = lazy(() =>
  import("../../features/reporting/pages/Projects.jsx")
);
export const ProjectDetail = lazy(() =>
  import("../../features/reporting/pages/ProjectDetail.jsx")
);
export const Budgets = lazy(() =>
  import("../../features/reporting/pages/Budgets.jsx")
);
export const BudgetDetail = lazy(() =>
  import("../../features/reporting/pages/BudgetDetail.jsx")
);
export const Forecasts = lazy(() =>
  import("../../features/reporting/pages/Forecasts.jsx")
);
export const ForecastDetail = lazy(() =>
  import("../../features/reporting/pages/ForecastDetail.jsx")
);
export const Allocations = lazy(() =>
  import("../../features/reporting/pages/Allocations.jsx")
);
export const KPIs = lazy(() => import("../../features/reporting/pages/KPIs.jsx"));
export const Dashboards = lazy(() =>
  import("../../features/reporting/pages/Dashboards.jsx")
);
export const SavedReports = lazy(() =>
  import("../../features/reporting/pages/SavedReports.jsx")
);
export const ManagementReports = lazy(() =>
  import("../../features/reporting/pages/ManagementReports.jsx")
);


// Phase 11 — HR
export const HrOverview = lazy(() => import("../../features/hr/pages/HrOverview.jsx"));
export const HrEmployees = lazy(() => import("../../features/hr/pages/Employees.jsx"));
export const HrDepartments = lazy(() => import("../../features/hr/pages/Departments.jsx"));
export const HrGrades = lazy(() => import("../../features/hr/pages/Grades.jsx"));
export const HrPositions = lazy(() => import("../../features/hr/pages/Positions.jsx"));
export const HrCompensationBands = lazy(() => import("../../features/hr/pages/CompensationBands.jsx"));
export const HrPayroll = lazy(() => import("../../features/hr/pages/Payroll.jsx"));
export const GhanaPayrollOverview = lazy(() => import("../../features/hr/pages/ghana/GhanaPayrollOverview.jsx"));
export const GhanaPayeReturns = lazy(() => import("../../features/hr/pages/ghana/GhanaPayeReturns.jsx"));
export const GhanaPayeReturnDetail = lazy(() => import("../../features/hr/pages/ghana/GhanaPayeReturnDetail.jsx"));
export const GhanaPensionSchedule = lazy(() => import("../../features/hr/pages/ghana/GhanaPensionSchedule.jsx"));
export const GhanaDisengagedSchedule = lazy(() => import("../../features/hr/pages/ghana/GhanaDisengagedSchedule.jsx"));
export const GhanaPayrollRemittances = lazy(() => import("../../features/hr/pages/ghana/GhanaPayrollRemittances.jsx"));
export const HrLeave = lazy(() => import("../../features/hr/pages/Leave.jsx"));
export const HrBenefits = lazy(() => import("../../features/hr/pages/Benefits.jsx"));
export const HrStatutory = lazy(() => import("../../features/hr/pages/Statutory.jsx"));
export const HrReports = lazy(() => import("../../features/hr/pages/Reports.jsx"));

export function Loader() {
  return <div className="p-4 text-sm text-slate-600">Loading…</div>;
}
