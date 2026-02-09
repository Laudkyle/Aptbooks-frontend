import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';

import { makeIas12Api } from '../api/ias12.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import {formatDate } from '../../../shared/utils/formatDate.js';
import {formatMoney } from '../../../shared/utils/formatMoney.js';

const yn = [
  { value: '0', label: 'No' },
  { value: '1', label: 'Yes' }
];

export default function IAS12TaxesPage() {
  const { http } = useApi();
  const api = useMemo(() => makeIas12Api(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  const qc = useQueryClient();
  const toast = useToast();

  // Master data
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: qk.ias12Settings,
    queryFn: () => api.getSettings()
  });
  const { data: authorities } = useQuery({ queryKey: qk.ias12Authorities, queryFn: () => api.listAuthorities() });
  const { data: rateSets } = useQuery({ queryKey: qk.ias12RateSets, queryFn: () => api.listRateSets() });
  const { data: categories } = useQuery({ queryKey: qk.ias12TempDiffCategories, queryFn: () => api.listTempDifferenceCategories() });
  const { data: coaAccounts } = useQuery({
    queryKey: qk.coaAccounts({}),
    queryFn: () => coaApi.list({}),
    staleTime: 60_000
  });
  const { data: periods } = useQuery({ queryKey: ['periods'], queryFn: () => periodsApi.list() });

  const accounts = Array.isArray(coaAccounts) ? coaAccounts : coaAccounts?.data ?? [];
  const accountOptions = useMemo(
    () => [{ value: '', label: '— Select —' }].concat(accounts.map((a) => ({ value: String(a.id), label: `${a.code ?? ''} ${a.name ?? ''}`.trim() }))),
    [accounts]
  );

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

  // Settings form (COA-powered selects)
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

  // Authorities CRUD
  const [authModal, setAuthModal] = useState({ open: false, mode: 'create', row: null });
  const [authForm, setAuthForm] = useState({ code: '', name: '', country: '', notes: '' });

  const openNewAuthority = () => {
    setAuthForm({ code: '', name: '', country: '', notes: '' });
    setAuthModal({ open: true, mode: 'create', row: null });
  };
  const openEditAuthority = (row) => {
    setAuthForm({ code: row?.code ?? '', name: row?.name ?? '', country: row?.country ?? '', notes: row?.notes ?? '' });
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

  // Temp differences
  const [tdPeriodId, setTdPeriodId] = useState('');
  const tdQs = useMemo(() => ({ periodId: tdPeriodId || undefined }), [tdPeriodId]);
  const { data: tempDiffs, isLoading: tdLoading } = useQuery({
    queryKey: qk.ias12TempDifferences(tdQs),
    queryFn: () => api.listTempDifferences(tdQs)
  });
  const tdRows = Array.isArray(tempDiffs) ? tempDiffs : tempDiffs?.data ?? [];

  const [tdModalOpen, setTdModalOpen] = useState(false);
  const [tdForm, setTdForm] = useState({
    period_id: '',
    category_id: '',
    description: '',
    carrying_amount: '',
    tax_base: '',
    authority_id: '',
    rate_set_id: ''
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

  // Deferred tax runs
  const [runsQs, setRunsQs] = useState({ periodId: '' });
  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: qk.ias12DeferredTaxRuns(runsQs),
    queryFn: () => api.listDeferredTaxRuns({ periodId: runsQs.periodId || undefined })
  });
  const runRows = Array.isArray(runs) ? runs : runs?.data ?? [];

  const [computeOpen, setComputeOpen] = useState(false);
  const [computeForm, setComputeForm] = useState({ period_id: '', authority_id: '', rate_set_id: '', dry_run: true });

  const compute = useMutation({
    mutationFn: async () => api.computeDeferredTax({
      ...computeForm,
      period_id: computeForm.period_id || undefined,
      dry_run: !!computeForm.dry_run
    }),
    onSuccess: () => {
      toast.show({ title: 'Done', message: 'Deferred tax computed.' });
      setComputeOpen(false);
      qc.invalidateQueries({ queryKey: qk.ias12DeferredTaxRuns(runsQs) });
    },
    onError: (e) => toast.show({ title: 'Failed', message: String(e?.message ?? 'Compute failed'), tone: 'error' })
  });

  const [postOpen, setPostOpen] = useState(false);
  const [postForm, setPostForm] = useState({ period_id: '', posting_date: '', memo: '' });
  const postRun = useMutation({
    mutationFn: async () => api.postDeferredTax(postForm),
    onSuccess: () => {
      toast.show({ title: 'Posted', message: 'Deferred tax posted.' });
      setPostOpen(false);
      qc.invalidateQueries({ queryKey: qk.ias12DeferredTaxRuns(runsQs) });
    },
    onError: (e) => toast.show({ title: 'Failed', message: String(e?.message ?? 'Post failed'), tone: 'error' })
  });

  const authorityColumns = useMemo(
    () => [
      { header: 'Name', render: (r) => <div className="font-medium text-slate-900">{r.name ?? '—'}</div> },
      { header: 'Code', render: (r) => <span className="text-sm text-slate-700">{r.code ?? '—'}</span> },
      { header: 'Country', render: (r) => <span className="text-sm text-slate-700">{r.country ?? '—'}</span> },
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
      { header: 'Description', render: (r) => <div className="font-medium text-slate-900">{r.description ?? '—'}</div> },
      { header: 'Category', render: (r) => <span className="text-sm text-slate-700">{r.category_name ?? r.category_id ?? '—'}</span> },
      { header: 'Carrying', render: (r) => <span className="text-sm text-slate-700">{formatMoney(r.carrying_amount)}</span> },
      { header: 'Tax base', render: (r) => <span className="text-sm text-slate-700">{formatMoney(r.tax_base)}</span> }
    ],
    []
  );

  const runColumns = useMemo(
    () => [
      { header: 'Period', render: (r) => <span className="text-sm text-slate-700">{r.period_code ?? r.period_id ?? '—'}</span> },
      { header: 'Authority', render: (r) => <span className="text-sm text-slate-700">{r.authority_name ?? r.authority_id ?? '—'}</span> },
      { header: 'Status', render: (r) => <span className="text-sm text-slate-700">{r.status ?? '—'}</span> },
      { header: 'Computed at', render: (r) => <span className="text-sm text-slate-700">{formatDate(r.created_at ?? r.computed_at)}</span> }
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

            <Select
              label="Deferred tax asset account"
              value={String(settingsForm?.deferred_tax_asset_account_id ?? '')}
              onChange={(e) => setSettingsForm((s) => ({ ...(s ?? {}), deferred_tax_asset_account_id: e.target.value || null }))}
              options={accountOptions}
            />
            <Select
              label="Deferred tax liability account"
              value={String(settingsForm?.deferred_tax_liability_account_id ?? '')}
              onChange={(e) => setSettingsForm((s) => ({ ...(s ?? {}), deferred_tax_liability_account_id: e.target.value || null }))}
              options={accountOptions}
            />
            <Select
              label="Tax expense account"
              value={String(settingsForm?.tax_expense_account_id ?? '')}
              onChange={(e) => setSettingsForm((s) => ({ ...(s ?? {}), tax_expense_account_id: e.target.value || null }))}
              options={accountOptions}
            />
            <Select
              label="Tax payable account"
              value={String(settingsForm?.tax_payable_account_id ?? '')}
              onChange={(e) => setSettingsForm((s) => ({ ...(s ?? {}), tax_payable_account_id: e.target.value || null }))}
              options={accountOptions}
            />

            <Select
              label="Require approvals"
              value={String(settingsForm?.require_approval ? 1 : 0)}
              onChange={(e) => setSettingsForm((s) => ({ ...(s ?? {}), require_approval: e.target.value === '1' }))}
              options={yn}
            />
            <Input
              label="Default memo prefix"
              value={settingsForm?.memo_prefix ?? ''}
              onChange={(e) => setSettingsForm((s) => ({ ...(s ?? {}), memo_prefix: e.target.value }))}
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
              empty={{ title: 'No authorities', description: 'Create at least one tax authority (e.g., GRA).' }}
            />
          </div>

          <div className="mt-6 rounded-xl border border-border-subtle p-4">
            <div className="text-sm font-semibold text-brand-deep">Rate sets & categories</div>
            <div className="mt-1 text-xs text-slate-500">
              The backend supports detailed rate lines (valid-from / valid-to) and category mapping. This UI provides the core scaffolding; you can expand it
              with inline line editing and additional validations as you finalize your exact IAS12 validators.
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
                  setTdForm({ period_id: tdPeriodId, category_id: '', description: '', carrying_amount: '', tax_base: '', authority_id: '', rate_set_id: '' });
                  setTdModalOpen(true);
                }}
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
              empty={{ title: 'No temporary differences', description: 'Select a period and add differences (carrying amount vs tax base).' }}
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
                <Select label="Period" value={runsQs.periodId} onChange={(e) => setRunsQs((s) => ({ ...s, periodId: e.target.value }))} options={periodOptions} />
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
        subtitle="Authorities, rate sets, temporary differences and deferred tax runs."
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

      {/* Authority modal */}
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
          <Input label="Country" value={authForm.country} onChange={(e) => setAuthForm((s) => ({ ...s, country: e.target.value }))} />
          <div className="hidden md:block" />
        </div>
        <div className="mt-3">
          <Textarea label="Notes" value={authForm.notes} onChange={(e) => setAuthForm((s) => ({ ...s, notes: e.target.value }))} />
        </div>
      </Modal>

      {/* Temp diff modal */}
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
          <Select label="Authority" value={tdForm.authority_id} onChange={(e) => setTdForm((s) => ({ ...s, authority_id: e.target.value }))} options={authorityOptions} />
          <Select label="Rate set" value={tdForm.rate_set_id} onChange={(e) => setTdForm((s) => ({ ...s, rate_set_id: e.target.value }))} options={rateSetOptions} />
          <Input label="Carrying amount" type="number" value={tdForm.carrying_amount} onChange={(e) => setTdForm((s) => ({ ...s, carrying_amount: e.target.value }))} />
          <Input label="Tax base" type="number" value={tdForm.tax_base} onChange={(e) => setTdForm((s) => ({ ...s, tax_base: e.target.value }))} />
        </div>
        <div className="mt-3">
          <Textarea label="Description" value={tdForm.description} onChange={(e) => setTdForm((s) => ({ ...s, description: e.target.value }))} />
        </div>
      </Modal>

      {/* Compute modal */}
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
          <Select label="Authority" value={computeForm.authority_id} onChange={(e) => setComputeForm((s) => ({ ...s, authority_id: e.target.value }))} options={authorityOptions} />
          <Select label="Rate set" value={computeForm.rate_set_id} onChange={(e) => setComputeForm((s) => ({ ...s, rate_set_id: e.target.value }))} options={rateSetOptions} />
          <Select label="Dry run" value={computeForm.dry_run ? '1' : '0'} onChange={(e) => setComputeForm((s) => ({ ...s, dry_run: e.target.value === '1' }))} options={[{ value: '1', label: 'Preview' }, { value: '0', label: 'Create run' }]} />
        </div>
      </Modal>

      {/* Post modal */}
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
          <Input label="Posting date" type="date" value={postForm.posting_date} onChange={(e) => setPostForm((s) => ({ ...s, posting_date: e.target.value }))} />
        </div>
        <Input className="mt-3" label="Memo" value={postForm.memo} onChange={(e) => setPostForm((s) => ({ ...s, memo: e.target.value }))} />
      </Modal>
    </div>
  );
}
