import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bell,
  Search,
  Shield,
  Users,
  Settings,
  KeyRound,
  Sliders,
  Layers,
  Activity,
  BookOpen,
  CalendarClock,
  FileText,
  Scale,
  BarChart3,
  ArrowLeftRight,
  Percent,
  Repeat,
  Ruler,
  Download,
  Upload,
  Merge,
  Briefcase,
  HandCoins,
  ReceiptText,
  FileMinus,
  FilePlus2,
  Wallet,
  Landmark,
  ClipboardList,
  LineChart,
  MailWarning,
  BadgeDollarSign,
  GitCompare,
  List,
  CheckCircle2,
  Inbox,
  Building2,
  Receipt,
  CreditCard,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  FileSpreadsheet,
  FileBarChart,
  Calculator,
  Newspaper,
  UserCog,
  Lock,
  Globe,
  Eye,
  Gauge,
  Timer,
  AlertCircle,
  ScrollText,
  Wrench,
  Database,
  BookMarked,
  ReceiptIndianRupee,
  Handshake,
  Warehouse,
  Package,
  PackagePlus,
  PackageMinus,
  BarChart4,
  PieChart,
  Network,
  Workflow,
  FileCheck,
  FileWarning,
  Stamp,
  Scale as ScaleIcon,
  FlaskConical,
  Box,
  Boxes,
  Coins,
  Banknote,
  CalendarRange,
  FileStack,
  Folders,
  FolderTree,
  Calculator as CalcIcon
} from 'lucide-react';
import clsx from 'clsx';
import { ROUTES } from '../../../app/constants/routes.js';
import { PERMISSIONS } from '../../../app/constants/permissions.js';
import { uiStore } from '../../../app/store/ui.store.js';
import { PermissionGate } from '../../../app/routes/route-guards.jsx';

const linkBase =
  'group relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/50';
const linkActive =
  'bg-brand-primary/10 text-brand-deep font-semibold ring-1 ring-brand-primary/20 ' +
  'before:absolute before:left-1 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-brand-primary';
const linkIdle = 'text-slate-700 hover:bg-slate-900/5';

