import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Sheet, RefreshCw } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { makeIfrs16Api } from '../api/ifrs16.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

const timingOptions = [
  { value: 'arrears', label: 'Arrears (end of period)' },
  { value: 'advance', label: 'Advance (start of period)' }
];

export default function IFRS16LeasesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const toast = useToast();

  const api = useMemo(() => makeIfrs16Api(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [openNew, setOpenNew] = useState(false);

  const { data: accountsRaw } = useQuery({
    queryKey: qk.coaAccounts({}),
    queryFn: () => coaApi.list({}),
    staleTime: 60_000
  });
  const accounts = Array.isArray(accountsRaw) ? accountsRaw : accountsRaw?.data ?? [];
  const accountOptions = useMemo(
    () => [{ value: '', label: '— Select —' }, ...accounts.map((a) => ({ value: a.id, label: `${a.code ?? ''} ${a.name ?? ''}`.trim() }))],
    [accounts]
  );

  const listQs = useMemo(() => ({ status: status || undefined }), [status]);
  const { data, isLoading, error } = useQuery({
    queryKey: qk.ifrs16Leases(listQs),
    queryFn: () => api.listLeases(listQs)
  });

  const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : data?.data ?? [];
  const normalizedQ = q.trim().toLowerCase();
  const filtered = normalizedQ
    ? rows.filter((r) => (r?.name ?? '').toLowerCase().includes(normalizedQ) || (r?.code ?? '').toLowerCase().includes(normalizedQ))
    : rows;

  const columns = useMemo(
    () => [
      {
        header: 'Lease',
        render: (r) => (
          <div className="flex flex-col">
            <Link to={ROUTES.complianceIFRS16LeaseDetail(r.id)} className="font-medium text-brand-deep hover:underline">
              {r.name ?? '—'}
            </Link>
            <div className="text-xs text-slate-500">{r.code ?? '—'}</div>
          </div>
        )
      },
      {
        header: 'Status',
        render: (r) => <Badge tone={(r.status ?? 'draft') === 'active' ? 'success' : 'muted'}>{r.status ?? 'draft'}</Badge>
      },
      { header: 'Commencement', render: (r) => <span className="text-sm text-slate-700">{r.commencement_date ?? '—'}</span> },
      { header: 'Term (months)', render: (r) => <span className="text-sm text-slate-700">{r.term_months ?? '—'}</span> }
    ],
    []
  );

  const [form, setForm] = useState({
    code: '',
    name: '',
    commencement_date: '',
    term_months: 12,
    payment_amount: 0,
    payments_per_year: 12,
    annual_discount_rate: 0,
    payment_timing: 'arrears',
    rou_asset_account_id: '',
    lease_liability_account_id: '',
    interest_expense_account_id: '',
    depreciation_expense_account_id: '',
    accumulated_depreciation_account_id: '',
    cash_account_id: ''
  });

  const createMutation = useMutation({
    mutationFn: () => api.createLease({
      ...form,
      term_months: Number(form.term_months),
      payment_amount: Number(form.payment_amount),
      payments_per_year: Number(form.payments_per_year),
      annual_discount_rate: Number(form.annual_discount_rate)
    }),
    onSuccess: (created) => {
      toast.push({ title: 'Lease created', message: `${created?.code ?? ''} ${created?.name ?? ''}`.trim() });
      setOpenNew(false);
      qc.invalidateQueries({ queryKey: qk.ifrs16Leases(listQs) });
      if (created?.id) navigate(ROUTES.complianceIFRS16LeaseDetail(created.id));
    },
    onError: (e) => toast.push({ title: 'Failed to create lease', message: String(e?.message ?? e), tone: 'error' })
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="IFRS 16 — Leases"
        subtitle="Maintain the lease register, generate amortisation schedules, and post journals."
        icon={Sheet}
        actions={
          <div className="flex gap-2">
            <Button leftIcon={Plus} variant="primary" onClick={() => setOpenNew(true)}>
              New lease
            </Button>
            <Button leftIcon={RefreshCw} variant="secondary" onClick={() => qc.invalidateQueries({ queryKey: qk.ifrs16Leases(listQs) })}>
              Refresh
            </Button>
          </div>
        }
      />

      <ContentCard>
        <FilterBar
          left={
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={q} onChange={(e) => setQ(e.target.value)} label="Search" placeholder="Name or code…" />
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: '', label: 'All' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
              />
              <div className="hidden md:block" />
            </div>
          }
          right={<div className="text-xs text-slate-500">{error ? <span className="text-red-600">{String(error?.message ?? 'Failed')}</span> : null}</div>}
        />

        <div className="mt-3">
          <DataTable
            rows={filtered}
            columns={columns}
            isLoading={isLoading}
            empty={{
              title: 'No leases yet',
              description: 'Create your first lease to generate schedules and post initial recognition.'
            }}
          />
        </div>
      </ContentCard>

      <Modal
        open={openNew}
        title="New Lease (IFRS 16)"
        onClose={() => (createMutation.isPending ? null : setOpenNew(false))}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpenNew(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Code" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} />
          <Input label="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          <Input label="Commencement date" type="date" value={form.commencement_date} onChange={(e) => setForm((s) => ({ ...s, commencement_date: e.target.value }))} />
          <Input label="Term (months)" type="number" value={form.term_months} onChange={(e) => setForm((s) => ({ ...s, term_months: e.target.value }))} />
          <Input label="Payment amount" type="number" value={form.payment_amount} onChange={(e) => setForm((s) => ({ ...s, payment_amount: e.target.value }))} />
          <Input label="Payments per year" type="number" value={form.payments_per_year} onChange={(e) => setForm((s) => ({ ...s, payments_per_year: e.target.value }))} />
          <Input label="Annual discount rate" type="number" step="0.0001" value={form.annual_discount_rate} onChange={(e) => setForm((s) => ({ ...s, annual_discount_rate: e.target.value }))} />
          <Select
            label="Payment timing"
            value={form.payment_timing}
            onChange={(e) => setForm((s) => ({ ...s, payment_timing: e.target.value }))}
            options={timingOptions}
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Select label="ROU Asset account" value={form.rou_asset_account_id} onChange={(e) => setForm((s) => ({ ...s, rou_asset_account_id: e.target.value }))} options={accountOptions} />
          <Select label="Lease liability account" value={form.lease_liability_account_id} onChange={(e) => setForm((s) => ({ ...s, lease_liability_account_id: e.target.value }))} options={accountOptions} />
          <Select label="Interest expense account" value={form.interest_expense_account_id} onChange={(e) => setForm((s) => ({ ...s, interest_expense_account_id: e.target.value }))} options={accountOptions} />
          <Select label="Depreciation expense account" value={form.depreciation_expense_account_id} onChange={(e) => setForm((s) => ({ ...s, depreciation_expense_account_id: e.target.value }))} options={accountOptions} />
          <Select label="Accumulated depreciation account" value={form.accumulated_depreciation_account_id} onChange={(e) => setForm((s) => ({ ...s, accumulated_depreciation_account_id: e.target.value }))} options={accountOptions} />
          <Select label="Cash / bank account" value={form.cash_account_id} onChange={(e) => setForm((s) => ({ ...s, cash_account_id: e.target.value }))} options={accountOptions} />
        </div>

        <div className="mt-4">
          <Textarea
            label="Notes (optional)"
            placeholder="Internal description / audit context…"
            value={form.notes ?? ''}
            onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}
