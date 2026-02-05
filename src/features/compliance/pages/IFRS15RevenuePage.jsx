import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { makeIfrs15Api } from '../api/ifrs15.api.js';
import { makePartnersApi } from '../../business/api/partners.api.js';
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

export default function IFRS15RevenuePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const toast = useToast();

  const api = useMemo(() => makeIfrs15Api(http), [http]);
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [newOpen, setNewOpen] = useState(false);

  const qs = useMemo(() => ({ status: status || undefined }), [status]);

  const { data, isLoading, error } = useQuery({
    queryKey: qk.ifrs15Contracts(qs),
    queryFn: () => api.listContracts(qs)
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];
  const normalizedQ = q.trim().toLowerCase();
  const filteredRows = normalizedQ
    ? rows.filter((r) => (r?.name ?? '').toLowerCase().includes(normalizedQ) || (r?.code ?? '').toLowerCase().includes(normalizedQ))
    : rows;

  const { data: customers } = useQuery({
    queryKey: qk.partners({ type: 'customer', status: 'active' }),
    queryFn: () => partnersApi.list({ type: 'customer', status: 'active' })
  });

  const { data: accounts } = useQuery({
    queryKey: qk.coaAccounts({}),
    queryFn: () => coaApi.list({})
  });

  const accountRows = Array.isArray(accounts) ? accounts : accounts?.data ?? [];
  const accountOptions = useMemo(
    () => [{ value: '', label: '— Select —' }].concat(accountRows.map((a) => ({ value: a.id, label: `${a.code ?? ''} ${a.name ?? ''}`.trim() }))),
    [accountRows]
  );

  const customerRows = Array.isArray(customers) ? customers : customers?.data ?? [];
  const customerOptions = useMemo(
    () => [{ value: '', label: '— Select —' }].concat(customerRows.map((c) => ({ value: c.id, label: c.name }))),
    [customerRows]
  );

  const [form, setForm] = useState({
    code: '',
    name: '',
    customer_id: '',
    start_date: '',
    end_date: '',
    currency: '',
    total_transaction_price: '',
    revenue_account_id: '',
    contract_asset_account_id: '',
    contract_liability_account_id: '',
    notes: ''
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        total_transaction_price: form.total_transaction_price === '' ? undefined : Number(form.total_transaction_price)
      };
      return api.createContract(payload);
    },
    onSuccess: (created) => {
      setNewOpen(false);
      toast.push({ title: 'Contract created', message: 'Contract saved successfully.', tone: 'success' });
      qc.invalidateQueries({ queryKey: qk.ifrs15Contracts(qs) });
      const id = created?.id ?? created?.data?.id;
      if (id) navigate(ROUTES.complianceIFRS15ContractDetail(id));
    },
    onError: (e) => toast.push({ title: 'Create failed', message: String(e?.message ?? e), tone: 'danger' })
  });

  const columns = useMemo(
    () => [
      {
        header: 'Contract',
        render: (r) => (
          <div className="flex flex-col">
            <Link to={ROUTES.complianceIFRS15ContractDetail(r.id)} className="font-medium text-brand-deep hover:underline">
              {r.name ?? r.code ?? '—'}
            </Link>
            <div className="text-xs text-slate-500">{r.code ?? ''}</div>
          </div>
        )
      },
      { header: 'Customer', render: (r) => <span className="text-sm text-slate-700">{r.customer_name ?? r.customer?.name ?? '—'}</span> },
      { header: 'Status', render: (r) => <Badge tone={(r.status ?? '').toLowerCase() === 'active' ? 'success' : 'muted'}>{r.status ?? '—'}</Badge> }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="IFRS 15 — Revenue Contracts"
        subtitle="Contract register, performance obligations, schedules, and posting."
        icon={FileText}
        actions={
          <Button leftIcon={Plus} variant="primary" onClick={() => setNewOpen(true)}>
            New contract
          </Button>
        }
      />

      <ContentCard>
        <FilterBar
          left={
            <div className="grid gap-3 md:grid-cols-3">
              <Input label="Search" placeholder="Search name, code…" value={q} onChange={(e) => setQ(e.target.value)} />
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: '', label: 'All' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'active', label: 'Active' },
                  { value: 'closed', label: 'Closed' }
                ]}
              />
              <div className="hidden md:block" />
            </div>
          }
          right={<div className="text-xs text-slate-500">{error ? <span className="text-red-600">{String(error?.message ?? 'Failed to load')}</span> : null}</div>}
        />

        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={filteredRows}
            isLoading={isLoading}
            empty={{ title: 'No contracts', description: 'Create your first IFRS 15 contract to begin revenue schedules and posting.' }}
          />
        </div>
      </ContentCard>

      <Modal
        open={newOpen}
        title="New IFRS 15 Contract"
        onClose={() => setNewOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              Create
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Code" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} />
          <Input label="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          <Select label="Customer" value={form.customer_id} onChange={(e) => setForm((s) => ({ ...s, customer_id: e.target.value }))} options={customerOptions} />
          <Input label="Currency" value={form.currency} onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))} placeholder="e.g., GHS" />
          <Input label="Start date" type="date" value={form.start_date} onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))} />
          <Input label="End date" type="date" value={form.end_date} onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))} />
          <Input
            label="Total transaction price"
            type="number"
            value={form.total_transaction_price}
            onChange={(e) => setForm((s) => ({ ...s, total_transaction_price: e.target.value }))}
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Select label="Revenue account" value={form.revenue_account_id} onChange={(e) => setForm((s) => ({ ...s, revenue_account_id: e.target.value }))} options={accountOptions} />
          <Select label="Contract asset account" value={form.contract_asset_account_id} onChange={(e) => setForm((s) => ({ ...s, contract_asset_account_id: e.target.value }))} options={accountOptions} />
          <Select label="Contract liability account" value={form.contract_liability_account_id} onChange={(e) => setForm((s) => ({ ...s, contract_liability_account_id: e.target.value }))} options={accountOptions} />
        </div>

        <div className="mt-4">
          <Textarea label="Notes (optional)" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
