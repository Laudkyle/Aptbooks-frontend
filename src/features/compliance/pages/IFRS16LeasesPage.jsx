import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  RefreshCw,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  BarChart3,
  Landmark,
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { qk } from '../../../shared/query/keys.js';
import { makeIfrs16Api } from '../api/ifrs16.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { AccountSelect } from '../../../shared/components/forms/AccountSelect.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { formatMoney } from '../../../shared/utils/formatMoney.js';
import { formatDate } from '../../../shared/utils/formatDate.js';

function rowsOf(data, keys = ['items', 'data', 'rows', 'leases']) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function firstNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

function statusTone(status) {
  const s = String(status || '').toLowerCase();
  if (['active', 'approved', 'posted'].includes(s)) return 'success';
  if (['draft', 'pending', 'submitted'].includes(s)) return 'warning';
  if (['cancelled', 'rejected', 'closed', 'terminated'].includes(s)) return 'danger';
  return 'muted';
}

function defaultLeaseForm() {
  return {
    code: '',
    name: '',
    commencement_date: '',
    term_months: '12',
    payment_amount: '',
    payments_per_year: '12',
    annual_discount_rate: '',
    payment_timing: 'arrears',
    rou_asset_account_id: '',
    lease_liability_account_id: '',
    interest_expense_account_id: '',
    depreciation_expense_account_id: '',
    accumulated_depreciation_account_id: '',
    cash_account_id: '',
    notes: '',
  };
}

