import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { ROUTES } from '../../../app/constants/routes.js';

const cards = [
  { title: 'Recurring Transactions', desc: 'Maintain reusable accounting schedules and trigger runs.', to: ROUTES.automationRecurringTransactions },
  { title: 'Accounting Jobs', desc: 'Inspect and execute scheduled accounting automation jobs.', to: ROUTES.automationAccountingJobs },
  { title: 'Auto Reconciliation', desc: 'Manage reconciliation profiles and trigger matching runs.', to: ROUTES.automationAutoReconciliation },
  { title: 'Document Matching', desc: 'Review document-to-settlement suggestions and run match cycles.', to: ROUTES.automationDocumentMatching },
  { title: 'AI Classification', desc: 'Manage classification rules and test deterministic classification.', to: ROUTES.automationAiClassification },
  { title: 'Smart Notifications', desc: 'Configure automated alerting logic and inspect recent events.', to: ROUTES.automationSmartNotifications },
];

export default function AutomationOverview() {
  return (
    <>
      <PageHeader title="Automation & Smart Accounting" subtitle="Reduce manual work while keeping accounting workflows auditable." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <ContentCard key={card.title} title={card.title}>
            <p className="mb-4 text-sm text-slate-600">{card.desc}</p>
            <Link className="text-sm font-medium text-blue-600 hover:underline" to={card.to}>Open module</Link>
          </ContentCard>
        ))}
      </div>
    </>
  );
}
