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
  Merge
} from 'lucide-react';
import clsx from 'clsx';
import { ROUTES } from '../../../app/constants/routes.js';
import { PERMISSIONS } from '../../../app/constants/permissions.js';
import { uiStore } from '../../../app/store/ui.store.js';
import { PermissionGate } from '../../../app/routes/route-guards.jsx';

const linkBase = 'flex items-center gap-2 rounded-md px-3 py-2 text-sm';
const linkActive = 'bg-slate-100 text-brand-deep font-medium';
const linkIdle = 'text-slate-700 hover:bg-slate-50';

function Item({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => clsx(linkBase, isActive ? linkActive : linkIdle)}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export function SideNav() {
  const sidebarOpen = uiStore((s) => s.sidebarOpen);
  return (
    <aside
      className={clsx(
        'h-full border-r border-slate-200 bg-white transition-all',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      <div className="flex h-full flex-col gap-4 p-3">
        <div className="px-2 pt-2 text-xs font-semibold text-slate-500">CORE</div>
        <nav className="space-y-1">
          <Item to={ROUTES.dashboard} icon={LayoutDashboard} label={sidebarOpen ? 'Dashboard' : ''} />
          <Item to={ROUTES.search} icon={Search} label={sidebarOpen ? 'Search' : ''} />
          <Item to={ROUTES.notifications} icon={Bell} label={sidebarOpen ? 'Inbox' : ''} />
          <Item to={ROUTES.approvalsInbox} icon={Shield} label={sidebarOpen ? 'Approvals' : ''} />
        </nav>

        <div className="px-2 pt-4 text-xs font-semibold text-slate-500">ACCOUNTING</div>
        <nav className="space-y-1">
          <Item to={ROUTES.accountingCoa} icon={BookOpen} label={sidebarOpen ? 'Chart of Accounts' : ''} />
          <Item to={ROUTES.accountingPeriods} icon={CalendarClock} label={sidebarOpen ? 'Periods' : ''} />
          <Item to={ROUTES.accountingJournals} icon={FileText} label={sidebarOpen ? 'Journals' : ''} />
          <Item to={ROUTES.accountingTrialBalance} icon={Scale} label={sidebarOpen ? 'Trial Balance' : ''} />
          <Item to={ROUTES.accountingPnL} icon={BarChart3} label={sidebarOpen ? 'Statements' : ''} />
          <Item to={ROUTES.accountingFx} icon={ArrowLeftRight} label={sidebarOpen ? 'FX' : ''} />
          <PermissionGate any={[PERMISSIONS.taxRead]} fallback={null}>
            <Item to={ROUTES.accountingTax} icon={Percent} label={sidebarOpen ? 'Tax' : ''} />
          </PermissionGate>
          <Item to={ROUTES.accountingAccruals} icon={Repeat} label={sidebarOpen ? 'Accruals' : ''} />
          <Item to={ROUTES.accountingImports} icon={Upload} label={sidebarOpen ? 'Imports' : ''} />
          <Item to={ROUTES.accountingExports} icon={Download} label={sidebarOpen ? 'Exports' : ''} />
          <Item to={ROUTES.accountingReconciliation} icon={Merge} label={sidebarOpen ? 'Reconciliation' : ''} />
        </nav>

        <PermissionGate any={[PERMISSIONS.settingsRead, PERMISSIONS.usersRead, PERMISSIONS.rbacRolesRead]} fallback={null}>
          <div className="px-2 pt-4 text-xs font-semibold text-slate-500">ADMIN</div>
          <nav className="space-y-1">
            <PermissionGate any={[PERMISSIONS.settingsRead]}>
              <Item to={ROUTES.adminOrg} icon={Sliders} label={sidebarOpen ? 'Organization' : ''} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.usersRead]}>
              <Item to={ROUTES.adminUsers} icon={Users} label={sidebarOpen ? 'Users' : ''} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.rbacRolesRead, PERMISSIONS.rbacPermissionsRead]}>
              <Item to={ROUTES.adminRoles} icon={Shield} label={sidebarOpen ? 'Roles' : ''} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.settingsRead]}>
              <Item to={ROUTES.adminSettings} icon={Settings} label={sidebarOpen ? 'Settings' : ''} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.dimensionSecurityRead]}>
              <Item to={ROUTES.adminDimensionSecurity} icon={Shield} label={sidebarOpen ? 'Dimension Security' : ''} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.settingsRead]}>
              <Item to={ROUTES.adminApiKeys} icon={KeyRound} label={sidebarOpen ? 'API Keys' : ''} />
            </PermissionGate>
          </nav>
        </PermissionGate>

        <PermissionGate any={[PERMISSIONS.settingsRead, PERMISSIONS.clientLogsRead, PERMISSIONS.releaseRead]} fallback={null}>
          <div className="px-2 pt-4 text-xs font-semibold text-slate-500">UTILITIES</div>
          <nav className="space-y-1">
            <PermissionGate any={[PERMISSIONS.settingsRead]}>
              <Item to={ROUTES.utilitiesHealth} icon={Activity} label={sidebarOpen ? 'Health' : ''} />
              <Item to={ROUTES.utilitiesScheduler} icon={Activity} label={sidebarOpen ? 'Scheduler' : ''} />
              <Item to={ROUTES.utilitiesErrors} icon={Activity} label={sidebarOpen ? 'Errors' : ''} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.clientLogsRead]}>
              <Item to={ROUTES.utilitiesClientLogs} icon={Activity} label={sidebarOpen ? 'Client Logs' : ''} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.i18nRead]}>
              <Item to={ROUTES.utilitiesI18n} icon={Activity} label={sidebarOpen ? 'i18n' : ''} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.a11yRead]}>
              <Item to={ROUTES.utilitiesA11y} icon={Activity} label={sidebarOpen ? 'A11y' : ''} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.releaseRead]}>
              <Item to={ROUTES.utilitiesRelease} icon={Activity} label={sidebarOpen ? 'Release' : ''} />
            </PermissionGate>
            <PermissionGate any={[PERMISSIONS.testsRun]}>
              <Item to={ROUTES.utilitiesTests} icon={Activity} label={sidebarOpen ? 'Tests' : ''} />
            </PermissionGate>
          </nav>
        </PermissionGate>
      </div>
    </aside>
  );
}
