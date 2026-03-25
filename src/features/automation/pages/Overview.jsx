import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BellRing, Bot, CalendarSync, FileSearch, Globe2, ReceiptText, RefreshCcw, ShieldCheck, Workflow } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAutomationApi } from '../api/automation.api.js';
import { makeTaxApi } from '../../accounting/tax/api/tax.api.js';
import { makeReportingApi } from '../../reporting/api/reporting.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { ROUTES } from '../../../app/constants/routes.js';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { normalizeRows } from '../../../shared/tax/frontendTax.js';

export default function AutomationOverview() {
  const { http } = useApi();
  const api = useMemo(() => makeAutomationApi(http), [http]);
  const taxApi = useMemo(() => makeTaxApi(http), [http]);
  const reportingApi = useMemo(() => makeReportingApi(http), [http]);

  const recurringQ = useQuery({ queryKey: ['automation.overview.recurring'], queryFn: () => api.listRecurringTransactions(), staleTime: 30000 });
  const jobsQ = useQuery({ queryKey: ['automation.overview.jobs'], queryFn: () => api.listAccountingJobs(), staleTime: 30000 });
  const reconRunsQ = useQuery({ queryKey: ['automation.overview.reconRuns'], queryFn: () => api.listAutoReconciliationRuns(), staleTime: 30000 });
  const matchesQ = useQuery({ queryKey: ['automation.overview.matches'], queryFn: () => api.listDocumentMatches({ minScore: 0.8 }), staleTime: 30000 });
  const rulesQ = useQuery({ queryKey: ['automation.overview.classificationRules'], queryFn: () => api.listClassificationRules(), staleTime: 30000 });
  const notificationsQ = useQuery({ queryKey: ['automation.overview.notifications'], queryFn: () => api.listSmartNotificationEvents(), staleTime: 30000 });
  const taxAutomationQ = useQuery({ queryKey: ['automation.overview.taxAutomation'], queryFn: () => taxApi.listAutomationRules({}), staleTime: 30000 });
  const filingAdaptersQ = useQuery({ queryKey: ['automation.overview.filingAdapters'], queryFn: () => taxApi.listFilingAdapters({}), staleTime: 30000 });
  const realtimeFilingsQ = useQuery({ queryKey: ['automation.overview.realtimeFilings'], queryFn: () => reportingApi.tax.realtimeFilings({ dateFrom: new Date().toISOString().slice(0, 10) }), staleTime: 30000 });
  const countryPacksQ = useQuery({ queryKey: ['automation.overview.countryPacks'], queryFn: () => taxApi.listCountryPacks({}), staleTime: 30000 });

  const cards = [
    { title: 'Recurring transactions', value: normalizeRows(recurringQ.data).length, desc: 'Scheduled accounting entries', to: ROUTES.automationRecurringTransactions, icon: CalendarSync },
    { title: 'Accounting jobs', value: normalizeRows(jobsQ.data).length, desc: 'Batch jobs and scheduler entries', to: ROUTES.automationAccountingJobs, icon: Workflow },
    { title: 'Reconciliation runs', value: normalizeRows(reconRunsQ.data).length, desc: 'Auto-reconciliation executions', to: ROUTES.automationAutoReconciliation, icon: RefreshCcw },
    { title: 'Document matches', value: normalizeRows(matchesQ.data).length, desc: 'Current matching suggestions', to: ROUTES.automationDocumentMatching, icon: FileSearch },
    { title: 'Classification rules', value: normalizeRows(rulesQ.data).length, desc: 'AI and deterministic classification', to: ROUTES.automationAiClassification, icon: Bot },
    { title: 'Notification events', value: normalizeRows(notificationsQ.data).length, desc: 'Recent smart alerts', to: ROUTES.automationSmartNotifications, icon: BellRing },
    { title: 'Tax automation rules', value: normalizeRows(taxAutomationQ.data).length, desc: 'Tax-specific automation controls', to: ROUTES.accountingTax, icon: ShieldCheck },
    { title: 'Filing adapters', value: normalizeRows(filingAdaptersQ.data).length, desc: 'Near-real-time filing connectors', to: ROUTES.accountingTax, icon: ReceiptText },
    { title: 'Realtime filings', value: normalizeRows(realtimeFilingsQ.data).length, desc: 'Submission events surfaced by reporting', to: ROUTES.reportTax, icon: Globe2 },
    { title: 'Country packs', value: normalizeRows(countryPacksQ.data).length, desc: 'Jurisdiction packs installed', to: ROUTES.accountingTax, icon: Globe2 }
  ];

  return (
    <div className="space-y-4 pb-8">
      <PageHeader title="Automation & smart accounting" subtitle="Operational automation now includes tax automation, near-real-time filing adapters, and country-pack readiness alongside the existing scheduler modules." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <ContentCard key={card.title} className="h-full">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-slate-500">{card.title}</div>
                  <div className="text-3xl font-semibold text-brand-deep">{card.value}</div>
                  <p className="text-sm text-slate-600">{card.desc}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-deep"><Icon className="h-5 w-5" /></div>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <Badge tone="brand">Module</Badge>
                <Link className="text-sm font-medium text-brand-deep hover:underline" to={card.to}>Open</Link>
              </div>
            </ContentCard>
          );
        })}
      </div>
    </div>
  );
}
