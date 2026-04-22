import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  RefreshCw,
  FileText,
  Search,
  CheckCircle2,
  FolderKanban,
  BarChart3,
  Landmark,
  Settings,
  ListTree,
  PencilLine,
  Save,
  ChevronDown,
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
import { CurrencySelect } from '../../../shared/components/forms/CurrencySelect.jsx';
import { PartnerSelect } from '../../../shared/components/forms/PartnerSelect.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
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

function defaultSettingsForm() {
  return {
    default_term_months: '12',
    default_payments_per_year: '12',
    default_annual_discount_rate: '',
    default_payment_timing: 'arrears',
    rou_asset_account_id: '',
    lease_liability_account_id: '',
    interest_expense_account_id: '',
    depreciation_expense_account_id: '',
    accumulated_depreciation_account_id: '',
    cash_account_id: '',
    default_notes_template: '',
  };
}

function mapSettingsToForm(data) {
  const source = data?.data ?? data ?? {};
  return {
    default_term_months: source.default_term_months != null ? String(source.default_term_months) : '12',
    default_payments_per_year: source.default_payments_per_year != null ? String(source.default_payments_per_year) : '12',
    default_annual_discount_rate:
      source.default_annual_discount_rate != null && source.default_annual_discount_rate !== ''
        ? String(source.default_annual_discount_rate)
        : '',
    default_payment_timing: source.default_payment_timing || 'arrears',
    rou_asset_account_id: source.rou_asset_account_id || '',
    lease_liability_account_id: source.lease_liability_account_id || '',
    interest_expense_account_id: source.interest_expense_account_id || '',
    depreciation_expense_account_id: source.depreciation_expense_account_id || '',
    accumulated_depreciation_account_id: source.accumulated_depreciation_account_id || '',
    cash_account_id: source.cash_account_id || '',
    default_notes_template: source.default_notes_template || '',
  };
}

function defaultLeaseForm(settings = defaultSettingsForm()) {
  return {
    code: '',
    name: '',
    commencement_date: '',
    term_months: settings.default_term_months || '12',
    payment_amount: '',
    payments_per_year: settings.default_payments_per_year || '12',
    annual_discount_rate: settings.default_annual_discount_rate || '',
    payment_timing: settings.default_payment_timing || 'arrears',
    recognition_model: 'on_balance_sheet',
    is_short_term_lease: 'false',
    is_low_value_lease: 'false',
    practical_expedient_non_lease_components: 'false',
    ownership_transfers: 'false',
    purchase_option_reasonably_certain: 'false',
    has_purchase_option: 'false',
    has_extension_option: 'false',
    has_termination_option: 'false',
    rou_asset_account_id: settings.rou_asset_account_id || '',
    lease_liability_account_id: settings.lease_liability_account_id || '',
    interest_expense_account_id: settings.interest_expense_account_id || '',
    depreciation_expense_account_id: settings.depreciation_expense_account_id || '',
    accumulated_depreciation_account_id: settings.accumulated_depreciation_account_id || '',
    cash_account_id: settings.cash_account_id || '',
    contract_reference: '',
    counterparty_partner_id: '',
    currency_code: 'GHS',
    indexation: '',
    asset_code: '',
    asset_description: '',
    asset_class: '',
    useful_life_months: settings.default_term_months || '12',
    initial_direct_costs: '',
    lease_incentives: '',
    restoration_provision: '',
    prepaid_lease_payments: '',
    accrued_lease_payments: '',
    residual_value_guarantee: '',
    purchase_option_amount: '',
    notes: settings.default_notes_template || '',
  };
}

