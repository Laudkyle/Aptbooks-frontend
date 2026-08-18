import React, { Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute, GuestRoute, PermissionGate } from "./route-guards.jsx";
import { ROUTES } from "../constants/routes.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { AppShell } from "../../shared/components/layout/AppShell.jsx";
import {
  Login, Register, ForgotPassword, ResetPassword, GlobalSearch, NotificationCenter, ApprovalQueue, OrganizationSettings,
  UserList, UserDetail, RoleList, RoleDetail, PermissionMatrix, SystemSettings, DimensionRules, ApiKeyList,
  SystemHealth, ErrorLogs, ClientLogs, I18nAdmin, A11yChecks, ReleaseInfo, BankingOverview, BankAccountsPage,
  BankStatementsPage, BankStatementDetailPage, BankMatchingRulesPage, BankCashbookPage, BankReconciliationsPage, TreasuryOverview, TreasuryDashboardPage, PaymentRunsPage,
  PaymentRunDetailPage, BankTransfersPage, BankTransferDetailPage, ApprovalBatchesPage, ApprovalBatchDetailPage, ChequesPage, CashForecastPage, AutomationOverview,
  RecurringTransactionsPage, AutoReconciliationPage, DocumentMatchingPage, AIClassificationPage, SmartNotificationsPage, TemplatesPage, PrintAssignmentsPage, PrintPreviewPage,
  ComplianceOverview, IFRS16LeasesPage, IFRS16LeaseDetailPage, IFRS15ContractsPage, IFRS15ContractDetailPage, IFRS9EclPage, IAS12TaxPage, DocumentsLibraryPage,
  DocumentDetailPage, DocumentTypesPage, ApprovalLevelsPage, DocumentCreatePage, AccountList, AccountCreate, AccountDetail, PeriodList,
  PeriodClose, JournalList, JournalCreate, JournalDetail, TrialBalance, BalanceByAccount, PnL, BalanceSheet,
  Cashflow, ChangesInEquity, ExportsHub, ImportsHub, FxRates, TaxAdmin, GhanaComplianceOverview, GhanaTaxLedger,
  GhanaTaxCatalogProfiles, GhanaPartnerTaxProfiles, GhanaVatOverview, GhanaVatReturn, GhanaVatApportionment, GhanaImportedServices, GhanaImportedServiceDetail, GhanaVatReconciliation,
  GhanaWithholdingOverview, GhanaWithholdingEvents, GhanaWithholdingCertificates, GhanaWithholdingReturns, GhanaWithholdingReturnDetail, GhanaWithholdingRemittances, GhanaWithholdingReconciliation, GhanaEvatOverview,
  GhanaEvatDocuments, GhanaEvatDocumentDetail, GhanaEvatQueue, GhanaEvatDevices, GhanaEvatLogs, GhanaEvatSettings, GhanaCit, GhanaCitComputation,
  GhanaCapitalAllowances, GhanaIndustryProfiles, WithholdingWorkspace, WithholdingOpenItemDetail, WithholdingRemittanceCreate, WithholdingRemittanceDetail, WithholdingCertificateCreate, WithholdingCertificateDetail,
  AccrualsHub, AccrualCreate, Reconciliation, Customers, Vendors, PartnerDetail, PartnerCreate, PaymentConfig,
  InvoiceList, InvoiceCreate, InvoiceDetail, BillList, BillCreate, BillDetail, CustomerReceiptList, CustomerReceiptCreate,
  CustomerReceiptDetail, VendorPaymentList, VendorPaymentCreate, VendorPaymentDetail, CreditNoteList, CreditNoteCreate, CreditNoteDetail, DebitNoteList,
  DebitNoteCreate, DebitNoteDetail, QuotationList, QuotationCreate, QuotationDetail, SalesOrderList, SalesOrderCreate, SalesOrderDetail,
  PurchaseRequisitionList, PurchaseRequisitionCreate, PurchaseRequisitionDetail, PurchaseOrderList, PurchaseOrderCreate, PurchaseOrderDetail, GoodsReceiptList, GoodsReceiptCreate,
  GoodsReceiptDetail, ExpenseList, ExpenseCreate, ExpenseDetail, PettyCashList, PettyCashCreate, PettyCashDetail, AdvanceList,
  AdvanceCreate, AdvanceDetail, ReturnList, ReturnCreate, ReturnDetail, RefundList, RefundCreate, RefundDetail,
  CollectionsHub, Disputes, Writeoffs, PaymentPlans, ReportArAging, ReportArOpenItems, ReportArCustomerStatement, ReportApAging,
  ReportApOpenItems, ReportApVendorStatement, ReportTax, AssetRegister, AssetCategories, AssetDetail, AssetDepreciation, DepreciationRuns,
  AssetRegisterNew, AssetCategoryNew, AssetCategoryEdit, AssetAcquire, AssetDispose, AssetTransfer, AssetRevalue, AssetImpair,
  DepreciationScheduleNew, InventoryCategoryNew, InventoryUnitNew, InventoryItemNew, InventoryWarehouseNew, InventoryTransactionNew, InventoryStockCountNew, InventoryItems,
  InventoryWarehouses, InventoryCategories, InventoryUnits, InventoryTransactions, InventoryTransactionDetail, InventoryStockCounts, InventoryStockCountDetail, InventoryReports,
  InventoryBins, InventoryBinNew, InventoryReservations, InventoryReservationNew, InventoryTransfers, InventoryTransferNew, InventoryTransferDetail, InventoryTraceability,
  InventoryReorder, POSRegister, POSSetup, CommerceOrders, CommerceReturns, CommercePromotions, CommerceReports, Centers,
  Projects, ProjectDetail, Budgets, BudgetDetail, Forecasts, ForecastDetail, Allocations, KPIs,
  Dashboards, SavedReports, ManagementReports, HrOverview, HrEmployees, HrDepartments, HrGrades, HrPositions,
  HrCompensationBands, HrPayroll, GhanaPayrollOverview, GhanaPayeReturns, GhanaPayeReturnDetail, GhanaPensionSchedule, GhanaDisengagedSchedule, GhanaPayrollRemittances,
  HrLeave, HrBenefits, HrStatutory, HrReports, Loader,
} from "./lazy-pages.jsx";

import Dashboard from "../../pages/Dashboard.jsx";
import Me from "../../pages/Me.jsx";
import NotFound from "../../pages/NotFound.jsx";
import Forbidden from "../../pages/Forbidden.jsx";

function Lazy({ children }) {
  return <Suspense fallback={<Loader />}>{children}</Suspense>;
}

