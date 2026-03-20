import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlarmClock,
  MailWarning,
  Receipt,
  Search,
  Shield,
  Users,
  Plus,
  PlayCircle
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeCollectionsApi } from '../api/collections.api.js';
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

export default function CollectionsHub() {
  const location = useLocation();
  const { http } = useApi();
  const api = useMemo(() => makeCollectionsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [modal, setModal] = useState(null);

  // Queue filters
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

  const casesQs = useMemo(
    () => (caseStatus ? { status: caseStatus } : {}),
    [caseStatus]
  );

  const { data: casesData, isLoading: casesLoading } = useQuery({
    queryKey: qk.collectionsCases(casesQs),
    queryFn: () => api.listCases(casesQs)
  });

  const casesRows = Array.isArray(casesData) ? casesData : casesData?.data ?? [];

  // Dunning
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: qk.dunningTemplates,
    queryFn: () => api.listDunningTemplates()
  });

  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: qk.dunningRules,
    queryFn: () => api.listDunningRules()
  });

  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: qk.dunningRuns,
    queryFn: () => api.listDunningRuns()
  });

  const templates = Array.isArray(templatesData) ? templatesData : templatesData?.data ?? [];
  const rules = Array.isArray(rulesData) ? rulesData : rulesData?.data ?? [];
  const runs = Array.isArray(runsData) ? runsData : runsData?.data ?? [];

  // Optional lookup sources if your API already exposes them.
  // If not available, you can replace these queries with your actual customer/user APIs.
  const { data: partnersData } = useQuery({
    queryKey: ['collections.casePartners'],
    queryFn: async () => (api.listPartners ? api.listPartners() : []),
    staleTime: 60_000
  });

  const { data: usersData } = useQuery({
    queryKey: ['collections.caseUsers'],
    queryFn: async () => (api.listAssignableUsers ? api.listAssignableUsers() : []),
    staleTime: 60_000
  });

  const partnerOptions = useMemo(
    () => [
      NONE_OPTION,
      ...toOptions(partnersData, {
        valueKey: 'id',
        label: (p) => p.name ?? p.display_name ?? p.code ?? p.id
      })
    ],
    [partnersData]
  );

  const userOptions = useMemo(
    () => [
      NONE_OPTION,
      ...toOptions(usersData, {
        valueKey: 'id',
        label: (u) => u.name ?? u.full_name ?? u.email ?? u.id
      })
    ],
    [usersData]
  );

  const templateOptions = useMemo(
    () => [
      NONE_OPTION,
      ...toOptions(templates, {
        valueKey: 'id',
        label: (t) => t.name ?? t.id
      })
    ],
    [templates]
  );

  const ruleOptions = useMemo(
    () => [
      ...toOptions(rules, {
        valueKey: 'id',
        label: (r) => r.name ?? `Rule ${r.id}`
      })
    ],
    [rules]
  );

  // Typed forms
  const [templateForm, setTemplateForm] = useState({
    name: '',
    channel: 'email',
    subject: '',
    body: '',
    isActive: 'true'
  });

  const [ruleForm, setRuleForm] = useState({
    name: '',
    isActive: 'true',
    startDaysPastDue: '1',
    cadenceDays: '7',
    maxReminders: '6',
    severity: 'soft',
    templateId: ''
  });

  const [runForm, setRunForm] = useState({
    ruleId: '',
    asOfDate: ''
  });

  const [caseForm, setCaseForm] = useState({
    partnerId: '',
    assignedToUserId: '',
    notes: ''
  });

  const resetTemplateForm = () =>
    setTemplateForm({
      name: '',
      channel: 'email',
      subject: '',
      body: '',
      isActive: 'true'
    });

  const resetRuleForm = () =>
    setRuleForm({
      name: '',
      isActive: 'true',
      startDaysPastDue: '1',
      cadenceDays: '7',
      maxReminders: '6',
      severity: 'soft',
      templateId: ''
    });

  const resetRunForm = () =>
    setRunForm({
      ruleId: rules?.[0]?.id ? String(rules[0].id) : '',
      asOfDate: ''
    });

  const resetCaseForm = () =>
    setCaseForm({
      partnerId: '',
      assignedToUserId: '',
      notes: ''
    });

  const createTemplate = useMutation({
    mutationFn: (body) => api.createDunningTemplate(body),
    onSuccess: () => {
      toast.success('Template saved');
      qc.invalidateQueries({ queryKey: qk.dunningTemplates });
      setModal(null);
      resetTemplateForm();
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to save template')
  });

  const createRule = useMutation({
    mutationFn: (body) => api.createDunningRule(body),
    onSuccess: () => {
      toast.success('Rule saved');
      qc.invalidateQueries({ queryKey: qk.dunningRules });
      setModal(null);
      resetRuleForm();
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to save rule')
  });

  const runDunning = useMutation({
    mutationFn: (body) => api.runDunning(body),
    onSuccess: () => {
      toast.success('Dunning run started');
      qc.invalidateQueries({ queryKey: qk.dunningRuns });
      setModal(null);
      resetRunForm();
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to run dunning')
  });

  const createCase = useMutation({
    mutationFn: (body) => api.createCase(body),
    onSuccess: () => {
      toast.success('Case created');
      qc.invalidateQueries({ queryKey: qk.collectionsCases(casesQs) });
      setModal(null);
      resetCaseForm();
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to create case')
  });

  function openNewTemplate() {
    resetTemplateForm();
    setModal('newTemplate');
  }

  function openNewRule() {
    resetRuleForm();
    setModal('newRule');
  }

  function openRunDunning() {
    resetRunForm();
    setModal('run');
  }

  function openNewCase() {
    resetCaseForm();
    setModal('newCase');
  }

  function submitTemplate(e) {
    e.preventDefault();
    createTemplate.mutate({
      name: templateForm.name.trim(),
      channel: templateForm.channel,
      subject: templateForm.subject.trim() || null,
      body: templateForm.body.trim(),
      is_active: templateForm.isActive === 'true'
    });
  }

  function submitRule(e) {
    e.preventDefault();
    createRule.mutate({
      name: ruleForm.name.trim(),
      is_active: ruleForm.isActive === 'true',
      start_days_past_due: Number(ruleForm.startDaysPastDue || 1),
      cadence_days: Number(ruleForm.cadenceDays || 7),
      max_reminders: Number(ruleForm.maxReminders || 6),
      severity: ruleForm.severity,
      template_id: ruleForm.templateId ? Number(ruleForm.templateId) : null
    });
  }

  function submitRun(e) {
    e.preventDefault();
    runDunning.mutate({
      ruleId: Number(runForm.ruleId),
      asOfDate: runForm.asOfDate || null
    });
  }

  function submitCase(e) {
    e.preventDefault();
    createCase.mutate({
      partner_id: caseForm.partnerId ? Number(caseForm.partnerId) : null,
      assigned_to_user_id: caseForm.assignedToUserId ? Number(caseForm.assignedToUserId) : null,
      notes: caseForm.notes.trim() || null
    });
  }

  const queueColumns = useMemo(
    () => [
      {
        header: 'Partner',
        render: (r) => (
          <span className="text-sm font-semibold text-slate-900">
            {r.partner_name ?? r.partnerName ?? r.partnerId ?? '—'}
          </span>
        )
      },
      {
        header: 'Open amount',
        render: (r) => (
          <span className="text-sm text-slate-900">
            {r.open_amount ?? r.openAmount ?? '—'}
          </span>
        )
      },
      {
        header: 'Days past due',
        render: (r) => (
          <span className="text-sm text-slate-700">
            {r.days_past_due ?? r.daysPastDue ?? '—'}
          </span>
        )
      },
      {
        header: 'Invoices',
        render: (r) => (
          <span className="text-sm text-slate-700">
            {r.open_invoice_count ?? r.openInvoiceCount ?? '—'}
          </span>
        )
      }
    ],
    []
  );

  const casesColumns = useMemo(
    () => [
      {
        header: 'Case',
        render: (r) => (
          <span className="text-sm font-semibold text-slate-900">
            #{r.id}
          </span>
        )
      },
      {
        header: 'Partner',
        render: (r) => (
          <span className="text-sm text-slate-700">
            {r.partner_name ?? r.partnerName ?? r.partner_id ?? '—'}
          </span>
        )
      },
      {
        header: 'Status',
        render: (r) => (
          <Badge tone={(r.status ?? 'open') === 'open' ? 'brand' : 'muted'}>
            {r.status ?? 'open'}
          </Badge>
        )
      },
      {
        header: 'Assigned',
        render: (r) => (
          <span className="text-sm text-slate-700">
            {r.assigned_to_user_name ?? r.assignedToUserName ?? r.assigned_to_user_id ?? '—'}
          </span>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="AR Collections"
        subtitle="Manage collections queue, dunning strategy, and recovery cases."
        icon={Users}
      />

      <Tabs
        defaultValue={location?.pathname?.includes('/ar/dunning') ? 'dunning' : 'queue'}
        tabs={[
          {
            key: 'queue',
            label: 'Queue',
            content: (
              <ContentCard>
                <FilterBar
                  left={
                    <div className="grid gap-3 md:grid-cols-3">
                      <Input
                        type="date"
                        label="As of date"
                        value={asOfDate}
                        onChange={(e) => setAsOfDate(e.target.value)}
                      />
                      <Input
                        type="number"
                        min="0"
                        label="Min days past due"
                        value={minDaysPastDue}
                        onChange={(e) => setMinDaysPastDue(e.target.value)}
                        placeholder="1"
                      />
                      <Select
                        label="Include disputed"
                        value={includeDisputed}
                        onChange={(e) => setIncludeDisputed(e.target.value)}
                        options={YES_NO_OPTIONS}
                      />
                    </div>
                  }
                  right={
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {queueRows.length} rows
                      </span>
                    </div>
                  }
                />
                <div className="mt-3">
                  <DataTable
                    columns={queueColumns}
                    rows={queueRows}
                    isLoading={queueLoading}
                    empty={{
                      title: 'No past-due partners',
                      description: 'Collections queue is empty for the selected parameters.'
                    }}
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
                  left={
                    <Select
                      label="Status"
                      value={caseStatus}
                      onChange={(e) => setCaseStatus(e.target.value)}
                      options={CASE_STATUS_OPTIONS}
                    />
                  }
                  right={
                    <Button leftIcon={Shield} onClick={openNewCase}>
                      New case
                    </Button>
                  }
                />
                <div className="mt-3">
                  <DataTable
                    columns={casesColumns}
                    rows={casesRows}
                    isLoading={casesLoading}
                    empty={{
                      title: 'No cases',
                      description: 'Create a collections case to track assignments and recovery actions.'
                    }}
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
                    <Button size="sm" leftIcon={Plus} onClick={openNewTemplate}>
                      New
                    </Button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {templates.length ? (
                      templates.map((t) => (
                        <div
                          key={t.id ?? t.name}
                          className="rounded-2xl border border-border-subtle bg-white/70 p-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {t.name}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {t.channel ?? 'email'}
                              </div>
                              {t.subject ? (
                                <div className="mt-1 text-xs text-slate-500">
                                  {t.subject}
                                </div>
                              ) : null}
                            </div>
                            <Badge tone={t.is_active ? 'success' : 'muted'}>
                              {t.is_active ? 'active' : 'inactive'}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border-subtle bg-white/60 p-6 text-center text-sm text-slate-600">
                        {templatesLoading ? 'Loading templates…' : 'No templates'}
                      </div>
                    )}
                  </div>
                </ContentCard>

                <ContentCard className="lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">Rules</div>
                    <Button size="sm" leftIcon={AlarmClock} onClick={openNewRule}>
                      New
                    </Button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {rules.length ? (
                      rules.map((r) => (
                        <div
                          key={r.id ?? r.name}
                          className="rounded-2xl border border-border-subtle bg-white/70 p-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {r.name}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Start {r.start_days_past_due ?? 1}d, every {r.cadence_days ?? 7}d, max {r.max_reminders ?? 6}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Severity: {r.severity ?? 'soft'}
                              </div>
                            </div>
                            <Badge tone={r.is_active ? 'success' : 'muted'}>
                              {r.is_active ? 'active' : 'inactive'}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border-subtle bg-white/60 p-6 text-center text-sm text-slate-600">
                        {rulesLoading ? 'Loading rules…' : 'No rules'}
                      </div>
                    )}
                  </div>
                </ContentCard>

                <ContentCard className="lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">Runs</div>
                    <Button
                      size="sm"
                      leftIcon={PlayCircle}
                      onClick={openRunDunning}
                      disabled={!rules.length}
                    >
                      Run
                    </Button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {runs.length ? (
                      runs.map((r) => (
                        <div
                          key={r.id ?? `${r.created_at}-${r.status}`}
                          className="rounded-2xl border border-border-subtle bg-white/70 p-4"
                        >
                          <div className="text-sm font-semibold text-slate-900">
                            Run #{r.id ?? '—'}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {r.status ?? '—'}
                          </div>
                          {r.created_at ? (
                            <div className="mt-1 text-xs text-slate-500">
                              {r.created_at}
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border-subtle bg-white/60 p-6 text-center text-sm text-slate-600">
                        {runsLoading ? 'Loading runs…' : 'No runs'}
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
        <form className="space-y-4" onSubmit={submitTemplate}>
          <Input
            label="Template name"
            value={templateForm.name}
            onChange={(e) => setTemplateForm((s) => ({ ...s, name: e.target.value }))}
            required
          />
          <Select
            label="Channel"
            value={templateForm.channel}
            onChange={(e) => setTemplateForm((s) => ({ ...s, channel: e.target.value }))}
            options={DUNNING_CHANNEL_OPTIONS}
          />
          <Input
            label="Subject"
            value={templateForm.subject}
            onChange={(e) => setTemplateForm((s) => ({ ...s, subject: e.target.value }))}
            placeholder="Optional subject"
          />
          <Textarea
            label="Message body"
            value={templateForm.body}
            onChange={(e) => setTemplateForm((s) => ({ ...s, body: e.target.value }))}
            required
          />
          <Select
            label="Active"
            value={templateForm.isActive}
            onChange={(e) => setTemplateForm((s) => ({ ...s, isActive: e.target.value }))}
            options={YES_NO_OPTIONS}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTemplate.isPending}>
              Save template
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'newRule'} onClose={() => setModal(null)} title="New dunning rule">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={submitRule}>
          <Input
            label="Rule name"
            value={ruleForm.name}
            onChange={(e) => setRuleForm((s) => ({ ...s, name: e.target.value }))}
            required
          />
          <Select
            label="Severity"
            value={ruleForm.severity}
            onChange={(e) => setRuleForm((s) => ({ ...s, severity: e.target.value }))}
            options={DUNNING_SEVERITY_OPTIONS}
          />
          <Input
            type="number"
            min="0"
            label="Start days past due"
            value={ruleForm.startDaysPastDue}
            onChange={(e) => setRuleForm((s) => ({ ...s, startDaysPastDue: e.target.value }))}
            required
          />
          <Input
            type="number"
            min="1"
            label="Cadence days"
            value={ruleForm.cadenceDays}
            onChange={(e) => setRuleForm((s) => ({ ...s, cadenceDays: e.target.value }))}
            required
          />
          <Input
            type="number"
            min="1"
            label="Max reminders"
            value={ruleForm.maxReminders}
            onChange={(e) => setRuleForm((s) => ({ ...s, maxReminders: e.target.value }))}
            required
          />
          <Select
            label="Template"
            value={ruleForm.templateId}
            onChange={(e) => setRuleForm((s) => ({ ...s, templateId: e.target.value }))}
            options={templateOptions}
          />
          <Select
            label="Active"
            value={ruleForm.isActive}
            onChange={(e) => setRuleForm((s) => ({ ...s, isActive: e.target.value }))}
            options={YES_NO_OPTIONS}
          />
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createRule.isPending}>
              Save rule
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'run'} onClose={() => setModal(null)} title="Run dunning">
        <form className="space-y-4" onSubmit={submitRun}>
          <Select
            label="Rule"
            value={runForm.ruleId}
            onChange={(e) => setRunForm((s) => ({ ...s, ruleId: e.target.value }))}
            options={ruleOptions}
            required
          />
          <Input
            type="date"
            label="As of date"
            value={runForm.asOfDate}
            onChange={(e) => setRunForm((s) => ({ ...s, asOfDate: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={runDunning.isPending || !runForm.ruleId}>
              Run dunning
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'newCase'} onClose={() => setModal(null)} title="New collections case">
        <form className="space-y-4" onSubmit={submitCase}>
          <Select
            label="Partner"
            value={caseForm.partnerId}
            onChange={(e) => setCaseForm((s) => ({ ...s, partnerId: e.target.value }))}
            options={partnerOptions}
            required
          />
          <Select
            label="Assigned to"
            value={caseForm.assignedToUserId}
            onChange={(e) => setCaseForm((s) => ({ ...s, assignedToUserId: e.target.value }))}
            options={userOptions}
          />
          <Textarea
            label="Notes"
            value={caseForm.notes}
            onChange={(e) => setCaseForm((s) => ({ ...s, notes: e.target.value }))}
            placeholder="Internal notes for this collections case"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCase.isPending || !caseForm.partnerId}>
              Create case
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}