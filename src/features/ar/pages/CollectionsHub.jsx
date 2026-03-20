import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlarmClock, MailWarning, PlayCircle, Plus, Receipt, Search, Shield, Users } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeCollectionsApi } from '../api/collections.api.js';
import { makePartnersApi } from '../../business/api/partners.api.js';
import { makeUsersApi } from '../../foundation/users/api/users.api.js';
import { toOptions, NONE_OPTION } from '../../../shared/utils/options.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

const YES_NO_OPTIONS = [
  { value: 'false', label: 'No' },
  { value: 'true', label: 'Yes' }
];

const CASE_STATUS_OPTIONS = [
  NONE_OPTION,
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' }
];

const DUNNING_CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'letter', label: 'Letter' }
];

const DUNNING_SEVERITY_OPTIONS = [
  { value: 'soft', label: 'Soft' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'final', label: 'Final notice' }
];

function rowsOf(d) {
  return Array.isArray(d?.items) ? d.items : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
}

function formatMoneyLike(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(v);
}

export default function CollectionsHub() {
  const location = useLocation();
  const { http } = useApi();
  const api = useMemo(() => makeCollectionsApi(http), [http]);
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);
  const usersApi = useMemo(() => makeUsersApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [modal, setModal] = useState(null);
  const [asOfDate, setAsOfDate] = useState('');
  const [minDaysPastDue, setMinDaysPastDue] = useState('1');
  const [includeDisputed, setIncludeDisputed] = useState('false');
  const [caseStatus, setCaseStatus] = useState('');

  const queueQs = useMemo(
    () => ({
      asOfDate: asOfDate || undefined,
      minDaysPastDue: minDaysPastDue || undefined,
      includeDisputed: includeDisputed || undefined
    }),
    [asOfDate, minDaysPastDue, includeDisputed]
  );

  const casesQs = useMemo(() => (caseStatus ? { status: caseStatus } : {}), [caseStatus]);

  const queueQ = useQuery({ queryKey: qk.collectionsQueue(queueQs), queryFn: () => api.queue(queueQs) });
  const casesQ = useQuery({ queryKey: qk.collectionsCases(casesQs), queryFn: () => api.listCases(casesQs) });
  const templatesQ = useQuery({ queryKey: qk.dunningTemplates, queryFn: () => api.listDunningTemplates() });
  const rulesQ = useQuery({ queryKey: qk.dunningRules, queryFn: () => api.listDunningRules() });
  const runsQ = useQuery({ queryKey: qk.dunningRuns, queryFn: () => api.listDunningRuns() });
  const partnersQ = useQuery({ queryKey: ['collections.partners'], queryFn: () => partnersApi.list({ type: 'customer' }), staleTime: 60_000 });
  const usersQ = useQuery({ queryKey: ['collections.users'], queryFn: () => usersApi.list(), staleTime: 60_000 });

  const queueRows = rowsOf(queueQ.data);
  const caseRows = rowsOf(casesQ.data);
  const templates = rowsOf(templatesQ.data);
  const rules = rowsOf(rulesQ.data);
  const runs = rowsOf(runsQ.data);
  const partners = rowsOf(partnersQ.data);
  const users = rowsOf(usersQ.data);

  const partnerOptions = useMemo(
    () => [NONE_OPTION, ...toOptions(partners, { valueKey: 'id', label: (p) => `${p.code ?? ''} ${p.name ?? ''}`.trim() || p.id })],
    [partners]
  );
  const userOptions = useMemo(
    () => [NONE_OPTION, ...toOptions(users, { valueKey: 'id', label: (u) => u.name ?? u.full_name ?? u.email ?? u.id })],
    [users]
  );
  const templateOptions = useMemo(
    () => [NONE_OPTION, ...toOptions(templates, { valueKey: 'id', label: (t) => t.name ?? `Template ${t.id}` })],
    [templates]
  );
  const ruleOptions = useMemo(
    () => [NONE_OPTION, ...toOptions(rules, { valueKey: 'id', label: (r) => r.name ?? `Rule ${r.id}` })],
    [rules]
  );

  const [templateForm, setTemplateForm] = useState({ name: '', channel: 'email', subject: '', body: '', isActive: 'true' });
  const [ruleForm, setRuleForm] = useState({ name: '', isActive: 'true', startDaysPastDue: '1', cadenceDays: '7', maxReminders: '6', severity: 'soft', templateId: '' });
  const [runForm, setRunForm] = useState({ ruleId: '', asOfDate: '' });
  const [caseForm, setCaseForm] = useState({ partnerId: '', assignedToUserId: '', notes: '' });

  const resetTemplateForm = () => setTemplateForm({ name: '', channel: 'email', subject: '', body: '', isActive: 'true' });
  const resetRuleForm = () => setRuleForm({ name: '', isActive: 'true', startDaysPastDue: '1', cadenceDays: '7', maxReminders: '6', severity: 'soft', templateId: '' });
  const resetRunForm = () => setRunForm({ ruleId: rules?.[0]?.id ? String(rules[0].id) : '', asOfDate: '' });
  const resetCaseForm = () => setCaseForm({ partnerId: '', assignedToUserId: '', notes: '' });

  const createTemplate = useMutation({
    mutationFn: (body) => api.createDunningTemplate(body),
    onSuccess: () => {
      toast.success('Template saved');
      qc.invalidateQueries({ queryKey: qk.dunningTemplates });
      resetTemplateForm();
      setModal(null);
    },
    onError: (e) => toast.error(e?.response?.data?.error || e?.message || 'Failed to save template')
  });

  const createRule = useMutation({
    mutationFn: (body) => api.createDunningRule(body),
    onSuccess: () => {
      toast.success('Rule saved');
      qc.invalidateQueries({ queryKey: qk.dunningRules });
      resetRuleForm();
      setModal(null);
    },
    onError: (e) => toast.error(e?.response?.data?.error || e?.message || 'Failed to save rule')
  });

  const runDunning = useMutation({
    mutationFn: (body) => api.runDunning(body),
    onSuccess: () => {
      toast.success('Dunning run started');
      qc.invalidateQueries({ queryKey: qk.dunningRuns });
      setModal(null);
    },
    onError: (e) => toast.error(e?.response?.data?.error || e?.message || 'Failed to run dunning')
  });

  const createCase = useMutation({
    mutationFn: (body) => api.createCase(body),
    onSuccess: () => {
      toast.success('Collections case created');
      qc.invalidateQueries({ queryKey: qk.collectionsCases(casesQs) });
      resetCaseForm();
      setModal(null);
    },
    onError: (e) => toast.error(e?.response?.data?.error || e?.message || 'Failed to create case')
  });

  const queueColumns = useMemo(
    () => [
      { header: 'Partner', render: (r) => <span className="font-medium text-slate-900">{r.partner_name ?? r.partnerName ?? r.partner_id ?? '—'}</span> },
      { header: 'Open amount', render: (r) => <span>{formatMoneyLike(r.open_amount ?? r.openAmount)}</span> },
      { header: 'Days past due', render: (r) => <span>{r.days_past_due ?? r.daysPastDue ?? '—'}</span> },
      { header: 'Open invoices', render: (r) => <span>{r.open_invoice_count ?? r.openInvoiceCount ?? '—'}</span> },
      { header: 'Disputed', render: (r) => <Badge tone={(r.has_dispute ?? r.hasDispute) ? 'warning' : 'muted'}>{(r.has_dispute ?? r.hasDispute) ? 'Yes' : 'No'}</Badge> }
    ],
    []
  );

  const caseColumns = useMemo(
    () => [
      { header: 'Case', render: (r) => <span className="font-medium text-slate-900">#{r.id}</span> },
      { header: 'Partner', render: (r) => <span>{r.partner_name ?? r.partnerName ?? r.partner_id ?? '—'}</span> },
      { header: 'Status', render: (r) => <Badge tone={(r.status ?? 'open') === 'open' ? 'brand' : 'muted'}>{r.status ?? 'open'}</Badge> },
      { header: 'Assigned to', render: (r) => <span>{r.assigned_to_user_name ?? r.assignedToUserName ?? r.assigned_to_user_id ?? '—'}</span> },
      { header: 'Updated', render: (r) => <span>{String(r.updated_at ?? r.updatedAt ?? '').slice(0, 10) || '—'}</span> }
    ],
    []
  );

  const summary = {
    openAmount: queueRows.reduce((sum, r) => sum + Number(r.open_amount ?? r.openAmount ?? 0), 0),
    partnerCount: queueRows.length,
    openCases: caseRows.filter((r) => ['open', 'in_progress'].includes(r.status ?? 'open')).length,
    activeRules: rules.filter((r) => r.is_active || r.isActive).length
  };

  return (
    <div className="space-y-4">
      <PageHeader title="AR Collections" subtitle="Manage collections risk, dunning strategy, and recovery activity." icon={Users} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ContentCard title="Outstanding queue"><div className="text-2xl font-semibold text-brand-deep">{formatMoneyLike(summary.openAmount)}</div><p className="mt-1 text-sm text-slate-600">Open partner exposure in the current queue.</p></ContentCard>
        <ContentCard title="Partners in queue"><div className="text-2xl font-semibold text-brand-deep">{summary.partnerCount}</div><p className="mt-1 text-sm text-slate-600">Partners currently overdue for follow-up.</p></ContentCard>
        <ContentCard title="Open cases"><div className="text-2xl font-semibold text-brand-deep">{summary.openCases}</div><p className="mt-1 text-sm text-slate-600">Collections cases still being worked.</p></ContentCard>
        <ContentCard title="Active rules"><div className="text-2xl font-semibold text-brand-deep">{summary.activeRules}</div><p className="mt-1 text-sm text-slate-600">Dunning rules currently enabled.</p></ContentCard>
      </div>

      <Tabs
        defaultValue={location?.pathname?.includes('/ar/dunning') ? 'dunning' : 'queue'}
        tabs={[
          {
            key: 'queue',
            label: 'Queue',
            content: (
              <ContentCard>
                <FilterBar
                  left={<div className="grid gap-3 md:grid-cols-3"><Input type="date" label="As of date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} /><Input type="number" min="0" label="Minimum days past due" value={minDaysPastDue} onChange={(e) => setMinDaysPastDue(e.target.value)} /><Select label="Include disputed" value={includeDisputed} onChange={(e) => setIncludeDisputed(e.target.value)} options={YES_NO_OPTIONS} /></div>}
                  right={<div className="flex items-center gap-2 text-xs text-slate-500"><Search className="h-4 w-4" /><span>{queueRows.length} results</span></div>}
                />
                <div className="mt-3">
                  <DataTable columns={queueColumns} rows={queueRows} isLoading={queueQ.isLoading} empty={{ title: 'No partners in queue', description: 'There are no overdue balances for the current filter set.' }} />
                </div>
              </ContentCard>
            )
          },
          {
            key: 'cases',
            label: 'Cases',
            content: (
              <ContentCard>
                <FilterBar left={<Select label="Case status" value={caseStatus} onChange={(e) => setCaseStatus(e.target.value)} options={CASE_STATUS_OPTIONS} />} right={<Button leftIcon={Shield} onClick={() => { resetCaseForm(); setModal('newCase'); }}>New case</Button>} />
                <div className="mt-3">
                  <DataTable columns={caseColumns} rows={caseRows} isLoading={casesQ.isLoading} empty={{ title: 'No cases found', description: 'Create a collections case to coordinate follow-up work.' }} />
                </div>
              </ContentCard>
            )
          },
          {
            key: 'dunning',
            label: 'Dunning',
            content: (
              <div className="grid gap-4 lg:grid-cols-3">
                <ContentCard title="Templates" actions={<Button size="sm" leftIcon={Plus} onClick={() => { resetTemplateForm(); setModal('template'); }}>New</Button>}>
                  <div className="space-y-3">
                    {templates.length ? templates.map((t) => (
                      <div key={t.id ?? t.name} className="rounded-2xl border border-border-subtle p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-900">{t.name}</div>
                            <div className="mt-1 text-xs text-slate-500">{t.channel ?? 'email'}{t.subject ? ` · ${t.subject}` : ''}</div>
                          </div>
                          <Badge tone={t.is_active ? 'success' : 'muted'}>{t.is_active ? 'active' : 'inactive'}</Badge>
                        </div>
                      </div>
                    )) : <div className="rounded-2xl border border-dashed border-border-subtle p-8 text-center text-sm text-slate-500">{templatesQ.isLoading ? 'Loading templates…' : 'No templates configured yet.'}</div>}
                  </div>
                </ContentCard>
                <ContentCard title="Rules" actions={<Button size="sm" leftIcon={AlarmClock} onClick={() => { resetRuleForm(); setModal('rule'); }}>New</Button>}>
                  <div className="space-y-3">
                    {rules.length ? rules.map((r) => (
                      <div key={r.id ?? r.name} className="rounded-2xl border border-border-subtle p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-900">{r.name}</div>
                            <div className="mt-1 text-xs text-slate-500">Starts at {r.start_days_past_due ?? 1} days, every {r.cadence_days ?? 7} days, max {r.max_reminders ?? 6}</div>
                            <div className="mt-1 text-xs text-slate-500">Severity: {r.severity ?? 'soft'}</div>
                          </div>
                          <Badge tone={r.is_active ? 'success' : 'muted'}>{r.is_active ? 'active' : 'inactive'}</Badge>
                        </div>
                      </div>
                    )) : <div className="rounded-2xl border border-dashed border-border-subtle p-8 text-center text-sm text-slate-500">{rulesQ.isLoading ? 'Loading rules…' : 'No rules configured yet.'}</div>}
                  </div>
                </ContentCard>
                <ContentCard title="Runs" actions={<Button size="sm" leftIcon={PlayCircle} onClick={() => { resetRunForm(); setModal('run'); }} disabled={!rules.length}>Run</Button>}>
                  <div className="space-y-3">
                    {runs.length ? runs.map((r) => (
                      <div key={r.id ?? `${r.created_at}-${r.status}`} className="rounded-2xl border border-border-subtle p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-900">Run #{r.id ?? '—'}</div>
                            <div className="mt-1 text-xs text-slate-500">{String(r.created_at ?? '').slice(0, 19).replace('T', ' ') || '—'}</div>
                          </div>
                          <Badge tone={r.status === 'completed' || r.status === 'success' ? 'success' : r.status === 'failed' ? 'danger' : 'warning'}>{r.status ?? 'pending'}</Badge>
                        </div>
                      </div>
                    )) : <div className="rounded-2xl border border-dashed border-border-subtle p-8 text-center text-sm text-slate-500">{runsQ.isLoading ? 'Loading runs…' : 'No dunning runs yet.'}</div>}
                  </div>
                </ContentCard>
              </div>
            )
          }
        ]}
      />

      <Modal open={modal === 'template'} onClose={() => setModal(null)} title="New dunning template" footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={createTemplate.isPending} onClick={() => createTemplate.mutate({ name: templateForm.name.trim(), channel: templateForm.channel, subject: templateForm.subject.trim() || null, body: templateForm.body.trim(), is_active: templateForm.isActive === 'true' })}>Save template</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Template name" value={templateForm.name} onChange={(e) => setTemplateForm((s) => ({ ...s, name: e.target.value }))} required />
          <Select label="Channel" value={templateForm.channel} onChange={(e) => setTemplateForm((s) => ({ ...s, channel: e.target.value }))} options={DUNNING_CHANNEL_OPTIONS} />
          <Input className="md:col-span-2" label="Subject" value={templateForm.subject} onChange={(e) => setTemplateForm((s) => ({ ...s, subject: e.target.value }))} />
          <Textarea className="md:col-span-2" label="Message body" value={templateForm.body} onChange={(e) => setTemplateForm((s) => ({ ...s, body: e.target.value }))} required />
          <Select label="Active" value={templateForm.isActive} onChange={(e) => setTemplateForm((s) => ({ ...s, isActive: e.target.value }))} options={YES_NO_OPTIONS} />
        </div>
      </Modal>

      <Modal open={modal === 'rule'} onClose={() => setModal(null)} title="New dunning rule" footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={createRule.isPending} onClick={() => createRule.mutate({ name: ruleForm.name.trim(), is_active: ruleForm.isActive === 'true', start_days_past_due: Number(ruleForm.startDaysPastDue || 1), cadence_days: Number(ruleForm.cadenceDays || 7), max_reminders: Number(ruleForm.maxReminders || 6), severity: ruleForm.severity, template_id: ruleForm.templateId ? Number(ruleForm.templateId) : null })}>Save rule</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Rule name" value={ruleForm.name} onChange={(e) => setRuleForm((s) => ({ ...s, name: e.target.value }))} required />
          <Select label="Severity" value={ruleForm.severity} onChange={(e) => setRuleForm((s) => ({ ...s, severity: e.target.value }))} options={DUNNING_SEVERITY_OPTIONS} />
          <Input type="number" min="0" label="Start days past due" value={ruleForm.startDaysPastDue} onChange={(e) => setRuleForm((s) => ({ ...s, startDaysPastDue: e.target.value }))} />
          <Input type="number" min="1" label="Cadence days" value={ruleForm.cadenceDays} onChange={(e) => setRuleForm((s) => ({ ...s, cadenceDays: e.target.value }))} />
          <Input type="number" min="1" label="Maximum reminders" value={ruleForm.maxReminders} onChange={(e) => setRuleForm((s) => ({ ...s, maxReminders: e.target.value }))} />
          <Select label="Template" value={ruleForm.templateId} onChange={(e) => setRuleForm((s) => ({ ...s, templateId: e.target.value }))} options={templateOptions} />
          <Select label="Active" value={ruleForm.isActive} onChange={(e) => setRuleForm((s) => ({ ...s, isActive: e.target.value }))} options={YES_NO_OPTIONS} />
        </div>
      </Modal>

      <Modal open={modal === 'run'} onClose={() => setModal(null)} title="Run dunning" footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={runDunning.isPending} onClick={() => runDunning.mutate({ ruleId: runForm.ruleId ? Number(runForm.ruleId) : null, asOfDate: runForm.asOfDate || null })} disabled={!runForm.ruleId}>Run now</Button></div>}>
        <div className="space-y-4">
          <Select label="Rule" value={runForm.ruleId} onChange={(e) => setRunForm((s) => ({ ...s, ruleId: e.target.value }))} options={ruleOptions} />
          <Input type="date" label="As of date" value={runForm.asOfDate} onChange={(e) => setRunForm((s) => ({ ...s, asOfDate: e.target.value }))} />
        </div>
      </Modal>

      <Modal open={modal === 'newCase'} onClose={() => setModal(null)} title="New collections case" footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={createCase.isPending} onClick={() => createCase.mutate({ partner_id: caseForm.partnerId, assigned_to_user_id: caseForm.assignedToUserId || null, notes: caseForm.notes.trim() || null })} disabled={!caseForm.partnerId}>Create case</Button></div>}>
        <div className="space-y-4">
          <Select label="Customer" value={caseForm.partnerId} onChange={(e) => setCaseForm((s) => ({ ...s, partnerId: e.target.value }))} options={partnerOptions} />
          <Select label="Assigned user" value={caseForm.assignedToUserId} onChange={(e) => setCaseForm((s) => ({ ...s, assignedToUserId: e.target.value }))} options={userOptions} />
          <Textarea label="Notes" value={caseForm.notes} onChange={(e) => setCaseForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Context, agreed actions, or escalation notes" />
        </div>
      </Modal>
    </div>
  );
}