function RequirePermission({ any, all, children }) {
  return (
    <PermissionGate any={any} all={all} fallback={<Forbidden />}>
      {children}
    </PermissionGate>
  );
}

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      {
        path: ROUTES.login,
        element: (
          <Lazy>
            <Login />
          </Lazy>
        ),
      },
      {
        path: ROUTES.register,
        element: (
          <Lazy>
            <Register />
          </Lazy>
        ),
      },
      {
        path: ROUTES.forgotPassword,
        element: (
          <Lazy>
            <ForgotPassword />
          </Lazy>
        ),
      },
      {
        path: ROUTES.resetPassword,
        element: (
          <Lazy>
            <ResetPassword />
          </Lazy>
        ),
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: ROUTES.dashboard, element: <Dashboard /> },
          { path: ROUTES.me, element: <Me /> },

          {
            path: ROUTES.search,
            element: (
              <Lazy>
                <GlobalSearch />
              </Lazy>
            ),
          },
          {
            path: ROUTES.notifications,
            element: (
              <Lazy>
                <NotificationCenter />
              </Lazy>
            ),
          },
          {
            path: ROUTES.approvalsInbox,
            element: (
              <RequirePermission any={[PERMISSIONS.approvalsInboxRead]}>
                <Lazy>
                  <ApprovalQueue />
                </Lazy>
              </RequirePermission>
            ),
          },

          // Phase 4 — Accounting
          {
            path: ROUTES.accountingCoa,
            element: (
              <RequirePermission any={[PERMISSIONS.accountingCoaRead]}>
                <Lazy><AccountList /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingCoaNew,
            element: (
              <RequirePermission any={[PERMISSIONS.accountingCoaManage]}>
                <Lazy><AccountCreate /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingCoaDetail(),
            element: (
              <RequirePermission any={[PERMISSIONS.accountingCoaRead]}>
                <Lazy><AccountDetail /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingCoaEdit(),
            element: (
              <RequirePermission any={[PERMISSIONS.accountingCoaManage]}>
                <Lazy><AccountDetail mode="edit" /></Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.accountingPeriods,
            element: (
              <RequirePermission any={[PERMISSIONS.accountingPeriodRead]}>
                <Lazy><PeriodList /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingPeriodClose(),
            element: (
              <RequirePermission any={[PERMISSIONS.accountingPeriodClose]}>
                <Lazy><PeriodClose /></Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.accountingJournals,
            element: (
              <RequirePermission all={[PERMISSIONS.accountingJournalRead, PERMISSIONS.accountingPeriodRead]}>
                <Lazy><JournalList /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingJournalNew,
            element: (
              <RequirePermission all={[PERMISSIONS.accountingJournalCreate, PERMISSIONS.accountingPeriodRead, PERMISSIONS.accountingCoaRead]}>
                <Lazy><JournalCreate /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingJournalDetail(),
            element: (
              <RequirePermission any={[PERMISSIONS.accountingJournalRead]}>
                <Lazy><JournalDetail /></Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.accountingTrialBalance,
            element: (
              <RequirePermission all={[PERMISSIONS.accountingBalancesRead, PERMISSIONS.accountingPeriodRead]}>
                <Lazy><TrialBalance /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingAccountActivity,
            element: (
              <RequirePermission all={[PERMISSIONS.accountingBalancesRead, PERMISSIONS.accountingPeriodRead]}>
                <Lazy><BalanceByAccount /></Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.accountingPnL,
            element: (
              <RequirePermission all={[PERMISSIONS.accountingBalancesRead, PERMISSIONS.accountingPeriodRead]}>
                <Lazy><PnL /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingBalanceSheet,
            element: (
              <RequirePermission all={[PERMISSIONS.accountingBalancesRead, PERMISSIONS.accountingPeriodRead]}>
                <Lazy><BalanceSheet /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingCashflow,
            element: (
              <RequirePermission all={[PERMISSIONS.accountingBalancesRead, PERMISSIONS.accountingPeriodRead]}>
                <Lazy><Cashflow /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingChangesEquity,
            element: (
              <RequirePermission all={[PERMISSIONS.accountingBalancesRead, PERMISSIONS.accountingPeriodRead]}>
                <Lazy><ChangesInEquity /></Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.accountingExports,
            element: (
              <RequirePermission all={[PERMISSIONS.accountingExportsRun, PERMISSIONS.accountingPeriodRead]}>
                <Lazy><ExportsHub /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingImports,
            element: (
              <RequirePermission any={[PERMISSIONS.accountingImportsRun]}>
                <Lazy><ImportsHub /></Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.accountingFx,
            element: (
              <RequirePermission any={[PERMISSIONS.accountingFxRead]}>
                <Lazy><FxRates /></Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.accountingTax,
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy>
                  <TaxAdmin />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhana,
            element: (
              <RequirePermission any={[PERMISSIONS.taxGhanaReadinessRead]}>
                <Lazy>
                  <GhanaComplianceOverview />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaLedger,
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy>
                  <GhanaTaxLedger />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaCatalogProfiles,
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy>
                  <GhanaTaxCatalogProfiles />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaPartnerProfiles,
            element: (
              <RequirePermission all={[PERMISSIONS.taxRead, PERMISSIONS.partnersRead]}>
                <Lazy>
                  <GhanaPartnerTaxProfiles />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaVat,
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy><GhanaVatOverview /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaVatReturn,
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy><GhanaVatReturn /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaVatApportionment,
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy><GhanaVatApportionment /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaImportedServices,
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy><GhanaImportedServices /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaImportedServiceDetail(),
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy><GhanaImportedServiceDetail /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaVatReconciliation,
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy><GhanaVatReconciliation /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaWithholding,
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy><GhanaWithholdingOverview /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaWithholdingEvents,
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy><GhanaWithholdingEvents /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaWithholdingCertificates,
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy><GhanaWithholdingCertificates /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaWithholdingReturns,
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy><GhanaWithholdingReturns /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaWithholdingReturnDetail(),
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy><GhanaWithholdingReturnDetail /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaWithholdingRemittances,
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy><GhanaWithholdingRemittances /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaWithholdingReconciliation,
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy><GhanaWithholdingReconciliation /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxGhanaEvat,
            element: <RequirePermission any={[PERMISSIONS.fiscalizationRead]}><Lazy><GhanaEvatOverview /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.accountingTaxGhanaEvatDocuments,
            element: <RequirePermission any={[PERMISSIONS.fiscalizationRead]}><Lazy><GhanaEvatDocuments /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.accountingTaxGhanaEvatDocumentDetail(),
            element: <RequirePermission any={[PERMISSIONS.fiscalizationRead]}><Lazy><GhanaEvatDocumentDetail /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.accountingTaxGhanaEvatQueue,
            element: <RequirePermission any={[PERMISSIONS.fiscalizationRead]}><Lazy><GhanaEvatQueue /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.accountingTaxGhanaEvatDevices,
            element: <RequirePermission any={[PERMISSIONS.fiscalizationRead]}><Lazy><GhanaEvatDevices /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.accountingTaxGhanaEvatLogs,
            element: <RequirePermission any={[PERMISSIONS.fiscalizationRead]}><Lazy><GhanaEvatLogs /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.accountingTaxGhanaEvatSettings,
            element: <RequirePermission any={[PERMISSIONS.fiscalizationManage]}><Lazy><GhanaEvatSettings /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.accountingTaxGhanaCit,
            element: <RequirePermission any={[PERMISSIONS.taxGhanaCitRead]}><Lazy><GhanaCit /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.accountingTaxGhanaCitComputation(),
            element: <RequirePermission any={[PERMISSIONS.taxGhanaCitRead]}><Lazy><GhanaCitComputation /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.accountingTaxGhanaCapitalAllowances,
            element: <RequirePermission any={[PERMISSIONS.taxGhanaCitRead]}><Lazy><GhanaCapitalAllowances /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.accountingTaxGhanaIndustryProfile,
            element: <RequirePermission any={[PERMISSIONS.taxRead]}><Lazy><GhanaIndustryProfiles /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.accountingTaxWithholding,
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy>
                  <WithholdingWorkspace />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxWithholdingOpenItemDetail(),
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy>
                  <WithholdingOpenItemDetail />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxWithholdingRemittanceNew,
            element: (
              <RequirePermission any={[PERMISSIONS.taxManage]}>
                <Lazy>
                  <WithholdingRemittanceCreate />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxWithholdingRemittanceDetail(),
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy>
                  <WithholdingRemittanceDetail />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxWithholdingCertificateNew,
            element: (
              <RequirePermission any={[PERMISSIONS.taxManage]}>
                <Lazy>
                  <WithholdingCertificateCreate />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingTaxWithholdingCertificateDetail(),
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy>
                  <WithholdingCertificateDetail />
                </Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.accountingAccruals,
            element: (
              <RequirePermission any={[PERMISSIONS.accountingAccrualsRead]}>
                <Lazy><AccrualsHub /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.accountingAccrualNew,
            element: (
              <RequirePermission any={[PERMISSIONS.accountingAccrualsManage]}>
                <Lazy><AccrualCreate /></Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.accountingReconciliation,
            element: (
              <RequirePermission all={[PERMISSIONS.accountingReconcileRun, PERMISSIONS.accountingPeriodRead]}>
                <Lazy><Reconciliation /></Lazy>
              </RequirePermission>
            ),
          },

          // Phase 5 — Business
          {
            path: ROUTES.businessCustomers,
            element: (
              <RequirePermission
                any={[PERMISSIONS.partnersRead, PERMISSIONS.partnersManage]}
              >
                <Lazy>
                  <Customers />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.businessVendors,
            element: (
              <RequirePermission
                any={[PERMISSIONS.partnersRead, PERMISSIONS.partnersManage]}
              >
                <Lazy>
                  <Vendors />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.businessPartnerNew,
            element: (
              <RequirePermission any={[PERMISSIONS.partnersManage]}>
                <Lazy>
                  <PartnerCreate />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.businessPartnerDetail(),
            element: (
              <RequirePermission
                any={[PERMISSIONS.partnersRead, PERMISSIONS.partnersManage]}
              >
                <Lazy>
                  <PartnerDetail />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.businessPaymentConfig,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.paymentConfigManage,
                  PERMISSIONS.partnersRead,
                ]}
              >
                <Lazy>
                  <PaymentConfig />
                </Lazy>
              </RequirePermission>
            ),
          },

          // Phase 5 — Transactions
          {
            path: ROUTES.invoices,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.transactionsInvoiceRead,
                  PERMISSIONS.transactionsInvoiceManage,
                ]}
              >
                <Lazy>
                  <InvoiceList />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.invoiceNew,
            element: (
              <RequirePermission any={[PERMISSIONS.transactionsInvoiceManage]}>
                <Lazy>
                  <InvoiceCreate />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.invoiceDetail(),
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.transactionsInvoiceRead,
                  PERMISSIONS.transactionsInvoiceManage,
                ]}
              >
                <Lazy>
                  <InvoiceDetail />
                </Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.bills,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.transactionsBillRead,
                  PERMISSIONS.transactionsBillManage,
                ]}
              >
                <Lazy>
                  <BillList />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.billNew,
            element: (
              <RequirePermission any={[PERMISSIONS.transactionsBillManage]}>
                <Lazy>
                  <BillCreate />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.billDetail(),
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.transactionsBillRead,
                  PERMISSIONS.transactionsBillManage,
                ]}
              >
                <Lazy>
                  <BillDetail />
                </Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.customerReceipts,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.customerReceiptRead,
                  PERMISSIONS.customerReceiptManage,
                ]}
              >
                <Lazy>
                  <CustomerReceiptList />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.customerReceiptNew,
            element: (
              <RequirePermission any={[PERMISSIONS.customerReceiptManage]}>
                <Lazy>
                  <CustomerReceiptCreate />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.customerReceiptDetail(),
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.customerReceiptRead,
                  PERMISSIONS.customerReceiptManage,
                ]}
              >
                <Lazy>
                  <CustomerReceiptDetail />
                </Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.vendorPayments,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.vendorPaymentRead,
                  PERMISSIONS.vendorPaymentManage,
                ]}
              >
                <Lazy>
                  <VendorPaymentList />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.vendorPaymentNew,
            element: (
              <RequirePermission any={[PERMISSIONS.vendorPaymentManage]}>
                <Lazy>
                  <VendorPaymentCreate />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.vendorPaymentDetail(),
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.vendorPaymentRead,
                  PERMISSIONS.vendorPaymentManage,
                ]}
              >
                <Lazy>
                  <VendorPaymentDetail />
                </Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.creditNotes,
            element: (
              <RequirePermission
                any={[PERMISSIONS.creditNoteRead, PERMISSIONS.creditNoteManage]}
              >
                <Lazy>
                  <CreditNoteList />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.creditNoteNew,
            element: (
              <RequirePermission any={[PERMISSIONS.creditNoteManage]}>
                <Lazy>
                  <CreditNoteCreate />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.creditNoteDetail(),
            element: (
              <RequirePermission
                any={[PERMISSIONS.creditNoteRead, PERMISSIONS.creditNoteManage]}
              >
                <Lazy>
                  <CreditNoteDetail />
                </Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.debitNotes,
            element: (
              <RequirePermission
                any={[PERMISSIONS.debitNoteRead, PERMISSIONS.debitNoteManage]}
              >
                <Lazy>
                  <DebitNoteList />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.debitNoteNew,
            element: (
              <RequirePermission any={[PERMISSIONS.debitNoteManage]}>
                <Lazy>
                  <DebitNoteCreate />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.debitNoteDetail(),
            element: (
              <RequirePermission
                any={[PERMISSIONS.debitNoteRead, PERMISSIONS.debitNoteManage]}
              >
                <Lazy>
                  <DebitNoteDetail />
                </Lazy>
              </RequirePermission>
            ),
          },

          { path: ROUTES.quotations, element: (<RequirePermission any={[PERMISSIONS.quotationRead, PERMISSIONS.quotationManage]}><Lazy><QuotationList /></Lazy></RequirePermission>) },
          { path: ROUTES.quotationNew, element: (<RequirePermission any={[PERMISSIONS.quotationManage]}><Lazy><QuotationCreate /></Lazy></RequirePermission>) },
          { path: ROUTES.quotationDetail(), element: (<RequirePermission any={[PERMISSIONS.quotationRead, PERMISSIONS.quotationManage]}><Lazy><QuotationDetail /></Lazy></RequirePermission>) },

          { path: ROUTES.salesOrders, element: (<RequirePermission any={[PERMISSIONS.salesOrderRead, PERMISSIONS.salesOrderManage]}><Lazy><SalesOrderList /></Lazy></RequirePermission>) },
          { path: ROUTES.salesOrderNew, element: (<RequirePermission any={[PERMISSIONS.salesOrderManage]}><Lazy><SalesOrderCreate /></Lazy></RequirePermission>) },
          { path: ROUTES.salesOrderDetail(), element: (<RequirePermission any={[PERMISSIONS.salesOrderRead, PERMISSIONS.salesOrderManage]}><Lazy><SalesOrderDetail /></Lazy></RequirePermission>) },

          { path: ROUTES.purchaseRequisitions, element: (<RequirePermission any={[PERMISSIONS.purchaseRequisitionRead, PERMISSIONS.purchaseRequisitionManage]}><Lazy><PurchaseRequisitionList /></Lazy></RequirePermission>) },
          { path: ROUTES.purchaseRequisitionNew, element: (<RequirePermission any={[PERMISSIONS.purchaseRequisitionManage]}><Lazy><PurchaseRequisitionCreate /></Lazy></RequirePermission>) },
          { path: ROUTES.purchaseRequisitionDetail(), element: (<RequirePermission any={[PERMISSIONS.purchaseRequisitionRead, PERMISSIONS.purchaseRequisitionManage]}><Lazy><PurchaseRequisitionDetail /></Lazy></RequirePermission>) },

          { path: ROUTES.purchaseOrders, element: (<RequirePermission any={[PERMISSIONS.purchaseOrderRead, PERMISSIONS.purchaseOrderManage]}><Lazy><PurchaseOrderList /></Lazy></RequirePermission>) },
          { path: ROUTES.purchaseOrderNew, element: (<RequirePermission any={[PERMISSIONS.purchaseOrderManage]}><Lazy><PurchaseOrderCreate /></Lazy></RequirePermission>) },
          { path: ROUTES.purchaseOrderDetail(), element: (<RequirePermission any={[PERMISSIONS.purchaseOrderRead, PERMISSIONS.purchaseOrderManage]}><Lazy><PurchaseOrderDetail /></Lazy></RequirePermission>) },

          { path: ROUTES.goodsReceipts, element: (<RequirePermission any={[PERMISSIONS.goodsReceiptRead, PERMISSIONS.goodsReceiptManage]}><Lazy><GoodsReceiptList /></Lazy></RequirePermission>) },
          { path: ROUTES.goodsReceiptNew, element: (<RequirePermission any={[PERMISSIONS.goodsReceiptManage]}><Lazy><GoodsReceiptCreate /></Lazy></RequirePermission>) },
          { path: ROUTES.goodsReceiptDetail(), element: (<RequirePermission any={[PERMISSIONS.goodsReceiptRead, PERMISSIONS.goodsReceiptManage]}><Lazy><GoodsReceiptDetail /></Lazy></RequirePermission>) },

          { path: ROUTES.expenses, element: (<RequirePermission any={[PERMISSIONS.expenseRead, PERMISSIONS.expenseManage]}><Lazy><ExpenseList /></Lazy></RequirePermission>) },
          { path: ROUTES.expenseNew, element: (<RequirePermission any={[PERMISSIONS.expenseManage]}><Lazy><ExpenseCreate /></Lazy></RequirePermission>) },
          { path: ROUTES.expenseDetail(), element: (<RequirePermission any={[PERMISSIONS.expenseRead, PERMISSIONS.expenseManage]}><Lazy><ExpenseDetail /></Lazy></RequirePermission>) },

          { path: ROUTES.pettyCash, element: (<RequirePermission any={[PERMISSIONS.pettyCashRead, PERMISSIONS.pettyCashManage]}><Lazy><PettyCashList /></Lazy></RequirePermission>) },
          { path: ROUTES.pettyCashNew, element: (<RequirePermission any={[PERMISSIONS.pettyCashManage]}><Lazy><PettyCashCreate /></Lazy></RequirePermission>) },
          { path: ROUTES.pettyCashDetail(), element: (<RequirePermission any={[PERMISSIONS.pettyCashRead, PERMISSIONS.pettyCashManage]}><Lazy><PettyCashDetail /></Lazy></RequirePermission>) },

          { path: ROUTES.advances, element: (<RequirePermission any={[PERMISSIONS.advanceRead, PERMISSIONS.advanceManage]}><Lazy><AdvanceList /></Lazy></RequirePermission>) },
          { path: ROUTES.advanceNew, element: (<RequirePermission any={[PERMISSIONS.advanceManage]}><Lazy><AdvanceCreate /></Lazy></RequirePermission>) },
          { path: ROUTES.advanceDetail(), element: (<RequirePermission any={[PERMISSIONS.advanceRead, PERMISSIONS.advanceManage]}><Lazy><AdvanceDetail /></Lazy></RequirePermission>) },

          { path: ROUTES.returns, element: (<RequirePermission any={[PERMISSIONS.returnRead, PERMISSIONS.returnManage]}><Lazy><ReturnList /></Lazy></RequirePermission>) },
          { path: ROUTES.returnNew, element: (<RequirePermission any={[PERMISSIONS.returnManage]}><Lazy><ReturnCreate /></Lazy></RequirePermission>) },
          { path: ROUTES.returnDetail(), element: (<RequirePermission any={[PERMISSIONS.returnRead, PERMISSIONS.returnManage]}><Lazy><ReturnDetail /></Lazy></RequirePermission>) },

          { path: ROUTES.refunds, element: (<RequirePermission any={[PERMISSIONS.refundRead, PERMISSIONS.refundManage]}><Lazy><RefundList /></Lazy></RequirePermission>) },
          { path: ROUTES.refundNew, element: (<RequirePermission any={[PERMISSIONS.refundManage]}><Lazy><RefundCreate /></Lazy></RequirePermission>) },
          { path: ROUTES.refundDetail(), element: (<RequirePermission any={[PERMISSIONS.refundRead, PERMISSIONS.refundManage]}><Lazy><RefundDetail /></Lazy></RequirePermission>) },

          // Phase 5 — AR Ops
          {
            path: ROUTES.arCollections,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.collectionsRead,
                  PERMISSIONS.collectionsManage,
                ]}
              >
                <Lazy>
                  <CollectionsHub />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.arDunning,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.collectionsRead,
                  PERMISSIONS.collectionsManage,
                ]}
              >
                <Lazy>
                  <CollectionsHub />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.arDisputes,
            element: (
              <RequirePermission
                any={[PERMISSIONS.disputesRead, PERMISSIONS.disputesManage]}
              >
                <Lazy>
                  <Disputes />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.arWriteoffs,
            element: (
              <RequirePermission
                any={[PERMISSIONS.writeoffsRead, PERMISSIONS.writeoffsManage]}
              >
                <Lazy>
                  <Writeoffs />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.arPaymentPlans,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.paymentPlansRead,
                  PERMISSIONS.paymentPlansManage,
                ]}
              >
                <Lazy>
                  <PaymentPlans />
                </Lazy>
              </RequirePermission>
            ),
          },

          // Phase 5 — Reporting
          {
            path: ROUTES.reportArAging,
            element: (
              <RequirePermission any={[PERMISSIONS.reportingArRead]}>
                <Lazy>
                  <ReportArAging />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.reportArOpenItems,
            element: (
              <RequirePermission any={[PERMISSIONS.reportingArRead]}>
                <Lazy>
                  <ReportArOpenItems />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.reportArCustomerStatement,
            element: (
              <RequirePermission any={[PERMISSIONS.reportingArRead]}>
                <Lazy>
                  <ReportArCustomerStatement />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.reportApAging,
            element: (
              <RequirePermission any={[PERMISSIONS.reportingApRead]}>
                <Lazy>
                  <ReportApAging />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.reportApOpenItems,
            element: (
              <RequirePermission any={[PERMISSIONS.reportingApRead]}>
                <Lazy>
                  <ReportApOpenItems />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.reportApVendorStatement,
            element: (
              <RequirePermission any={[PERMISSIONS.reportingApRead]}>
                <Lazy>
                  <ReportApVendorStatement />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.reportTax,
            element: (
              <RequirePermission any={[PERMISSIONS.reportingTaxRead]}>
                <Lazy>
                  <ReportTax />
                </Lazy>
              </RequirePermission>
            ),
          },

          // Phase 6 — Assets
          {
            path: ROUTES.assetsCategories,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.assetsCategoriesRead,
                  PERMISSIONS.assetsCategoriesManage,
                ]}
              >
                <Lazy>
                  <AssetCategories />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.assetsRegister,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.assetsFixedAssetsRead,
                  PERMISSIONS.assetsFixedAssetsManage,
                ]}
              >
                <Lazy>
                  <AssetRegister />
                </Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.assetsRegisterNew,
            element: (
              <RequirePermission any={[PERMISSIONS.assetsFixedAssetsManage]}>
                <Lazy>
                  <AssetRegisterNew />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.assetsCategoriesNew,
            element: (
              <RequirePermission any={[PERMISSIONS.assetsCategoriesManage]}>
                <Lazy>
                  <AssetCategoryNew />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.assetsCategoryEdit(),
            element: (
              <RequirePermission any={[PERMISSIONS.assetsCategoriesManage]}>
                <Lazy>
                  <AssetCategoryEdit />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.assetsAssetAcquire(),
            element: (
              <RequirePermission any={[PERMISSIONS.assetsFixedAssetsManage]}>
                <Lazy>
                  <AssetAcquire />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.assetsAssetDispose(),
            element: (
              <RequirePermission any={[PERMISSIONS.assetsFixedAssetsManage]}>
                <Lazy>
                  <AssetDispose />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.assetsAssetTransfer(),
            element: (
              <RequirePermission any={[PERMISSIONS.assetsFixedAssetsManage]}>
                <Lazy>
                  <AssetTransfer />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.assetsAssetRevalue(),
            element: (
              <RequirePermission any={[PERMISSIONS.assetsFixedAssetsManage]}>
                <Lazy>
                  <AssetRevalue />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.assetsAssetImpair(),
            element: (
              <RequirePermission any={[PERMISSIONS.assetsFixedAssetsManage]}>
                <Lazy>
                  <AssetImpair />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.assetsAssetDeprScheduleNew(),
            element: (
              <RequirePermission any={[PERMISSIONS.assetsFixedAssetsManage]}>
                <Lazy>
                  <DepreciationScheduleNew />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.assetsAssetDetail(":id"),
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.assetsFixedAssetsRead,
                  PERMISSIONS.assetsFixedAssetsManage,
                ]}
              >
                <Lazy>
                  <AssetDetail />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.assetsDepreciation,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.assetsDepreciationRun,
                  PERMISSIONS.assetsFixedAssetsRead,
                ]}
              >
                <Lazy>
                  <AssetDepreciation />
                </Lazy>
              </RequirePermission>
            ),
          },

          // Phase 6 — Inventory
          {
            path: ROUTES.inventoryItems,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.inventoryItemsRead,
                  PERMISSIONS.inventoryItemsManage,
                ]}
              >
                <Lazy>
                  <InventoryItems />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryWarehouses,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.inventoryWarehousesRead,
                  PERMISSIONS.inventoryWarehousesManage,
                ]}
              >
                <Lazy>
                  <InventoryWarehouses />
                </Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.inventoryCategories,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.inventoryCategoriesRead,
                  PERMISSIONS.inventoryCategoriesManage,
                ]}
              >
                <Lazy>
                  <InventoryCategories />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryUnits,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.inventoryUnitsRead,
                  PERMISSIONS.inventoryUnitsManage,
                ]}
              >
                <Lazy>
                  <InventoryUnits />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryTransactions,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.inventoryTransactionsRead,
                  PERMISSIONS.inventoryTransactionsManage,
                  PERMISSIONS.inventoryTransactionsApprove,
                  PERMISSIONS.inventoryTransactionsPost,
                ]}
              >
                <Lazy>
                  <InventoryTransactions />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryTransactionDetail(":id"),
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.inventoryTransactionsRead,
                  PERMISSIONS.inventoryTransactionsManage,
                  PERMISSIONS.inventoryTransactionsApprove,
                  PERMISSIONS.inventoryTransactionsPost,
                ]}
              >
                <Lazy>
                  <InventoryTransactionDetail />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryStockCounts,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.inventoryTransactionsRead,
                  PERMISSIONS.inventoryTransactionsManage,
                  PERMISSIONS.inventoryTransactionsApprove,
                  PERMISSIONS.inventoryTransactionsPost,
                ]}
              >
                <Lazy>
                  <InventoryStockCounts />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryStockCountDetail(":id"),
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.inventoryTransactionsRead,
                  PERMISSIONS.inventoryTransactionsManage,
                  PERMISSIONS.inventoryTransactionsApprove,
                  PERMISSIONS.inventoryTransactionsPost,
                ]}
              >
                <Lazy>
                  <InventoryStockCountDetail />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryReports,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.inventoryTransactionsRead,
                  PERMISSIONS.inventoryTransactionsManage,
                ]}
              >
                <Lazy>
                  <InventoryReports />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryBins,
            element: (
              <RequirePermission any={[PERMISSIONS.inventoryWarehousesRead, PERMISSIONS.inventoryWarehousesManage]}>
                <Lazy><InventoryBins /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryReservations,
            element: (
              <RequirePermission any={[PERMISSIONS.inventoryReservationsRead, PERMISSIONS.inventoryReservationsManage]}>
                <Lazy><InventoryReservations /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryTransfers,
            element: (
              <RequirePermission any={[PERMISSIONS.inventoryTransfersRead, PERMISSIONS.inventoryTransfersManage, PERMISSIONS.inventoryTransfersApprove, PERMISSIONS.inventoryTransfersPost]}>
                <Lazy><InventoryTransfers /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryTransferDetail(":id"),
            element: (
              <RequirePermission any={[PERMISSIONS.inventoryTransfersRead, PERMISSIONS.inventoryTransfersManage, PERMISSIONS.inventoryTransfersApprove, PERMISSIONS.inventoryTransfersPost]}>
                <Lazy><InventoryTransferDetail /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryTraceability,
            element: (
              <RequirePermission any={[PERMISSIONS.inventoryTraceabilityRead, PERMISSIONS.inventoryTraceabilityManage]}>
                <Lazy><InventoryTraceability /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryReorder,
            element: (
              <RequirePermission any={[PERMISSIONS.inventoryReorderRead, PERMISSIONS.inventoryReorderManage]}>
                <Lazy><InventoryReorder /></Lazy>
              </RequirePermission>
            ),
          },


          // Phase 12 — Commerce / POS
          {
            path: ROUTES.commercePos,
            element: (
              <RequirePermission any={[PERMISSIONS.commercePosRead, PERMISSIONS.commercePosSell, PERMISSIONS.commercePosPost]}>
                <Lazy><POSRegister /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.commerceSetup,
            element: (
              <RequirePermission any={[PERMISSIONS.commerceSetupRead, PERMISSIONS.commerceSetupManage]}>
                <Lazy><POSSetup /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.commerceOrders,
            element: (
              <RequirePermission any={[PERMISSIONS.commerceOrdersRead, PERMISSIONS.commerceOrdersManage]}>
                <Lazy><CommerceOrders /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.commerceReturns,
            element: (
              <RequirePermission any={[PERMISSIONS.commerceReturnsRead, PERMISSIONS.commerceReturnsManage]}>
                <Lazy><CommerceReturns /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.commercePromotions,
            element: (
              <RequirePermission any={[PERMISSIONS.commercePromotionsRead, PERMISSIONS.commercePromotionsManage]}>
                <Lazy><CommercePromotions /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.commerceReports,
            element: (
              <RequirePermission any={[PERMISSIONS.commerceReportsRead]}>
                <Lazy><CommerceReports /></Lazy>
              </RequirePermission>
            ),
          },

          // Phase 7 — Reporting & Planning
          {
            path: ROUTES.planningCenters("cost"),
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.reportingCentersRead,
                  PERMISSIONS.reportingCentersManage,
                ]}
              >
                <Lazy>
                  <Centers />
                </Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.inventoryCategoriesNew,
            element: (
              <RequirePermission any={[PERMISSIONS.inventoryCategoriesManage]}>
                <Lazy>
                  <InventoryCategoryNew />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryUnitsNew,
            element: (
              <RequirePermission any={[PERMISSIONS.inventoryUnitsManage]}>
                <Lazy>
                  <InventoryUnitNew />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryItemsNew,
            element: (
              <RequirePermission any={[PERMISSIONS.inventoryItemsManage]}>
                <Lazy>
                  <InventoryItemNew />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryWarehousesNew,
            element: (
              <RequirePermission any={[PERMISSIONS.inventoryWarehousesManage]}>
                <Lazy>
                  <InventoryWarehouseNew />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryTransactionsNew,
            element: (
              <RequirePermission
                any={[PERMISSIONS.inventoryTransactionsManage]}
              >
                <Lazy>
                  <InventoryTransactionNew />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryStockCountsNew,
            element: (
              <RequirePermission
                any={[PERMISSIONS.inventoryTransactionsManage]}
              >
                <Lazy>
                  <InventoryStockCountNew />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryBinsNew,
            element: (
              <RequirePermission any={[PERMISSIONS.inventoryWarehousesManage]}>
                <Lazy><InventoryBinNew /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryReservationsNew,
            element: (
              <RequirePermission any={[PERMISSIONS.inventoryReservationsManage]}>
                <Lazy><InventoryReservationNew /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.inventoryTransfersNew,
            element: (
              <RequirePermission any={[PERMISSIONS.inventoryTransfersManage]}>
                <Lazy><InventoryTransferNew /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.planningCenters("profit"),
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.reportingCentersRead,
                  PERMISSIONS.reportingCentersManage,
                ]}
              >
                <Lazy>
                  <Centers />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.planningCenters("investment"),
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.reportingCentersRead,
                  PERMISSIONS.reportingCentersManage,
                ]}
              >
                <Lazy>
                  <Centers />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.planningProjects,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.reportingProjectsRead,
                  PERMISSIONS.reportingProjectsManage,
                ]}
              >
                <Lazy>
                  <Projects />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.planningProjectDetail(":id"),
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.reportingProjectsRead,
                  PERMISSIONS.reportingProjectsManage,
                ]}
              >
                <Lazy>
                  <ProjectDetail />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.planningBudgets,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.reportingBudgetsRead,
                  PERMISSIONS.reportingBudgetsManage,
                ]}
              >
                <Lazy>
                  <Budgets />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.planningBudgetDetail(":id"),
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.reportingBudgetsRead,
                  PERMISSIONS.reportingBudgetsManage,
                ]}
              >
                <Lazy>
                  <BudgetDetail />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.planningForecasts,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.reportingForecastsRead,
                  PERMISSIONS.reportingForecastsManage,
                ]}
              >
                <Lazy>
                  <Forecasts />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.planningForecastDetail(":id"),
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.reportingForecastsRead,
                  PERMISSIONS.reportingForecastsManage,
                ]}
              >
                <Lazy>
                  <ForecastDetail />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.planningAllocations,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.reportingAllocationsRead,
                  PERMISSIONS.reportingAllocationsManage,
                ]}
              >
                <Lazy>
                  <Allocations />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.planningKpis,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.reportingKpisRead,
                  PERMISSIONS.reportingKpisManage,
                ]}
              >
                <Lazy>
                  <KPIs />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.planningDashboards,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.reportingDashboardsRead,
                  PERMISSIONS.reportingDashboardsManage,
                ]}
              >
                <Lazy>
                  <Dashboards />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.planningSavedReports,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.reportingReportsRead,
                  PERMISSIONS.reportingReportsManage,
                ]}
              >
                <Lazy>
                  <SavedReports />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.planningManagement,
            element: (
              <RequirePermission any={[PERMISSIONS.reportingManagementRead]}>
                <Lazy>
                  <ManagementReports />
                </Lazy>
              </RequirePermission>
            ),
          },



          // Phase 11 — Human Resources
          {
            path: ROUTES.hr,
            element: (
              <RequirePermission any={[PERMISSIONS.hrEmployeesRead, PERMISSIONS.hrDepartmentsRead, PERMISSIONS.hrPayrollRead, PERMISSIONS.hrReportsRead]}>
                <Lazy><HrOverview /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.hrEmployees,
            element: (
              <RequirePermission any={[PERMISSIONS.hrEmployeesRead, PERMISSIONS.hrEmployeesManage]}>
                <Lazy><HrEmployees /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.hrDepartments,
            element: (
              <RequirePermission any={[PERMISSIONS.hrDepartmentsRead, PERMISSIONS.hrDepartmentsManage]}>
                <Lazy><HrDepartments /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.hrGrades,
            element: (
              <RequirePermission any={[PERMISSIONS.hrGradesRead, PERMISSIONS.hrGradesManage]}>
                <Lazy><HrGrades /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.hrPositions,
            element: (
              <RequirePermission any={[PERMISSIONS.hrPositionsRead, PERMISSIONS.hrPositionsManage]}>
                <Lazy><HrPositions /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.hrCompensationBands,
            element: (
              <RequirePermission any={[PERMISSIONS.hrCompensationBandsRead, PERMISSIONS.hrCompensationBandsManage]}>
                <Lazy><HrCompensationBands /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.hrPayroll,
            element: (
              <RequirePermission any={[PERMISSIONS.hrPayrollRead, PERMISSIONS.hrPayrollManage, PERMISSIONS.hrPayrollPost]}>
                <Lazy><HrPayroll /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.hrPayrollGhana,
            element: <RequirePermission any={[PERMISSIONS.hrPayrollGhanaRead, PERMISSIONS.hrPayrollGhanaManage, PERMISSIONS.hrPayrollGhanaFile]}><Lazy><GhanaPayrollOverview /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.hrPayrollGhanaReturns,
            element: <RequirePermission any={[PERMISSIONS.hrPayrollGhanaRead]}><Lazy><GhanaPayeReturns /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.hrPayrollGhanaReturnDetail(),
            element: <RequirePermission any={[PERMISSIONS.hrPayrollGhanaRead]}><Lazy><GhanaPayeReturnDetail /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.hrPayrollGhanaPensions,
            element: <RequirePermission any={[PERMISSIONS.hrPayrollGhanaRead]}><Lazy><GhanaPensionSchedule /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.hrPayrollGhanaDisengaged,
            element: <RequirePermission any={[PERMISSIONS.hrPayrollGhanaRead]}><Lazy><GhanaDisengagedSchedule /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.hrPayrollGhanaRemittances,
            element: <RequirePermission any={[PERMISSIONS.hrPayrollGhanaRead]}><Lazy><GhanaPayrollRemittances /></Lazy></RequirePermission>,
          },
          {
            path: ROUTES.hrLeave,
            element: (
              <RequirePermission any={[PERMISSIONS.hrLeaveRead, PERMISSIONS.hrLeaveManage]}>
                <Lazy><HrLeave /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.hrBenefits,
            element: (
              <RequirePermission any={[PERMISSIONS.hrBenefitsRead, PERMISSIONS.hrBenefitsManage]}>
                <Lazy><HrBenefits /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.hrStatutory,
            element: (
              <RequirePermission any={[PERMISSIONS.hrStatutoryRead, PERMISSIONS.hrStatutoryManage]}>
                <Lazy><HrStatutory /></Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.hrReports,
            element: (
              <RequirePermission any={[PERMISSIONS.hrReportsRead]}>
                <Lazy><HrReports /></Lazy>
              </RequirePermission>
            ),
          },

          // Admin
          {
            path: ROUTES.adminOrg,
            element: (
              <RequirePermission
                any={[PERMISSIONS.settingsRead, PERMISSIONS.settingsManage]}
              >
                <Lazy>
                  <OrganizationSettings />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.adminUsers,
            element: (
              <RequirePermission
                any={[PERMISSIONS.usersRead, PERMISSIONS.usersManage]}
              >
                <Lazy>
                  <UserList />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.adminUserDetail(),
            element: (
              <RequirePermission
                any={[PERMISSIONS.usersRead, PERMISSIONS.usersManage]}
              >
                <Lazy>
                  <UserDetail />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.adminRoles,
            element: (
              <RequirePermission
                any={[PERMISSIONS.rbacRolesRead, PERMISSIONS.rbacRolesManage]}
              >
                <Lazy>
                  <RoleList />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.adminRoleDetail(),
            element: (
              <RequirePermission
                any={[PERMISSIONS.rbacRolesRead, PERMISSIONS.rbacRolesManage]}
              >
                <Lazy>
                  <RoleDetail />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.adminPermissions,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.rbacPermissionsRead,
                  PERMISSIONS.rbacRolesRead,
                ]}
              >
                <Lazy>
                  <PermissionMatrix />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.adminSettings,
            element: (
              <RequirePermission
                any={[PERMISSIONS.settingsRead, PERMISSIONS.settingsManage]}
              >
                <Lazy>
                  <SystemSettings />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.adminDimensionSecurity,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.dimensionSecurityRead,
                  PERMISSIONS.dimensionSecurityManage,
                ]}
              >
                <Lazy>
                  <DimensionRules />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.adminApiKeys,
            element: (
              <RequirePermission
                any={[PERMISSIONS.settingsRead, PERMISSIONS.settingsManage]}
              >
                <Lazy>
                  <ApiKeyList />
                </Lazy>
              </RequirePermission>
            ),
          },

          // Utilities
          {
            path: ROUTES.utilitiesHealth,
            element: (
              <RequirePermission any={[PERMISSIONS.settingsRead]}>
                <Lazy>
                  <SystemHealth />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.utilitiesErrors,
            element: (
              <RequirePermission any={[PERMISSIONS.settingsRead]}>
                <Lazy>
                  <ErrorLogs />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.utilitiesClientLogs,
            element: (
              <RequirePermission any={[PERMISSIONS.clientLogsRead]}>
                <Lazy>
                  <ClientLogs />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.utilitiesI18n,
            element: (
              <RequirePermission any={[PERMISSIONS.i18nRead]}>
                <Lazy>
                  <I18nAdmin />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.utilitiesA11y,
            element: (
              <RequirePermission any={[PERMISSIONS.a11yRead]}>
                <Lazy>
                  <A11yChecks />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.utilitiesRelease,
            element: (
              <RequirePermission any={[PERMISSIONS.releaseRead]}>
                <Lazy>
                  <ReleaseInfo />
                </Lazy>
              </RequirePermission>
            ),
          },

          // Phase 8 — Banking
          {
            path: ROUTES.banking,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.bankingAccountsRead,
                  PERMISSIONS.bankingStatementsRead,
                ]}
              >
                <Lazy>
                  <BankingOverview />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.bankingAccounts,
            element: (
              <RequirePermission any={[PERMISSIONS.bankingAccountsRead]}>
                <Lazy>
                  <BankAccountsPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.bankingStatements,
            element: (
              <RequirePermission any={[PERMISSIONS.bankingStatementsRead]}>
                <Lazy>
                  <BankStatementsPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.bankingStatementDetail(),
            element: (
              <RequirePermission any={[PERMISSIONS.bankingStatementsRead]}>
                <Lazy>
                  <BankStatementDetailPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.bankingMatchingRules,
            element: (
              <RequirePermission any={[PERMISSIONS.bankingMatchingRulesManage]}>
                <Lazy>
                  <BankMatchingRulesPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.bankingCashbook,
            element: (
              <RequirePermission any={[PERMISSIONS.bankingCashbookRead]}>
                <Lazy>
                  <BankCashbookPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.bankingReconciliations,
            element: (
              <RequirePermission any={[PERMISSIONS.bankingReconciliationsRead]}>
                <Lazy>
                  <BankReconciliationsPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.treasury,
            element: (
              <RequirePermission any={[PERMISSIONS.bankingTreasuryRead]}>
                <Lazy>
                  <TreasuryOverview />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.treasuryDashboard,
            element: (
              <RequirePermission any={[PERMISSIONS.bankingTreasuryRead]}>
                <Lazy>
                  <TreasuryDashboardPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.paymentRuns,
            element: (
              <RequirePermission any={[PERMISSIONS.bankingTreasuryRead]}>
                <Lazy>
                  <PaymentRunsPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.paymentRunDetail(),
            element: (
              <RequirePermission any={[PERMISSIONS.bankingTreasuryRead]}>
                <Lazy>
                  <PaymentRunDetailPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.bankTransfers,
            element: (
              <RequirePermission any={[PERMISSIONS.bankingTreasuryRead]}>
                <Lazy>
                  <BankTransfersPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.bankTransferDetail(),
            element: (
              <RequirePermission any={[PERMISSIONS.bankingTreasuryRead]}>
                <Lazy>
                  <BankTransferDetailPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.paymentApprovalBatches,
            element: (
              <RequirePermission any={[PERMISSIONS.bankingTreasuryRead]}>
                <Lazy>
                  <ApprovalBatchesPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.paymentApprovalBatchDetail(),
            element: (
              <RequirePermission any={[PERMISSIONS.bankingTreasuryRead]}>
                <Lazy>
                  <ApprovalBatchDetailPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.cheques,
            element: (
              <RequirePermission any={[PERMISSIONS.bankingTreasuryRead]}>
                <Lazy>
                  <ChequesPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.cashForecast,
            element: (
              <RequirePermission any={[PERMISSIONS.bankingTreasuryRead]}>
                <Lazy>
                  <CashForecastPage />
                </Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.automation,
            element: (
              <RequirePermission any={[PERMISSIONS.automationRead, PERMISSIONS.automationManage]}>
                <Lazy>
                  <AutomationOverview />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.automationRecurringTransactions,
            element: (
              <RequirePermission any={[PERMISSIONS.automationRead, PERMISSIONS.automationManage]}>
                <Lazy>
                  <RecurringTransactionsPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.automationAutoReconciliation,
            element: (
              <RequirePermission any={[PERMISSIONS.automationRead, PERMISSIONS.automationManage, PERMISSIONS.automationRun]}>
                <Lazy>
                  <AutoReconciliationPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.automationDocumentMatching,
            element: (
              <RequirePermission any={[PERMISSIONS.automationRead, PERMISSIONS.automationManage, PERMISSIONS.automationRun]}>
                <Lazy>
                  <DocumentMatchingPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.automationAiClassification,
            element: (
              <RequirePermission any={[PERMISSIONS.automationRead, PERMISSIONS.automationManage]}>
                <Lazy>
                  <AIClassificationPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.automationSmartNotifications,
            element: (
              <RequirePermission any={[PERMISSIONS.automationRead, PERMISSIONS.automationNotificationsManage, PERMISSIONS.automationManage]}>
                <Lazy>
                  <SmartNotificationsPage />
                </Lazy>
              </RequirePermission>
            ),
          },

          // Phase 10 — Printing
          {
            path: ROUTES.printingTemplates,
            element: (
              <RequirePermission any={[PERMISSIONS.printingTemplatesRead, PERMISSIONS.printingTemplatesManage]}>
                <Lazy>
                  <TemplatesPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.printingAssignments,
            element: (
              <RequirePermission any={[PERMISSIONS.printingAssignmentsManage, PERMISSIONS.printingTemplatesManage]}>
                <Lazy>
                  <PrintAssignmentsPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.printingPreview(),
            element: (
              <RequirePermission any={[PERMISSIONS.printingRender, PERMISSIONS.printingTemplatesRead, PERMISSIONS.printingTemplatesManage]}>
                <Lazy>
                  <PrintPreviewPage />
                </Lazy>
              </RequirePermission>
            ),
          },

          // Phase 8 — Compliance
          {
            path: ROUTES.compliance,
            element: (
              <RequirePermission
                any={[
                  PERMISSIONS.complianceIfrs16Read,
                  PERMISSIONS.complianceIfrs15Read,
                  PERMISSIONS.complianceIfrs9Read,
                  PERMISSIONS.complianceIas12Read,
                ]}
              >
                <Lazy>
                  <ComplianceOverview />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.complianceIFRS16,
            element: (
              <RequirePermission any={[PERMISSIONS.complianceIfrs16Read]}>
                <Lazy>
                  <IFRS16LeasesPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.complianceIFRS16LeaseDetail(),
            element: (
              <RequirePermission any={[PERMISSIONS.complianceIfrs16Read]}>
                <Lazy>
                  <IFRS16LeaseDetailPage />
                </Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.complianceIFRS15,
            element: (
              <RequirePermission any={[PERMISSIONS.complianceIfrs15Read]}>
                <Lazy>
                  <IFRS15ContractsPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.complianceIFRS15ContractDetail(),
            element: (
              <RequirePermission any={[PERMISSIONS.complianceIfrs15Read]}>
                <Lazy>
                  <IFRS15ContractDetailPage />
                </Lazy>
              </RequirePermission>
            ),
          },

          {
            path: ROUTES.complianceIFRS9,
            element: (
              <RequirePermission any={[PERMISSIONS.complianceIfrs9Read]}>
                <Lazy>
                  <IFRS9EclPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.complianceIAS12,
            element: (
              <RequirePermission any={[PERMISSIONS.complianceIas12Read]}>
                <Lazy>
                  <IAS12TaxPage />
                </Lazy>
              </RequirePermission>
            ),
          },

          // Phase 8 — Workflow Documents
          {
            path: ROUTES.documents,
            element: (
              <RequirePermission any={[PERMISSIONS.documentsRead]}>
                <Lazy>
                  <DocumentsLibraryPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.documentCreate,
            element: (
              <RequirePermission any={[PERMISSIONS.documentsManage]}>
                <Lazy>
                  <DocumentCreatePage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.documentDetail(),
            element: (
              <RequirePermission any={[PERMISSIONS.documentsRead]}>
                <Lazy>
                  <DocumentDetailPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.documentTypes,
            element: (
              <RequirePermission any={[PERMISSIONS.documentsManage]}>
                <Lazy>
                  <DocumentTypesPage />
                </Lazy>
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.documentApprovalLevels,
            element: (
              <RequirePermission any={[PERMISSIONS.documentsManage]}>
                <Lazy>
                  <ApprovalLevelsPage />
                </Lazy>
              </RequirePermission>
            ),
          },

          { path: "/forbidden", element: <Forbidden /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to={ROUTES.dashboard} replace /> },
]);
