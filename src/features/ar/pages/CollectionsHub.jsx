import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlarmClock, MailWarning, Receipt, Search, Shield, Users } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeCollectionsApi } from '../api/collections.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export default function CollectionsHub() {
  const { http } = useApi();
  const api = useMemo(() => makeCollectionsApi(http), [http]);
  const qc = useQueryClient();
const toast = useToast();
  // Queue
  const [asOfDate, setAsOfDate] = useState('');
  const [minDaysPastDue, setMinDaysPastDue] = useState('1');
  const [includeDisputed, setIncludeDisputed] = useState('false');

  const queueQs = useMemo(
    () => ({
      asOfDate: asOfDate || undefined,
      minDaysPastDue: minDaysPastDue || undefined,
      includeDisputed: includeDisputed || undefined
    }),
    [asOfDate, minDaysPastDue, includeDisputed]
  );

  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: qk.collectionsQueue(queueQs),
    queryFn: () => api.queue(queueQs)
  });

  const queueRows = Array.isArray(queueData) ? queueData : queueData?.data ?? [];

  // Cases
  const [caseStatus, setCaseStatus] = useState('');
  const casesQs = useMemo(() => (caseStatus ? { status: caseStatus } : {}), [caseStatus]);
  const { data: casesData } = useQuery({
    queryKey: qk.collectionsCases(casesQs),
    queryFn: () => api.listCases(casesQs)
  });
  const casesRows = Array.isArray(casesData) ? casesData : casesData?.data ?? [];

  // Dunning: templates + rules + runs
  const { data: templatesData } = useQuery({ queryKey: qk.dunningTemplates, queryFn: () => api.listDunningTemplates() });
  const { data: rulesData } = useQuery({ queryKey: qk.dunningRules, queryFn: () => api.listDunningRules() });
  const { data: runsData } = useQuery({ queryKey: qk.dunningRuns, queryFn: () => api.listDunningRuns() });

  const templates = Array.isArray(templatesData) ? templatesData : templatesData?.data ?? [];
  const rules = Array.isArray(rulesData) ? rulesData : rulesData?.data ?? [];
  const runs = Array.isArray(runsData) ? runsData : runsData?.data ?? [];

  const [modal, setModal] = useState(null);
  const [jsonDraft, setJsonDraft] = useState({});
  const [runDraft, setRunDraft] = useState({ ruleId: 1, asOfDate: '' });

  const createTemplate = useMutation({
    mutationFn: (body) => api.createDunningTemplate(body),
    onSuccess: () => {
      toast.success('Template saved');
      qc.invalidateQueries({ queryKey: qk.dunningTemplates });
      setModal(null);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  });

  const createRule = useMutation({
    mutationFn: (body) => api.createDunningRule(body),
    onSuccess: () => {
      toast.success('Rule saved');
      qc.invalidateQueries({ queryKey: qk.dunningRules });
      setModal(null);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  });

  const runDunning = useMutation({
    mutationFn: (body) => api.runDunning(body),
    onSuccess: () => {
      toast.success('Dunning run started');
      qc.invalidateQueries({ queryKey: qk.dunningRuns });
      setModal(null);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  });

  const queueColumns = useMemo(
    () => [
      { header: 'Partner', render: (r) => <span className="text-sm font-semibold text-slate-900">{r.partner_name ?? r.partnerId ?? '—'}</span> },
      { header: 'Open amount', render: (r) => <span className="text-sm text-slate-900">{r.open_amount ?? r.openAmount ?? '—'}</span> },
      { header: 'Days past due', render: (r) => <span className="text-sm text-slate-700">{r.days_past_due ?? r.daysPastDue ?? '—'}</span> },
      { header: 'Invoices', render: (r) => <span className="text-sm text-slate-700">{r.open_invoice_count ?? r.openInvoiceCount ?? '—'}</span> }
    ],
    []
  );

  const casesColumns = useMemo(
    () => [
      { header: 'Case', render: (r) => <span className="text-sm font-semibold text-slate-900">#{r.id}</span> },
      { header: 'Partner', render: (r) => <span className="text-sm text-slate-700">{r.partner_id ?? '—'}</span> },
      {
        header: 'Status',
        render: (r) => <Badge tone={(r.status ?? 'open') === 'open' ? 'brand' : 'muted'}>{r.status ?? 'open'}</Badge>
      },
      { header: 'Assigned', render: (r) => <span className="text-sm text-slate-700">{r.assigned_to_user_id ?? '—'}</span> }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="AR Collections"
        subtitle="Collections queue, dunning rules/templates, and case management."
        icon={Users}
      />

      <Tabs
        tabs={[
          {
            key: 'queue',
            label: 'Queue',
            content: (
              <ContentCard>
                <FilterBar
                  left={
                    <div className="grid gap-3 md:grid-cols-4">
                      <Input label="As of date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} placeholder="YYYY-MM-DD" />
                      <Input
                        label="Min days past due"
                        value={minDaysPastDue}
                        onChange={(e) => setMinDaysPastDue(e.target.value)}
                        placeholder="1"
                      />
                      <Input
                        label="Include disputed"
                        value={includeDisputed}
                        onChange={(e) => setIncludeDisputed(e.target.value)}
                        placeholder="true|false"
                      />
                      <div className="hidden md:block" />
                    </div>
                  }
                  right={
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-slate-400" />
                      <span className="text-xs text-slate-500">{queueRows.length} rows</span>
                    </div>
                  }
                />
                <div className="mt-3">
                  <DataTable
                    columns={queueColumns}
                    rows={queueRows}
                    isLoading={queueLoading}
                    empty={{ title: 'No past-due partners', description: 'Collections queue is empty for the selected parameters.' }}
                  />
                </div>
              </ContentCard>
            )
          },
          {
            key: 'cases',
            label: 'Cases',
            content: (
              <ContentCard>
                <FilterBar
                  left={<Input label="Status" value={caseStatus} onChange={(e) => setCaseStatus(e.target.value)} placeholder="open|closed|…" />}
                  right={
                    <Button
                      leftIcon={Shield}
                      onClick={() => {
                        setJsonDraft({ partner_id: 0, assigned_to_user_id: null, notes: null });
                        setModal('newCase');
                      }}
                    >
                      New case
                    </Button>
                  }
                />
                <div className="mt-3">
                  <DataTable
                    columns={casesColumns}
                    rows={casesRows}
                    empty={{ title: 'No cases', description: 'Create a collections case to track actions and assignments.' }}
                  />
                </div>
              </ContentCard>
            )
          },
          {
            key: 'dunning',
            label: 'Dunning',
            content: (
              <div className="grid gap-4 lg:grid-cols-3">
                <ContentCard className="lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">Templates</div>
                    <Button
                      size="sm"
                      leftIcon={MailWarning}
                      onClick={() => {
                        setJsonDraft({ name: '', channel: 'email', subject: null, body: '', is_active: true });
                        setModal('newTemplate');
                      }}
                    >
                      New
                    </Button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {templates.length ? (
                      templates.map((t) => (
                        <div key={t.id ?? t.name} className="rounded-2xl border border-border-subtle bg-white/70 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{t.channel ?? 'email'}</div>
                            </div>
                            <Badge tone={t.is_active ? 'success' : 'muted'}>{t.is_active ? 'active' : 'inactive'}</Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border-subtle bg-white/60 p-6 text-center text-sm text-slate-600">
                        No templates
                      </div>
                    )}
                  </div>
                </ContentCard>

                <ContentCard className="lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">Rules</div>
                    <Button
                      size="sm"
                      leftIcon={AlarmClock}
                      onClick={() => {
                        setJsonDraft({
                          name: '',
                          is_active: true,
                          start_days_past_due: 1,
                          cadence_days: 7,
                          max_reminders: 6,
                          severity: 'soft',
                          template_id: null
                        });
                        setModal('newRule');
                      }}
                    >
                      New
                    </Button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {rules.length ? (
                      rules.map((r) => (
                        <div key={r.id ?? r.name} className="rounded-2xl border border-border-subtle bg-white/70 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{r.name}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                Start {r.start_days_past_due ?? 1}d, every {r.cadence_days ?? 7}d, max {r.max_reminders ?? 6}
                              </div>
                            </div>
                            <Badge tone={r.is_active ? 'success' : 'muted'}>{r.is_active ? 'active' : 'inactive'}</Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border-subtle bg-white/60 p-6 text-center text-sm text-slate-600">
                        No rules
                      </div>
                    )}
                  </div>
                </ContentCard>

                <ContentCard className="lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">Runs</div>
                    <Button
                      size="sm"
                      leftIcon={Receipt}
                      onClick={() => {
                        setRunDraft({ ruleId: rules?.[0]?.id ?? 1, asOfDate: '' });
                        setModal('run');
                      }}
                    >
                      Run
                    </Button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {runs.length ? (
                      runs.map((r) => (
                        <div key={r.id ?? r.created_at ?? Math.random()} className="rounded-2xl border border-border-subtle bg-white/70 p-4">
                          <div className="text-sm font-semibold text-slate-900">Run #{r.id ?? '—'}</div>
                          <div className="mt-1 text-xs text-slate-500">{r.status ?? '—'}</div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border-subtle bg-white/60 p-6 text-center text-sm text-slate-600">
                        No runs
                      </div>
                    )}
                  </div>
                </ContentCard>
              </div>
            )
          }
        ]}
      />

      <Modal open={modal === 'newTemplate'} onClose={() => setModal(null)} title="New dunning template">
        <JsonPanel title="Template payload" value={jsonDraft} submitLabel="Create" onSubmit={(json) => createTemplate.mutate(json)} />
      </Modal>

      <Modal open={modal === 'newRule'} onClose={() => setModal(null)} title="New dunning rule">
        <JsonPanel title="Rule payload" value={jsonDraft} submitLabel="Create" onSubmit={(json) => createRule.mutate(json)} />
      </Modal>

      <Modal open={modal === 'run'} onClose={() => setModal(null)} title="Run dunning">
        <JsonPanel title="Run payload" value={runDraft} submitLabel="Run" onSubmit={(json) => runDunning.mutate(json)} />
      </Modal>

      <Modal open={modal === 'newCase'} onClose={() => setModal(null)} title="New collections case">
        <JsonPanel title="Case payload" value={jsonDraft} submitLabel="Create" onSubmit={(json) => api.createCase(json).then(() => { toast.success('Case created'); qc.invalidateQueries({ queryKey: qk.collectionsCases(casesQs) }); setModal(null); }).catch((e) => toast.error(e?.message ?? 'Failed'))} />
      </Modal>
    </div>
  );
}