function Item({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => clsx(linkBase, isActive ? linkActive : linkIdle)}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-4 w-4 text-slate-500 group-hover:text-slate-700" />
      {collapsed ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export function SideNav() {
  const sidebarOpen = uiStore((s) => s.sidebarOpen);
  return (
    <aside
      className={clsx(
        'relative h-screen overflow-y-scroll border-r border-border-subtle bg-white/70 backdrop-blur transition-all',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand-primary/10 to-transparent" />
      <div className="relative flex h-full flex-col gap-4 p-3">
        <div className={clsx('flex items-center gap-2 px-2 pt-2', !sidebarOpen && 'justify-center')}>
          <div className="h-9 w-9 rounded-xl bg-brand-primary/15 ring-1 ring-brand-primary/20 shadow-sm flex items-center justify-center text-brand-primary font-bold">
            AB
          </div>
          {sidebarOpen ? (
            <div>
              <div className="text-sm font-semibold text-brand-deep leading-none">AptBooks</div>
              <div className="mt-0.5 text-[11px] text-slate-500 leading-none">Accounting</div>
            </div>
          ) : null}
        </div>

        <div className={clsx('px-2 pt-2 text-[11px] font-semibold tracking-wide text-slate-500', !sidebarOpen && 'text-center')}>CORE</div>
        <nav className="space-y-1">
          <Item to={ROUTES.dashboard} icon={Gauge} label="Dashboard" collapsed={!sidebarOpen} />
          <Item to={ROUTES.search} icon={Search} label="Search" collapsed={!sidebarOpen} />
          <Item to={ROUTES.notifications} icon={Bell} label="Inbox" collapsed={!sidebarOpen} />
          <Item to={ROUTES.approvalsInbox} icon={FileCheck} label="Approvals" collapsed={!sidebarOpen} />
        </nav>

        <div className="px-2 pt-2">
          <div className="h-px w-full bg-border-subtle" />
        </div>
        <div className="px-2 pt-2 text-[11px] font-semibold tracking-wide text-slate-500">ACCOUNTING</div>
        <nav className="space-y-1">
          <Item to={ROUTES.accountingCoa} icon={BookMarked} label="Chart of Accounts" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingPeriods} icon={CalendarRange} label="Periods" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingJournals} icon={ScrollText} label="Journals" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingTrialBalance} icon={ScaleIcon} label="Trial Balance" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingAccountActivity} icon={List} label="Account ledgers" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingBalanceSheet} icon={FileBarChart} label="Balance Sheet" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingChangesEquity} icon={TrendingUp} label="Changes In Equity" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingCashflow} icon={RefreshCw} label="Cashflow" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingPnL} icon={BarChart4} label="Statements" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingFx} icon={Globe} label="FX" collapsed={!sidebarOpen} />
          <PermissionGate any={[PERMISSIONS.taxRead]} fallback={null}>
            <Item to={ROUTES.accountingTax} icon={ReceiptIndianRupee} label="Tax" collapsed={!sidebarOpen} />
          </PermissionGate>
          <Item to={ROUTES.accountingAccruals} icon={CalendarClock} label="Accruals" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingImports} icon={Upload} label="Imports" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingExports} icon={Download} label="Exports" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingReconciliation} icon={Merge} label="Reconciliation" collapsed={!sidebarOpen} />
        </nav>

        <PermissionGate any={[PERMISSIONS.partnersRead, PERMISSIONS.partnersManage, PERMISSIONS.transactionsInvoiceRead, PERMISSIONS.transactionsBillRead, PERMISSIONS.collectionsRead, PERMISSIONS.reportingArRead]} fallback={null}>
          <div className="px-2 pt-2">
            <div className="h-px w-full bg-border-subtle" />
          </div>
          <div className="px-2 pt-2 text-[11px] font-semibold tracking-wide text-slate-500">OPERATIONS</div>

          <PermissionGate any={[PERMISSIONS.partnersRead, PERMISSIONS.partnersManage, PERMISSIONS.paymentConfigManage]}>
            <div className="mt-2 px-2 text-[10px] font-semibold tracking-wide text-slate-500/90">BUSINESS</div>
            <nav className="mt-1 space-y-1">
              <Item to={ROUTES.businessCustomers} icon={Handshake} label="Customers" collapsed={!sidebarOpen} />
              <Item to={ROUTES.businessVendors} icon={Briefcase} label="Vendors" collapsed={!sidebarOpen} />
              <PermissionGate any={[PERMISSIONS.paymentConfigManage, PERMISSIONS.partnersRead]}>
                <Item to={ROUTES.businessPaymentConfig} icon={Settings} label="Payment Config" collapsed={!sidebarOpen} />
              </PermissionGate>
            </nav>
          </PermissionGate>

          <PermissionGate any={[PERMISSIONS.transactionsInvoiceRead, PERMISSIONS.transactionsInvoiceManage, PERMISSIONS.transactionsBillRead, PERMISSIONS.transactionsBillManage, PERMISSIONS.customerReceiptRead, PERMISSIONS.vendorPaymentRead, PERMISSIONS.creditNoteRead, PERMISSIONS.debitNoteRead]}>
            <div className="mt-4 px-2 text-[10px] font-semibold tracking-wide text-slate-500/90">TRANSACTIONS</div>
            <nav className="mt-1 space-y-1">
              <PermissionGate any={[PERMISSIONS.transactionsInvoiceRead, PERMISSIONS.transactionsInvoiceManage]}>
                <Item to={ROUTES.invoices} icon={Receipt} label="Invoices" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.transactionsBillRead, PERMISSIONS.transactionsBillManage]}>
                <Item to={ROUTES.bills} icon={FileText} label="Bills" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.customerReceiptRead, PERMISSIONS.customerReceiptManage]}>
                <Item to={ROUTES.customerReceipts} icon={Banknote} label="Customer Receipts" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.vendorPaymentRead, PERMISSIONS.vendorPaymentManage]}>
                <Item to={ROUTES.vendorPayments} icon={Wallet} label="Vendor Payments" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.creditNoteRead, PERMISSIONS.creditNoteManage]}>
                <Item to={ROUTES.creditNotes} icon={FileMinus} label="Credit Notes" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.debitNoteRead, PERMISSIONS.debitNoteManage]}>
                <Item to={ROUTES.debitNotes} icon={FilePlus2} label="Debit Notes" collapsed={!sidebarOpen} />
              </PermissionGate>
            </nav>
          </PermissionGate>

          <PermissionGate any={[PERMISSIONS.collectionsRead, PERMISSIONS.disputesRead, PERMISSIONS.writeoffsRead, PERMISSIONS.paymentPlansRead]}>
            <div className="mt-4 px-2 text-[10px] font-semibold tracking-wide text-slate-500/90">AR OPS</div>
            <nav className="mt-1 space-y-1">
              <PermissionGate any={[PERMISSIONS.collectionsRead, PERMISSIONS.collectionsManage]}>
                <Item to={ROUTES.arCollections} icon={Coins} label="Collections" collapsed={!sidebarOpen} />
                <Item to={ROUTES.arDunning} icon={MailWarning} label="Dunning" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.disputesRead, PERMISSIONS.disputesManage]}>
                <Item to={ROUTES.arDisputes} icon={FileWarning} label="Disputes" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.writeoffsRead, PERMISSIONS.writeoffsManage]}>
                <Item to={ROUTES.arWriteoffs} icon={FileMinus} label="Write-offs" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.paymentPlansRead, PERMISSIONS.paymentPlansManage]}>
                <Item to={ROUTES.arPaymentPlans} icon={CalendarClock} label="Payment Plans" collapsed={!sidebarOpen} />
              </PermissionGate>
            </nav>
          </PermissionGate>

          <PermissionGate any={[PERMISSIONS.assetsFixedAssetsRead, PERMISSIONS.inventoryItemsRead, PERMISSIONS.inventoryTransactionsRead]}>
            <div className="mt-4 px-2 text-[10px] font-semibold tracking-wide text-slate-500/90">ASSETS & INVENTORY</div>
            <nav className="mt-1 space-y-1">
              <PermissionGate any={[PERMISSIONS.assetsCategoriesRead, PERMISSIONS.assetsCategoriesManage]}>
                <Item to={ROUTES.assetsCategories} icon={FolderTree} label="Asset Categories" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.assetsFixedAssetsRead, PERMISSIONS.assetsFixedAssetsManage]}>
                <Item to={ROUTES.assetsRegister} icon={Database} label="Fixed Assets" collapsed={!sidebarOpen} />
                <Item to={ROUTES.assetsDepreciation} icon={TrendingDown} label="Depreciation" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.inventoryCategoriesRead, PERMISSIONS.inventoryCategoriesManage]}>
                <Item to={ROUTES.inventoryCategories} icon={Folders} label="Item Categories" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.inventoryUnitsRead, PERMISSIONS.inventoryUnitsManage]}>
                <Item to={ROUTES.inventoryUnits} icon={Ruler} label="Units" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.inventoryItemsRead, PERMISSIONS.inventoryItemsManage]}>
                <Item to={ROUTES.inventoryItems} icon={Package} label="Items" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.inventoryWarehousesRead, PERMISSIONS.inventoryWarehousesManage]}>
                <Item to={ROUTES.inventoryWarehouses} icon={Warehouse} label="Warehouses" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.inventoryTransactionsRead, PERMISSIONS.inventoryTransactionsManage]}>
                <Item to={ROUTES.inventoryTransactions} icon={ArrowLeftRight} label="Inventory Txns" collapsed={!sidebarOpen} />
                <Item to={ROUTES.inventoryStockCounts} icon={ClipboardList} label="Stock Counts" collapsed={!sidebarOpen} />
                <Item to={ROUTES.inventoryReports} icon={BarChart4} label="Inventory Reports" collapsed={!sidebarOpen} />
              </PermissionGate>
            </nav>
          </PermissionGate>

          <PermissionGate any={[PERMISSIONS.reportingArRead, PERMISSIONS.reportingApRead, PERMISSIONS.reportingTaxRead]}>
            <div className="mt-4 px-2 text-[10px] font-semibold tracking-wide text-slate-500/90">REPORTING</div>
            <nav className="mt-1 space-y-1">
              <PermissionGate any={[PERMISSIONS.reportingArRead]}>
                <Item to={ROUTES.reportArAging} icon={PieChart} label="AR Aging" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.reportingApRead]}>
                <Item to={ROUTES.reportApAging} icon={PieChart} label="AP Aging" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.reportingTaxRead]}>
                <Item to={ROUTES.reportTax} icon={ReceiptIndianRupee} label="Tax Reports" collapsed={!sidebarOpen} />
              </PermissionGate>
            </nav>
          </PermissionGate>

          <PermissionGate any={[PERMISSIONS.reportingBudgetsRead, PERMISSIONS.reportingForecastsRead, PERMISSIONS.reportingKpisRead, PERMISSIONS.reportingReportsRead]}>
            <div className="mt-4 px-2 text-[10px] font-semibold tracking-wide text-slate-500/90">PLANNING</div>
            <nav className="mt-1 space-y-1">
              <PermissionGate any={[PERMISSIONS.reportingCentersRead]}>
                <Item to={ROUTES.planningCenters('cost')} icon={Network} label="Centers" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.reportingProjectsRead]}>
                <Item to={ROUTES.planningProjects} icon={Briefcase} label="Projects" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.reportingBudgetsRead]}>
                <Item to={ROUTES.planningBudgets} icon={PiggyBank} label="Budgets" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.reportingForecastsRead]}>
                <Item to={ROUTES.planningForecasts} icon={LineChart} label="Forecasts" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.reportingAllocationsRead]}>
                <Item to={ROUTES.planningAllocations} icon={Merge} label="Allocations" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.reportingKpisRead]}>
                <Item to={ROUTES.planningKpis} icon={Gauge} label="KPIs" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.reportingDashboardsRead]}>
                <Item to={ROUTES.planningDashboards} icon={LayoutDashboard} label="Dashboards" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.reportingReportsRead]}>
                <Item to={ROUTES.planningSavedReports} icon={FileSpreadsheet} label="Saved Reports" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.reportingManagementRead]}>
                <Item to={ROUTES.planningManagement} icon={UserCog} label="Management" collapsed={!sidebarOpen} />
              </PermissionGate>
            </nav>
          </PermissionGate>
        </PermissionGate>

        <div className="mt-6">
          <div className="px-2 pt-2 text-[11px] font-semibold tracking-wide text-slate-500">BANKING</div>
          <nav className="mt-2 space-y-1">
            <PermissionGate any={[PERMISSIONS.bankingAccountsRead, PERMISSIONS.bankingStatementsRead, PERMISSIONS.bankingReconciliationsRead]} fallback={null}>
              <Item to={ROUTES.banking} icon={Landmark} label="Overview" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.bankingAccountsRead]} fallback={null}>
              <Item to={ROUTES.bankingAccounts} icon={CreditCard} label="Bank Accounts" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.bankingStatementsRead]} fallback={null}>
              <Item to={ROUTES.bankingStatements} icon={ScrollText} label="Statements" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.bankingMatchingRulesManage]} fallback={null}>
              <Item to={ROUTES.bankingMatchingRules} icon={GitCompare} label="Matching Rules" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.bankingCashbookRead]} fallback={null}>
              <Item to={ROUTES.bankingCashbook} icon={BookOpen} label="Cashbook" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.bankingReconciliationsRead]} fallback={null}>
              <Item to={ROUTES.bankingReconciliations} icon={CheckCircle2} label="Reconciliations" collapsed={!sidebarOpen} />
            </PermissionGate>
          </nav>
        </div>

        <div className="mt-6">
          <div className="px-2 pt-2 text-[11px] font-semibold tracking-wide text-slate-500">COMPLIANCE</div>
          <nav className="mt-2 space-y-1">
            <PermissionGate any={[PERMISSIONS.complianceIfrs16Read, PERMISSIONS.complianceIfrs15Read, PERMISSIONS.complianceIfrs9Read, PERMISSIONS.complianceIas12Read]} fallback={null}>
              <Item to={ROUTES.compliance} icon={Stamp} label="Overview" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.complianceIfrs16Read]} fallback={null}>
              <Item to={ROUTES.complianceIFRS16} icon={FileText} label="IFRS 16 (Leases)" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.complianceIfrs15Read]} fallback={null}>
              <Item to={ROUTES.complianceIFRS15} icon={Receipt} label="IFRS 15 (Revenue)" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.complianceIfrs9Read]} fallback={null}>
              <Item to={ROUTES.complianceIFRS9} icon={Calculator} label="IFRS 9 (ECL)" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.complianceIas12Read]} fallback={null}>
              <Item to={ROUTES.complianceIAS12} icon={ReceiptIndianRupee} label="IAS 12 (Taxes)" collapsed={!sidebarOpen} />
            </PermissionGate>
          </nav>
        </div>

        <div className="mt-6">
          <div className="px-2 pt-2 text-[11px] font-semibold tracking-wide text-slate-500">WORKFLOW</div>
          <nav className="mt-2 space-y-1">
            <PermissionGate any={[PERMISSIONS.documentsRead]} fallback={null}>
              <Item to={ROUTES.documents} icon={FileStack} label="Documents" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.documentsManage]} fallback={null}>
              <Item to={ROUTES.documentTypes} icon={Folders} label="Document Types" collapsed={!sidebarOpen} />
              <Item to={ROUTES.documentApprovalLevels} icon={Workflow} label="Approval Levels" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.approvalsInboxRead]} fallback={null}>
              <Item to={ROUTES.workflowApprovalsInbox} icon={Inbox} label="Approvals Inbox" collapsed={!sidebarOpen} />
            </PermissionGate>
          </nav>
        </div>

        <PermissionGate any={[PERMISSIONS.settingsRead, PERMISSIONS.usersRead, PERMISSIONS.rbacRolesRead]} fallback={null}>
          <div className="px-2 pt-2">
            <div className="h-px w-full bg-border-subtle" />
          </div>
          <div className="px-2 pt-2 text-[11px] font-semibold tracking-wide text-slate-500">ADMIN</div>
          <nav className="space-y-1">
            <PermissionGate any={[PERMISSIONS.settingsRead]}>
              <Item to={ROUTES.adminOrg} icon={Building2} label="Organization" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.usersRead]}>
              <Item to={ROUTES.adminUsers} icon={Users} label="Users" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.rbacRolesRead, PERMISSIONS.rbacPermissionsRead]}>
              <Item to={ROUTES.adminRoles} icon={UserCog} label="Roles" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.rbacRolesRead, PERMISSIONS.rbacPermissionsRead]}>
              <Item to={ROUTES.adminPermissions} icon={Lock} label="Permissions" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.settingsRead]}>
              <Item to={ROUTES.adminSettings} icon={Settings} label="Settings" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.dimensionSecurityRead]}>
              <Item to={ROUTES.adminDimensionSecurity} icon={Shield} label="Dimension Security" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.settingsRead]}>
              <Item to={ROUTES.adminApiKeys} icon={KeyRound} label="API Keys" collapsed={!sidebarOpen} />
            </PermissionGate>
          </nav>
        </PermissionGate>

        <PermissionGate any={[PERMISSIONS.settingsRead, PERMISSIONS.clientLogsRead, PERMISSIONS.releaseRead]} fallback={null}>
          <div className="px-2 pt-2">
            <div className="h-px w-full bg-border-subtle" />
          </div>
          <div className="px-2 pt-2 text-[11px] font-semibold tracking-wide text-slate-500">UTILITIES</div>
          <nav className="space-y-1">
            <PermissionGate any={[PERMISSIONS.settingsRead]}>
              <Item to={ROUTES.utilitiesHealth} icon={Activity} label="Health" collapsed={!sidebarOpen} />
              <Item to={ROUTES.utilitiesScheduler} icon={Timer} label="Scheduler" collapsed={!sidebarOpen} />
              <Item to={ROUTES.utilitiesErrors} icon={AlertCircle} label="Errors" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.clientLogsRead]}>
              <Item to={ROUTES.utilitiesClientLogs} icon={ScrollText} label="Client Logs" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.i18nRead]}>
              <Item to={ROUTES.utilitiesI18n} icon={Globe} label="i18n" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.a11yRead]}>
              <Item to={ROUTES.utilitiesA11y} icon={Eye} label="A11y" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.releaseRead]}>
              <Item to={ROUTES.utilitiesRelease} icon={FlaskConical} label="Release" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.testsRun]}>
              <Item to={ROUTES.utilitiesTests} icon={FlaskConical} label="Tests" collapsed={!sidebarOpen} />
            </PermissionGate>
          </nav>
        </PermissionGate>
      </div>
    </aside>
  );
}