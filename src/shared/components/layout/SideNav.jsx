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
  Activity,
  BookOpen,
  CalendarClock,
  FileText,
  Scale,
  BarChart3,
  ArrowLeftRight,
  Percent,
  Repeat,
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
  BadgeDollarSign
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
        'relative h-full border-r border-border-subtle bg-white/70 backdrop-blur transition-all',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand-primary/10 to-transparent" />
      <div className="relative flex h-full flex-col gap-4 p-3">
        <div className={clsx('flex items-center gap-2 px-2 pt-2', !sidebarOpen && 'justify-center')}>
          <div className="h-9 w-9 rounded-xl bg-brand-primary/15 ring-1 ring-brand-primary/20 shadow-sm" />
          {sidebarOpen ? (
            <div>
              <div className="text-sm font-semibold text-brand-deep leading-none">AptBooks</div>
              <div className="mt-0.5 text-[11px] text-slate-500 leading-none">Accounting</div>
            </div>
          ) : null}
        </div>

        <div className={clsx('px-2 pt-2 text-[11px] font-semibold tracking-wide text-slate-500', !sidebarOpen && 'text-center')}>CORE</div>
        <nav className="space-y-1">
          <Item to={ROUTES.dashboard} icon={LayoutDashboard} label="Dashboard" collapsed={!sidebarOpen} />
          <Item to={ROUTES.search} icon={Search} label="Search" collapsed={!sidebarOpen} />
          <Item to={ROUTES.notifications} icon={Bell} label="Inbox" collapsed={!sidebarOpen} />
          <Item to={ROUTES.approvalsInbox} icon={Shield} label="Approvals" collapsed={!sidebarOpen} />
        </nav>

        <div className="px-2 pt-2">
          <div className="h-px w-full bg-border-subtle" />
        </div>
        <div className="px-2 pt-2 text-[11px] font-semibold tracking-wide text-slate-500">ACCOUNTING</div>
        <nav className="space-y-1">
          <Item to={ROUTES.accountingCoa} icon={BookOpen} label="Chart of Accounts" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingPeriods} icon={CalendarClock} label="Periods" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingJournals} icon={FileText} label="Journals" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingTrialBalance} icon={Scale} label="Trial Balance" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingPnL} icon={BarChart3} label="Statements" collapsed={!sidebarOpen} />
          <Item to={ROUTES.accountingFx} icon={ArrowLeftRight} label="FX" collapsed={!sidebarOpen} />
          <PermissionGate any={[PERMISSIONS.taxRead]} fallback={null}>
            <Item to={ROUTES.accountingTax} icon={Percent} label="Tax" collapsed={!sidebarOpen} />
          </PermissionGate>
          <Item to={ROUTES.accountingAccruals} icon={Repeat} label="Accruals" collapsed={!sidebarOpen} />
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
              <Item to={ROUTES.businessCustomers} icon={Briefcase} label="Customers" collapsed={!sidebarOpen} />
              <Item to={ROUTES.businessVendors} icon={Briefcase} label="Vendors" collapsed={!sidebarOpen} />
              <PermissionGate any={[PERMISSIONS.paymentConfigManage, PERMISSIONS.partnersRead]}>
                <Item to={ROUTES.businessPaymentConfig} icon={Sliders} label="Payment Config" collapsed={!sidebarOpen} />
              </PermissionGate>
            </nav>
          </PermissionGate>

          <PermissionGate any={[PERMISSIONS.transactionsInvoiceRead, PERMISSIONS.transactionsInvoiceManage, PERMISSIONS.transactionsBillRead, PERMISSIONS.transactionsBillManage, PERMISSIONS.customerReceiptRead, PERMISSIONS.vendorPaymentRead, PERMISSIONS.creditNoteRead, PERMISSIONS.debitNoteRead]}>
            <div className="mt-4 px-2 text-[10px] font-semibold tracking-wide text-slate-500/90">TRANSACTIONS</div>
            <nav className="mt-1 space-y-1">
              <PermissionGate any={[PERMISSIONS.transactionsInvoiceRead, PERMISSIONS.transactionsInvoiceManage]}>
                <Item to={ROUTES.invoices} icon={ReceiptText} label="Invoices" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.transactionsBillRead, PERMISSIONS.transactionsBillManage]}>
                <Item to={ROUTES.bills} icon={FileText} label="Bills" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.customerReceiptRead, PERMISSIONS.customerReceiptManage]}>
                <Item to={ROUTES.customerReceipts} icon={HandCoins} label="Customer Receipts" collapsed={!sidebarOpen} />
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
                <Item to={ROUTES.arCollections} icon={ClipboardList} label="Collections" collapsed={!sidebarOpen} />
                <Item to={ROUTES.arDunning} icon={MailWarning} label="Dunning" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.disputesRead, PERMISSIONS.disputesManage]}>
                <Item to={ROUTES.arDisputes} icon={Shield} label="Disputes" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.writeoffsRead, PERMISSIONS.writeoffsManage]}>
                <Item to={ROUTES.arWriteoffs} icon={BadgeDollarSign} label="Write-offs" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.paymentPlansRead, PERMISSIONS.paymentPlansManage]}>
                <Item to={ROUTES.arPaymentPlans} icon={Landmark} label="Payment Plans" collapsed={!sidebarOpen} />
              </PermissionGate>
            </nav>
          </PermissionGate>

          <PermissionGate any={[PERMISSIONS.reportingArRead, PERMISSIONS.reportingApRead, PERMISSIONS.reportingTaxRead]}>
            <div className="mt-4 px-2 text-[10px] font-semibold tracking-wide text-slate-500/90">REPORTING</div>
            <nav className="mt-1 space-y-1">
              <PermissionGate any={[PERMISSIONS.reportingArRead]}>
                <Item to={ROUTES.reportArAging} icon={LineChart} label="AR Aging" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.reportingApRead]}>
                <Item to={ROUTES.reportApAging} icon={LineChart} label="AP Aging" collapsed={!sidebarOpen} />
              </PermissionGate>
              <PermissionGate any={[PERMISSIONS.reportingTaxRead]}>
                <Item to={ROUTES.reportTax} icon={Percent} label="Tax Reports" collapsed={!sidebarOpen} />
              </PermissionGate>
            </nav>
          </PermissionGate>
        </PermissionGate>

        <PermissionGate any={[PERMISSIONS.settingsRead, PERMISSIONS.usersRead, PERMISSIONS.rbacRolesRead]} fallback={null}>
          <div className="px-2 pt-2">
            <div className="h-px w-full bg-border-subtle" />
          </div>
          <div className="px-2 pt-2 text-[11px] font-semibold tracking-wide text-slate-500">ADMIN</div>
          <nav className="space-y-1">
            <PermissionGate any={[PERMISSIONS.settingsRead]}>
              <Item to={ROUTES.adminOrg} icon={Sliders} label="Organization" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.usersRead]}>
              <Item to={ROUTES.adminUsers} icon={Users} label="Users" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.rbacRolesRead, PERMISSIONS.rbacPermissionsRead]}>
              <Item to={ROUTES.adminRoles} icon={Shield} label="Roles" collapsed={!sidebarOpen} />
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
              <Item to={ROUTES.utilitiesScheduler} icon={Activity} label="Scheduler" collapsed={!sidebarOpen} />
              <Item to={ROUTES.utilitiesErrors} icon={Activity} label="Errors" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.clientLogsRead]}>
              <Item to={ROUTES.utilitiesClientLogs} icon={Activity} label="Client Logs" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.i18nRead]}>
              <Item to={ROUTES.utilitiesI18n} icon={Activity} label="i18n" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.a11yRead]}>
              <Item to={ROUTES.utilitiesA11y} icon={Activity} label="A11y" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.releaseRead]}>
              <Item to={ROUTES.utilitiesRelease} icon={Activity} label="Release" collapsed={!sidebarOpen} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.testsRun]}>
              <Item to={ROUTES.utilitiesTests} icon={Activity} label="Tests" collapsed={!sidebarOpen} />
            </PermissionGate>
          </nav>
        </PermissionGate>
      </div>
    </aside>
  );
}
