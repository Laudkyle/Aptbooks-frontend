import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bot, BellRing, CalendarSync, FileSearch, RefreshCcw, Workflow } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAutomationApi } from '../api/automation.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { ROUTES } from '../../../app/constants/routes.js';
import { Badge } from '../../../shared/components/ui/Badge.jsx';

function rowsOf(d) { return Array.isArray(d?.items) ? d.items : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []; }

export default function AutomationOverview() {
  const { http } = useApi();
  const api = useMemo(() => makeAutomationApi(http), [http]);

  const recurringQ = useQuery({ queryKey: ['automation.overview.recurring'], queryFn: () => api.listRecurringTransactions(), staleTime: 30_000 });
  const jobsQ = useQuery({ queryKey: ['automation.overview.jobs'], queryFn: () => api.listAccountingJobs(), staleTime: 30_000 });
  const reconRunsQ = useQuery({ queryKey: ['automation.overview.reconRuns'], queryFn: () => api.listAutoReconciliationRuns(), staleTime: 30_000 });
  const matchesQ = useQuery({ queryKey: ['automation.overview.matches'], queryFn: () => api.listDocumentMatches({ minScore: 0.8 }), staleTime: 30_000 });
  const rulesQ = useQuery({ queryKey: ['automation.overview.classificationRules'], queryFn: () => api.listClassificationRules(), staleTime: 30_000 });
  const notificationsQ = useQuery({ queryKey: ['automation.overview.notifications'], queryFn: () => api.listSmartNotificationEvents(), staleTime: 30_000 });

  const recurring = rowsOf(recurringQ.data);
  const jobs = rowsOf(jobsQ.data);
  const reconRuns = rowsOf(reconRunsQ.data);
  const matches = rowsOf(matchesQ.data);
  const classificationRules = rowsOf(rulesQ.data);
  const events = rowsOf(notificationsQ.data);

  const cards = [
    { title: 'Recurring transactions', value: recurring.length, desc: `${recurring.filter((x) => x.is_enabled ?? x.isEnabled).length} enabled schedules`, to: ROUTES.automationRecurringTransactions, icon: CalendarSync },
    { title: 'Accounting jobs', value: jobs.length, desc: `${jobs.filter((x) => x.is_enabled ?? x.isEnabled).length} scheduler jobs enabled`, to: ROUTES.automationAccountingJobs, icon: Workflow },
    { title: 'Reconciliation runs', value: reconRuns.length, desc: `${reconRuns.filter((x) => (x.status ?? '').toLowerCase() === 'success').length} successful runs`, to: ROUTES.automationAutoReconciliation, icon: RefreshCcw },
    { title: 'Document matches', value: matches.length, desc: 'Current high-confidence suggestions', to: ROUTES.automationDocumentMatching, icon: FileSearch },
    { title: 'Classification rules', value: classificationRules.length, desc: 'Deterministic posting rules available', to: ROUTES.automationAiClassification, icon: Bot },
    { title: 'Notification events', value: events.length, desc: 'Recent automation-generated alerts', to: ROUTES.automationSmartNotifications, icon: BellRing }
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Automation & Smart Accounting" subtitle="Operational automation with audit-friendly controls, repeatable rules, and workflow visibility." />
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
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-deep">
                  <Icon className="h-5 w-5" />
                </div>
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
