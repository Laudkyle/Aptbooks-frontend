import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  RefreshCw,
  ShieldCheck,
  Workflow,
  Landmark,
  Wallet,
  BarChart3,
  Activity,
  PlayCircle,
  PencilLine,
  FolderKanban,
  ListChecks,
  History,
  Plus,
  Save,
  Send,
  Trash2,
  XCircle,
  FileCheck2,
  FilePlus2,
  ReceiptText,
  RotateCcw,
} from 'lucide-react';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { makeIfrs16Api } from '../api/ifrs16.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';
import { formatMoney } from '../../../shared/utils/formatMoney.js';
import { formatDate } from '../../../shared/utils/formatDate.js';
import { PartnerSelect } from '../../../shared/components/forms/PartnerSelect.jsx';
import { CurrencySelect } from '../../../shared/components/forms/CurrencySelect.jsx';

function rowsOf(data, keys = ['items', 'data', 'rows', 'lines']) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function oneOf(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function numberOf(...values) {
  const value = oneOf(...values);
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function decimalOrUndefined(value) {
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}

function integerOrUndefined(value) {
  if (value === undefined || value === null || value === '') return undefined;
  return Number(value);
}

function getApprovalStatus(row) {
  if (row?.rejected_at || String(row?.workflow_status || '').toLowerCase() === 'rejected') return 'rejected';
  if (row?.approved_at) return 'approved';
  if (row?.submitted_at || row?.workflow_document_id) return 'submitted';
  return 'draft';
}

function toneForStatus(status) {
  const s = String(status || '').toLowerCase();
  if (['active', 'approved', 'posted', 'applied'].includes(s)) return 'success';
  if (['draft', 'pending', 'submitted'].includes(s)) return 'warning';
  if (['cancelled', 'rejected', 'closed', 'terminated'].includes(s)) return 'danger';
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

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-right text-sm font-medium text-slate-900">{value || '—'}</div>
    </div>
  );
}

function MiniTable({ columns, rows, emptyLabel = 'No rows found.' }) {
  if (!rows?.length) return <div className="py-8 text-sm text-slate-500">{emptyLabel}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            {columns.map((column) => (
              <th key={column.key} className="py-3 pr-4">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id || row.line_no || row.created_at || idx} className="border-b border-slate-100 align-top">
              {columns.map((column) => (
                <td key={column.key} className="py-3 pr-4 text-slate-700">{column.render ? column.render(row) : row[column.key] ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function IFRS16LeaseDetailPage() {
  const { leaseId } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeIfrs16Api(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [tab, setTab] = useState('overview');
  const [statusOpen, setStatusOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [initialOpen, setInitialOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [assetOpen, setAssetOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [modOpen, setModOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editingModificationId, setEditingModificationId] = useState(null);

  const [statusForm, setStatusForm] = useState({ status: 'active', reason: '' });
  const [initialForm, setInitialForm] = useState({ entry_date: '', memo: '' });
  const [postForm, setPostForm] = useState({ from_date: '', to_date: '', memo: '', post_depreciation: 'true', post_interest_and_payment: 'true' });
  const [reportFilters, setReportFilters] = useState({ as_of_date: '', from_date: '', to_date: '', period_id: '', status: '' });
  const [contractForm, setContractForm] = useState({
    counterparty_partner_id: '', contract_reference: '', currency_code: 'GHS', payment_timing: 'arrears', indexation: '',
    has_purchase_option: 'false', has_extension_option: 'false', has_termination_option: 'false',
    residual_value_guarantee: '', initial_direct_costs: '', lease_incentives: '', restoration_provision: '',
    prepaid_lease_payments: '', accrued_lease_payments: '', purchase_option_amount: '',
  });
  const [assetForm, setAssetForm] = useState({ description: '', asset_code: '', asset_class: '', useful_life_months: '', rou_cost: '', is_primary: 'true' });
  const [paymentForm, setPaymentForm] = useState({ due_date: '', amount: '', payment_type: 'fixed', is_actual: 'false', paid_date: '', reference: '' });
  const [modForm, setModForm] = useState({ effective_date: '', reason: '', new_term_months: '', new_payment_amount: '', new_payments_per_year: '', new_annual_discount_rate: '', new_payment_timing: '' });
  const [workflowComment, setWorkflowComment] = useState('');

  const leaseQ = useQuery({ queryKey: qk.ifrs16Lease(leaseId), queryFn: () => api.getLease(leaseId), enabled: !!leaseId, staleTime: 10_000 });
  const scheduleQ = useQuery({ queryKey: qk.ifrs16LeaseSchedule(leaseId), queryFn: () => api.getSchedule(leaseId), enabled: !!leaseId, staleTime: 10_000 });
  const assetsQ = useQuery({ queryKey: qk.ifrs16LeaseAssets(leaseId), queryFn: () => api.listAssets(leaseId), enabled: !!leaseId, staleTime: 10_000 });
  const paymentsQ = useQuery({ queryKey: qk.ifrs16LeasePayments(leaseId), queryFn: () => api.listPayments(leaseId), enabled: !!leaseId, staleTime: 10_000 });
  const modificationsQ = useQuery({ queryKey: qk.ifrs16LeaseModifications(leaseId), queryFn: () => api.listModifications(leaseId), enabled: !!leaseId, staleTime: 10_000 });
  const eventsQ = useQuery({ queryKey: qk.ifrs16LeaseEvents(leaseId, { limit: 100 }), queryFn: () => api.listEvents(leaseId, { limit: 100 }), enabled: !!leaseId, staleTime: 10_000 });
  const postingLedgerQ = useQuery({ queryKey: qk.ifrs16LeasePostingLedger(leaseId), queryFn: () => api.getPostingLedger(leaseId), enabled: !!leaseId, staleTime: 10_000 });
  const reportQuery = useMemo(() => ({
    as_of_date: reportFilters.as_of_date || undefined,
    from_date: reportFilters.from_date || undefined,
    to_date: reportFilters.to_date || undefined,
    period_id: reportFilters.period_id || undefined,
    status: reportFilters.status || undefined,
  }), [reportFilters]);
  const dashboardQ = useQuery({ queryKey: qk.ifrs16Dashboard(reportQuery), queryFn: () => api.getDashboard(reportQuery), staleTime: 10_000 });
  const disclosuresQ = useQuery({ queryKey: qk.ifrs16Disclosures(reportQuery), queryFn: () => api.getDisclosures(reportQuery), staleTime: 10_000 });
  const periodsQ = useQuery({ queryKey: ['ifrs16', 'periods'], queryFn: () => periodsApi.list({ limit: 500, offset: 0 }), staleTime: 60_000 });

  const leaseSnapshot = leaseQ.data || {};
  const lease = useMemo(() => {
    const data = leaseSnapshot || {};
    return data.lease && typeof data.lease === 'object' ? { ...data.lease, ...data } : data;
  }, [leaseSnapshot]);
  const contract = leaseSnapshot?.contract || null;
  const scheduleLines = useMemo(() => rowsOf(scheduleQ.data), [scheduleQ.data]);
  const assets = useMemo(() => rowsOf(assetsQ.data), [assetsQ.data]);
  const payments = useMemo(() => rowsOf(paymentsQ.data), [paymentsQ.data]);
  const modifications = useMemo(() => rowsOf(modificationsQ.data), [modificationsQ.data]);
  const events = useMemo(() => rowsOf(eventsQ.data), [eventsQ.data]);
  const postingLedger = useMemo(() => rowsOf(postingLedgerQ.data), [postingLedgerQ.data]);
  const periods = useMemo(() => rowsOf(periodsQ.data), [periodsQ.data]);
  const measurementSnapshots = useMemo(() => rowsOf(leaseSnapshot?.measurement_snapshots), [leaseSnapshot]);
  const currency = lease.currency_code || contract?.currency_code || 'GHS';
  const currentStatus = String(lease.status || '').toLowerCase();
  const approvalStatus = getApprovalStatus(lease);
  const isLeaseEditable = currentStatus === 'draft' && !lease.initial_recognition_journal_id && !lease.initial_recognition_date;

  useEffect(() => {
    setStatusForm((s) => ({ ...s, status: currentStatus || 'active' }));
  }, [currentStatus]);

  useEffect(() => {
    if (!contract) return;
    setContractForm({
      counterparty_partner_id: contract.counterparty_partner_id || '',
      contract_reference: contract.contract_reference || lease.contract_reference || '',
      currency_code: contract.currency_code || lease.currency_code || 'GHS',
      payment_timing: contract.payment_timing || lease.payment_timing || 'arrears',
      indexation: contract.indexation || '',
      has_purchase_option: String(Boolean(contract.has_purchase_option)),
      has_extension_option: String(Boolean(contract.has_extension_option)),
      has_termination_option: String(Boolean(contract.has_termination_option)),
      residual_value_guarantee: contract.residual_value_guarantee != null ? String(contract.residual_value_guarantee) : '',
      initial_direct_costs: contract.initial_direct_costs != null ? String(contract.initial_direct_costs) : '',
      lease_incentives: contract.lease_incentives != null ? String(contract.lease_incentives) : '',
      restoration_provision: contract.restoration_provision != null ? String(contract.restoration_provision) : '',
      prepaid_lease_payments: contract.prepaid_lease_payments != null ? String(contract.prepaid_lease_payments) : '',
      accrued_lease_payments: contract.accrued_lease_payments != null ? String(contract.accrued_lease_payments) : '',
      purchase_option_amount: contract.purchase_option_amount != null ? String(contract.purchase_option_amount) : '',
    });
  }, [contract, lease]);

  const invalidateAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: qk.ifrs16Lease(leaseId) }),
      qc.invalidateQueries({ queryKey: qk.ifrs16LeaseSchedule(leaseId) }),
      qc.invalidateQueries({ queryKey: qk.ifrs16LeaseAssets(leaseId) }),
      qc.invalidateQueries({ queryKey: qk.ifrs16LeasePayments(leaseId) }),
      qc.invalidateQueries({ queryKey: qk.ifrs16LeaseModifications(leaseId) }),
      qc.invalidateQueries({ queryKey: qk.ifrs16LeaseEvents(leaseId, { limit: 100 }) }),
      qc.invalidateQueries({ queryKey: qk.ifrs16LeasePostingLedger(leaseId) }),
      qc.invalidateQueries({ queryKey: qk.ifrs16Leases({}) }),
      qc.invalidateQueries({ queryKey: qk.ifrs16Dashboard(reportQuery) }),
      qc.invalidateQueries({ queryKey: qk.ifrs16Disclosures(reportQuery) }),
    ]);
  };

  const statusMutation = useMutation({
    mutationFn: () => api.updateLeaseStatus(leaseId, { status: statusForm.status, reason: statusForm.reason || undefined }),
    onSuccess: async () => { toast.success('Lease status updated'); setStatusOpen(false); await invalidateAll(); },
    onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to update lease status'),
  });
  const submitLeaseMutation = useMutation({ mutationFn: () => api.submitLease(leaseId), onSuccess: async () => { toast.success('Lease submitted'); await invalidateAll(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to submit lease') });
  const approveLeaseMutation = useMutation({ mutationFn: () => api.approveLease(leaseId, { comment: workflowComment || undefined }), onSuccess: async () => { toast.success('Lease approved'); setWorkflowComment(''); await invalidateAll(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to approve lease') });
  const rejectLeaseMutation = useMutation({ mutationFn: () => api.rejectLease(leaseId, { comment: workflowComment || undefined }), onSuccess: async () => { toast.success('Lease rejected'); setWorkflowComment(''); await invalidateAll(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to reject lease') });
  const deleteLeaseMutation = useMutation({ mutationFn: () => api.deleteLease(leaseId), onSuccess: async () => { toast.success('Draft lease deleted'); navigate(ROUTES.complianceIFRS16); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to delete lease') });
  const scheduleMutation = useMutation({ mutationFn: () => api.generateSchedule(leaseId, {}), onSuccess: async () => { toast.success('Lease schedule generated'); setScheduleOpen(false); await invalidateAll(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to generate schedule') });
  const initialMutation = useMutation({ mutationFn: () => api.postInitialRecognition(leaseId, { entry_date: initialForm.entry_date || undefined, memo: initialForm.memo || undefined }), onSuccess: async () => { toast.success('Initial recognition posted'); setInitialOpen(false); setInitialForm({ entry_date: '', memo: '' }); await invalidateAll(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to post initial recognition') });
  const postMutation = useMutation({ mutationFn: () => api.postForRange(leaseId, { from_date: postForm.from_date, to_date: postForm.to_date, memo: postForm.memo || undefined, post_depreciation: postForm.post_depreciation === 'true', post_interest_and_payment: postForm.post_interest_and_payment === 'true' }), onSuccess: async () => { toast.success('Lease period posted'); setPostOpen(false); setPostForm({ from_date: '', to_date: '', memo: '', post_depreciation: 'true', post_interest_and_payment: 'true' }); await invalidateAll(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to post lease period') });
  const contractMutation = useMutation({ mutationFn: () => api.updateContract(leaseId, {
    counterparty_partner_id: contractForm.counterparty_partner_id || undefined,
    contract_reference: contractForm.contract_reference || undefined,
    currency_code: contractForm.currency_code || undefined,
    payment_timing: contractForm.payment_timing || undefined,
    indexation: contractForm.indexation || undefined,
    has_purchase_option: contractForm.has_purchase_option === 'true',
    has_extension_option: contractForm.has_extension_option === 'true',
    has_termination_option: contractForm.has_termination_option === 'true',
    residual_value_guarantee: decimalOrUndefined(contractForm.residual_value_guarantee),
    initial_direct_costs: decimalOrUndefined(contractForm.initial_direct_costs),
    lease_incentives: decimalOrUndefined(contractForm.lease_incentives),
    restoration_provision: decimalOrUndefined(contractForm.restoration_provision),
    prepaid_lease_payments: decimalOrUndefined(contractForm.prepaid_lease_payments),
    accrued_lease_payments: decimalOrUndefined(contractForm.accrued_lease_payments),
    purchase_option_amount: decimalOrUndefined(contractForm.purchase_option_amount),
  }), onSuccess: async () => { toast.success('Contract updated'); setContractOpen(false); await invalidateAll(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to update contract') });
  const emptyAssetForm = { description: '', asset_code: '', asset_class: '', useful_life_months: '', rou_cost: '', is_primary: 'true' };
  const assetMutation = useMutation({ mutationFn: () => {
    const body = { description: assetForm.description, asset_code: assetForm.asset_code || undefined, asset_class: assetForm.asset_class || undefined, useful_life_months: integerOrUndefined(assetForm.useful_life_months), rou_cost: decimalOrUndefined(assetForm.rou_cost), is_primary: assetForm.is_primary === 'true' };
    return editingAssetId ? api.updateAsset(leaseId, editingAssetId, body) : api.createAsset(leaseId, body);
  }, onSuccess: async () => { toast.success(editingAssetId ? 'ROU asset updated' : 'ROU asset added'); setAssetOpen(false); setEditingAssetId(null); setAssetForm(emptyAssetForm); await invalidateAll(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to save asset') });
  const deleteAssetMutation = useMutation({ mutationFn: (assetId) => api.deleteAsset(leaseId, assetId), onSuccess: async () => { toast.success('ROU asset deleted'); await invalidateAll(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to delete asset') });
  const emptyPaymentForm = { due_date: '', amount: '', payment_type: 'fixed', is_actual: 'false', paid_date: '', reference: '' };
  const paymentMutation = useMutation({ mutationFn: () => {
    const body = { due_date: paymentForm.due_date || undefined, amount: decimalOrUndefined(paymentForm.amount), payment_type: paymentForm.payment_type || undefined, is_actual: paymentForm.is_actual === 'true', paid_date: paymentForm.paid_date || undefined, reference: paymentForm.reference || undefined };
    return editingPaymentId ? api.updatePayment(leaseId, editingPaymentId, body) : api.createPayment(leaseId, body);
  }, onSuccess: async () => { toast.success(editingPaymentId ? 'Lease payment updated' : 'Lease payment added'); setPaymentOpen(false); setEditingPaymentId(null); setPaymentForm(emptyPaymentForm); await invalidateAll(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to save payment') });
  const deletePaymentMutation = useMutation({ mutationFn: (paymentId) => api.deletePayment(leaseId, paymentId), onSuccess: async () => { toast.success('Lease payment deleted'); await invalidateAll(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to delete payment') });
  const emptyModForm = { effective_date: '', reason: '', new_term_months: '', new_payment_amount: '', new_payments_per_year: '', new_annual_discount_rate: '', new_payment_timing: '' };
  const modificationMutation = useMutation({ mutationFn: () => {
    const body = {
      effective_date: modForm.effective_date || undefined,
      reason: modForm.reason || undefined,
      new_term_months: integerOrUndefined(modForm.new_term_months),
      new_payment_amount: decimalOrUndefined(modForm.new_payment_amount),
      new_payments_per_year: integerOrUndefined(modForm.new_payments_per_year),
      new_annual_discount_rate: decimalOrUndefined(modForm.new_annual_discount_rate),
      new_payment_timing: modForm.new_payment_timing || undefined,
    };
    return editingModificationId ? api.updateModification(leaseId, editingModificationId, body) : api.createModification(leaseId, body);
  }, onSuccess: async () => { toast.success(editingModificationId ? 'Lease modification updated' : 'Lease modification created'); setModOpen(false); setEditingModificationId(null); setModForm(emptyModForm); await invalidateAll(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to save modification') });
  const deleteModificationMutation = useMutation({ mutationFn: (modificationId) => api.deleteModification(leaseId, modificationId), onSuccess: async () => { toast.success('Lease modification deleted'); await invalidateAll(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to delete modification') });
  const modificationAction = (fn, successMessage) => useMutation({ mutationFn: fn, onSuccess: async () => { toast.success(successMessage); await invalidateAll(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Modification action failed') });
  const modSubmitMutation = modificationAction(({ modificationId }) => api.submitModification(leaseId, modificationId), 'Modification submitted');
  const modApproveMutation = modificationAction(({ modificationId }) => api.approveModification(leaseId, modificationId, { comment: workflowComment || undefined }), 'Modification approved');
  const modRejectMutation = modificationAction(({ modificationId }) => api.rejectModification(leaseId, modificationId, { comment: workflowComment || undefined }), 'Modification rejected');
  const modApplyMutation = modificationAction(({ modificationId }) => api.applyModification(leaseId, modificationId), 'Modification applied');

  const metrics = useMemo(() => {
    const paymentsTotal = scheduleLines.reduce((sum, row) => sum + numberOf(row.payment_amount), 0);
    const interest = scheduleLines.reduce((sum, row) => sum + numberOf(row.interest_amount), 0);
    const depreciation = scheduleLines.reduce((sum, row) => sum + numberOf(row.depreciation_amount), 0);
    const closing = scheduleLines.length ? numberOf(scheduleLines[scheduleLines.length - 1]?.closing_balance) : numberOf(lease.lease_liability_balance, lease.initial_lease_liability);
    return { paymentsTotal, interest, depreciation, closing, lines: scheduleLines.length };
  }, [lease, scheduleLines]);

  const dashboard = dashboardQ.data || {};
  const disclosures = disclosuresQ.data || {};

  if (leaseQ.isLoading) {
    return <div className="space-y-6"><PageHeader title="Loading IFRS 16 lease..." subtitle="Preparing lease workspace" icon={FileText} actions={<Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.complianceIFRS16)}>Back to leases</Button>} /><ContentCard><div className="py-10 text-sm text-slate-500">Loading lease...</div></ContentCard></div>;
  }
  if (leaseQ.isError) {
    return <div className="space-y-6"><PageHeader title="IFRS 16 lease" subtitle="Unable to load the selected lease" icon={FileText} actions={<Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.complianceIFRS16)}>Back to leases</Button>} /><ContentCard><div className="py-10 text-sm text-red-600">{leaseQ.error?.response?.data?.message ?? 'Failed to load lease details'}</div></ContentCard></div>;
  }

  const overviewContent = (
    <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
      <ContentCard title="Lease profile">
        <div className="grid gap-3 md:grid-cols-2">
          <DetailRow label="Lease code" value={lease.code} />
          <DetailRow label="Lease name" value={lease.name} />
          <DetailRow label="Status" value={<Badge tone={toneForStatus(lease.status)}>{lease.status || 'unknown'}</Badge>} />
          <DetailRow label="Recognition model" value={lease.recognition_model || 'on_balance_sheet'} />
          <DetailRow label="Commencement date" value={formatDate(lease.commencement_date)} />
          <DetailRow label="Term" value={lease.term_months ? `${lease.term_months} months` : '—'} />
          <DetailRow label="Payment amount" value={formatMoney(numberOf(lease.payment_amount), currency)} />
          <DetailRow label="Payments per year" value={String(oneOf(lease.payments_per_year, '—'))} />
          <DetailRow label="Annual discount rate" value={`${(numberOf(lease.annual_discount_rate) * 100).toFixed(2)}%`} />
          <DetailRow label="Payment timing" value={lease.payment_timing === 'advance' ? 'Advance (start of period)' : 'Arrears (end of period)'} />
          <DetailRow label="Initial direct costs" value={formatMoney(numberOf(contract?.initial_direct_costs, lease.initial_direct_costs), currency)} />
          <DetailRow label="Lease incentives" value={formatMoney(numberOf(contract?.lease_incentives, lease.lease_incentives), currency)} />
        </div>
      </ContentCard>
      <ContentCard title="Contract & policy elections" actions={<Button variant="outline" leftIcon={PencilLine} onClick={() => setContractOpen(true)}>Update contract</Button>}>
        <div className="space-y-3">
          <DetailRow label="Contract reference" value={contract?.contract_reference || lease.contract_reference} />
          <DetailRow label="Currency" value={contract?.currency_code || currency} />
          <DetailRow label="Indexation" value={contract?.indexation || '—'} />
          <DetailRow label="Has purchase option" value={String(Boolean(contract?.has_purchase_option))} />
          <DetailRow label="Has extension option" value={String(Boolean(contract?.has_extension_option))} />
          <DetailRow label="Has termination option" value={String(Boolean(contract?.has_termination_option))} />
          <DetailRow label="Residual value guarantee" value={formatMoney(numberOf(contract?.residual_value_guarantee), currency)} />
          <DetailRow label="Purchase option amount" value={formatMoney(numberOf(contract?.purchase_option_amount), currency)} />
        </div>
      </ContentCard>
    </div>
  );

  const scheduleContent = (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-3 md:grid-cols-2">
        <StatCard label="Schedule lines" value={metrics.lines} subvalue="Generated payment / amortisation lines" icon={Calendar} />
        <StatCard label="Interest total" value={formatMoney(metrics.interest, currency)} subvalue="Across current schedule" icon={BarChart3} />
        <StatCard label="Closing liability" value={formatMoney(metrics.closing, currency)} subvalue="Latest schedule closing balance" icon={Landmark} />
      </div>
      <ContentCard title="Measurement schedule">
        <MiniTable
          rows={scheduleLines}
          emptyLabel="No schedule lines generated yet."
          columns={[
            { key: 'line_no', label: '#' },
            { key: 'due_date', label: 'Due date', render: (row) => formatDate(row.due_date) },
            { key: 'opening_balance', label: 'Opening', render: (row) => formatMoney(numberOf(row.opening_balance), currency) },
            { key: 'payment_amount', label: 'Payment', render: (row) => formatMoney(numberOf(row.payment_amount), currency) },
            { key: 'interest_amount', label: 'Interest', render: (row) => formatMoney(numberOf(row.interest_amount), currency) },
            { key: 'principal_amount', label: 'Principal', render: (row) => formatMoney(numberOf(row.principal_amount), currency) },
            { key: 'depreciation_amount', label: 'Depreciation', render: (row) => formatMoney(numberOf(row.depreciation_amount), currency) },
            { key: 'closing_balance', label: 'Closing', render: (row) => formatMoney(numberOf(row.closing_balance), currency) },
          ]}
        />
      </ContentCard>
      <ContentCard title="Measurement snapshots">
        <MiniTable
          rows={measurementSnapshots}
          emptyLabel="No measurement snapshots recorded yet."
          columns={[
            { key: 'snapshot_type', label: 'Type' },
            { key: 'effective_date', label: 'Effective date', render: (row) => formatDate(row.effective_date) },
            { key: 'discount_rate', label: 'Discount rate', render: (row) => `${(numberOf(row.discount_rate) * 100).toFixed(2)}%` },
            { key: 'lease_liability_amount', label: 'Lease liability', render: (row) => formatMoney(numberOf(row.lease_liability_amount), currency) },
            { key: 'rou_asset_amount', label: 'ROU asset', render: (row) => formatMoney(numberOf(row.rou_asset_amount), currency) },
          ]}
        />
      </ContentCard>
    </div>
  );

  const leaseActionButtons = (() => {
    if (currentStatus === 'draft' && approvalStatus === 'draft') {
      return [
        <Button key="submit" leftIcon={Send} loading={submitLeaseMutation.isPending} onClick={() => submitLeaseMutation.mutate()}>Submit</Button>,
        isLeaseEditable ? <Button key="delete" variant="danger" leftIcon={Trash2} loading={deleteLeaseMutation.isPending} onClick={() => deleteLeaseMutation.mutate()}>Delete</Button> : null,
      ].filter(Boolean);
    }
    if (approvalStatus === 'submitted') {
      return [
        <Button key="approve" leftIcon={CheckCircle2} loading={approveLeaseMutation.isPending} onClick={() => approveLeaseMutation.mutate()}>Approve</Button>,
        <Button key="reject" variant="danger" leftIcon={XCircle} loading={rejectLeaseMutation.isPending} onClick={() => rejectLeaseMutation.mutate()}>Reject</Button>,
      ];
    }
    if (currentStatus === 'draft' && approvalStatus === 'rejected') {
      return [
        <Button key="resubmit" leftIcon={Send} loading={submitLeaseMutation.isPending} onClick={() => submitLeaseMutation.mutate()}>Resubmit</Button>,
        isLeaseEditable ? <Button key="delete" variant="danger" leftIcon={Trash2} loading={deleteLeaseMutation.isPending} onClick={() => deleteLeaseMutation.mutate()}>Delete</Button> : null,
      ].filter(Boolean);
    }
    if (currentStatus === 'draft' && approvalStatus === 'approved') {
      if (!scheduleLines.length) return [<Button key="schedule" leftIcon={FilePlus2} onClick={() => setScheduleOpen(true)}>Generate schedule</Button>];
      if (!lease.initial_recognition_journal_id && !lease.initial_recognition_date) return [<Button key="initial" leftIcon={Landmark} onClick={() => setInitialOpen(true)}>Post initial recognition</Button>];
    }
    if (currentStatus === 'active') {
      return [
        <Button key="post" leftIcon={ReceiptText} onClick={() => setPostOpen(true)}>Post period</Button>,
        <Button key="status" variant="outline" leftIcon={ShieldCheck} onClick={() => setStatusOpen(true)}>Terminate / close</Button>,
      ];
    }
    return [];
  })();

  const operationsContent = (
    <div className="space-y-6">
      <ContentCard title="Workflow & posting actions" subtitle="Only the valid next IFRS 16 action is shown for the current lifecycle and approval state.">
        <div className="grid gap-4 md:grid-cols-3">
          <DetailRow label="Lease lifecycle status" value={<Badge tone={toneForStatus(lease.status)}>{lease.status || 'unknown'}</Badge>} />
          <DetailRow label="Approval status" value={<Badge tone={toneForStatus(approvalStatus)}>{approvalStatus}</Badge>} />
          <DetailRow label="Initial recognition" value={lease.initial_recognition_journal_id || lease.initial_recognition_date ? 'Posted' : 'Not posted'} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {leaseActionButtons.length ? leaseActionButtons : <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">No workflow action is currently available for this lease.</div>}
        </div>
        {approvalStatus === 'submitted' || approvalStatus === 'rejected' ? (
          <div className="mt-4 max-w-xl"><Textarea label="Approval / rejection comment" value={workflowComment} onChange={(e) => setWorkflowComment(e.target.value)} rows={3} /></div>
        ) : null}
      </ContentCard>
      <ContentCard title="Accounting readiness">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <DetailRow label="ROU asset account" value={lease.rou_asset_account_name || lease.rou_asset_account_id} />
          <DetailRow label="Lease liability account" value={lease.lease_liability_account_name || lease.lease_liability_account_id} />
          <DetailRow label="Interest expense account" value={lease.interest_expense_account_name || lease.interest_expense_account_id} />
          <DetailRow label="Depreciation expense account" value={lease.depreciation_expense_account_name || lease.depreciation_expense_account_id} />
          <DetailRow label="Accumulated depreciation account" value={lease.accumulated_depreciation_account_name || lease.accumulated_depreciation_account_id} />
          <DetailRow label="Cash / bank account" value={lease.cash_account_name || lease.cash_account_id} />
        </div>
      </ContentCard>
    </div>
  );

  const openNewAsset = () => {
    setEditingAssetId(null);
    setAssetForm(emptyAssetForm);
    setAssetOpen(true);
  };

  const openEditAsset = (row) => {
    setEditingAssetId(row.id);
    setAssetForm({
      description: row.description || '',
      asset_code: row.asset_code || '',
      asset_class: row.asset_class || '',
      useful_life_months: row.useful_life_months != null ? String(row.useful_life_months) : '',
      rou_cost: row.rou_cost != null ? String(row.rou_cost) : '',
      is_primary: String(Boolean(row.is_primary)),
    });
    setAssetOpen(true);
  };

  const openNewPayment = () => {
    setEditingPaymentId(null);
    setPaymentForm(emptyPaymentForm);
    setPaymentOpen(true);
  };

  const openEditPayment = (row) => {
    setEditingPaymentId(row.id);
    setPaymentForm({
      due_date: row.due_date ? String(row.due_date).slice(0, 10) : '',
      amount: row.amount != null ? String(row.amount) : '',
      payment_type: row.payment_type || 'fixed',
      is_actual: String(Boolean(row.is_actual)),
      paid_date: row.paid_date ? String(row.paid_date).slice(0, 10) : '',
      reference: row.reference || '',
    });
    setPaymentOpen(true);
  };

  const openNewModification = () => {
    setEditingModificationId(null);
    setModForm(emptyModForm);
    setModOpen(true);
  };

  const openEditModification = (row) => {
    setEditingModificationId(row.id);
    setModForm({
      effective_date: row.effective_date ? String(row.effective_date).slice(0, 10) : '',
      reason: row.reason || '',
      new_term_months: row.new_term_months != null ? String(row.new_term_months) : '',
      new_payment_amount: row.new_payment_amount != null ? String(row.new_payment_amount) : '',
      new_payments_per_year: row.new_payments_per_year != null ? String(row.new_payments_per_year) : '',
      new_annual_discount_rate: row.new_annual_discount_rate != null ? String(row.new_annual_discount_rate) : '',
      new_payment_timing: row.new_payment_timing || '',
    });
    setModOpen(true);
  };

  const renderModificationActions = (row) => {
    const status = String(row.status || 'draft').toLowerCase();
    if (status === 'draft' || status === 'rejected') {
      return (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" leftIcon={PencilLine} onClick={() => openEditModification(row)}>Edit</Button>
          <Button size="sm" leftIcon={Send} loading={modSubmitMutation.isPending} onClick={() => modSubmitMutation.mutate({ modificationId: row.id })}>Submit</Button>
          <Button size="sm" variant="danger" leftIcon={Trash2} loading={deleteModificationMutation.isPending} onClick={() => deleteModificationMutation.mutate(row.id)}>Delete</Button>
        </div>
      );
    }
    if (status === 'submitted') {
      return (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" leftIcon={CheckCircle2} loading={modApproveMutation.isPending} onClick={() => modApproveMutation.mutate({ modificationId: row.id })}>Approve</Button>
          <Button size="sm" variant="danger" leftIcon={XCircle} loading={modRejectMutation.isPending} onClick={() => modRejectMutation.mutate({ modificationId: row.id })}>Reject</Button>
        </div>
      );
    }
    if (status === 'approved') {
      return <Button size="sm" leftIcon={FileCheck2} loading={modApplyMutation.isPending} onClick={() => modApplyMutation.mutate({ modificationId: row.id })}>Apply</Button>;
    }
    return <span className="text-xs text-slate-500">No action</span>;
  };

  const supportingDataContent = (
    <div className="space-y-6">
      <ContentCard title="ROU assets" actions={<Button variant="outline" leftIcon={Plus} onClick={openNewAsset}>Add asset</Button>}>
        <MiniTable rows={assets} emptyLabel="No lease assets recorded." columns={[
          { key: 'asset_code', label: 'Asset code' },
          { key: 'description', label: 'Description' },
          { key: 'asset_class', label: 'Class' },
          { key: 'useful_life_months', label: 'Useful life', render: (row) => row.useful_life_months ? `${row.useful_life_months} months` : '—' },
          { key: 'rou_cost', label: 'ROU cost', render: (row) => formatMoney(numberOf(row.rou_cost), currency) },
          { key: 'is_primary', label: 'Primary', render: (row) => String(Boolean(row.is_primary)) },
          { key: 'actions', label: 'Actions', render: (row) => (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" leftIcon={PencilLine} onClick={() => openEditAsset(row)}>Edit</Button>
              <Button size="sm" variant="danger" leftIcon={Trash2} loading={deleteAssetMutation.isPending} onClick={() => deleteAssetMutation.mutate(row.id)}>Delete</Button>
            </div>
          ) },
        ]} />
      </ContentCard>
      <ContentCard title="Payments" actions={<Button variant="outline" leftIcon={Plus} onClick={openNewPayment}>Add payment</Button>}>
        <MiniTable rows={payments} emptyLabel="No lease payments recorded." columns={[
          { key: 'due_date', label: 'Due date', render: (row) => formatDate(row.due_date) },
          { key: 'amount', label: 'Amount', render: (row) => formatMoney(numberOf(row.amount), currency) },
          { key: 'payment_type', label: 'Type' },
          { key: 'is_actual', label: 'Actual', render: (row) => String(Boolean(row.is_actual)) },
          { key: 'paid_date', label: 'Paid date', render: (row) => formatDate(row.paid_date) },
          { key: 'reference', label: 'Reference' },
          { key: 'actions', label: 'Actions', render: (row) => (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" leftIcon={PencilLine} onClick={() => openEditPayment(row)}>Edit</Button>
              <Button size="sm" variant="danger" leftIcon={Trash2} loading={deletePaymentMutation.isPending} onClick={() => deletePaymentMutation.mutate(row.id)}>Delete</Button>
            </div>
          ) },
        ]} />
      </ContentCard>
      <ContentCard title="Modifications" actions={<Button variant="outline" leftIcon={Plus} onClick={openNewModification}>Create modification</Button>}>
        <MiniTable rows={modifications} emptyLabel="No lease modifications recorded." columns={[
          { key: 'effective_date', label: 'Effective date', render: (row) => formatDate(row.effective_date) },
          { key: 'status', label: 'Status', render: (row) => <Badge tone={toneForStatus(row.status)}>{row.status || 'draft'}</Badge> },
          { key: 'reason', label: 'Reason' },
          { key: 'new_term_months', label: 'New term', render: (row) => row.new_term_months ? `${row.new_term_months} months` : '—' },
          { key: 'new_payment_amount', label: 'New payment', render: (row) => row.new_payment_amount != null ? formatMoney(numberOf(row.new_payment_amount), currency) : '—' },
          { key: 'actions', label: 'Actions', render: renderModificationActions },
        ]} />
      </ContentCard>
    </div>
  );

  const activityContent = (
    <div className="space-y-6">
      <ContentCard title="Lease events">
        <MiniTable rows={events} emptyLabel="No lease events recorded." columns={[
          { key: 'created_at', label: 'When', render: (row) => formatDate(row.created_at) },
          { key: 'event_type', label: 'Event type' },
          { key: 'message', label: 'Message', render: (row) => row.message || row.notes || '—' },
        ]} />
      </ContentCard>
      <ContentCard title="Posting ledger">
        <MiniTable rows={postingLedger} emptyLabel="No posting ledger entries recorded." columns={[
          { key: 'created_at', label: 'When', render: (row) => formatDate(row.created_at) },
          { key: 'action_type', label: 'Action', render: (row) => row.action_type || row.action || '—' },
          { key: 'journal_id', label: 'Journal', render: (row) => row.entry_no || row.journal_entry_id || row.journal_id || '—' },
          { key: 'amount', label: 'Amount', render: (row) => formatMoney(numberOf(row.amount), currency) },
          { key: 'idempotency_key', label: 'Idempotency key' },
        ]} />
      </ContentCard>
    </div>
  );

  const reportsContent = (
    <div className="space-y-6">
      <ContentCard title="Report filters" subtitle="Filter IFRS 16 dashboard and disclosure figures by date, period, and lifecycle status.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Input label="As of date" type="date" value={reportFilters.as_of_date} onChange={(e) => setReportFilters((s) => ({ ...s, as_of_date: e.target.value }))} />
          <Input label="From date" type="date" value={reportFilters.from_date} onChange={(e) => setReportFilters((s) => ({ ...s, from_date: e.target.value }))} />
          <Input label="To date" type="date" value={reportFilters.to_date} onChange={(e) => setReportFilters((s) => ({ ...s, to_date: e.target.value }))} />
          <Select label="Accounting period" value={reportFilters.period_id} onChange={(e) => setReportFilters((s) => ({ ...s, period_id: e.target.value }))} options={[{ value: '', label: 'All periods' }, ...periods.map((p) => ({ value: p.id, label: p.code || p.name || p.period_name || p.id }))]} />
          <Select label="Lease status" value={reportFilters.status} onChange={(e) => setReportFilters((s) => ({ ...s, status: e.target.value }))} options={[{ value: '', label: 'All statuses' }, { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'terminated', label: 'Terminated' }, { value: 'closed', label: 'Closed' }]} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" leftIcon={RotateCcw} onClick={() => setReportFilters({ as_of_date: '', from_date: '', to_date: '', period_id: '', status: '' })}>Reset filters</Button>
          <Button leftIcon={RefreshCw} onClick={() => { dashboardQ.refetch(); disclosuresQ.refetch(); }}>Refresh reports</Button>
        </div>
      </ContentCard>
      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <StatCard label="Portfolio leases" value={numberOf(dashboard?.summary?.lease_count)} subvalue={`${numberOf(dashboard?.summary?.active_count)} active`} icon={FolderKanban} />
        <StatCard label="Portfolio liability" value={formatMoney(numberOf(dashboard?.liability?.liability_balance), currency)} subvalue={`${formatMoney(numberOf(dashboard?.liability?.current_liability), currency)} current`} icon={Landmark} />
        <StatCard label="Scheduled depreciation" value={formatMoney(numberOf(dashboard?.depreciation?.scheduled_depreciation), currency)} subvalue={`As of ${formatDate(dashboard?.as_of_date)}`} icon={BarChart3} />
        <StatCard label="Lease cash outflow" value={formatMoney(numberOf(disclosures?.expense_summary?.actual_cash_outflow), currency)} subvalue={`As of ${formatDate(disclosures?.as_of_date)}`} icon={Wallet} />
      </div>
      <ContentCard title="Disclosure rollforwards">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="text-sm font-medium text-slate-900">Liability rollforward</div>
            <DetailRow label="Opening liability" value={formatMoney(numberOf(disclosures?.liability_rollforward?.opening_liability), currency)} />
            <DetailRow label="Remeasurements" value={formatMoney(numberOf(disclosures?.liability_rollforward?.remeasurements), currency)} />
            <DetailRow label="Principal reduction" value={formatMoney(numberOf(disclosures?.liability_rollforward?.principal_reduction), currency)} />
            <DetailRow label="Closing liability" value={formatMoney(numberOf(disclosures?.liability_rollforward?.closing_liability), currency)} />
          </div>
          <div className="space-y-3">
            <div className="text-sm font-medium text-slate-900">ROU rollforward</div>
            <DetailRow label="Opening ROU cost" value={formatMoney(numberOf(disclosures?.rou_rollforward?.rou_opening_cost), currency)} />
            <DetailRow label="Additions" value={formatMoney(numberOf(disclosures?.rou_rollforward?.additions), currency)} />
            <DetailRow label="Depreciation" value={formatMoney(numberOf(disclosures?.rou_rollforward?.depreciation), currency)} />
            <DetailRow label="Remeasurement adjustments" value={formatMoney(numberOf(disclosures?.rou_rollforward?.remeasurement_adjustments), currency)} />
          </div>
        </div>
      </ContentCard>
      <ContentCard title="Maturity analysis">
        <MiniTable rows={rowsOf(disclosures?.maturity_analysis)} emptyLabel="No maturity analysis available." columns={[
          { key: 'bucket', label: 'Bucket' },
          { key: 'undiscounted_cash_flows', label: 'Undiscounted cash flows', render: (row) => formatMoney(numberOf(row.undiscounted_cash_flows), currency) },
        ]} />
      </ContentCard>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={lease.name || 'IFRS 16 Lease'}
        subtitle={<div className="flex flex-wrap items-center gap-2 text-sm text-slate-600"><span>{lease.code || 'No code'}</span>{lease.commencement_date ? <><span>·</span><span>Commencement {formatDate(lease.commencement_date)}</span></> : null}{lease.term_months ? <><span>·</span><span>{lease.term_months} months</span></> : null}</div>}
        icon={FileText}
        actions={<><Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.complianceIFRS16)}>Back to leases</Button><Button variant="outline" leftIcon={RefreshCw} onClick={() => { leaseQ.refetch(); scheduleQ.refetch(); assetsQ.refetch(); paymentsQ.refetch(); modificationsQ.refetch(); eventsQ.refetch(); postingLedgerQ.refetch(); dashboardQ.refetch(); disclosuresQ.refetch(); }}>Refresh</Button></>}
      />

      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <StatCard label="Lease status" value={<Badge tone={toneForStatus(lease.status)}>{lease.status || 'unknown'}</Badge>} subvalue="Current lifecycle state" icon={Workflow} />
        <StatCard label="Recurring payment" value={formatMoney(numberOf(lease.payment_amount), currency)} subvalue={`${numberOf(lease.payments_per_year)} payments per year`} icon={Wallet} />
        <StatCard label="Discount rate" value={`${(numberOf(lease.annual_discount_rate) * 100).toFixed(2)}%`} subvalue={lease.payment_timing === 'advance' ? 'Advance timing' : 'Arrears timing'} icon={BarChart3} />
        <StatCard label="Schedule lines" value={metrics.lines} subvalue={`${formatMoney(metrics.closing, currency)} closing liability`} icon={Activity} />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview', icon: FileText, content: overviewContent },
          { value: 'schedule', label: 'Schedule', icon: Calendar, content: scheduleContent },
          { value: 'operations', label: 'Operations', icon: ListChecks, content: operationsContent },
          { value: 'supporting', label: 'Supporting data', icon: FolderKanban, content: supportingDataContent },
          { value: 'activity', label: 'Activity', icon: History, content: activityContent },
          { value: 'reports', label: 'Reports', icon: BarChart3, content: reportsContent },
        ]}
      />

      <Modal open={statusOpen} title="Update lease status" onClose={() => setStatusOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setStatusOpen(false)}>Cancel</Button><Button loading={statusMutation.isPending} onClick={() => statusMutation.mutate()}>Save</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Status" value={statusForm.status} onChange={(e) => setStatusForm((s) => ({ ...s, status: e.target.value }))} options={[{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'terminated', label: 'Terminated' }, { value: 'closed', label: 'Closed' }]} />
          <Input label="Known periods" value={periods.length ? `${periods.length} periods available` : 'No periods loaded'} disabled />
          <Textarea label="Reason" value={statusForm.reason} onChange={(e) => setStatusForm((s) => ({ ...s, reason: e.target.value }))} rows={3} className="md:col-span-2" />
        </div>
      </Modal>

      <Modal open={scheduleOpen} title="Generate measurement schedule" onClose={() => setScheduleOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button><Button loading={scheduleMutation.isPending} onClick={() => scheduleMutation.mutate()}>Generate</Button></div>}>
        <div className="text-sm text-slate-600">This will call the backend schedule generation endpoint and refresh the schedule, snapshots, and disclosure views.</div>
      </Modal>

      <Modal open={initialOpen} title="Post initial recognition" onClose={() => setInitialOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setInitialOpen(false)}>Cancel</Button><Button loading={initialMutation.isPending} onClick={() => initialMutation.mutate()}>Post</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Entry date" type="date" value={initialForm.entry_date} onChange={(e) => setInitialForm((s) => ({ ...s, entry_date: e.target.value }))} />
          <Textarea label="Memo" value={initialForm.memo} onChange={(e) => setInitialForm((s) => ({ ...s, memo: e.target.value }))} rows={3} className="md:col-span-2" />
        </div>
      </Modal>

      <Modal open={postOpen} title="Post lease period" onClose={() => setPostOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPostOpen(false)}>Cancel</Button><Button loading={postMutation.isPending} onClick={() => postMutation.mutate()}>Post</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="From date" type="date" value={postForm.from_date} onChange={(e) => setPostForm((s) => ({ ...s, from_date: e.target.value }))} />
          <Input label="To date" type="date" value={postForm.to_date} onChange={(e) => setPostForm((s) => ({ ...s, to_date: e.target.value }))} />
          <Select label="Post depreciation" value={postForm.post_depreciation} onChange={(e) => setPostForm((s) => ({ ...s, post_depreciation: e.target.value }))} options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} />
          <Select label="Post interest and payment" value={postForm.post_interest_and_payment} onChange={(e) => setPostForm((s) => ({ ...s, post_interest_and_payment: e.target.value }))} options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} />
          <Textarea label="Memo" value={postForm.memo} onChange={(e) => setPostForm((s) => ({ ...s, memo: e.target.value }))} rows={3} className="md:col-span-2" />
        </div>
      </Modal>

      <Modal open={contractOpen} title="Update contract details" onClose={() => setContractOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setContractOpen(false)}>Cancel</Button><Button loading={contractMutation.isPending} onClick={() => contractMutation.mutate()}>Save contract</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input label="Contract reference" value={contractForm.contract_reference} onChange={(e) => setContractForm((s) => ({ ...s, contract_reference: e.target.value }))} />
          <CurrencySelect label="Currency" value={contractForm.currency_code} onChange={(e) => setContractForm((s) => ({ ...s, currency_code: e.target.value }))} />
          <Select label="Payment timing" value={contractForm.payment_timing} onChange={(e) => setContractForm((s) => ({ ...s, payment_timing: e.target.value }))} options={[{ value: 'arrears', label: 'Arrears' }, { value: 'advance', label: 'Advance' }]} />
          <Input label="Indexation" value={contractForm.indexation} onChange={(e) => setContractForm((s) => ({ ...s, indexation: e.target.value }))} />
          <Select label="Has purchase option" value={contractForm.has_purchase_option} onChange={(e) => setContractForm((s) => ({ ...s, has_purchase_option: e.target.value }))} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} />
          <Select label="Has extension option" value={contractForm.has_extension_option} onChange={(e) => setContractForm((s) => ({ ...s, has_extension_option: e.target.value }))} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} />
          <Select label="Has termination option" value={contractForm.has_termination_option} onChange={(e) => setContractForm((s) => ({ ...s, has_termination_option: e.target.value }))} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} />
          <Input label="Residual value guarantee" type="number" value={contractForm.residual_value_guarantee} onChange={(e) => setContractForm((s) => ({ ...s, residual_value_guarantee: e.target.value }))} />
          <Input label="Initial direct costs" type="number" value={contractForm.initial_direct_costs} onChange={(e) => setContractForm((s) => ({ ...s, initial_direct_costs: e.target.value }))} />
          <Input label="Lease incentives" type="number" value={contractForm.lease_incentives} onChange={(e) => setContractForm((s) => ({ ...s, lease_incentives: e.target.value }))} />
          <Input label="Restoration provision" type="number" value={contractForm.restoration_provision} onChange={(e) => setContractForm((s) => ({ ...s, restoration_provision: e.target.value }))} />
          <Input label="Prepaid lease payments" type="number" value={contractForm.prepaid_lease_payments} onChange={(e) => setContractForm((s) => ({ ...s, prepaid_lease_payments: e.target.value }))} />
          <Input label="Accrued lease payments" type="number" value={contractForm.accrued_lease_payments} onChange={(e) => setContractForm((s) => ({ ...s, accrued_lease_payments: e.target.value }))} />
          <Input label="Purchase option amount" type="number" value={contractForm.purchase_option_amount} onChange={(e) => setContractForm((s) => ({ ...s, purchase_option_amount: e.target.value }))} />
        </div>
      </Modal>

      <Modal open={assetOpen} title={editingAssetId ? "Edit ROU asset" : "Add ROU asset"} onClose={() => { setAssetOpen(false); setEditingAssetId(null); setAssetForm(emptyAssetForm); }} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setAssetOpen(false); setEditingAssetId(null); setAssetForm(emptyAssetForm); }}>Cancel</Button><Button loading={assetMutation.isPending} onClick={() => assetMutation.mutate()}>{editingAssetId ? "Save asset" : "Add asset"}</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Description" value={assetForm.description} onChange={(e) => setAssetForm((s) => ({ ...s, description: e.target.value }))} />
          <Input label="Asset code" value={assetForm.asset_code} onChange={(e) => setAssetForm((s) => ({ ...s, asset_code: e.target.value }))} />
          <Input label="Asset class" value={assetForm.asset_class} onChange={(e) => setAssetForm((s) => ({ ...s, asset_class: e.target.value }))} />
          <Input label="Useful life (months)" type="number" value={assetForm.useful_life_months} onChange={(e) => setAssetForm((s) => ({ ...s, useful_life_months: e.target.value }))} />
          <Input label="ROU cost" type="number" value={assetForm.rou_cost} onChange={(e) => setAssetForm((s) => ({ ...s, rou_cost: e.target.value }))} />
          <Select label="Primary asset" value={assetForm.is_primary} onChange={(e) => setAssetForm((s) => ({ ...s, is_primary: e.target.value }))} options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} />
        </div>
      </Modal>

      <Modal open={paymentOpen} title={editingPaymentId ? "Edit lease payment" : "Add lease payment"} onClose={() => { setPaymentOpen(false); setEditingPaymentId(null); setPaymentForm(emptyPaymentForm); }} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setPaymentOpen(false); setEditingPaymentId(null); setPaymentForm(emptyPaymentForm); }}>Cancel</Button><Button loading={paymentMutation.isPending} onClick={() => paymentMutation.mutate()}>{editingPaymentId ? "Save payment" : "Add payment"}</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Due date" type="date" value={paymentForm.due_date} onChange={(e) => setPaymentForm((s) => ({ ...s, due_date: e.target.value }))} />
          <Input label="Amount" type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((s) => ({ ...s, amount: e.target.value }))} />
          <Select label="Payment type" value={paymentForm.payment_type} onChange={(e) => setPaymentForm((s) => ({ ...s, payment_type: e.target.value }))} options={[{ value: 'fixed', label: 'Fixed' }, { value: 'variable', label: 'Variable' }, { value: 'fee', label: 'Fee' }, { value: 'incentive', label: 'Incentive' }, { value: 'restoration', label: 'Restoration' }, { value: 'other', label: 'Other' }]} />
          <Select label="Actual payment" value={paymentForm.is_actual} onChange={(e) => setPaymentForm((s) => ({ ...s, is_actual: e.target.value }))} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} />
          <Input label="Paid date" type="date" value={paymentForm.paid_date} onChange={(e) => setPaymentForm((s) => ({ ...s, paid_date: e.target.value }))} />
          <Input label="Reference" value={paymentForm.reference} onChange={(e) => setPaymentForm((s) => ({ ...s, reference: e.target.value }))} />
        </div>
      </Modal>

      <Modal open={modOpen} title={editingModificationId ? "Edit lease modification" : "Create lease modification"} onClose={() => { setModOpen(false); setEditingModificationId(null); setModForm(emptyModForm); }} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setModOpen(false); setEditingModificationId(null); setModForm(emptyModForm); }}>Cancel</Button><Button loading={modificationMutation.isPending} onClick={() => modificationMutation.mutate()}>{editingModificationId ? "Save modification" : "Create modification"}</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input label="Effective date" type="date" value={modForm.effective_date} onChange={(e) => setModForm((s) => ({ ...s, effective_date: e.target.value }))} />
          <Input label="New term (months)" type="number" value={modForm.new_term_months} onChange={(e) => setModForm((s) => ({ ...s, new_term_months: e.target.value }))} />
          <Input label="New payment amount" type="number" value={modForm.new_payment_amount} onChange={(e) => setModForm((s) => ({ ...s, new_payment_amount: e.target.value }))} />
          <Select label="New payments per year" value={modForm.new_payments_per_year} onChange={(e) => setModForm((s) => ({ ...s, new_payments_per_year: e.target.value }))} options={[{ value: '', label: 'No change' }, { value: '12', label: '12 · Monthly' }, { value: '4', label: '4 · Quarterly' }, { value: '2', label: '2 · Semi-annual' }, { value: '1', label: '1 · Annual' }]} />
          <Input label="New annual discount rate" type="number" step="0.0001" value={modForm.new_annual_discount_rate} onChange={(e) => setModForm((s) => ({ ...s, new_annual_discount_rate: e.target.value }))} />
          <Select label="New payment timing" value={modForm.new_payment_timing} onChange={(e) => setModForm((s) => ({ ...s, new_payment_timing: e.target.value }))} options={[{ value: '', label: 'No change' }, { value: 'arrears', label: 'Arrears' }, { value: 'advance', label: 'Advance' }]} />
          <Textarea label="Reason" value={modForm.reason} onChange={(e) => setModForm((s) => ({ ...s, reason: e.target.value }))} rows={3} className="md:col-span-2 xl:col-span-3" />
        </div>
      </Modal>
    </div>
  );
}