function IFRS16SettingsForm({ settingsForm, setSettingsForm, settingsErrors, saveMutation, settingsQ }) {
  return (
    <div className="space-y-6">
      <ContentCard
        title="Settings & defaults"
        subtitle="Maintain IFRS 16 default measurement inputs and posting accounts. New leases will inherit these values unless you override them."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" leftIcon={RefreshCw} onClick={() => settingsQ.refetch()}>
              Reload
            </Button>
            <Button leftIcon={Save} loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              Save settings
            </Button>
          </div>
        }
      >
        {settingsQ.isLoading ? (
          <div className="py-10 text-sm text-slate-500">Loading IFRS 16 settings…</div>
        ) : settingsQ.isError ? (
          <div className="py-10 text-sm text-red-600">
            {settingsQ.error?.response?.data?.message ?? 'Failed to load IFRS 16 settings'}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Input
              label="Default term (months)"
              type="number"
              value={settingsForm.default_term_months}
              error={settingsErrors.default_term_months}
              onChange={(e) => setSettingsForm((s) => ({ ...s, default_term_months: e.target.value }))}
            />
            <Input
              label="Default payments per year"
              type="number"
              value={settingsForm.default_payments_per_year}
              error={settingsErrors.default_payments_per_year}
              onChange={(e) => setSettingsForm((s) => ({ ...s, default_payments_per_year: e.target.value }))}
            />
            <Input
              label="Default annual discount rate"
              type="number"
              step="0.0001"
              value={settingsForm.default_annual_discount_rate}
              error={settingsErrors.default_annual_discount_rate}
              onChange={(e) => setSettingsForm((s) => ({ ...s, default_annual_discount_rate: e.target.value }))}
            />
            <Select
              label="Default payment timing"
              value={settingsForm.default_payment_timing}
              onChange={(e) => setSettingsForm((s) => ({ ...s, default_payment_timing: e.target.value }))}
              options={[
                { value: 'arrears', label: 'Arrears (end of period)' },
                { value: 'advance', label: 'Advance (start of period)' },
              ]}
            />
            <AccountSelect
              label="ROU asset account"
              value={settingsForm.rou_asset_account_id}
              onChange={(e) => setSettingsForm((s) => ({ ...s, rou_asset_account_id: e.target.value }))}
              allowEmpty
              filters={{ accountTypeCodes: ['ASSET'] }}
            />
            <AccountSelect
              label="Lease liability account"
              value={settingsForm.lease_liability_account_id}
              onChange={(e) => setSettingsForm((s) => ({ ...s, lease_liability_account_id: e.target.value }))}
              allowEmpty
              filters={{ accountTypeCodes: ['LIABILITY'] }}
            />
            <AccountSelect
              label="Interest expense account"
              value={settingsForm.interest_expense_account_id}
              onChange={(e) => setSettingsForm((s) => ({ ...s, interest_expense_account_id: e.target.value }))}
              allowEmpty
              filters={{ accountTypeCodes: ['EXPENSE'] }}
            />
            <AccountSelect
              label="Depreciation expense account"
              value={settingsForm.depreciation_expense_account_id}
              onChange={(e) => setSettingsForm((s) => ({ ...s, depreciation_expense_account_id: e.target.value }))}
              allowEmpty
              filters={{ accountTypeCodes: ['EXPENSE'] }}
            />
            <AccountSelect
              label="Accumulated depreciation account"
              value={settingsForm.accumulated_depreciation_account_id}
              onChange={(e) => setSettingsForm((s) => ({ ...s, accumulated_depreciation_account_id: e.target.value }))}
              allowEmpty
              filters={{ accountTypeCodes: ['ASSET', 'CONTRA_ASSET'] }}
            />
            <AccountSelect
              label="Cash / bank account"
              value={settingsForm.cash_account_id}
              onChange={(e) => setSettingsForm((s) => ({ ...s, cash_account_id: e.target.value }))}
              allowEmpty
            />
            <Textarea
              label="Default notes template"
              value={settingsForm.default_notes_template}
              onChange={(e) => setSettingsForm((s) => ({ ...s, default_notes_template: e.target.value }))}
              rows={6}
              className="md:col-span-2 xl:col-span-3"
            />
          </div>
        )}
      </ContentCard>

      <ContentCard>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-medium text-slate-900">How this now works</div>
            <div className="mt-2 text-sm text-slate-600">
              This page saves directly to <code>/compliance/ifrs16/settings</code>. Lease creation will use these saved defaults whenever lease-level accounts are not provided.
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-medium text-slate-900">Best use</div>
            <div className="mt-2 text-sm text-slate-600">
              Set your standard accounts once, then only override lease-level mappings for unusual contracts.
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-medium text-slate-900">Backend dependency</div>
            <div className="mt-2 text-sm text-slate-600">
              This requires the updated IFRS 16 backend with the new settings endpoints and settings table already installed.
            </div>
          </div>
        </div>
      </ContentCard>
    </div>
  );
}

