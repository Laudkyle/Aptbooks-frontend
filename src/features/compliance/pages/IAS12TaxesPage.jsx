import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';

import { makeIas12Api } from '../api/ias12.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { AccountSelect } from '../../../shared/components/forms/AccountSelect.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { formatDate } from '../../../shared/utils/formatDate.js';
import { formatMoney } from '../../../shared/utils/formatMoney.js';

const diffTypeOptions = [
  { value: '', label: '— Select —' },
  { value: 'DEDUCTIBLE', label: 'Deductible difference' },
  { value: 'TAXABLE', label: 'Taxable difference' }
];

const recognisableOptions = [
  { value: '1', label: 'Recognise' },
  { value: '0', label: 'Do not recognise' }
];

export default function IAS12TaxesPage() {
  const { http } = useApi();
  const api = useMemo(() => makeIas12Api(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  const qc = useQueryClient();
  const toast = useToast();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: qk.ias12Settings,
    queryFn: () => api.getSettings()
  });
  const { data: authorities } = useQuery({ queryKey: qk.ias12Authorities, queryFn: () => api.listAuthorities() });
  const { data: rateSets } = useQuery({ queryKey: qk.ias12RateSets, queryFn: () => api.listRateSets() });
  const { data: categories } = useQuery({ queryKey: qk.ias12TempDiffCategories, queryFn: () => api.listTempDifferenceCategories() });
  const { data: periods } = useQuery({ queryKey: ['periods'], queryFn: () => periodsApi.list() });

  const authorityRows = Array.isArray(authorities) ? authorities : authorities?.data ?? [];
  const authorityOptions = useMemo(
    () => [{ value: '', label: '— Select —' }].concat(authorityRows.map((a) => ({ value: String(a.id), label: a.name ?? a.code ?? String(a.id) }))),
    [authorityRows]
  );

  const rateSetRows = Array.isArray(rateSets) ? rateSets : rateSets?.data ?? [];
  const rateSetOptions = useMemo(
    () => [{ value: '', label: '— Select —' }].concat(rateSetRows.map((r) => ({ value: String(r.id), label: r.name ?? r.code ?? String(r.id) }))),
    [rateSetRows]
  );

  const periodRows = Array.isArray(periods) ? periods : periods?.data ?? [];
  const periodOptions = useMemo(
    () => [{ value: '', label: '— Select —' }].concat(periodRows.map((p) => ({ value: String(p.id), label: `${p.code ?? p.name ?? p.id} (${formatDate(p.start_date)} → ${formatDate(p.end_date)})` }))),
    [periodRows]
  );

  const categoryRows = Array.isArray(categories) ? categories : categories?.data ?? [];
  const categoryOptions = useMemo(
    () => [{ value: '', label: '— Select —' }].concat(categoryRows.map((c) => ({ value: String(c.id), label: c.name ?? c.code ?? String(c.id) }))),
    [categoryRows]
  );

  const [settingsForm, setSettingsForm] = useState(null);
  React.useEffect(() => {
    if (!settingsForm && settings) setSettingsForm({ ...settings });
  }, [settings, settingsForm]);

  const saveSettings = useMutation({
    mutationFn: async () => api.updateSettings(settingsForm ?? {}),
    onSuccess: () => {
      toast.show({ title: 'Saved', message: 'IAS 12 settings updated.' });
      qc.invalidateQueries({ queryKey: qk.ias12Settings });
    },
    onError: (e) => toast.show({ title: 'Failed', message: String(e?.message ?? 'Could not save settings'), tone: 'error' })
  });

  const [authModal, setAuthModal] = useState({ open: false, mode: 'create', row: null });
  const [authForm, setAuthForm] = useState({ code: '', name: '', country_code: '', status: 'active' });

  const openNewAuthority = () => {
    setAuthForm({ code: '', name: '', country_code: '', status: 'active' });
    setAuthModal({ open: true, mode: 'create', row: null });
  };

  const openEditAuthority = (row) => {
    setAuthForm({
      code: row?.code ?? '',
      name: row?.name ?? '',
      country_code: row?.country_code ?? '',
      status: row?.status ?? 'active'
    });
    setAuthModal({ open: true, mode: 'edit', row });
  };

  const saveAuthority = useMutation({
    mutationFn: async () => {
      if (authModal.mode === 'edit') return api.updateAuthority(authModal.row.id, authForm);
      return api.createAuthority(authForm);
    },
    onSuccess: () => {
      toast.show({ title: 'Saved', message: 'Authority saved.' });
      setAuthModal({ open: false, mode: 'create', row: null });
      qc.invalidateQueries({ queryKey: qk.ias12Authorities });
    },
    onError: (e) => toast.show({ title: 'Failed', message: String(e?.message ?? 'Could not save authority'), tone: 'error' })
  });

  const [tdPeriodId, setTdPeriodId] = useState('');
  const tdQs = useMemo(() => ({ period_id: tdPeriodId || undefined }), [tdPeriodId]);
  const { data: tempDiffs, isLoading: tdLoading } = useQuery({
    queryKey: qk.ias12TempDifferences(tdQs),
    queryFn: () => api.listTempDifferences(tdQs),
    enabled: !!tdPeriodId
  });
  const tdRows = Array.isArray(tempDiffs) ? tempDiffs : tempDiffs?.data ?? [];

  const [tdModalOpen, setTdModalOpen] = useState(false);
  const [tdForm, setTdForm] = useState({
    period_id: '',
    category_id: '',
    diff_type: '',
    carrying_amount: '',
    tax_base: '',
    recognisable: true,
    notes: ''
  });

  const createTempDiff = useMutation({
    mutationFn: async () => api.createTempDifference({
      ...tdForm,
      period_id: tdForm.period_id || tdPeriodId || undefined,
      carrying_amount: tdForm.carrying_amount === '' ? undefined : Number(tdForm.carrying_amount),
      tax_base: tdForm.tax_base === '' ? undefined : Number(tdForm.tax_base)
    }),
    onSuccess: () => {
      toast.show({ title: 'Saved', message: 'Temporary difference created.' });
      setTdModalOpen(false);
      qc.invalidateQueries({ queryKey: qk.ias12TempDifferences(tdQs) });
    },
    onError: (e) => toast.show({ title: 'Failed', message: String(e?.message ?? 'Could not save'), tone: 'error' })
  });

  const [runsQs, setRunsQs] = useState({ period_id: '' });
  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: qk.ias12DeferredTaxRuns(runsQs),
    queryFn: () => api.listDeferredTaxRuns({ period_id: runsQs.period_id || undefined }),
    enabled: !!runsQs.period_id
  });
  const runRows = Array.isArray(runs) ? runs : runs?.data ?? [];

  const [computeOpen, setComputeOpen] = useState(false);
  const [computeForm, setComputeForm] = useState({ period_id: '', rate_set_id: '', memo: '' });

  const compute = useMutation({
    mutationFn: async () => api.computeDeferredTax({
      ...computeForm,
      period_id: computeForm.period_id || undefined
    }),
    onSuccess: () => {
      toast.show({ title: 'Done', message: 'Deferred tax computed.' });
      setComputeOpen(false);
      qc.invalidateQueries({ queryKey: qk.ias12DeferredTaxRuns(runsQs) });
    },
    onError: (e) => toast.show({ title: 'Failed', message: String(e?.message ?? 'Compute failed'), tone: 'error' })
  });

  const [postOpen, setPostOpen] = useState(false);
  const [postForm, setPostForm] = useState({ period_id: '', run_id: '', memo: '' });
  const postRun = useMutation({
    mutationFn: async () => api.postDeferredTax(postForm),
    onSuccess: () => {
      toast.show({ title: 'Posted', message: 'Deferred tax posted.' });
      setPostOpen(false);
      qc.invalidateQueries({ queryKey: qk.ias12DeferredTaxRuns(runsQs) });
    },
    onError: (e) => toast.show({ title: 'Failed', message: String(e?.message ?? 'Post failed'), tone: 'error' })
  });

  const runOptions = useMemo(
    () => [{ value: '', label: 'Latest final run for selected period' }].concat(runRows.map((r) => ({ value: String(r.run_id), label: `${r.run_id} — ${r.run_status ?? 'draft'}` }))),
    [runRows]
  );

  const authorityColumns = useMemo(
    () => [
      { header: 'Name', render: (r) => <div className="font-medium text-slate-900">{r.name ?? '—'}</div> },
      { header: 'Code', render: (r) => <span className="text-sm text-slate-700">{r.code ?? '—'}</span> },
      { header: 'Country', render: (r) => <span className="text-sm text-slate-700">{r.country_code ?? '—'}</span> },
      { header: 'Status', render: (r) => <span className="text-sm text-slate-700">{r.status ?? '—'}</span> },
      {
        header: '',
        render: (r) => (
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => openEditAuthority(r)}>
              Edit
            </Button>
          </div>
        )
      }
    ],
    []
  );

  const tdColumns = useMemo(
    () => [
      { header: 'Type', render: (r) => <div className="font-medium text-slate-900">{r.diff_type ?? '—'}</div> },
      { header: 'Category', render: (r) => <span className="text-sm text-slate-700">{r.category_name ?? r.category_id ?? '—'}</span> },
      { header: 'Difference', render: (r) => <span className="text-sm text-slate-700">{formatMoney(r.difference)}</span> },
      { header: 'Recognisable', render: (r) => <span className="text-sm text-slate-700">{r.recognisable === false ? 'No' : 'Yes'}</span> },
      { header: 'Notes', render: (r) => <span className="text-sm text-slate-700">{r.notes ?? '—'}</span> }
    ],
    []
  );

  const runColumns = useMemo(
    () => [
      { header: 'Run', render: (r) => <span className="text-sm text-slate-700">{r.run_id ?? '—'}</span> },
      { header: 'Period', render: (r) => <span className="text-sm text-slate-700">{r.period_code ?? r.period_id ?? '—'}</span> },
      { header: 'Rate set', render: (r) => <span className="text-sm text-slate-700">{r.rate_set_id ?? '—'}</span> },
      { header: 'Status', render: (r) => <span className="text-sm text-slate-700">{r.run_status ?? '—'}</span> },
      { header: 'Computed at', render: (r) => <span className="text-sm text-slate-700">{formatDate(r.created_at)}</span> }
    ],
    []
  );

  const tabs = [
    {
      value: 'settings',
      label: 'Settings',
      content: (
        <ContentCard>
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Default tax authority"
              value={String(settingsForm?.default_authority_id ?? '')}
              onChange={(e) => setSettingsForm((s) => ({ ...(s ?? {}), default_authority_id: e.target.value || null }))}
              options={authorityOptions}
            />
            <Select
              label="Default rate set"
              value={String(settingsForm?.default_rate_set_id ?? '')}
              onChange={(e) => setSettingsForm((s) => ({ ...(s ?? {}), default_rate_set_id: e.target.value || null }))}
              options={rateSetOptions}
            />
            <AccountSelect
              label="Deferred tax asset account"
              value={String(settingsForm?.deferred_tax_asset_account_id ?? '')}
              onChange={(e) => setSettingsForm((s) => ({ ...(s ?? {}), deferred_tax_asset_account_id: e.target.value || null }))}
              allowEmpty
            />
            <AccountSelect
              label="Deferred tax liability account"
              value={String(settingsForm?.deferred_tax_liability_account_id ?? '')}
              onChange={(e) => setSettingsForm((s) => ({ ...(s ?? {}), deferred_tax_liability_account_id: e.target.value || null }))}
              allowEmpty
            />
            <AccountSelect
              label="Deferred tax expense account"
              value={String(settingsForm?.deferred_tax_expense_account_id ?? '')}
              onChange={(e) => setSettingsForm((s) => ({ ...(s ?? {}), deferred_tax_expense_account_id: e.target.value || null }))}
              allowEmpty
            />
            <Input
              label="Rounding decimals"
              type="number"
              value={String(settingsForm?.rounding_decimals ?? 2)}
              onChange={(e) => setSettingsForm((s) => ({ ...(s ?? {}), rounding_decimals: e.target.value === '' ? '' : Number(e.target.value) }))}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending || settingsLoading}>
              Save settings
            </Button>
          </div>
        </ContentCard>
      )
    },
    {
      value: 'master',
      label: 'Master data',
      content: (
        <ContentCard>
          <FilterBar
            left={<div className="text-sm font-medium text-slate-900">Authorities</div>}
            right={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => qc.invalidateQueries({ queryKey: qk.ias12Authorities })} leftIcon={RefreshCw}>
                  Refresh
                </Button>
                <Button variant="primary" onClick={openNewAuthority} leftIcon={Plus}>
                  New authority
                </Button>
              </div>
            }
          />
          <div className="mt-3">
            <DataTable
              columns={authorityColumns}
              rows={authorityRows}
              empty={{ title: 'No authorities', description: 'Create at least one income-tax authority for IAS 12.' }}
            />
          </div>

          <div className="mt-6 rounded-xl border border-border-subtle p-4">
            <div className="text-sm font-semibold text-brand-deep">Rate sets and categories</div>
            <div className="mt-1 text-xs text-slate-500">
              Rate-set lines, category setup, copy-forward, imports, and detailed reports remain backend-capable. This screen now stays aligned with the current deferred-tax data contract.
            </div>
          </div>
        </ContentCard>
      )
    },
    {
      value: 'temp',
      label: 'Temporary differences',
      content: (
        <ContentCard>
          <FilterBar
            left={
              <div className="grid gap-3 md:grid-cols-3">
                <Select label="Period" value={tdPeriodId} onChange={(e) => setTdPeriodId(e.target.value)} options={periodOptions} />
                <div className="hidden md:block" />
                <div className="hidden md:block" />
              </div>
            }
            right={
              <Button
                variant="primary"
                leftIcon={Plus}
                onClick={() => {
                  setTdForm({ period_id: tdPeriodId, category_id: '', diff_type: '', carrying_amount: '', tax_base: '', recognisable: true, notes: '' });
                  setTdModalOpen(true);
                }}
                disabled={!tdPeriodId}
              >
                Add
              </Button>
            }
          />

          <div className="mt-3">
            <DataTable
              columns={tdColumns}
              rows={tdRows}
              isLoading={tdLoading}
              empty={{ title: 'No temporary differences', description: 'Select a period and add deductible or taxable temporary differences.' }}
            />
          </div>
        </ContentCard>
      )
    },
    {
      value: 'runs',
      label: 'Deferred tax runs',
      content: (
        <ContentCard>
          <FilterBar
            left={
              <div className="grid gap-3 md:grid-cols-3">
                <Select label="Period" value={runsQs.period_id} onChange={(e) => setRunsQs((s) => ({ ...s, period_id: e.target.value }))} options={periodOptions} />
                <div className="hidden md:block" />
                <div className="hidden md:block" />
              </div>
            }
            right={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setComputeOpen(true)}>
                  Compute
                </Button>
                <Button variant="primary" onClick={() => setPostOpen(true)}>
                  Post
                </Button>
              </div>
            }
          />

          <div className="mt-3">
            <DataTable
              columns={runColumns}
              rows={runRows}
              isLoading={runsLoading}
              empty={{ title: 'No runs', description: 'Compute deferred tax to create a run.' }}
            />
          </div>
        </ContentCard>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="IAS 12 — Income Taxes"
        subtitle="Deferred-tax settings, authorities, temporary differences, and deferred-tax runs."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={openNewAuthority} leftIcon={Plus}>
              New authority
            </Button>
            <Button variant="primary" onClick={() => setComputeOpen(true)}>
              Compute deferred tax
            </Button>
          </div>
        }
      />

      <Tabs tabs={tabs} />

      <Modal
        open={authModal.open}
        title={authModal.mode === 'edit' ? 'Edit authority' : 'New authority'}
        onClose={() => setAuthModal({ open: false, mode: 'create', row: null })}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAuthModal({ open: false, mode: 'create', row: null })}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => saveAuthority.mutate()} disabled={saveAuthority.isPending}>
              Save
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Code" value={authForm.code} onChange={(e) => setAuthForm((s) => ({ ...s, code: e.target.value }))} />
          <Input label="Name" value={authForm.name} onChange={(e) => setAuthForm((s) => ({ ...s, name: e.target.value }))} />
          <Input label="Country code" value={authForm.country_code} onChange={(e) => setAuthForm((s) => ({ ...s, country_code: e.target.value.toUpperCase() }))} maxLength={2} />
          <Select label="Status" value={authForm.status} onChange={(e) => setAuthForm((s) => ({ ...s, status: e.target.value }))} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </div>
      </Modal>

      <Modal
        open={tdModalOpen}
        title="New temporary difference"
        onClose={() => setTdModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTdModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => createTempDiff.mutate()} disabled={createTempDiff.isPending}>
              Save
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Period" value={tdForm.period_id} onChange={(e) => setTdForm((s) => ({ ...s, period_id: e.target.value }))} options={periodOptions} />
          <Select label="Category" value={tdForm.category_id} onChange={(e) => setTdForm((s) => ({ ...s, category_id: e.target.value }))} options={categoryOptions} />
          <Select label="Difference type" value={tdForm.diff_type} onChange={(e) => setTdForm((s) => ({ ...s, diff_type: e.target.value }))} options={diffTypeOptions} />
          <Select label="Recognition" value={tdForm.recognisable ? '1' : '0'} onChange={(e) => setTdForm((s) => ({ ...s, recognisable: e.target.value === '1' }))} options={recognisableOptions} />
          <Input label="Carrying amount" type="number" value={tdForm.carrying_amount} onChange={(e) => setTdForm((s) => ({ ...s, carrying_amount: e.target.value }))} />
          <Input label="Tax base" type="number" value={tdForm.tax_base} onChange={(e) => setTdForm((s) => ({ ...s, tax_base: e.target.value }))} />
        </div>
        <div className="mt-3">
          <Textarea label="Notes" value={tdForm.notes} onChange={(e) => setTdForm((s) => ({ ...s, notes: e.target.value }))} />
        </div>
      </Modal>

      <Modal
        open={computeOpen}
        title="Compute deferred tax"
        onClose={() => setComputeOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setComputeOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => compute.mutate()} disabled={compute.isPending}>
              Run
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Period" value={computeForm.period_id} onChange={(e) => setComputeForm((s) => ({ ...s, period_id: e.target.value }))} options={periodOptions} />
          <Select label="Rate set" value={computeForm.rate_set_id} onChange={(e) => setComputeForm((s) => ({ ...s, rate_set_id: e.target.value }))} options={rateSetOptions} />
        </div>
        <div className="mt-3">
          <Input label="Memo" value={computeForm.memo} onChange={(e) => setComputeForm((s) => ({ ...s, memo: e.target.value }))} />
        </div>
      </Modal>

      <Modal
        open={postOpen}
        title="Post deferred tax"
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
          <Select label="Run (optional)" value={postForm.run_id} onChange={(e) => setPostForm((s) => ({ ...s, run_id: e.target.value }))} options={runOptions} />
        </div>
        <div className="mt-3">
          <Input label="Memo" value={postForm.memo} onChange={(e) => setPostForm((s) => ({ ...s, memo: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