export default function IFRS16LeasesPage() {
  const { http } = useApi();
  const api = useMemo(() => makeIfrs16Api(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(defaultLeaseForm());
  const [errors, setErrors] = useState({});

  const queryParams = useMemo(() => ({ status: status || undefined }), [status]);

  const leasesQ = useQuery({
    queryKey: qk.ifrs16Leases(queryParams),
    queryFn: () => api.listLeases(queryParams),
    staleTime: 30_000,
  });

  const leases = useMemo(() => rowsOf(leasesQ.data), [leasesQ.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leases.filter((lease) => {
      const haystack = [
        lease.code,
        lease.name,
        lease.status,
        lease.payment_timing,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return !q || haystack.includes(q);
    });
  }, [leases, search]);

  const validateLease = useCallback(() => {
    const next = {};
    if (!form.name.trim()) next.name = 'Lease name is required';
    if (!form.commencement_date) next.commencement_date = 'Commencement date is required';

    const term = Number(form.term_months);
    if (!Number.isInteger(term) || term <= 0) next.term_months = 'Term must be a positive whole number';

    const payment = Number(form.payment_amount);
    if (form.payment_amount === '' || Number.isNaN(payment) || payment < 0) next.payment_amount = 'Payment amount must be a valid non-negative number';

    const ppy = Number(form.payments_per_year);
    if (!Number.isInteger(ppy) || ppy <= 0 || ppy > 366) next.payments_per_year = 'Payments per year must be a valid positive whole number';

    const rate = Number(form.annual_discount_rate);
    if (form.annual_discount_rate === '' || Number.isNaN(rate) || rate < 0 || rate > 1) {
      next.annual_discount_rate = 'Discount rate must be between 0 and 1';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const createMutation = useMutation({
    mutationFn: () => api.createLease({
      code: form.code.trim() || undefined,
      name: form.name.trim(),
      commencement_date: form.commencement_date,
      term_months: Number(form.term_months || 0),
      payment_amount: Number(form.payment_amount || 0),
      payments_per_year: Number(form.payments_per_year || 0),
      annual_discount_rate: Number(form.annual_discount_rate || 0),
      payment_timing: form.payment_timing || 'arrears',
      rou_asset_account_id: form.rou_asset_account_id || undefined,
      lease_liability_account_id: form.lease_liability_account_id || undefined,
      interest_expense_account_id: form.interest_expense_account_id || undefined,
      depreciation_expense_account_id: form.depreciation_expense_account_id || undefined,
      accumulated_depreciation_account_id: form.accumulated_depreciation_account_id || undefined,
      cash_account_id: form.cash_account_id || undefined,
      notes: form.notes.trim() || undefined,
    }),
    onSuccess: async () => {
      toast.success('IFRS 16 lease created');
      setCreateOpen(false);
      setForm(defaultLeaseForm());
      await qc.invalidateQueries({ queryKey: ['compliance', 'ifrs16', 'leases'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to create lease'),
  });

  const metrics = useMemo(() => {
    return filtered.reduce(
      (acc, row) => {
        acc.total += 1;
        const st = String(row.status || '').toLowerCase();
        if (st === 'active') acc.active += 1;
        if (st === 'draft') acc.draft += 1;
        if (['closed', 'terminated'].includes(st)) acc.closed += 1;
        acc.paymentBase += firstNumber(row.payment_amount);
        acc.discountedBase += firstNumber(row.present_value, row.initial_lease_liability, row.lease_liability_balance);
        return acc;
      },
      { total: 0, active: 0, draft: 0, closed: 0, paymentBase: 0, discountedBase: 0 }
    );
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="IFRS 16 Leases"
        subtitle="Manage lease register, measurement inputs, and posting readiness in a controlled workflow."
        icon={FolderKanban}
        actions={
          <>
            <Button variant="outline" leftIcon={RefreshCw} onClick={() => leasesQ.refetch()}>
              Refresh
            </Button>
            <Button leftIcon={Plus} onClick={() => setCreateOpen(true)}>
              New lease
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <ContentCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-slate-500">Lease register</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{metrics.total}</div>
              <div className="mt-2 text-xs text-slate-500">{metrics.active} active · {metrics.draft} draft</div>
            </div>
            <FileText className="h-8 w-8 text-slate-300" />
          </div>
        </ContentCard>
        <ContentCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-slate-500">Recurring lease payments</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{formatMoney(metrics.paymentBase, 'GHS')}</div>
              <div className="mt-2 text-xs text-slate-500">Current payment inputs across shown leases</div>
            </div>
            <Landmark className="h-8 w-8 text-slate-300" />
          </div>
        </ContentCard>
        <ContentCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-slate-500">Measured liability base</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{formatMoney(metrics.discountedBase, 'GHS')}</div>
              <div className="mt-2 text-xs text-slate-500">Present-value oriented balances where available</div>
            </div>
            <BarChart3 className="h-8 w-8 text-slate-300" />
          </div>
        </ContentCard>
        <ContentCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-slate-500">Closed / terminated</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{metrics.closed}</div>
              <div className="mt-2 text-xs text-slate-500">Portfolio lifecycle visibility</div>
            </div>
            <CheckCircle2 className="h-8 w-8 text-slate-300" />
          </div>
        </ContentCard>
      </div>

      <ContentCard>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          <Input label="Search" placeholder="Code, lease name, status" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' },
              { value: 'closed', label: 'Closed' },
              { value: 'terminated', label: 'Terminated' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
          <div className="flex items-end">
            <Button variant="outline" leftIcon={Search} onClick={() => leasesQ.refetch()} className="w-full">
              Refresh results
            </Button>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Leases" actions={<Badge tone="muted">{filtered.length} shown</Badge>}>
        {leasesQ.isLoading ? (
          <div className="py-10 text-sm text-slate-500">Loading leases...</div>
        ) : leasesQ.isError ? (
          <div className="py-10 text-sm text-red-600">{leasesQ.error?.response?.data?.message ?? 'Failed to load leases'}</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-sm text-slate-500">No IFRS 16 leases found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-3 pr-4">Code</th>
                  <th className="py-3 pr-4">Lease</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Commencement</th>
                  <th className="py-3 pr-4">Term</th>
                  <th className="py-3 pr-4">Payment</th>
                  <th className="py-3 pr-4">Discount rate</th>
                  <th className="py-3 text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lease) => (
                  <tr key={lease.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 pr-4 font-medium text-slate-900">{lease.code || '—'}</td>
                    <td className="py-3 pr-4 text-slate-700">{lease.name || '—'}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={statusTone(lease.status)}>{lease.status || 'unknown'}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{formatDate(lease.commencement_date)}</td>
                    <td className="py-3 pr-4 text-slate-700">{firstNumber(lease.term_months)} months</td>
                    <td className="py-3 pr-4 text-slate-700">{formatMoney(firstNumber(lease.payment_amount), lease.currency_code || 'GHS')}</td>
                    <td className="py-3 pr-4 text-slate-700">{(firstNumber(lease.annual_discount_rate) * 100).toFixed(2)}%</td>
                    <td className="py-3 text-right">
                      <Link to={ROUTES.complianceIFRS16LeaseDetail(lease.id)}>
                        <Button size="sm">Open</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>

      <Modal
        open={createOpen}
        title="Create IFRS 16 lease"
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              loading={createMutation.isPending}
              onClick={() => {
                if (!validateLease()) return;
                createMutation.mutate();
              }}
            >
              Create lease
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Lease code" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} />
          <Input label="Lease name" value={form.name} error={errors.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          <Input label="Commencement date" type="date" value={form.commencement_date} error={errors.commencement_date} onChange={(e) => setForm((s) => ({ ...s, commencement_date: e.target.value }))} />
          <Input label="Term (months)" type="number" value={form.term_months} error={errors.term_months} onChange={(e) => setForm((s) => ({ ...s, term_months: e.target.value }))} />
          <Input label="Payment amount" type="number" value={form.payment_amount} error={errors.payment_amount} onChange={(e) => setForm((s) => ({ ...s, payment_amount: e.target.value }))} />
          <Input label="Payments per year" type="number" value={form.payments_per_year} error={errors.payments_per_year} onChange={(e) => setForm((s) => ({ ...s, payments_per_year: e.target.value }))} />
          <Input label="Annual discount rate" type="number" step="0.0001" value={form.annual_discount_rate} error={errors.annual_discount_rate} onChange={(e) => setForm((s) => ({ ...s, annual_discount_rate: e.target.value }))} />
          <Select
            label="Payment timing"
            value={form.payment_timing}
            onChange={(e) => setForm((s) => ({ ...s, payment_timing: e.target.value }))}
            options={[
              { value: 'arrears', label: 'Arrears (end of period)' },
              { value: 'advance', label: 'Advance (start of period)' },
            ]}
          />
          <AccountSelect label="ROU asset account" value={form.rou_asset_account_id} onChange={(e) => setForm((s) => ({ ...s, rou_asset_account_id: e.target.value }))} allowEmpty filters={{ accountTypeCodes: ['ASSET'] }} />
          <AccountSelect label="Lease liability account" value={form.lease_liability_account_id} onChange={(e) => setForm((s) => ({ ...s, lease_liability_account_id: e.target.value }))} allowEmpty filters={{ accountTypeCodes: ['LIABILITY'] }} />
          <AccountSelect label="Interest expense account" value={form.interest_expense_account_id} onChange={(e) => setForm((s) => ({ ...s, interest_expense_account_id: e.target.value }))} allowEmpty filters={{ accountTypeCodes: ['EXPENSE'] }} />
          <AccountSelect label="Depreciation expense account" value={form.depreciation_expense_account_id} onChange={(e) => setForm((s) => ({ ...s, depreciation_expense_account_id: e.target.value }))} allowEmpty filters={{ accountTypeCodes: ['EXPENSE'] }} />
          <AccountSelect label="Accumulated depreciation account" value={form.accumulated_depreciation_account_id} onChange={(e) => setForm((s) => ({ ...s, accumulated_depreciation_account_id: e.target.value }))} allowEmpty filters={{ accountTypeCodes: ['ASSET', 'CONTRA_ASSET'] }} className="md:col-span-2" />
          <AccountSelect label="Cash / bank account" value={form.cash_account_id} onChange={(e) => setForm((s) => ({ ...s, cash_account_id: e.target.value }))} allowEmpty className="md:col-span-2" />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} className="md:col-span-2" rows={4} />
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Use this form to create the lease master record and the core accounting mappings required for subsequent measurement and journal posting.
        </div>
      </Modal>
    </div>
  );
}
