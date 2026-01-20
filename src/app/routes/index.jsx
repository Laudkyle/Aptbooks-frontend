import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, GuestRoute, PermissionGate } from './route-guards.jsx';
import { ROUTES } from '../constants/routes.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { AppShell } from '../../shared/components/layout/AppShell.jsx';

import Dashboard from '../../pages/Dashboard.jsx';
import Me from '../../pages/Me.jsx';
import NotFound from '../../pages/NotFound.jsx';
import Forbidden from '../../pages/Forbidden.jsx';

const Login = lazy(() => import('../../features/auth/pages/Login.jsx'));
const Register = lazy(() => import('../../features/auth/pages/Register.jsx'));
const ForgotPassword = lazy(() => import('../../features/auth/pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('../../features/auth/pages/ResetPassword.jsx'));

const GlobalSearch = lazy(() => import('../../features/search/pages/GlobalSearch.jsx'));
const NotificationCenter = lazy(() => import('../../features/notifications/pages/NotificationCenter.jsx'));
const ApprovalQueue = lazy(() => import('../../features/workflow/approvals/pages/ApprovalQueue.jsx'));

const OrganizationSettings = lazy(() => import('../../features/foundation/organizations/pages/OrganizationSettings.jsx'));
const UserList = lazy(() => import('../../features/foundation/users/pages/UserList.jsx'));
const UserDetail = lazy(() => import('../../features/foundation/users/pages/UserDetail.jsx'));
const RoleList = lazy(() => import('../../features/foundation/roles/pages/RoleList.jsx'));
const RoleDetail = lazy(() => import('../../features/foundation/roles/pages/RoleDetail.jsx'));
const PermissionMatrix = lazy(() => import('../../features/foundation/permissions/pages/PermissionMatrix.jsx'));
const SystemSettings = lazy(() => import('../../features/foundation/settings/pages/SystemSettings.jsx'));
const DimensionRules = lazy(() => import('../../features/foundation/dimensionSecurity/pages/DimensionRules.jsx'));
const ApiKeyList = lazy(() => import('../../features/foundation/apiKeys/pages/ApiKeyList.jsx'));

const SystemHealth = lazy(() => import('../../features/utilities/pages/SystemHealth.jsx'));
const ScheduledTasks = lazy(() => import('../../features/utilities/pages/ScheduledTasks.jsx'));
const ErrorLogs = lazy(() => import('../../features/utilities/pages/ErrorLogs.jsx'));
const ClientLogs = lazy(() => import('../../features/utilities/pages/ClientLogs.jsx'));
const I18nAdmin = lazy(() => import('../../features/utilities/pages/I18nAdmin.jsx'));
const A11yChecks = lazy(() => import('../../features/utilities/pages/A11yChecks.jsx'));
const ReleaseInfo = lazy(() => import('../../features/utilities/pages/ReleaseInfo.jsx'));
const TestConsole = lazy(() => import('../../features/utilities/pages/TestConsole.jsx'));

// Phase 4 — Accounting
const AccountList = lazy(() => import('../../features/accounting/chartOfAccounts/pages/AccountList.jsx'));
const AccountCreate = lazy(() => import('../../features/accounting/chartOfAccounts/pages/AccountCreate.jsx'));
const AccountDetail = lazy(() => import('../../features/accounting/chartOfAccounts/pages/AccountDetail.jsx'));

const PeriodList = lazy(() => import('../../features/accounting/periods/pages/PeriodList.jsx'));
const PeriodClose = lazy(() => import('../../features/accounting/periods/pages/PeriodClose.jsx'));

const JournalList = lazy(() => import('../../features/accounting/journals/pages/JournalList.jsx'));
const JournalCreate = lazy(() => import('../../features/accounting/journals/pages/JournalCreate.jsx'));
const JournalDetail = lazy(() => import('../../features/accounting/journals/pages/JournalDetail.jsx'));

const TrialBalance = lazy(() => import('../../features/accounting/balances/pages/TrialBalance.jsx'));
const BalanceByAccount = lazy(() => import('../../features/accounting/balances/pages/BalanceByAccount.jsx'));

const PnL = lazy(() => import('../../features/accounting/statements/pages/PnL.jsx'));
const BalanceSheet = lazy(() => import('../../features/accounting/statements/pages/BalanceSheet.jsx'));
const Cashflow = lazy(() => import('../../features/accounting/statements/pages/Cashflow.jsx'));
const ChangesInEquity = lazy(() => import('../../features/accounting/statements/pages/ChangesInEquity.jsx'));

const ExportsHub = lazy(() => import('../../features/accounting/exports/pages/ExportsHub.jsx'));
const ImportsHub = lazy(() => import('../../features/accounting/imports/pages/ImportsHub.jsx'));

const FxRates = lazy(() => import('../../features/accounting/fx/pages/FxRates.jsx'));
const TaxAdmin = lazy(() => import('../../features/accounting/tax/pages/TaxAdmin.jsx'));

const AccrualsHub = lazy(() => import('../../features/accounting/accruals/pages/AccrualsHub.jsx'));
const AccrualCreate = lazy(() => import('../../features/accounting/accruals/pages/AccrualCreate.jsx'));

const Reconciliation = lazy(() => import('../../features/accounting/reconciliation/pages/Reconciliation.jsx'));

function Loader() {
  return (
    <div className="p-4 text-sm text-slate-600">
      Loading…
    </div>
  );
}

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
        )
      },
      {
        path: ROUTES.register,
        element: (
          <Lazy>
            <Register />
          </Lazy>
        )
      },
      {
        path: ROUTES.forgotPassword,
        element: (
          <Lazy>
            <ForgotPassword />
          </Lazy>
        )
      },
      {
        path: ROUTES.resetPassword,
        element: (
          <Lazy>
            <ResetPassword />
          </Lazy>
        )
      }
    ]
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
            )
          },
          {
            path: ROUTES.notifications,
            element: (
              <Lazy>
                <NotificationCenter />
              </Lazy>
            )
          },
          {
            path: ROUTES.approvalsInbox,
            element: (
              <Lazy>
                <ApprovalQueue />
              </Lazy>
            )
          },

          
          // Phase 4 — Accounting
          {
            path: ROUTES.accountingCoa,
            element: (
              <Lazy>
                <AccountList />
              </Lazy>
            )
          },
          {
            path: ROUTES.accountingCoaNew,
            element: (
              <Lazy>
                <AccountCreate />
              </Lazy>
            )
          },
          {
            path: ROUTES.accountingCoaDetail(),
            element: (
              <Lazy>
                <AccountDetail />
              </Lazy>
            )
          },
          {
            path: ROUTES.accountingCoaEdit(),
            element: (
              <Lazy>
                <AccountDetail mode="edit" />
              </Lazy>
            )
          },

          {
            path: ROUTES.accountingPeriods,
            element: (
              <Lazy>
                <PeriodList />
              </Lazy>
            )
          },
          {
            path: ROUTES.accountingPeriodClose(),
            element: (
              <Lazy>
                <PeriodClose />
              </Lazy>
            )
          },

          {
            path: ROUTES.accountingJournals,
            element: (
              <Lazy>
                <JournalList />
              </Lazy>
            )
          },
          {
            path: ROUTES.accountingJournalNew,
            element: (
              <Lazy>
                <JournalCreate />
              </Lazy>
            )
          },
          {
            path: ROUTES.accountingJournalDetail(),
            element: (
              <Lazy>
                <JournalDetail />
              </Lazy>
            )
          },

          {
            path: ROUTES.accountingTrialBalance,
            element: (
              <Lazy>
                <TrialBalance />
              </Lazy>
            )
          },
          {
            path: ROUTES.accountingAccountActivity,
            element: (
              <Lazy>
                <BalanceByAccount />
              </Lazy>
            )
          },

          {
            path: ROUTES.accountingPnL,
            element: (
              <Lazy>
                <PnL />
              </Lazy>
            )
          },
          {
            path: ROUTES.accountingBalanceSheet,
            element: (
              <Lazy>
                <BalanceSheet />
              </Lazy>
            )
          },
          {
            path: ROUTES.accountingCashflow,
            element: (
              <Lazy>
                <Cashflow />
              </Lazy>
            )
          },
          {
            path: ROUTES.accountingChangesEquity,
            element: (
              <Lazy>
                <ChangesInEquity />
              </Lazy>
            )
          },

          {
            path: ROUTES.accountingExports,
            element: (
              <Lazy>
                <ExportsHub />
              </Lazy>
            )
          },
          {
            path: ROUTES.accountingImports,
            element: (
              <Lazy>
                <ImportsHub />
              </Lazy>
            )
          },

          {
            path: ROUTES.accountingFx,
            element: (
              <Lazy>
                <FxRates />
              </Lazy>
            )
          },

          {
            path: ROUTES.accountingTax,
            element: (
              <RequirePermission any={[PERMISSIONS.taxRead]}>
                <Lazy>
                  <TaxAdmin />
                </Lazy>
              </RequirePermission>
            )
          },

          {
            path: ROUTES.accountingAccruals,
            element: (
              <Lazy>
                <AccrualsHub />
              </Lazy>
            )
          },
          {
            path: ROUTES.accountingAccrualNew,
            element: (
              <Lazy>
                <AccrualCreate />
              </Lazy>
            )
          },

          {
            path: ROUTES.accountingReconciliation,
            element: (
              <Lazy>
                <Reconciliation />
              </Lazy>
            )
          },