export default function IFRS16LeasesPage() {
  const { http } = useApi();
  const api = useMemo(() => makeIfrs16Api(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('register');
  const [form, setForm] = useState(defaultLeaseForm());
  const [errors, setErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [settingsForm, setSettingsForm] = useState(defaultSettingsForm());
  const [settingsErrors, setSettingsErrors] = useState({});

  const queryParams = useMemo(() => ({ status: status || undefined }), [status]);

  const settingsQ = useQuery({
    queryKey: qk.ifrs16Settings,
    queryFn: () => api.getSettings(),
    staleTime: 60_000,
  });

  const leasesQ = useQuery({
    queryKey: qk.ifrs16Leases(queryParams),
    queryFn: () => api.listLeases(queryParams),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!settingsQ.data) return;
    const mapped = mapSettingsToForm(settingsQ.data);
    setSettingsForm(mapped);
    setForm((current) => {
      const isUntouched =
        !current.code &&
        !current.name &&
        !current.commencement_date &&
        !current.payment_amount &&
        !current.notes &&
        !current.rou_asset_account_id &&
        !current.lease_liability_account_id &&
        !current.interest_expense_account_id &&
        !current.depreciation_expense_account_id &&
        !current.accumulated_depreciation_account_id &&
        !current.cash_account_id;
      return isUntouched ? defaultLeaseForm(mapped) : current;
    });
  }, [settingsQ.data]);

  const leases = useMemo(() => rowsOf(leasesQ.data), [leasesQ.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leases.filter((lease) => {
      const haystack = [lease.code, lease.name, lease.status, lease.payment_timing]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return !q || haystack.includes(q);
    });
  }, [leases, search]);

  const validateSettings = useCallback(() => {
    const next = {};
    const term = Number(settingsForm.default_term_months);
    if (!Number.isInteger(term) || term <= 0) next.default_term_months = 'Default term must be a positive whole number';

    const ppy = Number(settingsForm.default_payments_per_year);
    if (![1, 2, 4, 12].includes(ppy)) {
      next.default_payments_per_year = 'Default payments per year must be 1, 2, 4, or 12';
    }

    if (settingsForm.default_annual_discount_rate !== '') {
      const rate = Number(settingsForm.default_annual_discount_rate);
      if (Number.isNaN(rate) || rate < 0 || rate > 1) {
        next.default_annual_discount_rate = 'Default discount rate must be between 0 and 1';
      }
    }

    setSettingsErrors(next);
    return Object.keys(next).length === 0;
  }, [settingsForm]);

  const validateLease = useCallback(() => {
    const next = {};
    if (!form.name.trim()) next.name = 'Lease name is required';
    if (!form.commencement_date) next.commencement_date = 'Commencement date is required';

    const term = Number(form.term_months);
    if (!Number.isInteger(term) || term <= 0) next.term_months = 'Term must be a positive whole number';

    const payment = Number(form.payment_amount);
    if (form.payment_amount === '' || Number.isNaN(payment) || payment <= 0) next.payment_amount = 'Payment amount must be a valid positive number';

    const ppy = Number(form.payments_per_year);
    if (![1, 2, 4, 12].includes(ppy)) next.payments_per_year = 'Payments per year must be 1, 2, 4, or 12';

    const rate = Number(form.annual_discount_rate);
    if (form.annual_discount_rate === '' || Number.isNaN(rate) || rate < 0 || rate > 1) {
      next.annual_discount_rate = 'Discount rate must be between 0 and 1';
    }

    if (!String(form.currency_code || '').trim()) next.currency_code = 'Currency is required';

    const positiveOptionalFields = ['useful_life_months', 'initial_direct_costs', 'lease_incentives', 'restoration_provision', 'prepaid_lease_payments', 'accrued_lease_payments', 'residual_value_guarantee', 'purchase_option_amount'];
    for (const field of positiveOptionalFields) {
      const raw = form[field];
      if (raw !== '' && raw !== null && raw !== undefined) {
        const n = Number(raw);
        if (Number.isNaN(n) || n < 0) next[field] = 'Value must be zero or greater';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const saveSettingsMutation = useMutation({
    mutationFn: () => {
      if (!validateSettings()) throw new Error('validation_failed');
      const payload = {
        default_term_months: Number(settingsForm.default_term_months || 0),
        default_payments_per_year: Number(settingsForm.default_payments_per_year || 0),
        default_payment_timing: settingsForm.default_payment_timing || 'arrears',
        rou_asset_account_id: settingsForm.rou_asset_account_id || null,
        lease_liability_account_id: settingsForm.lease_liability_account_id || null,
        interest_expense_account_id: settingsForm.interest_expense_account_id || null,
        depreciation_expense_account_id: settingsForm.depreciation_expense_account_id || null,
        accumulated_depreciation_account_id: settingsForm.accumulated_depreciation_account_id || null,
        cash_account_id: settingsForm.cash_account_id || null,
      };
      if (settingsForm.default_annual_discount_rate !== '') {
        payload.default_annual_discount_rate = Number(settingsForm.default_annual_discount_rate);
      }
      const notesTemplate = settingsForm.default_notes_template?.trim();
      if (notesTemplate) payload.default_notes_template = notesTemplate;
      return api.updateSettings(payload);
    },
    onSuccess: async (data) => {
      toast.success('IFRS 16 settings saved');
      await qc.invalidateQueries({ queryKey: qk.ifrs16Settings });
      const mapped = mapSettingsToForm(data);
      setSettingsForm(mapped);
      setForm((current) => ({
        ...current,
        term_months: current.term_months || mapped.default_term_months,
        payments_per_year: current.payments_per_year || mapped.default_payments_per_year,
        annual_discount_rate: current.annual_discount_rate || mapped.default_annual_discount_rate,
        payment_timing: current.payment_timing || mapped.default_payment_timing,
        rou_asset_account_id: current.rou_asset_account_id || mapped.rou_asset_account_id,
        lease_liability_account_id: current.lease_liability_account_id || mapped.lease_liability_account_id,
        interest_expense_account_id: current.interest_expense_account_id || mapped.interest_expense_account_id,
        depreciation_expense_account_id: current.depreciation_expense_account_id || mapped.depreciation_expense_account_id,
        accumulated_depreciation_account_id: current.accumulated_depreciation_account_id || mapped.accumulated_depreciation_account_id,
        cash_account_id: current.cash_account_id || mapped.cash_account_id,
        useful_life_months: current.useful_life_months || mapped.default_term_months,
        notes: current.notes || mapped.default_notes_template,
      }));
    },
    onError: (e) => {
      if (e?.message === 'validation_failed') return;
      toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to save IFRS 16 settings');
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createLease({
        code: form.code.trim() || undefined,
        name: form.name.trim(),
        commencement_date: form.commencement_date,
        term_months: Number(form.term_months || 0),
        payment_amount: Number(form.payment_amount || 0),
        payments_per_year: Number(form.payments_per_year || 0),
        annual_discount_rate: Number(form.annual_discount_rate || 0),
        payment_timing: form.payment_timing || 'arrears',
        recognition_model: form.recognition_model || 'on_balance_sheet',
        is_short_term_lease: form.is_short_term_lease === 'true',
        is_low_value_lease: form.is_low_value_lease === 'true',
        practical_expedient_non_lease_components: form.practical_expedient_non_lease_components === 'true',
        ownership_transfers: form.ownership_transfers === 'true',
        purchase_option_reasonably_certain: form.purchase_option_reasonably_certain === 'true',
        has_purchase_option: form.has_purchase_option === 'true',
        has_extension_option: form.has_extension_option === 'true',
        has_termination_option: form.has_termination_option === 'true',
        rou_asset_account_id: form.rou_asset_account_id || undefined,
        lease_liability_account_id: form.lease_liability_account_id || undefined,
        interest_expense_account_id: form.interest_expense_account_id || undefined,
        depreciation_expense_account_id: form.depreciation_expense_account_id || undefined,
        accumulated_depreciation_account_id: form.accumulated_depreciation_account_id || undefined,
        cash_account_id: form.cash_account_id || undefined,
        contract_reference: form.contract_reference.trim() || form.code.trim() || undefined,
        currency_code: form.currency_code || undefined,
        indexation: form.indexation.trim() || undefined,
        asset_code: form.asset_code.trim() || form.code.trim() || undefined,
        asset_description: form.asset_description.trim() || form.name.trim(),
        asset_class: form.asset_class.trim() || undefined,
        useful_life_months: form.useful_life_months === '' ? undefined : Number(form.useful_life_months || 0),
        initial_direct_costs: form.initial_direct_costs === '' ? undefined : Number(form.initial_direct_costs || 0),
        lease_incentives: form.lease_incentives === '' ? undefined : Number(form.lease_incentives || 0),
        restoration_provision: form.restoration_provision === '' ? undefined : Number(form.restoration_provision || 0),
        prepaid_lease_payments: form.prepaid_lease_payments === '' ? undefined : Number(form.prepaid_lease_payments || 0),
        accrued_lease_payments: form.accrued_lease_payments === '' ? undefined : Number(form.accrued_lease_payments || 0),
        residual_value_guarantee: form.residual_value_guarantee === '' ? undefined : Number(form.residual_value_guarantee || 0),
        purchase_option_amount: form.purchase_option_amount === '' ? undefined : Number(form.purchase_option_amount || 0),
      }),
    onSuccess: async (data) => {
      const createdLeaseId = data?.id || data?.lease_id || data?.lease?.id || null;
      const counterpartyPartnerId = form.counterparty_partner_id || '';
      if (createdLeaseId && counterpartyPartnerId) {
        await api.updateContract(createdLeaseId, { counterparty_partner_id: counterpartyPartnerId });
      }
      toast.success(counterpartyPartnerId ? 'IFRS 16 lease created and counterparty saved' : 'IFRS 16 lease created');
      setForm(defaultLeaseForm(settingsForm));
      setErrors({});
      setActiveTab('register');
      await qc.invalidateQueries({ queryKey: ['compliance', 'ifrs16', 'leases'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to create lease'),
  });

  const metrics = useMemo(
    () =>
      filtered.reduce(
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
      ),
    [filtered]
  );

  const registerContent = (
    <div className="space-y-6">
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
          <div className="flex items-end">
            <Button className="w-full" leftIcon={Plus} onClick={() => setActiveTab('new-lease')}>
              New lease
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
    </div>
  );

  const createContent = (
    <div className="space-y-6">
      <ContentCard
        title="New lease"
        subtitle="Create a lease with default IFRS 16 values already pulled from the backend settings. Override any field only where the contract needs it."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setForm(defaultLeaseForm(settingsForm))}>
              Reset to defaults
            </Button>
            <Button
              leftIcon={Save}
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input label="Lease code" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} />
          <Input label="Lease name" value={form.name} error={errors.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          <Input label="Contract reference" value={form.contract_reference} onChange={(e) => setForm((s) => ({ ...s, contract_reference: e.target.value }))} />
          <PartnerSelect label="Counterparty / lessor" type="vendor" value={form.counterparty_partner_id} onChange={(e) => setForm((s) => ({ ...s, counterparty_partner_id: e.target.value }))} />
          <Input label="Commencement date" type="date" value={form.commencement_date} error={errors.commencement_date} onChange={(e) => setForm((s) => ({ ...s, commencement_date: e.target.value }))} />
          <Input label="Term (months)" type="number" value={form.term_months} error={errors.term_months} onChange={(e) => setForm((s) => ({ ...s, term_months: e.target.value }))} />
          <Input label="Payment amount" type="number" value={form.payment_amount} error={errors.payment_amount} onChange={(e) => setForm((s) => ({ ...s, payment_amount: e.target.value }))} />
          <Select
            label="Payments per year"
            value={form.payments_per_year}
            error={errors.payments_per_year}
            onChange={(e) => setForm((s) => ({ ...s, payments_per_year: e.target.value }))}
            options={[
              { value: '12', label: '12 · Monthly' },
              { value: '4', label: '4 · Quarterly' },
              { value: '2', label: '2 · Semi-annual' },
              { value: '1', label: '1 · Annual' },
            ]}
          />
          <CurrencySelect label="Currency" value={form.currency_code} error={errors.currency_code} onChange={(e) => setForm((s) => ({ ...s, currency_code: e.target.value }))} allowEmpty={false} />
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
          <Select
            label="Recognition model"
            value={form.recognition_model}
            onChange={(e) => setForm((s) => ({ ...s, recognition_model: e.target.value }))}
            options={[
              { value: 'on_balance_sheet', label: 'On balance sheet' },
              { value: 'short_term_exempt', label: 'Short-term exempt' },
              { value: 'low_value_exempt', label: 'Low-value exempt' },
            ]}
          />
          <Input label="Indexation basis" value={form.indexation} onChange={(e) => setForm((s) => ({ ...s, indexation: e.target.value }))} />
          <Select label="Short-term lease" value={form.is_short_term_lease} onChange={(e) => setForm((s) => ({ ...s, is_short_term_lease: e.target.value }))} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} />
          <Select label="Low-value lease" value={form.is_low_value_lease} onChange={(e) => setForm((s) => ({ ...s, is_low_value_lease: e.target.value }))} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} />
          <Select label="Practical expedient: do not separate non-lease components" value={form.practical_expedient_non_lease_components} onChange={(e) => setForm((s) => ({ ...s, practical_expedient_non_lease_components: e.target.value }))} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} />
          <Select label="Ownership transfers" value={form.ownership_transfers} onChange={(e) => setForm((s) => ({ ...s, ownership_transfers: e.target.value }))} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} />
          <Select label="Purchase option reasonably certain" value={form.purchase_option_reasonably_certain} onChange={(e) => setForm((s) => ({ ...s, purchase_option_reasonably_certain: e.target.value }))} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} />
          <Select label="Has purchase option" value={form.has_purchase_option} onChange={(e) => setForm((s) => ({ ...s, has_purchase_option: e.target.value }))} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} />
          <Select label="Has extension option" value={form.has_extension_option} onChange={(e) => setForm((s) => ({ ...s, has_extension_option: e.target.value }))} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} />
          <Select label="Has termination option" value={form.has_termination_option} onChange={(e) => setForm((s) => ({ ...s, has_termination_option: e.target.value }))} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} />
          <AccountSelect label="ROU asset account" value={form.rou_asset_account_id} onChange={(e) => setForm((s) => ({ ...s, rou_asset_account_id: e.target.value }))} allowEmpty filters={{ accountTypeCodes: ['ASSET'] }} />
          <AccountSelect label="Lease liability account" value={form.lease_liability_account_id} onChange={(e) => setForm((s) => ({ ...s, lease_liability_account_id: e.target.value }))} allowEmpty filters={{ accountTypeCodes: ['LIABILITY'] }} />
          <AccountSelect label="Interest expense account" value={form.interest_expense_account_id} onChange={(e) => setForm((s) => ({ ...s, interest_expense_account_id: e.target.value }))} allowEmpty filters={{ accountTypeCodes: ['EXPENSE'] }} />
          <AccountSelect label="Depreciation expense account" value={form.depreciation_expense_account_id} onChange={(e) => setForm((s) => ({ ...s, depreciation_expense_account_id: e.target.value }))} allowEmpty filters={{ accountTypeCodes: ['EXPENSE'] }} />
          <AccountSelect label="Accumulated depreciation account" value={form.accumulated_depreciation_account_id} onChange={(e) => setForm((s) => ({ ...s, accumulated_depreciation_account_id: e.target.value }))} allowEmpty filters={{ accountTypeCodes: ['ASSET', 'CONTRA_ASSET'] }} />
          <AccountSelect label="Cash / bank account" value={form.cash_account_id} onChange={(e) => setForm((s) => ({ ...s, cash_account_id: e.target.value }))} allowEmpty />
          <Input label="Asset code" value={form.asset_code} onChange={(e) => setForm((s) => ({ ...s, asset_code: e.target.value }))} />
          <Input label="Asset description" value={form.asset_description} onChange={(e) => setForm((s) => ({ ...s, asset_description: e.target.value }))} />
          <Input label="Asset class" value={form.asset_class} onChange={(e) => setForm((s) => ({ ...s, asset_class: e.target.value }))} />
          <Input label="Useful life (months)" type="number" value={form.useful_life_months} error={errors.useful_life_months} onChange={(e) => setForm((s) => ({ ...s, useful_life_months: e.target.value }))} />
          <div className="md:col-span-2 xl:col-span-3">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
              Initial measurement adjustments
              <span className="ml-1 text-xs font-normal text-slate-400">(initial direct costs, incentives, restoration provision, prepaid / accrued payments, residual value guarantee, purchase option amount)</span>
            </button>
          </div>
          {showAdvanced && (
            <>
              <Input label="Initial direct costs" type="number" value={form.initial_direct_costs} error={errors.initial_direct_costs} onChange={(e) => setForm((s) => ({ ...s, initial_direct_costs: e.target.value }))} />
              <Input label="Lease incentives" type="number" value={form.lease_incentives} error={errors.lease_incentives} onChange={(e) => setForm((s) => ({ ...s, lease_incentives: e.target.value }))} />
              <Input label="Restoration provision" type="number" value={form.restoration_provision} error={errors.restoration_provision} onChange={(e) => setForm((s) => ({ ...s, restoration_provision: e.target.value }))} />
              <Input label="Prepaid lease payments" type="number" value={form.prepaid_lease_payments} error={errors.prepaid_lease_payments} onChange={(e) => setForm((s) => ({ ...s, prepaid_lease_payments: e.target.value }))} />
              <Input label="Accrued lease payments" type="number" value={form.accrued_lease_payments} error={errors.accrued_lease_payments} onChange={(e) => setForm((s) => ({ ...s, accrued_lease_payments: e.target.value }))} />
              <Input label="Residual value guarantee" type="number" value={form.residual_value_guarantee} error={errors.residual_value_guarantee} onChange={(e) => setForm((s) => ({ ...s, residual_value_guarantee: e.target.value }))} />
              <Input label="Purchase option amount" type="number" value={form.purchase_option_amount} error={errors.purchase_option_amount} onChange={(e) => setForm((s) => ({ ...s, purchase_option_amount: e.target.value }))} />
            </>
          )}
          <Textarea label="Working notes" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} rows={5} className="md:col-span-2 xl:col-span-3" />
        </div>
      </ContentCard>

      <ContentCard>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-sm font-medium text-emerald-900">Pulled from settings</div>
            <div className="mt-2 text-sm text-emerald-800">
              Default term, payment frequency, discount rate, payment timing, notes template, and posting accounts now come from the IFRS 16 settings endpoint.
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-medium text-slate-900">Override only when needed</div>
            <div className="mt-2 text-sm text-slate-600">
              Leave inherited accounts in place for standard leases. Change them here only for contract-specific accounting treatment.
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-medium text-slate-900">Cleaner workflow</div>
            <div className="mt-2 text-sm text-slate-600">
              This matches the IFRS 15 pattern better: one tab for setup, one tab for transaction creation, one tab for the working register.
            </div>
          </div>
        </div>
      </ContentCard>
    </div>
  );

  const settingsContent = (
    <IFRS16SettingsForm
      settingsForm={settingsForm}
      setSettingsForm={setSettingsForm}
      settingsErrors={settingsErrors}
      saveMutation={saveSettingsMutation}
      settingsQ={settingsQ}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="IFRS 16 Leases"
        subtitle="Manage lease defaults, create leases in a cleaner workflow, and keep the register separate from settings just like IFRS 15."
        icon={FolderKanban}
        actions={
          <>
            <Button variant="outline" leftIcon={RefreshCw} onClick={() => {
              settingsQ.refetch();
              leasesQ.refetch();
            }}>
              Refresh
            </Button>
            <Button variant="outline" leftIcon={Settings} onClick={() => setActiveTab('settings')}>
              Settings
            </Button>
            <Button leftIcon={Plus} onClick={() => setActiveTab('new-lease')}>
              New lease
            </Button>
          </>
        }
      />

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { value: 'register', label: 'Lease register', icon: ListTree, content: registerContent },
          { value: 'new-lease', label: 'New lease', icon: PencilLine, content: createContent },
          { value: 'settings', label: 'Settings & defaults', icon: Settings, content: settingsContent },
        ]}
      />
    </div>
  );
}