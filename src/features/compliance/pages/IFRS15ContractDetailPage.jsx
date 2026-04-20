import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  Layers3,
  Plus,
  RefreshCw,
  ShieldCheck,
  Workflow,
  Landmark,
  Wallet,
  BarChart3,
  Activity,
  XCircle,
} from 'lucide-react';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { AccountSelect } from '../../../shared/components/forms/AccountSelect.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeIfrs15Api } from '../api/ifrs15.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';
import { formatMoney } from '../../../shared/utils/formatMoney.js';
import { formatDate } from '../../../shared/utils/formatDate.js';

function rowsOf(data, keys = ['items', 'data', 'rows', 'lines', 'costs', 'events']) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function oneOf(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return null;
}

function numberOf(...values) {
  const value = oneOf(...values);
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function toneForStatus(status) {
  const s = String(status || '').toLowerCase();
  if (['active', 'approved', 'completed', 'posted'].includes(s)) return 'success';
  if (['draft', 'pending', 'scheduled'].includes(s)) return 'warning';
  if (['cancelled', 'rejected', 'voided'].includes(s)) return 'danger';
  return 'muted';
}

function StatCard({ label, value, subvalue, icon: Icon }) {
  return (
    <ContentCard className="p-0">
      <div className="flex items-start justify-between p-5">
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
          {subvalue ? <div className="mt-1 text-xs text-slate-500">{subvalue}</div> : null}
        </div>
        {Icon ? <Icon className="h-7 w-7 text-slate-400" /> : null}
      </div>
    </ContentCard>
  );
}

export default function IFRS15ContractDetailPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeIfrs15Api(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [tab, setTab] = useState('overview');
  const [activateOpen, setActivateOpen] = useState(false);
  const [obligationOpen, setObligationOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [postRevenueOpen, setPostRevenueOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [modificationOpen, setModificationOpen] = useState(false);
  const [variableOpen, setVariableOpen] = useState(false);
  const [financingOpen, setFinancingOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [reportState, setReportState] = useState({
    period_id: '',
    as_of_period_id: '',
    as_of_date: '',
    dimension: 'customer',
  });

  const [activateForm, setActivateForm] = useState({ entry_date: '', memo: '' });
  const [obligationForm, setObligationForm] = useState({
    description: '',
    obligation_type: 'OVER_TIME',
    satisfaction_method: 'TIME',
    standalone_selling_price: '',
    start_date: '',
    end_date: '',
    satisfaction_date: '',
  });
  const [scheduleForm, setScheduleForm] = useState({ replace: true });
  const [postRevenueForm, setPostRevenueForm] = useState({ period_id: '', entry_date: '', memo: '' });
  const [costForm, setCostForm] = useState({
    cost_type: 'ACQUISITION',
    description: '',
    amount: '',
    asset_account_id: '',
    amort_expense_account_id: '',
    amort_start_date: '',
    amort_end_date: '',
  });
  const [modificationForm, setModificationForm] = useState({
    modification_date: '',
    modification_type: 'PRICE_CHANGE',
    new_base_transaction_price: '',
    adds_distinct_goods_services: false,
    price_increase_commensurate_with_ssp: false,
    remaining_goods_services_distinct: false,
    notes: '',
  });
  const [variableForm, setVariableForm] = useState({
    effective_date: '',
    method: 'EXPECTED_VALUE',
    estimate_amount: '',
    highly_probable_no_reversal: false,
    constraint_basis: '',
    rationale: '',
  });
  const [financingForm, setFinancingForm] = useState({ annual_rate: '', effective_from: '', effective_to: '' });
  const [approvalForm, setApprovalForm] = useState({ action: 'submit', comment: '' });
  const [lifecycleForm, setLifecycleForm] = useState({ action: 'complete', entry_date: '', memo: '' });
  const [errors, setErrors] = useState({});

  const contractQ = useQuery({
    queryKey: ['ifrs15', 'contract', contractId],
    queryFn: () => api.getContract(contractId),
    enabled: !!contractId,
    staleTime: 10_000,
  });
  const scheduleQ = useQuery({
    queryKey: ['ifrs15', 'contract', contractId, 'schedule'],
    queryFn: () => api.getSchedule(contractId),
    enabled: !!contractId,
    staleTime: 10_000,
  });
  const costsQ = useQuery({
    queryKey: ['ifrs15', 'contract', contractId, 'costs'],
    queryFn: () => api.listCosts(contractId),
    enabled: !!contractId,
    staleTime: 10_000,
  });
  const modificationsQ = useQuery({
    queryKey: ['ifrs15', 'contract', contractId, 'modifications'],
    queryFn: () => api.listModifications(contractId),
    enabled: !!contractId,
    staleTime: 10_000,
  });
  const variableQ = useQuery({
    queryKey: ['ifrs15', 'contract', contractId, 'variable-consideration'],
    queryFn: () => api.listVariableConsideration(contractId),
    enabled: !!contractId,
    staleTime: 10_000,
  });
  const financingQ = useQuery({
    queryKey: ['ifrs15', 'contract', contractId, 'financing-terms'],
    queryFn: () => api.listFinancingTerms(contractId),
    enabled: !!contractId,
    staleTime: 10_000,
  });
  const ledgerQ = useQuery({
    queryKey: ['ifrs15', 'contract', contractId, 'posting-ledger'],
    queryFn: () => api.getPostingLedger(contractId),
    enabled: !!contractId,
    staleTime: 10_000,
  });
  const eventsQ = useQuery({
    queryKey: ['ifrs15', 'contract', contractId, 'events'],
    queryFn: () => api.getEvents(contractId),
    enabled: !!contractId,
    staleTime: 10_000,
  });
  const periodsQ = useQuery({
    queryKey: ['ifrs15', 'periods'],
    queryFn: () => periodsApi.list({ limit: 500, offset: 0 }),
    staleTime: 60_000,
  });

  const core = useMemo(() => {
    const data = contractQ.data || {};
    return data.contract && typeof data.contract === 'object' ? { ...data.contract, ...data } : data;
  }, [contractQ.data]);
  const obligations = useMemo(() => rowsOf(contractQ.data?.obligations || contractQ.data?.performance_obligations || core.obligations || core.performance_obligations, ['items', 'data']), [contractQ.data, core]);
  const scheduleLines = useMemo(() => rowsOf(scheduleQ.data, ['lines', 'items', 'data']), [scheduleQ.data]);
  const costs = useMemo(() => rowsOf(costsQ.data, ['costs', 'items', 'data']), [costsQ.data]);
  const modifications = useMemo(() => rowsOf(modificationsQ.data), [modificationsQ.data]);
  const variableItems = useMemo(() => rowsOf(variableQ.data), [variableQ.data]);
  const financingTerms = useMemo(() => rowsOf(financingQ.data), [financingQ.data]);
  const ledgerRows = useMemo(() => rowsOf(ledgerQ.data), [ledgerQ.data]);
  const eventRows = useMemo(() => rowsOf(eventsQ.data), [eventsQ.data]);
  const periods = useMemo(() => rowsOf(periodsQ.data), [periodsQ.data]);

  const currency = core.currency_code || 'GHS';
  const status = String(core.status || '').toLowerCase();

  React.useEffect(() => {
    if (!reportState.period_id && periods[0]?.id) {
      setReportState((s) => ({ ...s, period_id: periods[0].id, as_of_period_id: periods[0].id }));
      setPostRevenueForm((s) => ({ ...s, period_id: periods[0].id }));
    }
  }, [periods, reportState.period_id]);

  const refetchAll = async () => {
    await Promise.all([
      contractQ.refetch(),
      scheduleQ.refetch(),
      costsQ.refetch(),
      modificationsQ.refetch(),
      variableQ.refetch(),
      financingQ.refetch(),
      ledgerQ.refetch(),
      eventsQ.refetch(),
    ]);
  };

  const invalidateAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['ifrs15', 'contract', contractId] }),
      qc.invalidateQueries({ queryKey: ['ifrs15', 'contract', contractId, 'schedule'] }),
      qc.invalidateQueries({ queryKey: ['ifrs15', 'contract', contractId, 'costs'] }),
      qc.invalidateQueries({ queryKey: ['ifrs15', 'contract', contractId, 'modifications'] }),
      qc.invalidateQueries({ queryKey: ['ifrs15', 'contract', contractId, 'variable-consideration'] }),
      qc.invalidateQueries({ queryKey: ['ifrs15', 'contract', contractId, 'financing-terms'] }),
      qc.invalidateQueries({ queryKey: ['ifrs15', 'contract', contractId, 'posting-ledger'] }),
      qc.invalidateQueries({ queryKey: ['ifrs15', 'contract', contractId, 'events'] }),
      qc.invalidateQueries({ queryKey: ['ifrs15', 'contracts'] }),
    ]);
  };

  const activateMutation = useMutation({
    mutationFn: (body) => api.activateContract(contractId, body),
    onSuccess: async () => { toast.success('Contract activated'); setActivateOpen(false); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Activation failed'),
  });
  const addObligationMutation = useMutation({
    mutationFn: (body) => api.addObligation(contractId, body),
    onSuccess: async () => { toast.success('Obligation added'); setObligationOpen(false); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Failed to add obligation'),
  });
  const generateScheduleMutation = useMutation({
    mutationFn: (body) => api.generateSchedule(contractId, body),
    onSuccess: async () => { toast.success('Schedule generated'); setScheduleOpen(false); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Failed to generate schedule'),
  });
  const postRevenueMutation = useMutation({
    mutationFn: (body) => api.postRevenue(contractId, body),
    onSuccess: async () => { toast.success('Revenue posted'); setPostRevenueOpen(false); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Failed to post revenue'),
  });
  const costMutation = useMutation({
    mutationFn: (body) => api.createCost(contractId, body),
    onSuccess: async () => { toast.success('Contract cost added'); setCostOpen(false); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Failed to add cost'),
  });
  const modificationMutation = useMutation({
    mutationFn: (body) => api.createModification(contractId, body),
    onSuccess: async () => { toast.success('Modification recorded'); setModificationOpen(false); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Failed to record modification'),
  });
  const variableMutation = useMutation({
    mutationFn: (body) => api.createVariableConsideration(contractId, body),
    onSuccess: async () => { toast.success('Variable consideration captured'); setVariableOpen(false); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Failed to save variable consideration'),
  });
  const financingMutation = useMutation({
    mutationFn: (body) => api.setFinancingTerms(contractId, body),
    onSuccess: async () => { toast.success('Financing terms saved'); setFinancingOpen(false); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Failed to save financing terms'),
  });
  const lifecycleMutation = useMutation({
    mutationFn: (body) => api.updateLifecycle(contractId, body),
    onSuccess: async () => { toast.success('Lifecycle updated'); setLifecycleOpen(false); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Lifecycle update failed'),
  });

  const approvalMutation = useMutation({
    mutationFn: async () => {
      if (approvalForm.action === 'submit') return api.submitForApproval(contractId);
      if (approvalForm.action === 'approve') return api.approveContract(contractId, { comment: approvalForm.comment || undefined });
      return api.rejectContract(contractId, { comment: approvalForm.comment || undefined });
    },
    onSuccess: async () => { toast.success('Workflow action completed'); setApprovalOpen(false); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Workflow action failed'),
  });

  const applyModificationMutation = useMutation({
    mutationFn: (modificationId) => api.applyModification(contractId, modificationId, {}),
    onSuccess: async () => { toast.success('Modification applied'); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Failed to apply modification'),
  });
  const reviewVcMutation = useMutation({
    mutationFn: ({ id, notes }) => api.reviewVariableConsideration(contractId, id, { notes }),
    onSuccess: async () => { toast.success('Variable consideration reviewed'); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Review failed'),
  });
  const approveVcMutation = useMutation({
    mutationFn: ({ id, included_amount }) => api.approveVariableConsideration(contractId, id, {
      include_in_transaction_price: true,
      included_amount: Number(included_amount || 0),
    }),
    onSuccess: async () => { toast.success('Variable consideration approved'); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Approval failed'),
  });
  const applyVcMutation = useMutation({
    mutationFn: () => api.applyVariableConsideration(contractId, {}),
    onSuccess: async () => { toast.success('Variable consideration applied'); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Apply failed'),
  });
  const postFinancingMutation = useMutation({
    mutationFn: (period_id) => api.postFinancing(contractId, { period_id }),
    onSuccess: async () => { toast.success('Financing posted'); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Failed to post financing'),
  });
  const generateCostScheduleMutation = useMutation({
    mutationFn: (costId) => api.generateCostSchedule(contractId, costId, { replace: true }),
    onSuccess: async () => { toast.success('Cost schedule generated'); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Failed to generate cost schedule'),
  });
  const postCostMutation = useMutation({
    mutationFn: ({ costId, period_id }) => api.postCost(contractId, costId, { period_id }),
    onSuccess: async () => { toast.success('Cost amortisation posted'); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Failed to post amortisation'),
  });

  const rollforwardQ = useQuery({
    queryKey: ['ifrs15', 'report', 'rollforward', reportState.period_id],
    queryFn: () => api.getContractRollforwardReport({ period_id: reportState.period_id }),
    enabled: tab === 'reports' && !!reportState.period_id,
  });
  const rpoQ = useQuery({
    queryKey: ['ifrs15', 'report', 'rpo', reportState.as_of_period_id],
    queryFn: () => api.getRpoReport({ as_of_period_id: reportState.as_of_period_id }),
    enabled: tab === 'reports' && !!reportState.as_of_period_id,
  });
  const disaggQ = useQuery({
    queryKey: ['ifrs15', 'report', 'disagg', reportState.period_id, reportState.dimension],
    queryFn: () => api.getRevenueDisaggregationReport({ period_id: reportState.period_id, dimension: reportState.dimension }),
    enabled: tab === 'reports' && !!reportState.period_id,
  });
  const judgementQ = useQuery({
    queryKey: ['ifrs15', 'report', 'judgements', reportState.as_of_date],
    queryFn: () => api.getJudgementsReport({ as_of_date: reportState.as_of_date }),
    enabled: tab === 'reports' && !!reportState.as_of_date,
  });

  const validate = (name) => {
    const next = {};
    if (name === 'obligation') {
      if (!obligationForm.description.trim()) next.description = 'Description is required';
      if (Number(obligationForm.standalone_selling_price) <= 0) next.standalone_selling_price = 'Standalone selling price must be greater than zero';
      if (obligationForm.obligation_type === 'POINT_IN_TIME' && !obligationForm.satisfaction_date) next.satisfaction_date = 'Satisfaction date is required';
      if (obligationForm.obligation_type === 'OVER_TIME' && !obligationForm.start_date) next.start_date = 'Start date is required';
      if (obligationForm.obligation_type === 'OVER_TIME' && !obligationForm.end_date) next.end_date = 'End date is required';
    }
    if (name === 'postRevenue') {
      if (!postRevenueForm.period_id) next.period_id = 'Period is required';
    }
    if (name === 'cost') {
      if (Number(costForm.amount) <= 0) next.amount = 'Amount must be greater than zero';
      if (!costForm.amort_start_date) next.amort_start_date = 'Amortisation start date is required';
      if (!costForm.amort_end_date) next.amort_end_date = 'Amortisation end date is required';
    }
    if (name === 'modification') {
      if (!modificationForm.modification_date) next.modification_date = 'Modification date is required';
    }
    if (name === 'variable') {
      if (!variableForm.effective_date) next.effective_date = 'Effective date is required';
    }
    if (name === 'financing') {
      if (Number(financingForm.annual_rate) < 0 || financingForm.annual_rate === '') next.annual_rate = 'Annual rate is required';
      if (!financingForm.effective_from) next.effective_from = 'Effective from date is required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  if (contractQ.isLoading) {
    return <div className="py-10 text-sm text-slate-500">Loading contract...</div>;
  }
  if (contractQ.isError) {
    return <div className="py-10 text-sm text-red-600">{contractQ.error?.response?.data?.message ?? 'Failed to load contract'}</div>;
  }

  const tabItems = [
    { value: 'overview', label: 'Overview', icon: FileText },
    { value: 'obligations', label: 'Obligations', icon: Layers3 },
    { value: 'schedule', label: 'Schedule', icon: Calendar },
    { value: 'modifications', label: 'Modifications', icon: Workflow },
    { value: 'variable', label: 'Variable consideration', icon: ShieldCheck },
    { value: 'financing', label: 'Financing', icon: Landmark },
    { value: 'costs', label: 'Costs', icon: Wallet },
    { value: 'approvals', label: 'Approvals', icon: CheckCircle2 },
    { value: 'ledger', label: 'Ledger', icon: BarChart3 },
    { value: 'events', label: 'Events', icon: Activity },
    { value: 'reports', label: 'Reports', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={core.code || 'IFRS 15 contract'}
        subtitle={`${core.customer_name || core.business_partner_name || 'Customer'} • ${formatDate(core.contract_date)} • ${formatMoney(numberOf(core.transaction_price, core.base_transaction_price), currency)}`}
        icon={FileText}
        actions={
          <>
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(-1)}>Back</Button>
            <Button variant="outline" leftIcon={RefreshCw} onClick={refetchAll}>Refresh</Button>
            {status === 'draft' && <Button leftIcon={CheckCircle2} onClick={() => setActivateOpen(true)}>Activate</Button>}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Status" value={<Badge tone={toneForStatus(core.status)} size="lg">{core.status || 'draft'}</Badge>} subvalue={`Billing: ${core.billing_policy || '—'}`} icon={CheckCircle2} />
        <StatCard label="Transaction price" value={formatMoney(numberOf(core.transaction_price, core.base_transaction_price), currency)} subvalue={`Allocated SSP: ${formatMoney(numberOf(core.allocated_ssp_total), currency)}`} icon={Wallet} />
        <StatCard label="Contract asset" value={formatMoney(numberOf(core.contract_asset_balance), currency)} subvalue={`Liability: ${formatMoney(numberOf(core.contract_liability_balance), currency)}`} icon={Landmark} />
        <StatCard label="Recognized revenue" value={formatMoney(numberOf(core.recognized_revenue, core.recognised_revenue), currency)} subvalue={`${scheduleLines.length} schedule line(s)`} icon={BarChart3} />
      </div>

      <ContentCard>
        <Tabs tabs={tabItems} value={tab} onChange={setTab} />
      </ContentCard>

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ContentCard title="Contract summary">
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Code</dt><dd className="font-medium text-slate-900">{core.code || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Customer</dt><dd className="font-medium text-slate-900">{core.customer_name || core.business_partner_name || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Contract date</dt><dd className="font-medium text-slate-900">{formatDate(core.contract_date)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Period</dt><dd className="font-medium text-slate-900">{formatDate(core.start_date)} {core.end_date ? `to ${formatDate(core.end_date)}` : ''}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Currency</dt><dd className="font-medium text-slate-900">{currency}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Workflow status</dt><dd className="font-medium text-slate-900">{core.workflow_status || core.approval_status || '—'}</dd></div>
            </dl>
          </ContentCard>
          <ContentCard title="Operational actions">
            <div className="grid gap-3 md:grid-cols-2">
              <Button variant="outline" onClick={() => setObligationOpen(true)}>Add obligation</Button>
              <Button variant="outline" onClick={() => setScheduleOpen(true)}>Generate schedule</Button>
              <Button variant="outline" onClick={() => setPostRevenueOpen(true)}>Post revenue</Button>
              <Button variant="outline" onClick={() => setCostOpen(true)}>Add contract cost</Button>
              <Button variant="outline" onClick={() => setModificationOpen(true)}>Record modification</Button>
              <Button variant="outline" onClick={() => setVariableOpen(true)}>Add variable consideration</Button>
              <Button variant="outline" onClick={() => setFinancingOpen(true)}>Set financing terms</Button>
              <Button variant="outline" onClick={() => setApprovalOpen(true)}>Workflow action</Button>
              <Button variant="outline" onClick={() => setLifecycleOpen(true)}>Lifecycle update</Button>
            </div>
          </ContentCard>
        </div>
      )}

      {tab === 'obligations' && (
        <ContentCard title="Performance obligations" actions={<Button size="sm" leftIcon={Plus} onClick={() => setObligationOpen(true)}>Add obligation</Button>}>
          {obligations.length === 0 ? <div className="text-sm text-slate-500">No performance obligations yet.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-3 pr-4">Description</th><th className="py-3 pr-4">Type</th><th className="py-3 pr-4">Method</th><th className="py-3 pr-4">SSP</th><th className="py-3 pr-4">Timing</th></tr></thead>
                <tbody>
                  {obligations.map((item, i) => (
                    <tr key={item.id || i} className="border-b border-slate-100">
                      <td className="py-3 pr-4">{item.description || '—'}</td>
                      <td className="py-3 pr-4"><Badge tone="muted">{item.obligation_type || item.satisfaction_type || '—'}</Badge></td>
                      <td className="py-3 pr-4">{item.satisfaction_method || '—'}</td>
                      <td className="py-3 pr-4">{formatMoney(numberOf(item.standalone_selling_price), currency)}</td>
                      <td className="py-3 pr-4">{item.satisfaction_date ? formatDate(item.satisfaction_date) : `${formatDate(item.start_date)} ${item.end_date ? `to ${formatDate(item.end_date)}` : ''}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ContentCard>
      )}

      {tab === 'schedule' && (
        <ContentCard title="Revenue schedule" actions={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => scheduleQ.refetch()}>Refresh</Button><Button size="sm" leftIcon={RefreshCw} onClick={() => setScheduleOpen(true)}>Generate</Button><Button size="sm" onClick={() => setPostRevenueOpen(true)}>Post revenue</Button></div>}>
          {scheduleLines.length === 0 ? <div className="text-sm text-slate-500">No schedule lines yet.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-3 pr-4">Recognition date</th><th className="py-3 pr-4">Period</th><th className="py-3 pr-4">Amount</th><th className="py-3 pr-4">Status</th></tr></thead>
                <tbody>
                  {scheduleLines.map((line, i) => (
                    <tr key={line.id || i} className="border-b border-slate-100">
                      <td className="py-3 pr-4">{formatDate(line.recognition_date)}</td>
                      <td className="py-3 pr-4">{line.period_id || line.period_code || '—'}</td>
                      <td className="py-3 pr-4">{formatMoney(numberOf(line.amount), currency)}</td>
                      <td className="py-3 pr-4"><Badge tone={toneForStatus(line.status)}>{line.status || 'scheduled'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ContentCard>
      )}

      {tab === 'modifications' && (
        <ContentCard title="Contract modifications" actions={<Button size="sm" leftIcon={Plus} onClick={() => setModificationOpen(true)}>New modification</Button>}>
          {modifications.length === 0 ? <div className="text-sm text-slate-500">No modifications recorded.</div> : (
            <div className="space-y-3">
              {modifications.map((item, i) => (
                <div key={item.id || i} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-900">{item.modification_type || 'Modification'}</div>
                      <div className="text-sm text-slate-500">{formatDate(item.modification_date)} • Decision: {item.decision || item.accounting_treatment || 'pending'}</div>
                    </div>
                    <div className="flex gap-2">
                      <Badge tone={toneForStatus(item.status)}>{item.status || 'draft'}</Badge>
                      <Button size="sm" variant="outline" onClick={() => applyModificationMutation.mutate(item.id)} disabled={!item.id || applyModificationMutation.isPending}>Apply</Button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">New base transaction price: {item.new_base_transaction_price != null ? formatMoney(numberOf(item.new_base_transaction_price), currency) : '—'}</div>
                  {item.notes ? <div className="mt-2 text-sm text-slate-600">{item.notes}</div> : null}
                </div>
              ))}
            </div>
          )}
        </ContentCard>
      )}

      {tab === 'variable' && (
        <ContentCard title="Variable consideration" actions={<div className="flex gap-2"><Button size="sm" leftIcon={Plus} onClick={() => setVariableOpen(true)}>Add entry</Button><Button size="sm" variant="outline" onClick={() => applyVcMutation.mutate()} disabled={applyVcMutation.isPending}>Apply latest approved</Button></div>}>
          {variableItems.length === 0 ? <div className="text-sm text-slate-500">No variable consideration entries.</div> : (
            <div className="space-y-3">
              {variableItems.map((item, i) => (
                <div key={item.id || i} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-900">{item.method || 'Method'} • {formatMoney(numberOf(item.estimate_amount), currency)}</div>
                      <div className="text-sm text-slate-500">Effective {formatDate(item.effective_date)} • Highly probable no reversal: {item.highly_probable_no_reversal ? 'Yes' : 'No'}</div>
                    </div>
                    <Badge tone={toneForStatus(item.status)}>{item.status || 'draft'}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => reviewVcMutation.mutate({ id: item.id, notes: 'Reviewed from frontend' })} disabled={!item.id || reviewVcMutation.isPending}>Review</Button>
                    <Button size="sm" onClick={() => approveVcMutation.mutate({ id: item.id, included_amount: item.estimate_amount })} disabled={!item.id || approveVcMutation.isPending}>Approve & include</Button>
                  </div>
                  {item.constraint_basis ? <div className="mt-3 text-sm text-slate-600">Constraint basis: {item.constraint_basis}</div> : null}
                  {item.rationale ? <div className="mt-1 text-sm text-slate-600">Rationale: {item.rationale}</div> : null}
                </div>
              ))}
            </div>
          )}
        </ContentCard>
      )}

      {tab === 'financing' && (
        <ContentCard title="Significant financing component" actions={<div className="flex gap-2"><Button size="sm" leftIcon={Plus} onClick={() => setFinancingOpen(true)}>Set terms</Button><Button size="sm" variant="outline" onClick={() => postFinancingMutation.mutate(postRevenueForm.period_id)} disabled={!postRevenueForm.period_id || postFinancingMutation.isPending}>Post financing</Button></div>}>
          {financingTerms.length === 0 ? <div className="text-sm text-slate-500">No financing terms configured.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-3 pr-4">Annual rate</th><th className="py-3 pr-4">Effective from</th><th className="py-3 pr-4">Effective to</th><th className="py-3 pr-4">Status</th></tr></thead>
                <tbody>
                  {financingTerms.map((item, i) => (
                    <tr key={item.id || i} className="border-b border-slate-100"><td className="py-3 pr-4">{numberOf(item.annual_rate).toFixed(4)}</td><td className="py-3 pr-4">{formatDate(item.effective_from)}</td><td className="py-3 pr-4">{formatDate(item.effective_to)}</td><td className="py-3 pr-4"><Badge tone={toneForStatus(item.status)}>{item.status || 'active'}</Badge></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ContentCard>
      )}

      {tab === 'costs' && (
        <ContentCard title="Capitalised contract costs" actions={<Button size="sm" leftIcon={Plus} onClick={() => setCostOpen(true)}>Add cost</Button>}>
          {costs.length === 0 ? <div className="text-sm text-slate-500">No capitalised costs recorded.</div> : (
            <div className="space-y-3">
              {costs.map((cost, i) => (
                <div key={cost.id || i} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{cost.cost_type || 'Cost'} • {formatMoney(numberOf(cost.amount), currency)}</div>
                      <div className="text-sm text-slate-500">{cost.description || 'No description'} • {formatDate(cost.amort_start_date)} to {formatDate(cost.amort_end_date)}</div>
                    </div>
                    <Badge tone={toneForStatus(cost.status)}>{cost.status || 'open'}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => generateCostScheduleMutation.mutate(cost.id)} disabled={!cost.id || generateCostScheduleMutation.isPending}>Generate schedule</Button>
                    <Button size="sm" onClick={() => postCostMutation.mutate({ costId: cost.id, period_id: postRevenueForm.period_id })} disabled={!cost.id || !postRevenueForm.period_id || postCostMutation.isPending}>Post amortisation</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ContentCard>
      )}

      {tab === 'approvals' && (
        <ContentCard title="Workflow and approvals" actions={<Button size="sm" leftIcon={Workflow} onClick={() => setApprovalOpen(true)}>Workflow action</Button>}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Approval status</div>
              <div className="mt-2"><Badge tone={toneForStatus(core.workflow_status || core.approval_status || core.status)} size="lg">{core.workflow_status || core.approval_status || core.status || 'draft'}</Badge></div>
              {core.workflow_comment || core.approval_comment ? <div className="mt-3 text-sm text-slate-600">{core.workflow_comment || core.approval_comment}</div> : null}
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Lifecycle</div>
              <div className="mt-2 text-sm text-slate-700">Use lifecycle update to complete or cancel the contract once operational conditions are met.</div>
              <div className="mt-3"><Button size="sm" variant="outline" onClick={() => setLifecycleOpen(true)}>Lifecycle update</Button></div>
            </div>
          </div>
        </ContentCard>
      )}

      {tab === 'ledger' && (
        <ContentCard title="Posting ledger">
          {ledgerRows.length === 0 ? <div className="text-sm text-slate-500">No posting ledger rows yet.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-3 pr-4">Date</th><th className="py-3 pr-4">Type</th><th className="py-3 pr-4">Reference</th><th className="py-3 pr-4">Amount</th><th className="py-3 pr-4">Journal</th></tr></thead>
                <tbody>
                  {ledgerRows.map((row, i) => (
                    <tr key={row.id || i} className="border-b border-slate-100"><td className="py-3 pr-4">{formatDate(row.entry_date || row.date)}</td><td className="py-3 pr-4">{row.entry_type || row.source_type || '—'}</td><td className="py-3 pr-4">{row.reference || row.memo || '—'}</td><td className="py-3 pr-4">{formatMoney(numberOf(row.amount), currency)}</td><td className="py-3 pr-4">{row.journal_id || row.journal_entry_id || '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ContentCard>
      )}

      {tab === 'events' && (
        <ContentCard title="Contract events">
          {eventRows.length === 0 ? <div className="text-sm text-slate-500">No events recorded yet.</div> : (
            <div className="space-y-3">
              {eventRows.map((row, i) => (
                <div key={row.id || i} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-slate-900">{row.event_type || row.type || 'Event'}</div>
                    <div className="text-sm text-slate-500">{formatDate(row.event_date || row.created_at || row.entry_date)}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">{row.memo || row.description || row.notes || '—'}</div>
                </div>
              ))}
            </div>
          )}
        </ContentCard>
      )}

      {tab === 'reports' && (
        <div className="space-y-4">
          <ContentCard title="Report controls">
            <div className="grid gap-4 md:grid-cols-4">
              <Select label="Period" value={reportState.period_id} onChange={(e) => setReportState((s) => ({ ...s, period_id: e.target.value }))} options={[{ value: '', label: 'Select period' }, ...periods.map((p) => ({ value: p.id, label: p.name || p.code || p.id }))]} />
              <Select label="RPO as-of period" value={reportState.as_of_period_id} onChange={(e) => setReportState((s) => ({ ...s, as_of_period_id: e.target.value }))} options={[{ value: '', label: 'Select period' }, ...periods.map((p) => ({ value: p.id, label: p.name || p.code || p.id }))]} />
              <Input label="Judgements as-of date" type="date" value={reportState.as_of_date} onChange={(e) => setReportState((s) => ({ ...s, as_of_date: e.target.value }))} />
              <Select label="Disaggregation dimension" value={reportState.dimension} onChange={(e) => setReportState((s) => ({ ...s, dimension: e.target.value }))} options={[{ value: 'customer', label: 'Customer' }, { value: 'contract', label: 'Contract' }, { value: 'obligation', label: 'Obligation' }]} />
            </div>
          </ContentCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <ContentCard title="Contract rollforward">
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-700">{JSON.stringify(rollforwardQ.data ?? {}, null, 2)}</pre>
            </ContentCard>
            <ContentCard title="Remaining performance obligations">
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-700">{JSON.stringify(rpoQ.data ?? {}, null, 2)}</pre>
            </ContentCard>
            <ContentCard title="Revenue disaggregation">
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-700">{JSON.stringify(disaggQ.data ?? {}, null, 2)}</pre>
            </ContentCard>
            <ContentCard title="Significant judgements">
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-700">{JSON.stringify(judgementQ.data ?? {}, null, 2)}</pre>
            </ContentCard>
          </div>
        </div>
      )}

      <Modal open={activateOpen} title="Activate contract" onClose={() => setActivateOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setActivateOpen(false)}>Cancel</Button><Button loading={activateMutation.isPending} onClick={() => activateMutation.mutate({ entry_date: activateForm.entry_date || undefined, memo: activateForm.memo || undefined })}>Activate</Button></div>}>
        <div className="grid gap-4"><Input label="Entry date" type="date" value={activateForm.entry_date} onChange={(e) => setActivateForm((s) => ({ ...s, entry_date: e.target.value }))} /><Textarea label="Memo" value={activateForm.memo} onChange={(e) => setActivateForm((s) => ({ ...s, memo: e.target.value }))} /></div>
      </Modal>

      <Modal open={obligationOpen} title="Add performance obligation" onClose={() => setObligationOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setObligationOpen(false)}>Cancel</Button><Button loading={addObligationMutation.isPending} onClick={() => { if (!validate('obligation')) return; addObligationMutation.mutate({ ...obligationForm, standalone_selling_price: Number(obligationForm.standalone_selling_price), start_date: obligationForm.start_date || undefined, end_date: obligationForm.end_date || undefined, satisfaction_date: obligationForm.satisfaction_date || undefined }); }}>Save obligation</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Textarea label="Description" value={obligationForm.description} error={errors.description} onChange={(e) => setObligationForm((s) => ({ ...s, description: e.target.value }))} className="md:col-span-2" />
          <Select label="Obligation type" value={obligationForm.obligation_type} onChange={(e) => setObligationForm((s) => ({ ...s, obligation_type: e.target.value }))} options={[{ value: 'OVER_TIME', label: 'Over time' }, { value: 'POINT_IN_TIME', label: 'Point in time' }]} />
          <Select label="Satisfaction method" value={obligationForm.satisfaction_method} onChange={(e) => setObligationForm((s) => ({ ...s, satisfaction_method: e.target.value }))} options={[{ value: 'TIME', label: 'Time' }, { value: 'OUTPUT', label: 'Output' }, { value: 'INPUT', label: 'Input' }]} />
          <Input label="Standalone selling price" type="number" value={obligationForm.standalone_selling_price} error={errors.standalone_selling_price} onChange={(e) => setObligationForm((s) => ({ ...s, standalone_selling_price: e.target.value }))} />
          {obligationForm.obligation_type === 'POINT_IN_TIME' ? <Input label="Satisfaction date" type="date" value={obligationForm.satisfaction_date} error={errors.satisfaction_date} onChange={(e) => setObligationForm((s) => ({ ...s, satisfaction_date: e.target.value }))} /> : <><Input label="Start date" type="date" value={obligationForm.start_date} error={errors.start_date} onChange={(e) => setObligationForm((s) => ({ ...s, start_date: e.target.value }))} /><Input label="End date" type="date" value={obligationForm.end_date} error={errors.end_date} onChange={(e) => setObligationForm((s) => ({ ...s, end_date: e.target.value }))} /></>}
        </div>
      </Modal>

      <Modal open={scheduleOpen} title="Generate revenue schedule" onClose={() => setScheduleOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setScheduleOpen(false)}>Cancel</Button><Button loading={generateScheduleMutation.isPending} onClick={() => generateScheduleMutation.mutate({ replace: !!scheduleForm.replace })}>Generate</Button></div>}>
        <div className="grid gap-4"><Select label="Generation mode" value={String(scheduleForm.replace)} onChange={(e) => setScheduleForm({ replace: e.target.value === 'true' })} options={[{ value: 'true', label: 'Replace all schedule lines' }, { value: 'false', label: 'Append without replacing' }]} /></div>
      </Modal>

      <Modal open={postRevenueOpen} title="Post revenue" onClose={() => setPostRevenueOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setPostRevenueOpen(false)}>Cancel</Button><Button loading={postRevenueMutation.isPending} onClick={() => { if (!validate('postRevenue')) return; postRevenueMutation.mutate({ ...postRevenueForm, entry_date: postRevenueForm.entry_date || undefined, memo: postRevenueForm.memo || undefined }); }}>Post revenue</Button></div>}>
        <div className="grid gap-4"><Select label="Period" value={postRevenueForm.period_id} error={errors.period_id} onChange={(e) => setPostRevenueForm((s) => ({ ...s, period_id: e.target.value }))} options={[{ value: '', label: 'Select period' }, ...periods.map((p) => ({ value: p.id, label: p.name || p.code || p.id }))]} /><Input label="Entry date" type="date" value={postRevenueForm.entry_date} onChange={(e) => setPostRevenueForm((s) => ({ ...s, entry_date: e.target.value }))} /><Textarea label="Memo" value={postRevenueForm.memo} onChange={(e) => setPostRevenueForm((s) => ({ ...s, memo: e.target.value }))} /></div>
      </Modal>

      <Modal open={costOpen} title="Add contract cost" onClose={() => setCostOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setCostOpen(false)}>Cancel</Button><Button loading={costMutation.isPending} onClick={() => { if (!validate('cost')) return; costMutation.mutate({ ...costForm, amount: Number(costForm.amount), asset_account_id: costForm.asset_account_id || undefined, amort_expense_account_id: costForm.amort_expense_account_id || undefined }); }}>Save cost</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Cost type" value={costForm.cost_type} onChange={(e) => setCostForm((s) => ({ ...s, cost_type: e.target.value }))} options={[{ value: 'ACQUISITION', label: 'Acquisition' }, { value: 'FULFILMENT', label: 'Fulfilment' }]} />
          <Input label="Amount" type="number" value={costForm.amount} error={errors.amount} onChange={(e) => setCostForm((s) => ({ ...s, amount: e.target.value }))} />
          <Textarea label="Description" value={costForm.description} onChange={(e) => setCostForm((s) => ({ ...s, description: e.target.value }))} className="md:col-span-2" />
          <AccountSelect label="Asset account" value={costForm.asset_account_id} onChange={(e) => setCostForm((s) => ({ ...s, asset_account_id: e.target.value }))} allowEmpty filters={{ accountTypeCodes: ['ASSET'] }} />
          <AccountSelect label="Amortisation expense account" value={costForm.amort_expense_account_id} onChange={(e) => setCostForm((s) => ({ ...s, amort_expense_account_id: e.target.value }))} allowEmpty filters={{ accountTypeCodes: ['EXPENSE'] }} />
          <Input label="Amortisation start date" type="date" value={costForm.amort_start_date} error={errors.amort_start_date} onChange={(e) => setCostForm((s) => ({ ...s, amort_start_date: e.target.value }))} />
          <Input label="Amortisation end date" type="date" value={costForm.amort_end_date} error={errors.amort_end_date} onChange={(e) => setCostForm((s) => ({ ...s, amort_end_date: e.target.value }))} />
        </div>
      </Modal>

      <Modal open={modificationOpen} title="Record contract modification" onClose={() => setModificationOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModificationOpen(false)}>Cancel</Button><Button loading={modificationMutation.isPending} onClick={() => { if (!validate('modification')) return; modificationMutation.mutate({ ...modificationForm, modification_date: modificationForm.modification_date, new_base_transaction_price: modificationForm.new_base_transaction_price === '' ? undefined : Number(modificationForm.new_base_transaction_price) }); }}>Save modification</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Modification date" type="date" value={modificationForm.modification_date} error={errors.modification_date} onChange={(e) => setModificationForm((s) => ({ ...s, modification_date: e.target.value }))} />
          <Select label="Modification type" value={modificationForm.modification_type} onChange={(e) => setModificationForm((s) => ({ ...s, modification_type: e.target.value }))} options={[{ value: 'PRICE_CHANGE', label: 'Price change' }, { value: 'SCOPE_CHANGE', label: 'Scope change' }, { value: 'SCOPE_AND_PRICE', label: 'Scope and price' }]} />
          <Input label="New base transaction price" type="number" value={modificationForm.new_base_transaction_price} onChange={(e) => setModificationForm((s) => ({ ...s, new_base_transaction_price: e.target.value }))} />
          <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700 md:col-span-2 space-y-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={modificationForm.adds_distinct_goods_services} onChange={(e) => setModificationForm((s) => ({ ...s, adds_distinct_goods_services: e.target.checked }))} />Adds distinct goods/services</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={modificationForm.price_increase_commensurate_with_ssp} onChange={(e) => setModificationForm((s) => ({ ...s, price_increase_commensurate_with_ssp: e.target.checked }))} />Price increase commensurate with SSP</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={modificationForm.remaining_goods_services_distinct} onChange={(e) => setModificationForm((s) => ({ ...s, remaining_goods_services_distinct: e.target.checked }))} />Remaining goods/services distinct</label>
          </div>
          <Textarea label="Notes" value={modificationForm.notes} onChange={(e) => setModificationForm((s) => ({ ...s, notes: e.target.value }))} className="md:col-span-2" />
        </div>
      </Modal>

      <Modal open={variableOpen} title="Add variable consideration" onClose={() => setVariableOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setVariableOpen(false)}>Cancel</Button><Button loading={variableMutation.isPending} onClick={() => { if (!validate('variable')) return; variableMutation.mutate({ ...variableForm, estimate_amount: Number(variableForm.estimate_amount || 0) }); }}>Save entry</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Effective date" type="date" value={variableForm.effective_date} error={errors.effective_date} onChange={(e) => setVariableForm((s) => ({ ...s, effective_date: e.target.value }))} />
          <Select label="Method" value={variableForm.method} onChange={(e) => setVariableForm((s) => ({ ...s, method: e.target.value }))} options={[{ value: 'EXPECTED_VALUE', label: 'Expected value' }, { value: 'MOST_LIKELY', label: 'Most likely' }]} />
          <Input label="Estimated amount" type="number" value={variableForm.estimate_amount} onChange={(e) => setVariableForm((s) => ({ ...s, estimate_amount: e.target.value }))} />
          <div className="flex items-center rounded-2xl border border-slate-200 p-4 text-sm text-slate-700"><label className="flex items-center gap-2"><input type="checkbox" checked={variableForm.highly_probable_no_reversal} onChange={(e) => setVariableForm((s) => ({ ...s, highly_probable_no_reversal: e.target.checked }))} />Highly probable no significant reversal</label></div>
          <Textarea label="Constraint basis" value={variableForm.constraint_basis} onChange={(e) => setVariableForm((s) => ({ ...s, constraint_basis: e.target.value }))} className="md:col-span-2" />
          <Textarea label="Rationale" value={variableForm.rationale} onChange={(e) => setVariableForm((s) => ({ ...s, rationale: e.target.value }))} className="md:col-span-2" />
        </div>
      </Modal>

      <Modal open={financingOpen} title="Set financing terms" onClose={() => setFinancingOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setFinancingOpen(false)}>Cancel</Button><Button loading={financingMutation.isPending} onClick={() => { if (!validate('financing')) return; financingMutation.mutate({ annual_rate: Number(financingForm.annual_rate), effective_from: financingForm.effective_from, effective_to: financingForm.effective_to || undefined }); }}>Save terms</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2"><Input label="Annual rate" type="number" value={financingForm.annual_rate} error={errors.annual_rate} onChange={(e) => setFinancingForm((s) => ({ ...s, annual_rate: e.target.value }))} /><Input label="Effective from" type="date" value={financingForm.effective_from} error={errors.effective_from} onChange={(e) => setFinancingForm((s) => ({ ...s, effective_from: e.target.value }))} /><Input label="Effective to" type="date" value={financingForm.effective_to} onChange={(e) => setFinancingForm((s) => ({ ...s, effective_to: e.target.value }))} /></div>
      </Modal>

      <Modal open={approvalOpen} title="Workflow action" onClose={() => setApprovalOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setApprovalOpen(false)}>Cancel</Button><Button loading={approvalMutation.isPending} onClick={() => approvalMutation.mutate()}>Run action</Button></div>}>
        <div className="grid gap-4"><Select label="Action" value={approvalForm.action} onChange={(e) => setApprovalForm((s) => ({ ...s, action: e.target.value }))} options={[{ value: 'submit', label: 'Submit for approval' }, { value: 'approve', label: 'Approve' }, { value: 'reject', label: 'Reject' }]} /><Textarea label="Comment" value={approvalForm.comment} onChange={(e) => setApprovalForm((s) => ({ ...s, comment: e.target.value }))} /></div>
      </Modal>

      <Modal open={lifecycleOpen} title="Lifecycle update" onClose={() => setLifecycleOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setLifecycleOpen(false)}>Cancel</Button><Button loading={lifecycleMutation.isPending} onClick={() => lifecycleMutation.mutate({ ...lifecycleForm, entry_date: lifecycleForm.entry_date || undefined, memo: lifecycleForm.memo || undefined })}>Update lifecycle</Button></div>}>
        <div className="grid gap-4"><Select label="Action" value={lifecycleForm.action} onChange={(e) => setLifecycleForm((s) => ({ ...s, action: e.target.value }))} options={[{ value: 'complete', label: 'Complete' }, { value: 'cancel', label: 'Cancel' }]} /><Input label="Entry date" type="date" value={lifecycleForm.entry_date} onChange={(e) => setLifecycleForm((s) => ({ ...s, entry_date: e.target.value }))} /><Textarea label="Memo" value={lifecycleForm.memo} onChange={(e) => setLifecycleForm((s) => ({ ...s, memo: e.target.value }))} /></div>
      </Modal>
    </div>
  );
}