// Admin
          {
            path: ROUTES.adminOrg,
            element: (
              <RequirePermission any={[PERMISSIONS.settingsRead, PERMISSIONS.settingsManage]}>
                <Lazy>
                  <OrganizationSettings />
                </Lazy>
              </RequirePermission>
            )
          },
          {
            path: ROUTES.adminUsers,
            element: (
              <RequirePermission any={[PERMISSIONS.usersRead, PERMISSIONS.usersManage]}>
                <Lazy>
                  <UserList />
                </Lazy>
              </RequirePermission>
            )
          },
          {
            path: ROUTES.adminUserDetail(),
            element: (
              <RequirePermission any={[PERMISSIONS.usersRead, PERMISSIONS.usersManage]}>
                <Lazy>
                  <UserDetail />
                </Lazy>
              </RequirePermission>
            )
          },
          {
            path: ROUTES.adminRoles,
            element: (
              <RequirePermission any={[PERMISSIONS.rbacRolesRead, PERMISSIONS.rbacRolesManage]}>
                <Lazy>
                  <RoleList />
                </Lazy>
              </RequirePermission>
            )
          },
          {
            path: ROUTES.adminRoleDetail(),
            element: (
              <RequirePermission any={[PERMISSIONS.rbacRolesRead, PERMISSIONS.rbacRolesManage]}>
                <Lazy>
                  <RoleDetail />
                </Lazy>
              </RequirePermission>
            )
          },
          {
            path: ROUTES.adminPermissions,
            element: (
              <RequirePermission any={[PERMISSIONS.rbacPermissionsRead, PERMISSIONS.rbacRolesRead]}>
                <Lazy>
                  <PermissionMatrix />
                </Lazy>
              </RequirePermission>
            )
          },
          {
            path: ROUTES.adminSettings,
            element: (
              <RequirePermission any={[PERMISSIONS.settingsRead, PERMISSIONS.settingsManage]}>
                <Lazy>
                  <SystemSettings />
                </Lazy>
              </RequirePermission>
            )
          },
          {
            path: ROUTES.adminDimensionSecurity,
            element: (
              <RequirePermission any={[PERMISSIONS.dimensionSecurityRead, PERMISSIONS.dimensionSecurityManage]}>
                <Lazy>
                  <DimensionRules />
                </Lazy>
              </RequirePermission>
            )
          },
          {
            path: ROUTES.adminApiKeys,
            element: (
              <RequirePermission any={[PERMISSIONS.settingsRead, PERMISSIONS.settingsManage]}>
                <Lazy>
                  <ApiKeyList />
                </Lazy>
              </RequirePermission>
            )
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
            )
          },
          {
            path: ROUTES.utilitiesScheduler,
            element: (
              <RequirePermission any={[PERMISSIONS.settingsRead]}>
                <Lazy>
                  <ScheduledTasks />
                </Lazy>
              </RequirePermission>
            )
          },
          {
            path: ROUTES.utilitiesErrors,
            element: (
              <RequirePermission any={[PERMISSIONS.settingsRead]}>
                <Lazy>
                  <ErrorLogs />
                </Lazy>
              </RequirePermission>
            )
          },
          {
            path: ROUTES.utilitiesClientLogs,
            element: (
              <RequirePermission any={[PERMISSIONS.clientLogsRead]}>
                <Lazy>
                  <ClientLogs />
                </Lazy>
              </RequirePermission>
            )
          },
          {
            path: ROUTES.utilitiesI18n,
            element: (
              <RequirePermission any={[PERMISSIONS.i18nRead]}>
                <Lazy>
                  <I18nAdmin />
                </Lazy>
              </RequirePermission>
            )
          },
          {
            path: ROUTES.utilitiesA11y,
            element: (
              <RequirePermission any={[PERMISSIONS.a11yRead]}>
                <Lazy>
                  <A11yChecks />
                </Lazy>
              </RequirePermission>
            )
          },
          {
            path: ROUTES.utilitiesRelease,
            element: (
              <RequirePermission any={[PERMISSIONS.releaseRead]}>
                <Lazy>
                  <ReleaseInfo />
                </Lazy>
              </RequirePermission>
            )
          },
          {
            path: ROUTES.utilitiesTests,
            element: (
              <RequirePermission any={[PERMISSIONS.testsRun]}>
                <Lazy>
                  <TestConsole />
                </Lazy>
              </RequirePermission>
            )
          },

          { path: '/forbidden', element: <Forbidden /> },
          { path: '*', element: <NotFound /> }
        ]
      }
    ]
  },
  { path: '*', element: <Navigate to={ROUTES.dashboard} replace /> }
]);
