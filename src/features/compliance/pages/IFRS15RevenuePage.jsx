import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  RefreshCw,
  FileText,
  Search,
  Settings,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  BarChart3,
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { makeIfrs15Api } from '../api/ifrs15.api.js';
import { makePartnersApi } from '../../business/api/partners.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { CurrencySelect } from '../../../shared/components/forms/CurrencySelect.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { formatMoney } from '../../../shared/utils/formatMoney.js';
import { formatDate } from '../../../shared/utils/formatDate.js';

function rowsOf(data, keys = ['items', 'data', 'rows', 'contracts']) {
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
  if (s === 'active' || s === 'approved' || s === 'completed') return 'success';
  if (s === 'draft' || s === 'pending') return 'warning';
  if (s === 'cancelled' || s === 'rejected') return 'danger';
  return 'muted';
}

function defaultContractForm() {
  return {
    code: '',
    customer_id: '',
    contract_date: '',
    start_date: '',
    end_date: '',
    currency_code: 'GHS',
    transaction_price: '',
    billing_policy: 'UPFRONT',
    billing_account_id: '',
  };
}

function defaultSettingsForm() {
  return {
    revenue_account_id: '',
    contract_asset_account_id: '',
    contract_liability_account_id: '',
    billing_account_id: '',
    financing_interest_income_account_id: '',
    financing_interest_expense_account_id: '',
    default_cost_asset_account_id: '',
    default_cost_amort_expense_account_id: '',
    rounding_decimals: '2',
  };
}

