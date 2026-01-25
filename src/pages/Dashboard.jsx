import React from 'react'; 
import { Link } from 'react-router-dom'; 
import {
  BookOpen,
  FileText,
  Scale,
  BarChart3,
  ArrowLeftRight,
  Bell,
  Shield,
  Search
} from 'lucide-react'; 
import { ROUTES } from '../app/constants/routes.js'; 
import { useAuth } from '../shared/hooks/useAuth.js'; 
import { ContentCard } from '../shared/components/layout/ContentCard.jsx'; 
import { PageHeader } from '../shared/components/layout/PageHeader.jsx'; 
import { Button } from '../shared/components/ui/Button.jsx'; 

export default function Dashboard() {
  const { user } = useAuth(); 

  return (
    <div className="app-page">
      <PageHeader
        title="Dashboard"
        subtitle={`Signed in as ${user?.email ?? '—'}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => (window.location.href = ROUTES.accountingJournals)}>
              <FileText className="h-4 w-4" />
              New journal
            </Button>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = ROUTES.search)}>
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="app-kpi">
          <div className="app-kpi-label">Accounting period</div>
          <div className="app-kpi-value">Current</div>
          <div className="mt-2 text-xs text-slate-600">Select and close periods from Accounting → Periods.</div>
        </div>
        <div className="app-kpi">
          <div className="app-kpi-label">Journals workflow</div>
          <div className="app-kpi-value">Draft → Post</div>
          <div className="mt-2 text-xs text-slate-600">Submit, approve, and post with guarded actions.</div>
        </div>
        <div className="app-kpi">
          <div className="app-kpi-label">Statements</div>
          <div className="app-kpi-value">Ready</div>
          <div className="mt-2 text-xs text-slate-600">P&L, balance sheet, cash flow, changes in equity.</div>
        </div>
        <div className="app-kpi">
          <div className="app-kpi-label">Ops</div>
          <div className="app-kpi-value">Healthy</div>
          <div className="mt-2 text-xs text-slate-600">Utilities expose health, errors, scheduler and logs.</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ContentCard
          title="Accounting"
          actions={<Link to={ROUTES.accountingCoa}><Button variant="ghost" size="sm">Open</Button></Link>}
        >
          <div className="grid gap-2">
            <Link className="group flex items-center justify-between rounded-xl border border-border-subtle bg-white/60 px-4 py-3 shadow-sm transition hover:bg-white" to={ROUTES.accountingCoa}>
              <span className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-deep">
                  <BookOpen className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-brand-deep">Chart of Accounts</span>
                  <span className="block text-xs text-slate-600">Create, edit, archive accounts</span>
                </span>
              </span>
              <span className="text-xs text-slate-500 group-hover:text-slate-700">→</span>
            </Link>

            <Link className="group flex items-center justify-between rounded-xl border border-border-subtle bg-white/60 px-4 py-3 shadow-sm transition hover:bg-white" to={ROUTES.accountingJournals}>
              <span className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-deep">
                  <FileText className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-brand-deep">Journals</span>
                  <span className="block text-xs text-slate-600">Draft, submit, approve, post, void</span>
                </span>
              </span>
              <span className="text-xs text-slate-500 group-hover:text-slate-700">→</span>
            </Link>

            <Link className="group flex items-center justify-between rounded-xl border border-border-subtle bg-white/60 px-4 py-3 shadow-sm transition hover:bg-white" to={ROUTES.accountingTrialBalance}>
              <span className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-deep">
                  <Scale className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-brand-deep">Trial Balance</span>
                  <span className="block text-xs text-slate-600">Balances and activity for periods</span>
                </span>
              </span>
              <span className="text-xs text-slate-500 group-hover:text-slate-700">→</span>
            </Link>
          </div>
        </ContentCard>

        <ContentCard title="Reports" actions={<Link to={ROUTES.accountingPnL}><Button variant="ghost" size="sm">View</Button></Link>}>
          <div className="grid gap-2">
            <Link className="app-surface flex items-center gap-3 p-4 hover:bg-white" to={ROUTES.accountingPnL}>
              <BarChart3 className="h-4 w-4 text-slate-600" />
              <div>
                <div className="text-sm font-semibold text-brand-deep">Statements</div>
                <div className="text-xs text-slate-600">P&L, balance sheet, cash flow and equity</div>
              </div>
            </Link>
            <Link className="app-surface flex items-center gap-3 p-4 hover:bg-white" to={ROUTES.accountingFx}>
              <ArrowLeftRight className="h-4 w-4 text-slate-600" />
              <div>
                <div className="text-sm font-semibold text-brand-deep">FX</div>
                <div className="text-xs text-slate-600">Rate types, rates, effective lookups</div>
              </div>
            </Link>
          </div>
        </ContentCard>

        <ContentCard title="Work queue" actions={<Link to={ROUTES.notifications}><Button variant="ghost" size="sm">Open</Button></Link>}>
          <div className="grid gap-2">
            <Link className="app-surface flex items-center gap-3 p-4 hover:bg-white" to={ROUTES.notifications}>
              <Bell className="h-4 w-4 text-slate-600" />
              <div>
                <div className="text-sm font-semibold text-brand-deep">Notifications</div>
                <div className="text-xs text-slate-600">Track system and workflow events</div>
              </div>
            </Link>
            <Link className="app-surface flex items-center gap-3 p-4 hover:bg-white" to={ROUTES.approvalsInbox}>
              <Shield className="h-4 w-4 text-slate-600" />
              <div>
                <div className="text-sm font-semibold text-brand-deep">Approvals</div>
                <div className="text-xs text-slate-600">Review and act on pending items</div>
              </div>
            </Link>
          </div>
        </ContentCard>
      </div>
    </div>
  ); 
}
