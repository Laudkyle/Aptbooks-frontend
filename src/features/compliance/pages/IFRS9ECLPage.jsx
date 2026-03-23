import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';

import { makeIfrs9Api } from '../api/ifrs9.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
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
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { formatDate } from '../../../shared/utils/formatDate.js';

export default function IFRS9ECLPage() {
  const qc = useQueryClient();
  const { http } = useApi();
  const toast = useToast();

  const api = useMemo(() => makeIfrs9Api(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: qk.ifrs9Settings,
    queryFn: () => api.getSettings()
  });

  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: qk.ifrs9Models,
    queryFn: () => api.listModels()
  });

  const [runsPeriodId, setRunsPeriodId] = useState('');
  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }),
    queryFn: () => api.listRuns({ period_id: runsPeriodId || undefined })
  });

  const { data: accounts } = useQuery({
    queryKey: qk.coaAccounts({ status: 'active' }),
    queryFn: () => coaApi.list({ status: 'active' })
  });

  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: () => periodsApi.list()
  });

  const accountRows = Array.isArray(accounts) ? accounts : accounts?.data ?? [];
  const accountOptions = [{ value: '', label: 'Select…' }].concat(
    accountRows.map((a) => ({ value: a.id, label: `${a.code ?? ''} ${a.name ?? ''}`.trim() }))
  );

  const periodRows = Array.isArray(periods) ? periods : periods?.data ?? [];
  const periodOptions = [{ value: '', label: 'Select…' }].concat(
    periodRows.map((p) => ({ value: p.id, label: `${p.code ?? ''} — ${p.name ?? ''}`.trim() }))
  );

  const [settingsForm, setSettingsForm] = useState(null);
  const effectiveSettingsForm = settingsForm ?? {
    allowance_account_id: settings?.allowance_account_id ?? '',
    impairment_expense_account_id: settings?.impairment_expense_account_id ?? '',
    writeoff_account_id: settings?.writeoff_account_id ?? '',
    stage2_days_past_due: settings?.stage2_days_past_due ?? 30,
    stage3_days_past_due: settings?.stage3_days_past_due ?? 90
  };

  const saveSettings = useMutation({
    mutationFn: () => api.updateSettings(effectiveSettingsForm),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Saved', message: 'IFRS 9 settings updated.' });
      setSettingsForm(null);
      await qc.invalidateQueries({ queryKey: qk.ifrs9Settings });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Save failed', message: String(e?.message ?? e) })
  });

  const modelRows = Array.isArray(models) ? models : models?.data ?? [];
  const runRows = Array.isArray(runs) ? runs : runs?.data ?? [];

  const [newModelOpen, setNewModelOpen] = useState(false);
  const [modelForm, setModelForm] = useState({
    name: '',
    method: 'simplified',
    description: ''
  });

  const createModel = useMutation({
    mutationFn: () => api.createModel(modelForm),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Created', message: 'Model created.' });
      setNewModelOpen(false);
      setModelForm({ name: '', method: 'simplified', description: '' });
      await qc.invalidateQueries({ queryKey: qk.ifrs9Models });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Create failed', message: String(e?.message ?? e) })
  });

  const [bucketOpen, setBucketOpen] = useState(false);
  const [bucketTarget, setBucketTarget] = useState(null);
  const [bucketForm, setBucketForm] = useState({
    name: '',
    stage: 1,
    pd: '',
    lgd: '',
    ead_multiplier: 1
  });

  const addBucket = useMutation({
    mutationFn: () => api.addBucket(bucketTarget?.id, {
      ...bucketForm,
      stage: Number(bucketForm.stage),
      pd: bucketForm.pd === '' ? null : Number(bucketForm.pd),
      lgd: bucketForm.lgd === '' ? null : Number(bucketForm.lgd),
      ead_multiplier: bucketForm.ead_multiplier === '' ? null : Number(bucketForm.ead_multiplier)
    }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Added', message: 'Bucket added.' });
      setBucketOpen(false);
      setBucketTarget(null);
      setBucketForm({ name: '', stage: 1, pd: '', lgd: '', ead_multiplier: 1 });
      await qc.invalidateQueries({ queryKey: qk.ifrs9Models });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Add failed', message: String(e?.message ?? e) })
  });

  const [computeOpen, setComputeOpen] = useState(false);
  const [computeForm, setComputeForm] = useState({
    period_id: '',
    model_id: '',
    as_of_date: ''
  });

  const computeRun = useMutation({
    mutationFn: () => api.computeEcl({
      ...computeForm,
      model_id: computeForm.model_id || undefined,
      as_of_date: computeForm.as_of_date || undefined
    }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Computed', message: 'ECL run created.' });
      setComputeOpen(false);
      await qc.invalidateQueries({ queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }) });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Compute failed', message: String(e?.message ?? e) })
  });

  const [runDetailOpen, setRunDetailOpen] = useState(false);
  const [runDetailId, setRunDetailId] = useState(null);
  const { data: runDetail } = useQuery({
    queryKey: qk.ifrs9Run(runDetailId ?? 'none'),
    queryFn: () => api.getRun(runDetailId),
    enabled: !!runDetailId
  });

  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const finalizeRun = useMutation({
    mutationFn: () => api.finalizeRun(runDetailId),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Finalized', message: 'Run finalized.' });
      setFinalizeOpen(false);
      await qc.invalidateQueries({ queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }) });
      if (runDetailId) await qc.invalidateQueries({ queryKey: qk.ifrs9Run(runDetailId) });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Finalize failed', message: String(e?.message ?? e) })
  });

  const [postOpen, setPostOpen] = useState(false);
  const [postForm, setPostForm] = useState({ period_id: '', posting_date: '', memo: '' });
  const postRun = useMutation({
    mutationFn: () => api.postEcl({ ...postForm, run_id: runDetailId }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Posted', message: 'ECL posted.' });
      setPostOpen(false);
      await qc.invalidateQueries({ queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }) });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Post failed', message: String(e?.message ?? e) })
  });

  const modelsColumns = useMemo(
    () => [
      { header: 'Name', render: (m) => <div className="font-medium text-slate-800">{m.name ?? '—'}</div> },
      { header: 'Method', render: (m) => <span className="text-sm text-slate-700">{m.method ?? '—'}</span> },
      {
        header: 'Buckets',
        render: (m) => <span className="text-sm text-slate-700">{Array.isArray(m.buckets) ? m.buckets.length : m.bucket_count ?? '—'}</span>
      },
      {
        header: '',
        render: (m) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setBucketTarget(m);
              setBucketOpen(true);
            }}
          >
            Add bucket
          </Button>
        )
      }
    ],
    []
  );

  const runsColumns = useMemo(
    () => [
      {
        header: 'Run',
        render: (r) => (
          <button
            type="button"
            className="text-left"
            onClick={() => {
              setRunDetailId(r.id);
              setRunDetailOpen(true);
            }}
          >
            <div className="font-medium text-brand-deep hover:underline">{r.code ?? r.id}</div>
            <div className="text-xs text-slate-500">{r.created_at ? formatDate(r.created_at) : ''}</div>
          </button>
        )
      },
      { header: 'Period', render: (r) => <span className="text-sm text-slate-700">{r.period_code ?? r.period_id ?? '—'}</span> },
      { header: 'Model', render: (r) => <span className="text-sm text-slate-700">{r.model_name ?? r.model_id ?? '—'}</span> },
      { header: 'Status', render: (r) => <span className="text-sm text-slate-700">{r.status ?? '—'}</span> }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="IFRS 9 — Expected Credit Loss"
        subtitle="Models, parameters, runs, posting and disclosures."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={RefreshCw} variant="secondary" onClick={() => qc.invalidateQueries({ queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }) })}>
              Refresh
            </Button>
            <Button leftIcon={Plus} variant="primary" onClick={() => setComputeOpen(true)}>
              Compute ECL
            </Button>
          </div>
        }
      />

      <ContentCard>
        <Tabs
          tabs={[
            {
              value: 'settings',
              label: 'Settings',
              content: (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2 rounded-xl border border-border-subtle p-4">
                    <div className="text-sm font-semibold text-brand-deep">Posting & thresholds</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Select
                        label="Allowance account"
                        value={effectiveSettingsForm.allowance_account_id}
                        onChange={(e) => setSettingsForm((s) => ({ ...(s ?? effectiveSettingsForm), allowance_account_id: e.target.value }))}
                        options={accountOptions}
                      />
                      <Select
                        label="Impairment expense account"
                        value={effectiveSettingsForm.impairment_expense_account_id}
                        onChange={(e) => setSettingsForm((s) => ({ ...(s ?? effectiveSettingsForm), impairment_expense_account_id: e.target.value }))}
                        options={accountOptions}
                      />
                      <Select
                        label="Write-off account"
                        value={effectiveSettingsForm.writeoff_account_id}
                        onChange={(e) => setSettingsForm((s) => ({ ...(s ?? effectiveSettingsForm), writeoff_account_id: e.target.value }))}
                        options={accountOptions}
                      />
                      <div />
                      <Input
                        label="Stage 2 days past due"
                        type="number"
                        value={effectiveSettingsForm.stage2_days_past_due}
                        onChange={(e) => setSettingsForm((s) => ({ ...(s ?? effectiveSettingsForm), stage2_days_past_due: e.target.value }))}
                      />
                      <Input
                        label="Stage 3 days past due"
                        type="number"
                        value={effectiveSettingsForm.stage3_days_past_due}
                        onChange={(e) => setSettingsForm((s) => ({ ...(s ?? effectiveSettingsForm), stage3_days_past_due: e.target.value }))}
                      />
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button variant="primary" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending || settingsLoading}>
                        Save settings
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border-subtle p-4">
                    <div className="text-sm font-semibold text-brand-deep">Notes</div>
                    <div className="mt-2 text-sm text-slate-600">
                      Settings are used by compute + posting flows. Accounts are pulled from your Chart of Accounts to avoid invalid IDs.
                    </div>
                  </div>
                </div>
              )
            },
            {
              value: 'models',
              label: 'Models',
              content: (
                <div>
                  <div className="flex justify-end">
                    <Button leftIcon={Plus} variant="primary" onClick={() => setNewModelOpen(true)}>
                      New model
                    </Button>
                  </div>
                  <div className="mt-3">
                    <DataTable
                      columns={modelsColumns}
                      rows={modelRows}
                      isLoading={modelsLoading}
                      empty={{ title: 'No models', description: 'Create an ECL model to compute runs.' }}
                    />
                  </div>
                </div>
              )
            },
            {
              value: 'runs',
              label: 'Runs',
              content: (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Select label="Period" value={runsPeriodId} onChange={(e) => setRunsPeriodId(e.target.value)} options={periodOptions} />
                    <div className="md:col-span-2" />
                  </div>

                  <DataTable
                    columns={runsColumns}
                    rows={runRows}
                    isLoading={runsLoading}
                    empty={{ title: 'No runs', description: 'Compute an ECL run for a period.' }}
                  />
                </div>
              )
            }
          ]}
        />
      </ContentCard>

      <Modal
        open={newModelOpen}
        title="New ECL model"
        onClose={() => setNewModelOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNewModelOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => createModel.mutate()} disabled={createModel.isPending}>
              Create
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Name" value={modelForm.name} onChange={(e) => setModelForm((s) => ({ ...s, name: e.target.value }))} />
          <Select
            label="Method"
            value={modelForm.method}
            onChange={(e) => setModelForm((s) => ({ ...s, method: e.target.value }))}
            options={[
              { value: 'simplified', label: 'Simplified (trade receivables)' },
              { value: 'general', label: 'General (staging)' }
            ]}
          />
        </div>
        <Textarea className="mt-3" label="Description" value={modelForm.description} onChange={(e) => setModelForm((s) => ({ ...s, description: e.target.value }))} />
      </Modal>

      <Modal
        open={bucketOpen}
        title={`Add bucket — ${bucketTarget?.name ?? ''}`}
        onClose={() => setBucketOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBucketOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => addBucket.mutate()} disabled={addBucket.isPending}>
              Add
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Name" value={bucketForm.name} onChange={(e) => setBucketForm((s) => ({ ...s, name: e.target.value }))} />
          <Select
            label="Stage"
            value={String(bucketForm.stage)}
            onChange={(e) => setBucketForm((s) => ({ ...s, stage: e.target.value }))}
            options={[
              { value: '1', label: 'Stage 1' },
              { value: '2', label: 'Stage 2' },
              { value: '3', label: 'Stage 3' }
            ]}
          />
          <Input label="PD" type="number" step="0.0001" value={bucketForm.pd} onChange={(e) => setBucketForm((s) => ({ ...s, pd: e.target.value }))} />
          <Input label="LGD" type="number" step="0.0001" value={bucketForm.lgd} onChange={(e) => setBucketForm((s) => ({ ...s, lgd: e.target.value }))} />
          <Input
            label="EAD multiplier"
            type="number"
            step="0.0001"
            value={bucketForm.ead_multiplier}
            onChange={(e) => setBucketForm((s) => ({ ...s, ead_multiplier: e.target.value }))}
          />
        </div>
      </Modal>

      <Modal
        open={computeOpen}
        title="Compute ECL"
        onClose={() => setComputeOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setComputeOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => computeRun.mutate()} disabled={computeRun.isPending}>
              Run
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Period" value={computeForm.period_id} onChange={(e) => setComputeForm((s) => ({ ...s, period_id: e.target.value }))} options={periodOptions} />
          <Select
            label="Model"
            value={computeForm.model_id}
            onChange={(e) => setComputeForm((s) => ({ ...s, model_id: e.target.value }))}
            options={[{ value: '', label: 'Select…' }].concat(modelRows.map((m) => ({ value: m.id, label: m.name ?? m.id })))}
          />
          <Input label="As of date (optional)" type="date" value={computeForm.as_of_date} onChange={(e) => setComputeForm((s) => ({ ...s, as_of_date: e.target.value }))} />
        </div>
      </Modal>

      <Modal
        open={runDetailOpen}
        title={`Run details — ${runDetail?.code ?? runDetail?.id ?? ''}`}
        onClose={() => setRunDetailOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRunDetailOpen(false)}>
              Close
            </Button>
            <Button variant="secondary" onClick={() => setFinalizeOpen(true)} disabled={!runDetailId}>
              Finalize
            </Button>
            <Button variant="primary" onClick={() => setPostOpen(true)} disabled={!runDetailId}>
              Post
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border p-3">
            <div className="text-xs text-slate-500">Status</div>
            <div className="text-sm font-semibold text-slate-800">{runDetail?.status ?? '—'}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-slate-500">Created</div>
            <div className="text-sm font-semibold text-slate-800">{runDetail?.created_at ? formatDate(runDetail.created_at) : '—'}</div>
          </div>
        </div>
        <pre className="mt-3 max-h-64 overflow-auto rounded-xl border bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(runDetail ?? {}, null, 2)}</pre>
      </Modal>

      <ConfirmDialog
        open={finalizeOpen}
        title="Finalize run"
        message="Finalizing locks the run for audit. Continue?"
        confirmText="Finalize"
        onClose={() => setFinalizeOpen(false)}
        onConfirm={() => finalizeRun.mutate()}
      />

      <Modal
        open={postOpen}
        title="Post ECL"
        onClose={() => setPostOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPostOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => postRun.mutate()} disabled={postRun.isPending}>
              Post
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Period" value={postForm.period_id} onChange={(e) => setPostForm((s) => ({ ...s, period_id: e.target.value }))} options={periodOptions} />
          <Input label="Posting date" type="date" value={postForm.posting_date} onChange={(e) => setPostForm((s) => ({ ...s, posting_date: e.target.value }))} />
        </div>
        <Input className="mt-3" label="Memo" value={postForm.memo} onChange={(e) => setPostForm((s) => ({ ...s, memo: e.target.value }))} />
      </Modal>
    </div>
  );
}