export default function IFRS15RevenuePage() {
  const { http } = useApi();
  const api = useMemo(() => makeIfrs15Api(http), [http]);
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [billingPolicy, setBillingPolicy] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [form, setForm] = useState(defaultContractForm());
  const [settingsForm, setSettingsForm] = useState(defaultSettingsForm());
  const [errors, setErrors] = useState({});

  const queryParams = useMemo(() => ({
    status: status || undefined,
    billing_policy: billingPolicy || undefined,
  }), [status, billingPolicy]);

  const contractsQ = useQuery({
    queryKey: ['ifrs15', 'contracts', queryParams],
    queryFn: () => api.listContracts(queryParams),
    staleTime: 30_000,
  });

  const settingsQ = useQuery({
    queryKey: ['ifrs15', 'settings'],
    queryFn: () => api.getSettings(),
    staleTime: 60_000,
  });

  const customersQ = useQuery({
    queryKey: ['ifrs15', 'customers'],
    queryFn: () => partnersApi.list({ type: 'customer', status: 'active', limit: 500 }),
    staleTime: 60_000,
  });

  const contracts = useMemo(() => rowsOf(contractsQ.data), [contractsQ.data]);
  const customers = useMemo(() => rowsOf(customersQ.data), [customersQ.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter((contract) => {
      const haystack = [
        contract.code,
        contract.customer_name,
        contract.customer_code,
        contract.business_partner_name,
        contract.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return !q || haystack.includes(q);
    });
  }, [contracts, search]);

  const customerOptions = useMemo(
    () => [{ value: '', label: 'Select customer' }, ...customers.map((c) => ({ value: c.id, label: c.name || c.display_name || c.code || c.id }))],
    [customers]
  );

  const syncSettingsForm = useCallback((data) => {
    const src = data || {};
    setSettingsForm({
      revenue_account_id: src.revenue_account_id || '',
      contract_asset_account_id: src.contract_asset_account_id || '',
      contract_liability_account_id: src.contract_liability_account_id || '',
      billing_account_id: src.billing_account_id || '',
      financing_interest_income_account_id: src.financing_interest_income_account_id || '',
      financing_interest_expense_account_id: src.financing_interest_expense_account_id || '',
      default_cost_asset_account_id: src.default_cost_asset_account_id || '',
      default_cost_amort_expense_account_id: src.default_cost_amort_expense_account_id || '',
      rounding_decimals: String(src.rounding_decimals ?? 2),
    });
  }, []);

  React.useEffect(() => {
    if (settingsQ.data) syncSettingsForm(settingsQ.data);
  }, [settingsQ.data, syncSettingsForm]);

  const validateContract = useCallback(() => {
    const next = {};
    if (!form.code.trim()) next.code = 'Contract code is required';
    if (!form.customer_id) next.customer_id = 'Customer is required';
    if (!form.contract_date) next.contract_date = 'Contract date is required';
    if (form.transaction_price === '' || Number.isNaN(Number(form.transaction_price)) || Number(form.transaction_price) < 0) {
      next.transaction_price = 'Transaction price must be a valid non-negative number';
    }
    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      next.end_date = 'End date must be on or after start date';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const createMutation = useMutation({
    mutationFn: () => api.createContract({
      code: form.code.trim(),
      customer_id: form.customer_id || undefined,
      business_partner_id: form.customer_id || undefined,
      contract_date: form.contract_date,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      currency_code: form.currency_code || 'GHS',
      transaction_price: Number(form.transaction_price || 0),
      billing_policy: form.billing_policy || 'UPFRONT',
      billing_account_id: form.billing_account_id || undefined,
    }),
    onSuccess: async () => {
      toast.success('IFRS 15 contract created');
      setCreateOpen(false);
      setForm(defaultContractForm());
      await qc.invalidateQueries({ queryKey: ['ifrs15', 'contracts'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Failed to create contract'),
  });

  const settingsMutation = useMutation({
    mutationFn: () => api.updateSettings({
      ...settingsForm,
      rounding_decimals: Number(settingsForm.rounding_decimals || 2),
      revenue_account_id: settingsForm.revenue_account_id || undefined,
      contract_asset_account_id: settingsForm.contract_asset_account_id || undefined,
      contract_liability_account_id: settingsForm.contract_liability_account_id || undefined,
      billing_account_id: settingsForm.billing_account_id || undefined,
      financing_interest_income_account_id: settingsForm.financing_interest_income_account_id || undefined,
      financing_interest_expense_account_id: settingsForm.financing_interest_expense_account_id || undefined,
      default_cost_asset_account_id: settingsForm.default_cost_asset_account_id || undefined,
      default_cost_amort_expense_account_id: settingsForm.default_cost_amort_expense_account_id || undefined,
    }),
    onSuccess: async () => {
      toast.success('IFRS 15 settings saved');
      setSettingsOpen(false);
      await qc.invalidateQueries({ queryKey: ['ifrs15', 'settings'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Failed to save settings'),
  });

  const metrics = useMemo(() => {
    return filtered.reduce(
      (acc, row) => {
        acc.total += 1;
        const st = String(row.status || '').toLowerCase();
        if (st === 'active') acc.active += 1;
        if (st === 'draft') acc.draft += 1;
        if (st === 'completed') acc.completed += 1;
        acc.transactionPrice += firstNumber(row.transaction_price, row.base_transaction_price);
        acc.contractAsset += firstNumber(row.contract_asset_balance);
        acc.contractLiability += firstNumber(row.contract_liability_balance);
        acc.recognized += firstNumber(row.recognized_revenue, row.recognised_revenue);
        return acc;
      },
      { total: 0, active: 0, draft: 0, completed: 0, transactionPrice: 0, contractAsset: 0, contractLiability: 0, recognized: 0 }
    );
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="IFRS 15 Revenue Contracts"
        subtitle="Manage customer contracts, module settings, and revenue recognition readiness."
        icon={FolderKanban}
        actions={
          <>
            <Button variant="outline" leftIcon={RefreshCw} onClick={() => contractsQ.refetch()}>
              Refresh
            </Button>
            <Button variant="outline" leftIcon={Settings} onClick={() => { syncSettingsForm(settingsQ.data); setSettingsOpen(true); }}>
              Settings
            </Button>
            <Button leftIcon={Plus} onClick={() => { setErrors({}); setForm(defaultContractForm()); setCreateOpen(true); }}>
              New contract
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ContentCard className="p-0">
          <div className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm text-slate-500">Contracts</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{metrics.total}</div>
            </div>
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
        </ContentCard>
        <ContentCard className="p-0">
          <div className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm text-slate-500">Recognized revenue</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{formatMoney(metrics.recognized)}</div>
            </div>
            <BarChart3 className="h-8 w-8 text-slate-400" />
          </div>
        </ContentCard>
        <ContentCard className="p-0">
          <div className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm text-slate-500">Contract asset</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{formatMoney(metrics.contractAsset)}</div>
            </div>
            <CheckCircle2 className="h-8 w-8 text-slate-400" />
          </div>
        </ContentCard>
        <ContentCard className="p-0">
          <div className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm text-slate-500">Contract liability</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{formatMoney(metrics.contractLiability)}</div>
            </div>
            <AlertCircle className="h-8 w-8 text-slate-400" />
          </div>
        </ContentCard>
      </div>

      <ContentCard title="Filters">
        <div className="grid gap-4 lg:grid-cols-4">
          <Input label="Search" placeholder="Code, customer, status" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
          <Select
            label="Billing policy"
            value={billingPolicy}
            onChange={(e) => setBillingPolicy(e.target.value)}
            options={[
              { value: '', label: 'All billing policies' },
              { value: 'UPFRONT', label: 'Upfront' },
              { value: 'AS_RECOGNIZED', label: 'As recognized' },
              { value: 'NONE', label: 'None' },
            ]}
          />
          <div className="flex items-end">
            <Button variant="outline" leftIcon={Search} onClick={() => contractsQ.refetch()} className="w-full">
              Refresh results
            </Button>
          </div>
        </div>
      </ContentCard>

      <ContentCard
        title="Contracts"
        actions={<Badge tone="muted">{filtered.length} shown</Badge>}
      >
        {contractsQ.isLoading ? (
          <div className="py-10 text-sm text-slate-500">Loading contracts...</div>
        ) : contractsQ.isError ? (
          <div className="py-10 text-sm text-red-600">{contractsQ.error?.response?.data?.message ?? 'Failed to load contracts'}</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-sm text-slate-500">No IFRS 15 contracts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-3 pr-4">Code</th>
                  <th className="py-3 pr-4">Customer</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Contract date</th>
                  <th className="py-3 pr-4">Transaction price</th>
                  <th className="py-3 pr-4">Recognized</th>
                  <th className="py-3 pr-4">Contract balances</th>
                  <th className="py-3 text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contract) => (
                  <tr key={contract.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 pr-4 font-medium text-slate-900">{contract.code || '—'}</td>
                    <td className="py-3 pr-4 text-slate-700">{contract.customer_name || contract.business_partner_name || contract.customer_code || '—'}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={statusTone(contract.status)}>{contract.status || 'unknown'}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{formatDate(contract.contract_date)}</td>
                    <td className="py-3 pr-4 text-slate-700">{formatMoney(firstNumber(contract.transaction_price, contract.base_transaction_price), contract.currency_code || 'GHS')}</td>
                    <td className="py-3 pr-4 text-slate-700">{formatMoney(firstNumber(contract.recognized_revenue, contract.recognised_revenue), contract.currency_code || 'GHS')}</td>
                    <td className="py-3 pr-4 text-slate-700">
                      <div>Asset: {formatMoney(firstNumber(contract.contract_asset_balance), contract.currency_code || 'GHS')}</div>
                      <div>Liability: {formatMoney(firstNumber(contract.contract_liability_balance), contract.currency_code || 'GHS')}</div>
                    </td>
                    <td className="py-3 text-right">
                      <Link to={ROUTES.complianceIFRS15ContractDetail(contract.id)}>
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
        title="Create IFRS 15 contract"
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              loading={createMutation.isPending}
              onClick={() => {
                if (!validateContract()) return;
                createMutation.mutate();
              }}
            >
              Create contract
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Contract code" value={form.code} error={errors.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} />
          <Select label="Customer" value={form.customer_id} error={errors.customer_id} onChange={(e) => setForm((s) => ({ ...s, customer_id: e.target.value }))} options={customerOptions} />
          <Input label="Contract date" type="date" value={form.contract_date} error={errors.contract_date} onChange={(e) => setForm((s) => ({ ...s, contract_date: e.target.value }))} />
          <CurrencySelect label="Currency" value={form.currency_code} onChange={(e) => setForm((s) => ({ ...s, currency_code: e.target.value }))} allowEmpty={false} />
          <Input label="Start date" type="date" value={form.start_date} onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))} />
          <Input label="End date" type="date" value={form.end_date} error={errors.end_date} onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))} />
          <Input label="Transaction price" type="number" value={form.transaction_price} error={errors.transaction_price} onChange={(e) => setForm((s) => ({ ...s, transaction_price: e.target.value }))} />
          <Select
            label="Billing policy"
            value={form.billing_policy}
            onChange={(e) => setForm((s) => ({ ...s, billing_policy: e.target.value }))}
            options={[
              { value: 'UPFRONT', label: 'Upfront' },
              { value: 'AS_RECOGNIZED', label: 'As recognized' },
              { value: 'NONE', label: 'None' },
            ]}
          />
          <Input label="Billing account ID" value={form.billing_account_id} onChange={(e) => setForm((s) => ({ ...s, billing_account_id: e.target.value }))} className="md:col-span-2" />
        </div>
      </Modal>

      <Modal
        open={settingsOpen}
        title="IFRS 15 settings"
        onClose={() => setSettingsOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button loading={settingsMutation.isPending} onClick={() => settingsMutation.mutate()}>
              Save settings
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Revenue account ID" value={settingsForm.revenue_account_id} onChange={(e) => setSettingsForm((s) => ({ ...s, revenue_account_id: e.target.value }))} />
          <Input label="Billing account ID" value={settingsForm.billing_account_id} onChange={(e) => setSettingsForm((s) => ({ ...s, billing_account_id: e.target.value }))} />
          <Input label="Contract asset account ID" value={settingsForm.contract_asset_account_id} onChange={(e) => setSettingsForm((s) => ({ ...s, contract_asset_account_id: e.target.value }))} />
          <Input label="Contract liability account ID" value={settingsForm.contract_liability_account_id} onChange={(e) => setSettingsForm((s) => ({ ...s, contract_liability_account_id: e.target.value }))} />
          <Input label="Financing interest income account ID" value={settingsForm.financing_interest_income_account_id} onChange={(e) => setSettingsForm((s) => ({ ...s, financing_interest_income_account_id: e.target.value }))} />
          <Input label="Financing interest expense account ID" value={settingsForm.financing_interest_expense_account_id} onChange={(e) => setSettingsForm((s) => ({ ...s, financing_interest_expense_account_id: e.target.value }))} />
          <Input label="Default cost asset account ID" value={settingsForm.default_cost_asset_account_id} onChange={(e) => setSettingsForm((s) => ({ ...s, default_cost_asset_account_id: e.target.value }))} />
          <Input label="Default cost amort. expense account ID" value={settingsForm.default_cost_amort_expense_account_id} onChange={(e) => setSettingsForm((s) => ({ ...s, default_cost_amort_expense_account_id: e.target.value }))} />
          <Input label="Rounding decimals" type="number" value={settingsForm.rounding_decimals} onChange={(e) => setSettingsForm((s) => ({ ...s, rounding_decimals: e.target.value }))} />
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          These settings drive revenue, contract balance, financing, and capitalised-cost postings across the IFRS 15 module.
        </div>
      </Modal>
    </div>
  );
}
