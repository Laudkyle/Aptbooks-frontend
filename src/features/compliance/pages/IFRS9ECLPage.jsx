
import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, ShieldCheck, Calculator, BookOpenCheck, RotateCcw, BarChart3 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeIfrs9Api } from '../api/ifrs9.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { AccountSelect } from '../../../shared/components/forms/AccountSelect.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { formatDate } from '../../../shared/utils/formatDate.js';
import { formatMoney } from '../../../shared/utils/formatMoney.js';

const percent = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `${(n * 100).toFixed(2)}%`;
};

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export default function IFRS9ECLPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { http } = useApi();
  const api = useMemo(() => makeIfrs9Api(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [runsPeriodId, setRunsPeriodId] = useState('');
  const [selectedRunId, setSelectedRunId] = useState(null);

  const { data: settings, isLoading: settingsLoading } = useQuery({ queryKey: qk.ifrs9Settings, queryFn: () => api.getSettings() });
  const { data: models = [], isLoading: modelsLoading } = useQuery({ queryKey: qk.ifrs9Models, queryFn: () => api.listModels() });
  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }),
    queryFn: () => api.listRuns({ period_id: runsPeriodId || undefined })
  });
  const { data: periods = [] } = useQuery({ queryKey: ['periods'], queryFn: () => periodsApi.list() });

  const periodRows = Array.isArray(periods) ? periods : periods?.data ?? [];
  const modelRows = Array.isArray(models) ? models : models?.data ?? [];
  const runRows = Array.isArray(runs) ? runs : runs?.data ?? [];

  useEffect(() => {
    if (!selectedRunId && runRows.length) setSelectedRunId(runRows[0].id);
  }, [runRows, selectedRunId]);

  const periodOptions = [{ value: '', label: 'Select…' }].concat(periodRows.map((p) => ({ value: p.id, label: `${p.code ?? ''} — ${p.name ?? ''}`.trim() })));
  const modelOptions = [{ value: '', label: 'Select…' }].concat(modelRows.map((m) => ({ value: m.id, label: `${m.code ?? ''} — ${m.name ?? ''}`.trim() })));
  const generalModelOptions = [{ value: '', label: 'Select…' }].concat(modelRows.filter((m) => m.model_type === 'GENERAL').map((m) => ({ value: m.id, label: `${m.code ?? ''} — ${m.name ?? ''}`.trim() })));
  const simplifiedModelOptions = [{ value: '', label: 'Select…' }].concat(modelRows.filter((m) => m.model_type === 'SIMPLIFIED').map((m) => ({ value: m.id, label: `${m.code ?? ''} — ${m.name ?? ''}`.trim() })));

  const [settingsForm, setSettingsForm] = useState({
    loss_allowance_account_id: '',
    impairment_expense_account_id: '',
    default_model_id: '',
    rounding_decimals: 2,
    stage2_threshold_days: 30,
    stage3_threshold_days: 90,
    default_lgd: 0.45,
    annual_discount_rate: 0.10
  });

  useEffect(() => {
    if (!settings) return;
    setSettingsForm({
      loss_allowance_account_id: settings.loss_allowance_account_id ?? settings.allowance_account_id ?? '',
      impairment_expense_account_id: settings.impairment_expense_account_id ?? '',
      default_model_id: settings.default_model_id ?? '',
      rounding_decimals: settings.rounding_decimals ?? 2,
      stage2_threshold_days: settings.stage2_threshold_days ?? settings.stage2_days_past_due ?? 30,
      stage3_threshold_days: settings.stage3_threshold_days ?? settings.stage3_days_past_due ?? 90,
      default_lgd: settings.default_lgd ?? 0.45,
      annual_discount_rate: settings.annual_discount_rate ?? 0.10
    });
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: () => api.updateSettings({
      ...settingsForm,
      rounding_decimals: Number(settingsForm.rounding_decimals),
      stage2_threshold_days: Number(settingsForm.stage2_threshold_days),
      stage3_threshold_days: Number(settingsForm.stage3_threshold_days),
      default_lgd: Number(settingsForm.default_lgd),
      annual_discount_rate: Number(settingsForm.annual_discount_rate)
    }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Saved', message: 'IFRS 9 settings updated.' });
      await qc.invalidateQueries({ queryKey: qk.ifrs9Settings });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Save failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [modelOpen, setModelOpen] = useState(false);
  const [modelForm, setModelForm] = useState({ code: '', name: '', model_type: 'SIMPLIFIED', description: '' });
  const createModel = useMutation({
    mutationFn: () => api.createModel(modelForm),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Model created', message: 'The ECL model is ready for configuration.' });
      setModelOpen(false);
      setModelForm({ code: '', name: '', model_type: 'SIMPLIFIED', description: '' });
      await qc.invalidateQueries({ queryKey: qk.ifrs9Models });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Create failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [bucketOpen, setBucketOpen] = useState(false);
  const [bucketTarget, setBucketTarget] = useState(null);
  const [bucketForm, setBucketForm] = useState({ label: '', days_past_due_from: 0, days_past_due_to: '', loss_rate: '' });
  const addBucket = useMutation({
    mutationFn: () => api.addBucket(bucketTarget?.id, { ...bucketForm, loss_rate: Number(bucketForm.loss_rate) }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Bucket added', message: 'Loss-rate bucket saved.' });
      setBucketOpen(false);
      setBucketTarget(null);
      setBucketForm({ label: '', days_past_due_from: 0, days_past_due_to: '', loss_rate: '' });
      await qc.invalidateQueries({ queryKey: qk.ifrs9Models });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Save failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [parameterOpen, setParameterOpen] = useState(false);
  const [parameterTarget, setParameterTarget] = useState(null);
  const [parameterForm, setParameterForm] = useState({ stage: 1, label: '', days_past_due_from: 0, days_past_due_to: '', pd_12m: '', pd_lifetime: '', lgd: '' });
  const addParameter = useMutation({
    mutationFn: () => api.addParameter(parameterTarget?.id, {
      ...parameterForm,
      stage: Number(parameterForm.stage),
      pd_12m: Number(parameterForm.pd_12m),
      pd_lifetime: Number(parameterForm.pd_lifetime),
      lgd: parameterForm.lgd === '' ? null : Number(parameterForm.lgd)
    }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Parameter added', message: 'Stage parameter row saved.' });
      setParameterOpen(false);
      setParameterTarget(null);
      setParameterForm({ stage: 1, label: '', days_past_due_from: 0, days_past_due_to: '', pd_12m: '', pd_lifetime: '', lgd: '' });
      await qc.invalidateQueries({ queryKey: qk.ifrs9Models });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Save failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [computeOpen, setComputeOpen] = useState(false);
  const [computeForm, setComputeForm] = useState({ period_id: '', model_id: '', as_of_date: '', memo: '' });
  const computeRun = useMutation({
    mutationFn: () => api.computeEcl({ ...computeForm, model_id: computeForm.model_id || undefined, as_of_date: computeForm.as_of_date || undefined, memo: computeForm.memo || undefined }),
    onSuccess: async (result) => {
      toast.push({ tone: 'success', title: 'Run computed', message: 'Expected credit loss was computed successfully.' });
      setComputeOpen(false);
      setSelectedRunId(result?.run?.id ?? result?.id ?? null);
      await qc.invalidateQueries({ queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }) });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Compute failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const { data: runDetail, isLoading: runDetailLoading } = useQuery({
    queryKey: qk.ifrs9Run(selectedRunId ?? 'none'),
    queryFn: () => api.getRun(selectedRunId),
    enabled: !!selectedRunId
  });

  const disclosureQuery = useQuery({
    queryKey: ['compliance', 'ifrs9', 'disclosures', selectedRunId ?? 'none'],
    queryFn: () => api.reportDisclosures({ run_id: selectedRunId }),
    enabled: !!selectedRunId
  });

  const allowanceQuery = useQuery({
    queryKey: ['compliance', 'ifrs9', 'allowanceMovement', runsPeriodId || 'none'],
    queryFn: () => api.reportAllowanceMovement({ period_id: runsPeriodId }),
    enabled: !!runsPeriodId
  });

  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const finalizeRun = useMutation({
    mutationFn: () => api.finalizeRun(selectedRunId),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Run finalized', message: 'The selected run is now locked for audit.' });
      setFinalizeOpen(false);
      await qc.invalidateQueries({ queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }) });
      if (selectedRunId) await qc.invalidateQueries({ queryKey: qk.ifrs9Run(selectedRunId) });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Finalize failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [postOpen, setPostOpen] = useState(false);
  const [postForm, setPostForm] = useState({ period_id: '', entry_date: '', memo: '' });
  const postRun = useMutation({
    mutationFn: () => api.postEcl({ ...postForm, run_id: selectedRunId, entry_date: postForm.entry_date || undefined, memo: postForm.memo || undefined }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Posted', message: 'The ECL journal entry was posted.' });
      setPostOpen(false);
      await qc.invalidateQueries({ queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }) });
      if (selectedRunId) await qc.invalidateQueries({ queryKey: qk.ifrs9Run(selectedRunId) });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Post failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [reverseOpen, setReverseOpen] = useState(false);
  const [reverseForm, setReverseForm] = useState({ target_period_id: '', entry_date: '', reason: '' });
  const reverseRun = useMutation({
    mutationFn: () => api.reverseEcl({ ...reverseForm, run_id: selectedRunId }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Reversed', message: 'The IFRS 9 posting was reversed.' });
      setReverseOpen(false);
      await qc.invalidateQueries({ queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }) });
      if (selectedRunId) await qc.invalidateQueries({ queryKey: qk.ifrs9Run(selectedRunId) });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Reverse failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const run = runDetail?.run;
  const runLines = runDetail?.lines ?? [];
  const dashboard = {
    models: modelRows.length,
    activeModels: modelRows.filter((m) => m.status === 'active').length,
    runs: runRows.length,
    postedRuns: runRows.filter((r) => r.status === 'posted').length
  };

  const modelColumns = useMemo(() => [
    { header: 'Model', render: (m) => <div><div className="font-medium text-slate-900">{m.name}</div><div className="text-xs text-slate-500">{m.code}</div></div> },
    { header: 'Type', render: (m) => <span className="text-sm text-slate-700">{m.model_type}</span> },
    { header: 'Buckets', render: (m) => <span className="text-sm text-slate-700">{m.bucket_count ?? 0}</span> },
    { header: 'Parameters', render: (m) => <span className="text-sm text-slate-700">{m.parameter_count ?? 0}</span> },
    { header: 'Status', render: (m) => <span className="text-sm text-slate-700">{m.status}</span> },
    { header: '', render: (m) => (
      <div className="flex gap-2">
        {m.model_type === 'SIMPLIFIED' ? <Button size="sm" variant="secondary" onClick={() => { setBucketTarget(m); setBucketOpen(true); }}>Add bucket</Button> : null}
        {m.model_type === 'GENERAL' ? <Button size="sm" variant="secondary" onClick={() => { setParameterTarget(m); setParameterOpen(true); }}>Add parameter</Button> : null}
      </div>
    ) }
  ], []);

  const runColumns = useMemo(() => [
    { header: 'Run', render: (r) => <button type="button" className="text-left" onClick={() => setSelectedRunId(r.id)}><div className="font-medium text-brand-deep hover:underline">{r.model_code ? `${r.model_code}` : r.id}</div><div className="text-xs text-slate-500">{formatDate(r.created_at)}</div></button> },
    { header: 'Period', render: (r) => <span>{r.period_code ?? r.period_name ?? '—'}</span> },
    { header: 'Model', render: (r) => <span>{r.model_name ?? '—'}</span> },
    { header: 'Approach', render: (r) => <span>{r.approach ?? '—'}</span> },
    { header: 'Exposure', render: (r) => <span>{formatMoney(r.total_exposure)}</span> },
    { header: 'ECL', render: (r) => <span>{formatMoney(r.total_ecl)}</span> },
    { header: 'Delta', render: (r) => <span>{formatMoney(r.delta_allowance)}</span> },
    { header: 'Status', render: (r) => <span>{r.status}</span> }
  ], []);

  const lineColumns = useMemo(() => [
    { header: 'Counterparty', render: (l) => <div><div className="font-medium text-slate-900">{l.customer_name ?? l.customer_id}</div><div className="text-xs text-slate-500">{l.bucket_label ?? '—'}</div></div> },
    { header: 'Stage', render: (l) => <span>{l.stage ?? '—'}</span> },
    { header: 'DPD band', render: (l) => <span>{`${l.days_past_due_from ?? 0} - ${l.days_past_due_to ?? '∞'}`}</span> },
    { header: 'Loss rate / PD', render: (l) => <span>{l.loss_rate != null ? percent(l.loss_rate) : percent(l.pd_used)}</span> },
    { header: 'LGD', render: (l) => <span>{l.lgd_used != null ? percent(l.lgd_used) : '—'}</span> },
    { header: 'Exposure', render: (l) => <span>{formatMoney(l.exposure_amount)}</span> },
    { header: 'ECL', render: (l) => <span>{formatMoney(l.ecl_amount)}</span> }
  ], []);

  const stageColumns = useMemo(() => [
    { header: 'Stage', render: (r) => <span>{r.stage}</span> },
    { header: 'Lines', render: (r) => <span>{r.line_count}</span> },
    { header: 'Invoices', render: (r) => <span>{r.invoice_count}</span> },
    { header: 'Contract assets', render: (r) => <span>{r.contract_asset_count}</span> },
    { header: 'Exposure', render: (r) => <span>{formatMoney(r.exposure_amount)}</span> },
    { header: 'ECL', render: (r) => <span>{formatMoney(r.ecl_amount)}</span> }
  ], []);

  const bucketColumns = useMemo(() => [
    { header: 'Bucket', render: (r) => <span>{r.bucket_label}</span> },
    { header: 'Invoices', render: (r) => <span>{r.invoice_count}</span> },
    { header: 'Contract assets', render: (r) => <span>{r.contract_asset_count}</span> },
    { header: 'Exposure', render: (r) => <span>{formatMoney(r.exposure_amount)}</span> },
    { header: 'ECL', render: (r) => <span>{formatMoney(r.ecl_amount)}</span> }
  ], []);

  const topCounterpartyColumns = useMemo(() => [
    { header: 'Counterparty', render: (r) => <span>{r.customer_name}</span> },
    { header: 'Exposure', render: (r) => <span>{formatMoney(r.exposure_amount)}</span> },
    { header: 'ECL', render: (r) => <span>{formatMoney(r.ecl_amount)}</span> },
    { header: 'Invoices', render: (r) => <span>{r.invoice_count}</span> },
    { header: 'Contract assets', render: (r) => <span>{r.contract_asset_count}</span> }
  ], []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="IFRS 9 — Expected Credit Loss"
        subtitle="Production-grade ECL settings, models, staging inputs, runs, posting, reversals and disclosures."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={RefreshCw} variant="secondary" onClick={() => { qc.invalidateQueries({ queryKey: qk.ifrs9Settings }); qc.invalidateQueries({ queryKey: qk.ifrs9Models }); qc.invalidateQueries({ queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }) }); }}>
              Refresh
            </Button>
            <Button leftIcon={Calculator} variant="primary" onClick={() => setComputeOpen(true)}>
              Compute ECL
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Models" value={dashboard.models} hint={`${dashboard.activeModels} active`} />
        <StatCard label="Runs" value={dashboard.runs} hint={`${dashboard.postedRuns} posted`} />
        <StatCard label="Default model" value={settings?.default_model_id ? 'Configured' : 'Not set'} hint="Used when compute does not specify a model" />
        <StatCard label="Selected run" value={run?.status ?? 'None'} hint={run?.model_name ?? 'Choose a run from the runs tab'} />
      </div>

      <ContentCard>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          tabs={[
            {
              value: 'dashboard',
              label: 'Dashboard',
              icon: BarChart3,
              content: (
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-border-subtle p-4">
                      <div className="text-sm font-semibold text-brand-deep">Current run snapshot</div>
                      {run ? (
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <StatCard label="Model" value={run.model_name ?? '—'} hint={run.model_code ?? ''} />
                          <StatCard label="Approach" value={run.approach ?? '—'} hint={run.period_code ?? run.period_name ?? ''} />
                          <StatCard label="Exposure" value={formatMoney(run.total_exposure)} hint={`As of ${formatDate(run.as_of_date)}`} />
                          <StatCard label="Total ECL" value={formatMoney(run.total_ecl)} hint={`Delta ${formatMoney(run.delta_allowance)}`} />
                        </div>
                      ) : <div className="mt-3 text-sm text-slate-500">No run selected.</div>}
                    </div>
                    <div className="rounded-2xl border border-border-subtle p-4">
                      <div className="text-sm font-semibold text-brand-deep">Allowance movement</div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <Select label="Period" value={runsPeriodId} onChange={(e) => setRunsPeriodId(e.target.value)} options={periodOptions} />
                        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Pick a period to load opening, movement and closing allowance.</div>
                      </div>
                      {allowanceQuery.data ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <StatCard label="Opening allowance" value={formatMoney(allowanceQuery.data.opening_allowance)} />
                          <StatCard label="Closing allowance" value={formatMoney(allowanceQuery.data.closing_allowance)} />
                          <StatCard label="Additions" value={formatMoney(allowanceQuery.data.additions)} />
                          <StatCard label="Releases" value={formatMoney(allowanceQuery.data.releases)} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            },
            {
              value: 'settings',
              label: 'Settings',
              icon: ShieldCheck,
              content: (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2 rounded-2xl border border-border-subtle p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <AccountSelect label="Loss allowance account" value={settingsForm.loss_allowance_account_id} onChange={(e) => setSettingsForm((s) => ({ ...s, loss_allowance_account_id: e.target.value }))} allowEmpty />
                      <AccountSelect label="Impairment expense account" value={settingsForm.impairment_expense_account_id} onChange={(e) => setSettingsForm((s) => ({ ...s, impairment_expense_account_id: e.target.value }))} allowEmpty filters={{ accountTypeCodes: ['EXPENSE'] }} />
                      <Select label="Default ECL model" value={settingsForm.default_model_id} onChange={(e) => setSettingsForm((s) => ({ ...s, default_model_id: e.target.value }))} options={modelOptions} />
                      <Input label="Rounding decimals" type="number" value={settingsForm.rounding_decimals} onChange={(e) => setSettingsForm((s) => ({ ...s, rounding_decimals: e.target.value }))} />
                      <Input label="Stage 2 threshold (days past due)" type="number" value={settingsForm.stage2_threshold_days} onChange={(e) => setSettingsForm((s) => ({ ...s, stage2_threshold_days: e.target.value }))} />
                      <Input label="Stage 3 threshold (days past due)" type="number" value={settingsForm.stage3_threshold_days} onChange={(e) => setSettingsForm((s) => ({ ...s, stage3_threshold_days: e.target.value }))} />
                      <Input label="Default LGD" type="number" step="0.0001" value={settingsForm.default_lgd} onChange={(e) => setSettingsForm((s) => ({ ...s, default_lgd: e.target.value }))} />
                      <Input label="Annual discount rate" type="number" step="0.0001" value={settingsForm.annual_discount_rate} onChange={(e) => setSettingsForm((s) => ({ ...s, annual_discount_rate: e.target.value }))} />
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button variant="primary" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending || settingsLoading}>Save settings</Button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-slate-50 p-4 text-sm text-slate-600">
                    These settings govern stage migration thresholds, the general-approach fallback LGD, posting accounts, and the default model used by compute runs.
                  </div>
                </div>
              )
            },
            {
              value: 'models',
              label: 'Models',
              icon: BookOpenCheck,
              content: (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button leftIcon={Plus} variant="primary" onClick={() => setModelOpen(true)}>New model</Button>
                  </div>
                  <DataTable columns={modelColumns} rows={modelRows} isLoading={modelsLoading} empty={{ title: 'No IFRS 9 models', description: 'Create simplified or general ECL models to begin.' }} />
                </div>
              )
            },
            {
              value: 'runs',
              label: 'Runs',
              icon: Calculator,
              content: (
                <div className="space-y-4">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <Select label="Filter by period" value={runsPeriodId} onChange={(e) => setRunsPeriodId(e.target.value)} options={periodOptions} />
                    <div className="lg:col-span-2 rounded-2xl border border-border-subtle p-3 text-sm text-slate-600">Select a run to view line-level exposure, disclosure breakdowns, posting status and audit actions.</div>
                  </div>
                  <DataTable columns={runColumns} rows={runRows} isLoading={runsLoading} empty={{ title: 'No runs', description: 'Compute an ECL run for an open period.' }} />
                  <div className="rounded-2xl border border-border-subtle p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-brand-deep">Run detail</div>
                        <div className="text-xs text-slate-500">Detailed view for the selected run.</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => setFinalizeOpen(true)} disabled={!selectedRunId || !run || run.status !== 'computed'}>Finalize</Button>
                        <Button variant="primary" onClick={() => setPostOpen(true)} disabled={!selectedRunId || !run || !['finalized','posted'].includes(run.status)}>Post</Button>
                        <Button variant="secondary" leftIcon={RotateCcw} onClick={() => setReverseOpen(true)} disabled={!selectedRunId || !run || run.status !== 'posted'}>Reverse</Button>
                      </div>
                    </div>

                    {runDetailLoading ? <div className="mt-3 text-sm text-slate-500">Loading run detail…</div> : run ? (
                      <div className="mt-4 space-y-4">
                        <div className="grid gap-3 md:grid-cols-4">
                          <StatCard label="Status" value={run.status} hint={run.model_name ?? ''} />
                          <StatCard label="Exposure" value={formatMoney(run.total_exposure)} hint={`As of ${formatDate(run.as_of_date)}`} />
                          <StatCard label="Total ECL" value={formatMoney(run.total_ecl)} hint={`Prior ${formatMoney(run.prior_posted_ecl)}`} />
                          <StatCard label="Delta allowance" value={formatMoney(run.delta_allowance)} hint={run.journal_entry_id ? `Journal ${run.journal_entry_id}` : 'Not yet posted'} />
                        </div>
                        <DataTable columns={lineColumns} rows={runLines} empty={{ title: 'No line detail', description: 'No aggregated exposures were produced for this run.' }} />
                      </div>
                    ) : <div className="mt-3 text-sm text-slate-500">Select a run to inspect.</div>}
                  </div>
                </div>
              )
            },
            {
              value: 'reports',
              label: 'Disclosures',
              icon: BarChart3,
              content: (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border-subtle p-4 text-sm text-slate-600">
                    Disclosure reports are derived from the selected run and the currently selected allowance-movement period.
                  </div>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-4">
                      <ContentCard title="Breakdown by stage">
                        <DataTable columns={stageColumns} rows={disclosureQuery.data?.breakdown?.by_stage ?? []} empty={{ title: 'No stage breakdown', description: 'Select a run to load disclosure analytics.' }} />
                      </ContentCard>
                      <ContentCard title="Breakdown by bucket">
                        <DataTable columns={bucketColumns} rows={disclosureQuery.data?.breakdown?.by_bucket ?? []} empty={{ title: 'No bucket breakdown', description: 'This run may use general staging only, or no run is selected.' }} />
                      </ContentCard>
                    </div>
                    <div>
                      <ContentCard title="Top counterparties">
                        <DataTable columns={topCounterpartyColumns} rows={disclosureQuery.data?.breakdown?.top_counterparties ?? []} empty={{ title: 'No counterparties', description: 'Compute or select a run first.' }} />
                      </ContentCard>
                    </div>
                  </div>
                </div>
              )
            }
          ]}
        />
      </ContentCard>

      <Modal open={modelOpen} title="New ECL model" onClose={() => setModelOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModelOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => createModel.mutate()} disabled={createModel.isPending}>Create</Button></div>}>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Code (optional)" value={modelForm.code} onChange={(e) => setModelForm((s) => ({ ...s, code: e.target.value }))} />
          <Input label="Name" value={modelForm.name} onChange={(e) => setModelForm((s) => ({ ...s, name: e.target.value }))} />
          <Select label="Model type" value={modelForm.model_type} onChange={(e) => setModelForm((s) => ({ ...s, model_type: e.target.value }))} options={[{ value: 'SIMPLIFIED', label: 'Simplified' }, { value: 'GENERAL', label: 'General' }]} />
        </div>
        <Textarea className="mt-3" label="Description" value={modelForm.description} onChange={(e) => setModelForm((s) => ({ ...s, description: e.target.value }))} />
      </Modal>

      <Modal open={bucketOpen} title={`Add simplified bucket — ${bucketTarget?.name ?? ''}`} onClose={() => setBucketOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setBucketOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => addBucket.mutate()} disabled={addBucket.isPending}>Save bucket</Button></div>}>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Label" value={bucketForm.label} onChange={(e) => setBucketForm((s) => ({ ...s, label: e.target.value }))} />
          <Input label="Days past due from" type="number" value={bucketForm.days_past_due_from} onChange={(e) => setBucketForm((s) => ({ ...s, days_past_due_from: e.target.value }))} />
          <Input label="Days past due to" type="number" value={bucketForm.days_past_due_to} onChange={(e) => setBucketForm((s) => ({ ...s, days_past_due_to: e.target.value }))} />
          <Input label="Loss rate" type="number" step="0.0001" value={bucketForm.loss_rate} onChange={(e) => setBucketForm((s) => ({ ...s, loss_rate: e.target.value }))} />
        </div>
      </Modal>

      <Modal open={parameterOpen} title={`Add general parameter — ${parameterTarget?.name ?? ''}`} onClose={() => setParameterOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setParameterOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => addParameter.mutate()} disabled={addParameter.isPending}>Save parameter</Button></div>}>
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Stage" value={String(parameterForm.stage)} onChange={(e) => setParameterForm((s) => ({ ...s, stage: e.target.value }))} options={[{ value: '1', label: 'Stage 1' }, { value: '2', label: 'Stage 2' }, { value: '3', label: 'Stage 3' }]} />
          <Input label="Label" value={parameterForm.label} onChange={(e) => setParameterForm((s) => ({ ...s, label: e.target.value }))} />
          <Input label="Days past due from" type="number" value={parameterForm.days_past_due_from} onChange={(e) => setParameterForm((s) => ({ ...s, days_past_due_from: e.target.value }))} />
          <Input label="Days past due to" type="number" value={parameterForm.days_past_due_to} onChange={(e) => setParameterForm((s) => ({ ...s, days_past_due_to: e.target.value }))} />
          <Input label="12-month PD" type="number" step="0.0001" value={parameterForm.pd_12m} onChange={(e) => setParameterForm((s) => ({ ...s, pd_12m: e.target.value }))} />
          <Input label="Lifetime PD" type="number" step="0.0001" value={parameterForm.pd_lifetime} onChange={(e) => setParameterForm((s) => ({ ...s, pd_lifetime: e.target.value }))} />
          <Input label="LGD (optional)" type="number" step="0.0001" value={parameterForm.lgd} onChange={(e) => setParameterForm((s) => ({ ...s, lgd: e.target.value }))} />
        </div>
      </Modal>

      <Modal open={computeOpen} title="Compute ECL" onClose={() => setComputeOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setComputeOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => computeRun.mutate()} disabled={computeRun.isPending}>Compute</Button></div>}>
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Period" value={computeForm.period_id} onChange={(e) => setComputeForm((s) => ({ ...s, period_id: e.target.value }))} options={periodOptions} />
          <Select label="Model" value={computeForm.model_id} onChange={(e) => setComputeForm((s) => ({ ...s, model_id: e.target.value }))} options={modelOptions} />
          <Input label="As of date (optional)" type="date" value={computeForm.as_of_date} onChange={(e) => setComputeForm((s) => ({ ...s, as_of_date: e.target.value }))} />
        </div>
        <Textarea className="mt-3" label="Memo (optional)" value={computeForm.memo} onChange={(e) => setComputeForm((s) => ({ ...s, memo: e.target.value }))} />
      </Modal>

      <ConfirmDialog open={finalizeOpen} title="Finalize selected run" message="Finalizing locks the run for audit and enables controlled posting." confirmText="Finalize" onClose={() => setFinalizeOpen(false)} onConfirm={() => finalizeRun.mutate()} />

      <Modal open={postOpen} title="Post ECL journal" onClose={() => setPostOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setPostOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => postRun.mutate()} disabled={postRun.isPending}>Post</Button></div>}>
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Posting period" value={postForm.period_id} onChange={(e) => setPostForm((s) => ({ ...s, period_id: e.target.value }))} options={periodOptions} />
          <Input label="Entry date" type="date" value={postForm.entry_date} onChange={(e) => setPostForm((s) => ({ ...s, entry_date: e.target.value }))} />
        </div>
        <Input className="mt-3" label="Memo" value={postForm.memo} onChange={(e) => setPostForm((s) => ({ ...s, memo: e.target.value }))} />
      </Modal>

      <Modal open={reverseOpen} title="Reverse IFRS 9 posting" onClose={() => setReverseOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setReverseOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => reverseRun.mutate()} disabled={reverseRun.isPending}>Reverse</Button></div>}>
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Target period" value={reverseForm.target_period_id} onChange={(e) => setReverseForm((s) => ({ ...s, target_period_id: e.target.value }))} options={periodOptions} />
          <Input label="Entry date" type="date" value={reverseForm.entry_date} onChange={(e) => setReverseForm((s) => ({ ...s, entry_date: e.target.value }))} />
        </div>
        <Textarea className="mt-3" label="Reason" value={reverseForm.reason} onChange={(e) => setReverseForm((s) => ({ ...s, reason: e.target.value }))} />
      </Modal>
    </div>
  );
}
