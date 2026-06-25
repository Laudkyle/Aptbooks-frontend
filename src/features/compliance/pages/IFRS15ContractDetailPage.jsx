import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, RefreshCw, Plus, CheckCircle2, XCircle, Send, Trash2, Edit3,
  CalendarDays, FileText, PlayCircle, ListChecks, Banknote, ShieldCheck, ClipboardCheck
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

function rowsOf(data, keys = ['items', 'data', 'rows', 'lines', 'costs', 'events', 'modifications']) {
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  return [];
}
function n(value) { const x = Number(value); return Number.isFinite(x) ? x : 0; }
function tone(status) {
  const s = String(status || '').toLowerCase();
  if (['active','approved','completed','posted','applied','reviewed'].includes(s)) return 'success';
  if (['draft','submitted','pending','pending_approval','scheduled'].includes(s)) return 'warning';
  if (['cancelled','rejected','voided','deleted'].includes(s)) return 'danger';
  return 'muted';
}
function approvalState(core) {
  const raw = core.workflow_status || core.approval_status;
  if (raw) return String(raw).toLowerCase();
  if (core.workflow_document_id && core.approved_at) return 'approved';
  if (core.workflow_document_id && core.submitted_at) return 'submitted';
  return 'missing';
}
function canEditStatus(status) { return ['draft', 'cancelled'].includes(String(status || '').toLowerCase()); }

const defaultContractForm = (core = {}) => ({
  code: core.code || '',
  contract_date: core.contract_date ? String(core.contract_date).slice(0, 10) : '',
  start_date: core.start_date ? String(core.start_date).slice(0, 10) : '',
  end_date: core.end_date ? String(core.end_date).slice(0, 10) : '',
  currency_code: core.currency_code || 'GHS',
  transaction_price: core.transaction_price ?? core.base_transaction_price ?? '',
  billing_policy: core.billing_policy || 'UPFRONT',
  billing_account_id: core.billing_account_id || '',
});
const emptyObligation = () => ({ description: '', obligation_type: 'OVER_TIME', satisfaction_method: 'TIME', standalone_selling_price: '', start_date: '', end_date: '', satisfaction_date: '' });
const emptyCost = () => ({ cost_type: 'ACQUISITION', description: '', amount: '', asset_account_id: '', amort_expense_account_id: '', amort_start_date: '', amort_end_date: '' });
const emptyModification = () => ({ modification_date: '', modification_type: 'PRICE_CHANGE', new_base_transaction_price: '', adds_distinct_goods_services: false, price_increase_commensurate_with_ssp: false, remaining_goods_services_distinct: false, notes: '' });
const emptyVariable = () => ({ effective_date: '', method: 'EXPECTED_VALUE', estimate_amount: '', highly_probable_no_reversal: false, constraint_basis: '', rationale: '' });

export default function IFRS15ContractDetailPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeIfrs15Api(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [tab, setTab] = useState('overview');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [contractForm, setContractForm] = useState(defaultContractForm());
  const [obligationForm, setObligationForm] = useState(emptyObligation());
  const [costForm, setCostForm] = useState(emptyCost());
  const [modificationForm, setModificationForm] = useState(emptyModification());
  const [variableForm, setVariableForm] = useState(emptyVariable());
  const [scheduleForm, setScheduleForm] = useState({ replace: true });
  const [postRevenueForm, setPostRevenueForm] = useState({ period_id: '', entry_date: '', memo: '' });
  const [financingForm, setFinancingForm] = useState({ annual_rate: '', effective_from: '', effective_to: '' });
  const [commentForm, setCommentForm] = useState({ comment: '', notes: '' });
  const [lifecycleForm, setLifecycleForm] = useState({ action: 'complete', entry_date: '', memo: '' });
  const [reportState, setReportState] = useState({ period_id: '', as_of_period_id: '', as_of_date: '', dimension: 'CUSTOMER' });

  const contractQ = useQuery({ queryKey: ['ifrs15','contract',contractId], queryFn: () => api.getContract(contractId), enabled: !!contractId });
  const scheduleQ = useQuery({ queryKey: ['ifrs15','contract',contractId,'schedule'], queryFn: () => api.getSchedule(contractId), enabled: !!contractId });
  const costsQ = useQuery({ queryKey: ['ifrs15','contract',contractId,'costs'], queryFn: () => api.listCosts(contractId), enabled: !!contractId });
  const modificationsQ = useQuery({ queryKey: ['ifrs15','contract',contractId,'modifications'], queryFn: () => api.listModifications(contractId), enabled: !!contractId });
  const variableQ = useQuery({ queryKey: ['ifrs15','contract',contractId,'variable'], queryFn: () => api.listVariableConsideration(contractId), enabled: !!contractId });
  const financingQ = useQuery({ queryKey: ['ifrs15','contract',contractId,'financing'], queryFn: () => api.listFinancingTerms(contractId), enabled: !!contractId });
  const ledgerQ = useQuery({ queryKey: ['ifrs15','contract',contractId,'ledger'], queryFn: () => api.getPostingLedger(contractId), enabled: !!contractId });
  const eventsQ = useQuery({ queryKey: ['ifrs15','contract',contractId,'events'], queryFn: () => api.getEvents(contractId), enabled: !!contractId });
  const periodsQ = useQuery({ queryKey: ['ifrs15','periods'], queryFn: () => periodsApi.list({ limit: 500, offset: 0 }), staleTime: 60_000 });

  const core = useMemo(() => {
    const data = contractQ.data || {};
    return data.contract && typeof data.contract === 'object' ? { ...data.contract, ...data } : data;
  }, [contractQ.data]);
  const obligations = useMemo(() => rowsOf(contractQ.data?.obligations || contractQ.data?.performance_obligations || core.obligations || core.performance_obligations, ['items','data']), [contractQ.data, core]);
  const scheduleLines = useMemo(() => rowsOf(scheduleQ.data, ['lines','items','data']), [scheduleQ.data]);
  const costs = useMemo(() => rowsOf(costsQ.data, ['costs','items','data']), [costsQ.data]);
  const modifications = useMemo(() => rowsOf(modificationsQ.data), [modificationsQ.data]);
  const variables = useMemo(() => rowsOf(variableQ.data), [variableQ.data]);
  const financingTerms = useMemo(() => rowsOf(financingQ.data), [financingQ.data]);
  const ledgerRows = useMemo(() => rowsOf(ledgerQ.data), [ledgerQ.data]);
  const eventRows = useMemo(() => rowsOf(eventsQ.data), [eventsQ.data]);
  const periods = useMemo(() => rowsOf(periodsQ.data), [periodsQ.data]);

  React.useEffect(() => {
    if (!postRevenueForm.period_id && periods[0]?.id) {
      setPostRevenueForm((s) => ({ ...s, period_id: periods[0].id }));
      setReportState((s) => ({ ...s, period_id: periods[0].id, as_of_period_id: periods[0].id }));
    }
  }, [periods, postRevenueForm.period_id]);

  const currency = core.currency_code || 'GHS';
  const status = String(core.status || 'draft').toLowerCase();
  const approval = approvalState(core);
  const hasObligations = obligations.length > 0;
  const hasSchedule = scheduleLines.length > 0;
  const hasUnpostedSchedule = scheduleLines.some((line) => String(line.status || 'scheduled').toLowerCase() !== 'posted');

  const invalidateAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['ifrs15','contract',contractId] }),
      qc.invalidateQueries({ queryKey: ['ifrs15','contract',contractId,'schedule'] }),
      qc.invalidateQueries({ queryKey: ['ifrs15','contract',contractId,'costs'] }),
      qc.invalidateQueries({ queryKey: ['ifrs15','contract',contractId,'modifications'] }),
      qc.invalidateQueries({ queryKey: ['ifrs15','contract',contractId,'variable'] }),
      qc.invalidateQueries({ queryKey: ['ifrs15','contract',contractId,'financing'] }),
      qc.invalidateQueries({ queryKey: ['ifrs15','contract',contractId,'ledger'] }),
      qc.invalidateQueries({ queryKey: ['ifrs15','contract',contractId,'events'] }),
      qc.invalidateQueries({ queryKey: ['ifrs15','contracts'] }),
    ]);
  };
  const ok = (msg) => async () => { toast.success(msg); setModal(null); setEditing(null); await invalidateAll(); };
  const fail = (msg) => (e) => toast.error(e?.response?.data?.message ?? msg);

  const updateContract = useMutation({ mutationFn: () => api.updateContract(contractId, { ...contractForm, transaction_price: contractForm.transaction_price || '0', billing_account_id: contractForm.billing_account_id || undefined, start_date: contractForm.start_date || undefined, end_date: contractForm.end_date || undefined }), onSuccess: ok('Contract updated'), onError: fail('Failed to update contract') });
  const deleteContract = useMutation({ mutationFn: () => api.deleteContract(contractId), onSuccess: async () => { toast.success('Contract deleted/voided'); navigate('/compliance/ifrs15'); }, onError: fail('Failed to delete contract') });
  const addObligation = useMutation({ mutationFn: () => editing?.type === 'obligation' ? api.updateObligation(contractId, editing.id, cleanObligation()) : api.addObligation(contractId, cleanObligation()), onSuccess: ok(editing ? 'Obligation updated' : 'Obligation added'), onError: fail('Failed to save obligation') });
  const deleteObligation = useMutation({ mutationFn: (id) => api.deleteObligation(contractId, id), onSuccess: ok('Obligation deleted'), onError: fail('Failed to delete obligation') });
  const submit = useMutation({ mutationFn: () => api.submitForApproval(contractId), onSuccess: ok('Contract submitted'), onError: fail('Submit failed') });
  const approve = useMutation({ mutationFn: () => api.approveContract(contractId, { comment: commentForm.comment || undefined }), onSuccess: ok('Contract approved'), onError: fail('Approve failed') });
  const reject = useMutation({ mutationFn: () => api.rejectContract(contractId, { comment: commentForm.comment || undefined }), onSuccess: ok('Contract rejected'), onError: fail('Reject failed') });
  const activate = useMutation({ mutationFn: () => api.activateContract(contractId, { entry_date: postRevenueForm.entry_date || undefined, memo: postRevenueForm.memo || undefined }), onSuccess: ok('Contract activated'), onError: fail('Activation failed') });
  const generateSchedule = useMutation({ mutationFn: () => api.generateSchedule(contractId, { replace: !!scheduleForm.replace }), onSuccess: ok('Revenue schedule generated'), onError: fail('Schedule generation failed') });
  const postRevenue = useMutation({ mutationFn: () => api.postRevenue(contractId, { ...postRevenueForm, entry_date: postRevenueForm.entry_date || undefined, memo: postRevenueForm.memo || undefined }), onSuccess: ok('Revenue posted'), onError: fail('Revenue posting failed') });
  const lifecycle = useMutation({ mutationFn: () => api.updateLifecycle(contractId, { ...lifecycleForm, entry_date: lifecycleForm.entry_date || undefined, memo: lifecycleForm.memo || undefined }), onSuccess: ok('Lifecycle updated'), onError: fail('Lifecycle update failed') });
  const costMut = useMutation({ mutationFn: () => editing?.type === 'cost' ? api.updateCost(contractId, editing.id, cleanCost()) : api.createCost(contractId, cleanCost()), onSuccess: ok(editing ? 'Cost updated' : 'Cost added'), onError: fail('Failed to save cost') });
  const deleteCost = useMutation({ mutationFn: (id) => api.deleteCost(contractId, id), onSuccess: ok('Cost deleted'), onError: fail('Failed to delete cost') });
  const genCostSchedule = useMutation({ mutationFn: (id) => api.generateCostSchedule(contractId, id, { replace: true }), onSuccess: ok('Cost schedule generated'), onError: fail('Failed to generate cost schedule') });
  const postCost = useMutation({ mutationFn: (id) => api.postCost(contractId, id, { period_id: postRevenueForm.period_id }), onSuccess: ok('Cost amortisation posted'), onError: fail('Failed to post amortisation') });
  const modMut = useMutation({ mutationFn: () => editing?.type === 'modification' ? api.updateModification(contractId, editing.id, cleanModification()) : api.createModification(contractId, cleanModification()), onSuccess: ok(editing ? 'Modification updated' : 'Modification created'), onError: fail('Failed to save modification') });
  const deleteMod = useMutation({ mutationFn: (id) => api.deleteModification(contractId, id), onSuccess: ok('Modification deleted'), onError: fail('Failed to delete modification') });
  const submitMod = useMutation({ mutationFn: (id) => api.submitModification(contractId, id), onSuccess: ok('Modification submitted'), onError: fail('Submit failed') });
  const approveMod = useMutation({ mutationFn: (id) => api.approveModification(contractId, id, { notes: commentForm.notes || undefined }), onSuccess: ok('Modification approved'), onError: fail('Approve failed') });
  const rejectMod = useMutation({ mutationFn: (id) => api.rejectModification(contractId, id, { notes: commentForm.notes || undefined }), onSuccess: ok('Modification rejected'), onError: fail('Reject failed') });
  const applyMod = useMutation({ mutationFn: (id) => api.applyModification(contractId, id, {}), onSuccess: ok('Modification applied'), onError: fail('Apply failed') });
  const variableMut = useMutation({ mutationFn: () => editing?.type === 'variable' ? api.updateVariableConsideration(contractId, editing.id, cleanVariable()) : api.createVariableConsideration(contractId, cleanVariable()), onSuccess: ok(editing ? 'Variable consideration updated' : 'Variable consideration added'), onError: fail('Failed to save variable consideration') });
  const deleteVariable = useMutation({ mutationFn: (id) => api.deleteVariableConsideration(contractId, id), onSuccess: ok('Variable consideration deleted'), onError: fail('Delete failed') });
  const reviewVariable = useMutation({ mutationFn: (id) => api.reviewVariableConsideration(contractId, id, { notes: commentForm.notes || undefined }), onSuccess: ok('Variable consideration reviewed'), onError: fail('Review failed') });
  const approveVariable = useMutation({ mutationFn: (item) => api.approveVariableConsideration(contractId, item.id, { include_in_transaction_price: true, included_amount: String(item.estimate_amount ?? '0'), notes: commentForm.notes || undefined }), onSuccess: ok('Variable consideration approved'), onError: fail('Approve failed') });
  const applyVariable = useMutation({ mutationFn: () => api.applyVariableConsideration(contractId, {}), onSuccess: ok('Variable consideration applied'), onError: fail('Apply failed') });
  const saveFinancing = useMutation({ mutationFn: () => api.setFinancingTerms(contractId, { annual_rate: financingForm.annual_rate || '0', effective_from: financingForm.effective_from, effective_to: financingForm.effective_to || undefined }), onSuccess: ok('Financing terms saved'), onError: fail('Failed to save financing terms') });
  const postFinancing = useMutation({ mutationFn: () => api.postFinancing(contractId, { period_id: postRevenueForm.period_id }), onSuccess: ok('Financing posted'), onError: fail('Failed to post financing') });

  function cleanObligation() { return { ...obligationForm, standalone_selling_price: obligationForm.standalone_selling_price || '0', start_date: obligationForm.start_date || undefined, end_date: obligationForm.end_date || undefined, satisfaction_date: obligationForm.satisfaction_date || undefined }; }
  function cleanCost() { return { ...costForm, amount: costForm.amount || '0', asset_account_id: costForm.asset_account_id || undefined, amort_expense_account_id: costForm.amort_expense_account_id || undefined }; }
  function cleanModification() { return { ...modificationForm, new_base_transaction_price: modificationForm.new_base_transaction_price === '' ? undefined : modificationForm.new_base_transaction_price }; }
  function cleanVariable() { return { ...variableForm, estimate_amount: variableForm.estimate_amount || '0' }; }
  function openEditContract() { setContractForm(defaultContractForm(core)); setModal('contract'); }
  function openObligation(item) { setEditing(item ? { type:'obligation', id:item.id } : null); setObligationForm(item ? { ...emptyObligation(), ...item, standalone_selling_price: item.standalone_selling_price ?? '', start_date: item.start_date ? String(item.start_date).slice(0,10) : '', end_date: item.end_date ? String(item.end_date).slice(0,10) : '', satisfaction_date: item.satisfaction_date ? String(item.satisfaction_date).slice(0,10) : '' } : emptyObligation()); setModal('obligation'); }
  function openCost(item) { setEditing(item ? { type:'cost', id:item.id } : null); setCostForm(item ? { ...emptyCost(), ...item, amount: item.amount ?? '', amort_start_date: item.amort_start_date ? String(item.amort_start_date).slice(0,10) : '', amort_end_date: item.amort_end_date ? String(item.amort_end_date).slice(0,10) : '' } : emptyCost()); setModal('cost'); }
  function openModification(item) { setEditing(item ? { type:'modification', id:item.id } : null); setModificationForm(item ? { ...emptyModification(), ...item, modification_date: item.modification_date ? String(item.modification_date).slice(0,10) : '', new_base_transaction_price: item.new_base_transaction_price ?? '' } : emptyModification()); setModal('modification'); }
  function openVariable(item) { setEditing(item ? { type:'variable', id:item.id } : null); setVariableForm(item ? { ...emptyVariable(), ...item, effective_date: item.effective_date ? String(item.effective_date).slice(0,10) : '', estimate_amount: item.estimate_amount ?? '' } : emptyVariable()); setModal('variable'); }

  const primaryActions = (() => {
    if (status === 'draft' && approval === 'missing') return [<Button key="submit" leftIcon={Send} onClick={() => submit.mutate()} disabled={!hasObligations || submit.isPending}>Submit</Button>, <Button key="delete" variant="danger" leftIcon={Trash2} onClick={() => window.confirm('Delete/void this draft contract?') && deleteContract.mutate()}>Delete</Button>];
    if (status === 'draft' && ['pending','submitted','pending_approval'].includes(approval)) return [<Button key="approve" leftIcon={CheckCircle2} onClick={() => approve.mutate()}>Approve</Button>, <Button key="reject" variant="danger" leftIcon={XCircle} onClick={() => reject.mutate()}>Reject</Button>];
    if (status === 'draft' && approval === 'approved') return [<Button key="activate" leftIcon={PlayCircle} onClick={() => activate.mutate()}>Activate</Button>];
    if (status === 'active' && !hasSchedule) return [<Button key="schedule" leftIcon={CalendarDays} onClick={() => setModal('schedule')}>Generate schedule</Button>];
    if (status === 'active' && hasUnpostedSchedule) return [<Button key="post" leftIcon={Banknote} onClick={() => setModal('postRevenue')}>Post revenue</Button>];
    if (status === 'active') return [<Button key="complete" leftIcon={CheckCircle2} onClick={() => { setLifecycleForm((s)=>({...s, action:'complete'})); setModal('lifecycle'); }}>Complete</Button>];
    return [];
  })();

  const tabItems = [
    { value:'overview', label:'Overview' }, { value:'obligations', label:'Obligations' }, { value:'schedule', label:'Schedule' }, { value:'modifications', label:'Modifications' }, { value:'variable', label:'Variable consideration' }, { value:'financing', label:'Financing' }, { value:'costs', label:'Costs' }, { value:'ledger', label:'Ledger' }, { value:'reports', label:'Reports' }, { value:'events', label:'Events' },
  ];

  const periodOptions = [{ value:'', label:'Select period' }, ...periods.map((p) => ({ value:p.id, label:p.code || p.name || `${formatDate(p.start_date)} - ${formatDate(p.end_date)}` }))];
  const rollforwardQ = useQuery({ queryKey:['ifrs15','report','rollforward',reportState.period_id], queryFn:() => api.getContractRollforwardReport({ period_id: reportState.period_id }), enabled: tab === 'reports' && !!reportState.period_id });
  const rpoQ = useQuery({ queryKey:['ifrs15','report','rpo',reportState.as_of_period_id], queryFn:() => api.getRpoReport({ as_of_period_id: reportState.as_of_period_id }), enabled: tab === 'reports' && !!reportState.as_of_period_id });
  const disaggQ = useQuery({ queryKey:['ifrs15','report','disagg',reportState.period_id,reportState.dimension], queryFn:() => api.getRevenueDisaggregationReport({ period_id: reportState.period_id, dimension: reportState.dimension }), enabled: tab === 'reports' && !!reportState.period_id });
  const judgementQ = useQuery({ queryKey:['ifrs15','report','judgements',reportState.as_of_date], queryFn:() => api.getJudgementsReport({ as_of_date: reportState.as_of_date }), enabled: tab === 'reports' && !!reportState.as_of_date });

  if (contractQ.isLoading) return <div className="p-6 text-sm text-slate-500">Loading IFRS 15 contract...</div>;
  if (contractQ.isError) return <div className="p-6 text-sm text-red-600">{contractQ.error?.response?.data?.message || 'Failed to load contract'}</div>;

  return <div className="space-y-6">
    <PageHeader
      title={core.code || 'IFRS 15 contract'}
      subtitle={`${core.customer_name || core.business_partner_name || 'Customer'} • ${formatDate(core.contract_date)} • ${formatMoney(n(core.transaction_price ?? core.base_transaction_price), currency)}`}
      icon={FileText}
      actions={<><Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(-1)}>Back</Button><Button variant="outline" leftIcon={RefreshCw} onClick={invalidateAll}>Refresh</Button>{canEditStatus(status) && <Button variant="outline" leftIcon={Edit3} onClick={openEditContract}>Edit</Button>}{primaryActions}</>}
    />

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <ContentCard><div className="text-sm text-slate-500">Lifecycle status</div><div className="mt-2"><Badge tone={tone(status)} size="lg">{status}</Badge></div></ContentCard>
      <ContentCard><div className="text-sm text-slate-500">Approval status</div><div className="mt-2"><Badge tone={tone(approval)} size="lg">{approval}</Badge></div></ContentCard>
      <ContentCard><div className="text-sm text-slate-500">Transaction price</div><div className="mt-2 text-2xl font-semibold">{formatMoney(n(core.transaction_price ?? core.base_transaction_price), currency)}</div></ContentCard>
      <ContentCard><div className="text-sm text-slate-500">Recognised revenue</div><div className="mt-2 text-2xl font-semibold">{formatMoney(n(core.recognized_revenue ?? core.recognised_revenue), currency)}</div></ContentCard>
    </div>

    <ContentCard><Tabs tabs={tabItems} value={tab} onChange={setTab} /></ContentCard>

    {tab === 'overview' && <div className="grid gap-4 lg:grid-cols-2">
      <ContentCard title="Next available action" actions={primaryActions.length ? <Badge tone="warning">Action required</Badge> : <Badge tone="success">No immediate action</Badge>}>
        <div className="space-y-3 text-sm text-slate-700"><p>Only valid next actions are shown in the page header. This prevents users from approving, activating, posting, or completing a contract too early.</p><p>Add performance obligations before submission. After approval, activate the contract, generate the schedule, then post revenue by period.</p></div>
      </ContentCard>
      <ContentCard title="Contract summary"><dl className="grid gap-3 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Customer</dt><dd>{core.customer_name || core.business_partner_name || '—'}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Billing policy</dt><dd>{core.billing_policy || '—'}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Contract date</dt><dd>{formatDate(core.contract_date)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Period</dt><dd>{formatDate(core.start_date)} {core.end_date ? `to ${formatDate(core.end_date)}` : ''}</dd></div></dl></ContentCard>
    </div>}

    {tab === 'obligations' && <ContentCard title="Performance obligations" actions={status === 'draft' ? <Button size="sm" leftIcon={Plus} onClick={() => openObligation(null)}>Add obligation</Button> : null}>{obligations.length === 0 ? <div className="text-sm text-slate-500">No obligations recorded.</div> : <SimpleTable rows={obligations} columns={[['Description', r=>r.description], ['Type', r=>r.obligation_type], ['Method', r=>r.satisfaction_method], ['SSP', r=>formatMoney(n(r.standalone_selling_price), currency)], ['Timing', r=>r.satisfaction_date ? formatDate(r.satisfaction_date) : `${formatDate(r.start_date)} ${r.end_date ? `to ${formatDate(r.end_date)}` : ''}`]]} actions={(r) => status === 'draft' ? <><Button size="sm" variant="outline" leftIcon={Edit3} onClick={() => openObligation(r)}>Edit</Button><Button size="sm" variant="danger" leftIcon={Trash2} onClick={() => window.confirm('Delete this obligation?') && deleteObligation.mutate(r.id)}>Delete</Button></> : null} />}</ContentCard>}

    {tab === 'schedule' && <ContentCard title="Revenue schedule" actions={<><Button size="sm" variant="outline" leftIcon={RefreshCw} onClick={() => scheduleQ.refetch()}>Refresh</Button>{status === 'active' && !hasSchedule && <Button size="sm" leftIcon={CalendarDays} onClick={() => setModal('schedule')}>Generate</Button>}{status === 'active' && hasUnpostedSchedule && <Button size="sm" leftIcon={Banknote} onClick={() => setModal('postRevenue')}>Post revenue</Button>}</>}>{scheduleLines.length === 0 ? <div className="text-sm text-slate-500">No schedule lines yet.</div> : <SimpleTable rows={scheduleLines} columns={[['Recognition date', r=>formatDate(r.recognition_date)], ['Period', r=>r.period_code || r.period_id], ['Amount', r=>formatMoney(n(r.amount), currency)], ['Status', r=><Badge tone={tone(r.status)}>{r.status || 'scheduled'}</Badge>]]} />}</ContentCard>}

    {tab === 'modifications' && <ContentCard title="Contract modifications" actions={status === 'active' ? <Button size="sm" leftIcon={Plus} onClick={() => openModification(null)}>New modification</Button> : null}>{modifications.length === 0 ? <div className="text-sm text-slate-500">No modifications.</div> : <div className="space-y-3">{modifications.map((m) => <div key={m.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="font-medium">{m.modification_type}</div><div className="text-sm text-slate-500">{formatDate(m.modification_date)} • {formatMoney(n(m.new_base_transaction_price), currency)}</div></div><Badge tone={tone(m.status)}>{m.status || 'draft'}</Badge></div><ActionRow>{modificationActions(m)}</ActionRow></div>)}</div>}</ContentCard>}

    {tab === 'variable' && <ContentCard title="Variable consideration" actions={<><Button size="sm" leftIcon={Plus} onClick={() => openVariable(null)}>Add entry</Button><Button size="sm" variant="outline" leftIcon={ClipboardCheck} onClick={() => applyVariable.mutate()} disabled={applyVariable.isPending}>Apply approved</Button></>}>{variables.length === 0 ? <div className="text-sm text-slate-500">No variable consideration entries.</div> : <div className="space-y-3">{variables.map((v) => <div key={v.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="font-medium">{v.method} • {formatMoney(n(v.estimate_amount), currency)}</div><div className="text-sm text-slate-500">Effective {formatDate(v.effective_date)}</div></div><Badge tone={tone(v.status)}>{v.status || 'draft'}</Badge></div><ActionRow>{variableActions(v)}</ActionRow></div>)}</div>}</ContentCard>}

    {tab === 'financing' && <ContentCard title="Significant financing component" actions={<><Button size="sm" leftIcon={Plus} onClick={() => setModal('financing')}>Set terms</Button><Button size="sm" variant="outline" leftIcon={Banknote} onClick={() => postFinancing.mutate()} disabled={!postRevenueForm.period_id}>Post financing</Button></>}>{financingTerms.length === 0 ? <div className="text-sm text-slate-500">No financing terms.</div> : <SimpleTable rows={financingTerms} columns={[['Annual rate', r=>r.annual_rate], ['Effective from', r=>formatDate(r.effective_from)], ['Effective to', r=>formatDate(r.effective_to)], ['Status', r=><Badge tone={tone(r.status)}>{r.status || 'active'}</Badge>]]} />}</ContentCard>}

    {tab === 'costs' && <ContentCard title="Capitalised contract costs" actions={<Button size="sm" leftIcon={Plus} onClick={() => openCost(null)}>Add cost</Button>}>{costs.length === 0 ? <div className="text-sm text-slate-500">No costs.</div> : <div className="space-y-3">{costs.map((c) => <div key={c.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="font-medium">{c.cost_type} • {formatMoney(n(c.amount), currency)}</div><div className="text-sm text-slate-500">{formatDate(c.amort_start_date)} to {formatDate(c.amort_end_date)}</div></div><Badge tone={tone(c.status)}>{c.status || 'active'}</Badge></div><ActionRow><Button size="sm" variant="outline" leftIcon={Edit3} onClick={() => openCost(c)}>Edit</Button><Button size="sm" variant="outline" leftIcon={CalendarDays} onClick={() => genCostSchedule.mutate(c.id)}>Generate schedule</Button><Button size="sm" leftIcon={Banknote} onClick={() => postCost.mutate(c.id)} disabled={!postRevenueForm.period_id}>Post amortisation</Button><Button size="sm" variant="danger" leftIcon={Trash2} onClick={() => window.confirm('Delete this cost?') && deleteCost.mutate(c.id)}>Delete</Button></ActionRow></div>)}</div>}</ContentCard>}

    {tab === 'ledger' && <ContentCard title="Posting ledger">{ledgerRows.length === 0 ? <div className="text-sm text-slate-500">No ledger rows.</div> : <SimpleTable rows={ledgerRows} columns={[['Date', r=>formatDate(r.entry_date || r.created_at)], ['Type', r=>r.posting_type || r.type], ['Amount', r=>formatMoney(n(r.amount), currency)], ['Journal', r=>r.journal_entry_id || '—'], ['Status', r=><Badge tone={tone(r.status)}>{r.status || 'posted'}</Badge>]]} />}</ContentCard>}

    {tab === 'reports' && <ContentCard title="IFRS 15 reports"><div className="grid gap-4 md:grid-cols-4"><Select label="Period" value={reportState.period_id} onChange={(e)=>setReportState(s=>({...s, period_id:e.target.value}))} options={periodOptions}/><Select label="As-of period" value={reportState.as_of_period_id} onChange={(e)=>setReportState(s=>({...s, as_of_period_id:e.target.value}))} options={periodOptions}/><Input label="As-of date" type="date" value={reportState.as_of_date} onChange={(e)=>setReportState(s=>({...s, as_of_date:e.target.value}))}/><Select label="Disaggregation dimension" value={reportState.dimension} onChange={(e)=>setReportState(s=>({...s, dimension:e.target.value}))} options={[{value:'CUSTOMER', label:'Customer'}, {value:'CONTRACT', label:'Contract'}, {value:'OBLIGATION_TYPE', label:'Obligation type'}, {value:'SATISFACTION_METHOD', label:'Satisfaction method'}]}/></div><div className="mt-6 grid gap-4 lg:grid-cols-2"><ReportBlock title="Contract rollforward" data={rollforwardQ.data}/><ReportBlock title="Remaining performance obligations" data={rpoQ.data}/><ReportBlock title="Revenue disaggregation" data={disaggQ.data}/><ReportBlock title="Judgements" data={judgementQ.data}/></div></ContentCard>}

    {tab === 'events' && <ContentCard title="Events">{eventRows.length === 0 ? <div className="text-sm text-slate-500">No events.</div> : <SimpleTable rows={eventRows} columns={[['Date', r=>formatDate(r.created_at || r.event_date)], ['Type', r=>r.event_type || r.type], ['Description', r=>r.description || r.message || '—']]} />}</ContentCard>}

    {modal === 'contract' && <Modal open title="Edit contract" onClose={() => setModal(null)} footer={<Footer onCancel={()=>setModal(null)} onSave={()=>updateContract.mutate()} loading={updateContract.isPending} label="Save contract"/>}><div className="grid gap-4 md:grid-cols-2"><Input label="Code" value={contractForm.code} onChange={(e)=>setContractForm(s=>({...s, code:e.target.value}))}/><Input label="Contract date" type="date" value={contractForm.contract_date} onChange={(e)=>setContractForm(s=>({...s, contract_date:e.target.value}))}/><Input label="Start date" type="date" value={contractForm.start_date} onChange={(e)=>setContractForm(s=>({...s, start_date:e.target.value}))}/><Input label="End date" type="date" value={contractForm.end_date} onChange={(e)=>setContractForm(s=>({...s, end_date:e.target.value}))}/><Input label="Transaction price" value={contractForm.transaction_price} onChange={(e)=>setContractForm(s=>({...s, transaction_price:e.target.value}))}/><Select label="Billing policy" value={contractForm.billing_policy} onChange={(e)=>setContractForm(s=>({...s, billing_policy:e.target.value}))} options={[{value:'UPFRONT', label:'Upfront'}, {value:'AS_RECOGNIZED', label:'As recognized'}, {value:'NONE', label:'None'}]}/><AccountSelect label="Billing account" value={contractForm.billing_account_id} onChange={(e)=>setContractForm(s=>({...s, billing_account_id:e.target.value}))} allowEmpty className="md:col-span-2"/></div></Modal>}
    {modal === 'obligation' && <Modal open title={editing ? 'Edit obligation' : 'Add obligation'} onClose={()=>setModal(null)} footer={<Footer onCancel={()=>setModal(null)} onSave={()=>addObligation.mutate()} loading={addObligation.isPending} label="Save obligation"/>}><ObligationForm form={obligationForm} setForm={setObligationForm}/></Modal>}
    {modal === 'schedule' && <Modal open title="Generate schedule" onClose={()=>setModal(null)} footer={<Footer onCancel={()=>setModal(null)} onSave={()=>generateSchedule.mutate()} loading={generateSchedule.isPending} label="Generate"/>}><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!scheduleForm.replace} onChange={(e)=>setScheduleForm({ replace:e.target.checked })}/> Replace existing unposted schedule lines</label></Modal>}
    {modal === 'postRevenue' && <Modal open title="Post revenue" onClose={()=>setModal(null)} footer={<Footer onCancel={()=>setModal(null)} onSave={()=>postRevenue.mutate()} loading={postRevenue.isPending} label="Post revenue"/>}><div className="grid gap-4 md:grid-cols-2"><Select label="Accounting period" value={postRevenueForm.period_id} onChange={(e)=>setPostRevenueForm(s=>({...s, period_id:e.target.value}))} options={periodOptions}/><Input label="Entry date" type="date" value={postRevenueForm.entry_date} onChange={(e)=>setPostRevenueForm(s=>({...s, entry_date:e.target.value}))}/><Textarea label="Memo" value={postRevenueForm.memo} onChange={(e)=>setPostRevenueForm(s=>({...s, memo:e.target.value}))} className="md:col-span-2"/></div></Modal>}
    {modal === 'lifecycle' && <Modal open title="Lifecycle update" onClose={()=>setModal(null)} footer={<Footer onCancel={()=>setModal(null)} onSave={()=>lifecycle.mutate()} loading={lifecycle.isPending} label="Update lifecycle"/>}><div className="grid gap-4"><Select label="Action" value={lifecycleForm.action} onChange={(e)=>setLifecycleForm(s=>({...s, action:e.target.value}))} options={[{value:'complete', label:'Complete'}, {value:'cancel', label:'Cancel'}]}/><Input label="Entry date" type="date" value={lifecycleForm.entry_date} onChange={(e)=>setLifecycleForm(s=>({...s, entry_date:e.target.value}))}/><Textarea label="Memo" value={lifecycleForm.memo} onChange={(e)=>setLifecycleForm(s=>({...s, memo:e.target.value}))}/></div></Modal>}
    {modal === 'cost' && <Modal open title={editing ? 'Edit cost' : 'Add cost'} onClose={()=>setModal(null)} footer={<Footer onCancel={()=>setModal(null)} onSave={()=>costMut.mutate()} loading={costMut.isPending} label="Save cost"/>}><CostForm form={costForm} setForm={setCostForm}/></Modal>}
    {modal === 'modification' && <Modal open title={editing ? 'Edit modification' : 'New modification'} onClose={()=>setModal(null)} footer={<Footer onCancel={()=>setModal(null)} onSave={()=>modMut.mutate()} loading={modMut.isPending} label="Save modification"/>}><ModificationForm form={modificationForm} setForm={setModificationForm}/></Modal>}
    {modal === 'variable' && <Modal open title={editing ? 'Edit variable consideration' : 'Add variable consideration'} onClose={()=>setModal(null)} footer={<Footer onCancel={()=>setModal(null)} onSave={()=>variableMut.mutate()} loading={variableMut.isPending} label="Save entry"/>}><VariableForm form={variableForm} setForm={setVariableForm}/></Modal>}
    {modal === 'financing' && <Modal open title="Set financing terms" onClose={()=>setModal(null)} footer={<Footer onCancel={()=>setModal(null)} onSave={()=>saveFinancing.mutate()} loading={saveFinancing.isPending} label="Save terms"/>}><div className="grid gap-4 md:grid-cols-3"><Input label="Annual rate" value={financingForm.annual_rate} onChange={(e)=>setFinancingForm(s=>({...s, annual_rate:e.target.value}))}/><Input label="Effective from" type="date" value={financingForm.effective_from} onChange={(e)=>setFinancingForm(s=>({...s, effective_from:e.target.value}))}/><Input label="Effective to" type="date" value={financingForm.effective_to} onChange={(e)=>setFinancingForm(s=>({...s, effective_to:e.target.value}))}/></div></Modal>}
  </div>;

  function modificationActions(m) { const s=String(m.status || 'draft').toLowerCase(); if (['draft','rejected'].includes(s)) return <><Button size="sm" variant="outline" leftIcon={Edit3} onClick={()=>openModification(m)}>Edit</Button><Button size="sm" leftIcon={Send} onClick={()=>submitMod.mutate(m.id)}>Submit</Button><Button size="sm" variant="danger" leftIcon={Trash2} onClick={()=>window.confirm('Delete this modification?') && deleteMod.mutate(m.id)}>Delete</Button></>; if (['submitted','pending','pending_approval'].includes(s)) return <><Button size="sm" leftIcon={CheckCircle2} onClick={()=>approveMod.mutate(m.id)}>Approve</Button><Button size="sm" variant="danger" leftIcon={XCircle} onClick={()=>rejectMod.mutate(m.id)}>Reject</Button></>; if (s === 'approved') return <Button size="sm" leftIcon={PlayCircle} onClick={()=>applyMod.mutate(m.id)}>Apply</Button>; return null; }
  function variableActions(v) { const s=String(v.status || 'draft').toLowerCase(); if (s === 'draft') return <><Button size="sm" variant="outline" leftIcon={Edit3} onClick={()=>openVariable(v)}>Edit</Button><Button size="sm" leftIcon={ListChecks} onClick={()=>reviewVariable.mutate(v.id)}>Review</Button><Button size="sm" variant="danger" leftIcon={Trash2} onClick={()=>window.confirm('Delete this entry?') && deleteVariable.mutate(v.id)}>Delete</Button></>; if (s === 'reviewed') return <><Button size="sm" leftIcon={ShieldCheck} onClick={()=>approveVariable.mutate(v)}>Approve & include</Button><Button size="sm" variant="outline" leftIcon={Edit3} onClick={()=>openVariable(v)}>Edit</Button></>; return null; }
}

function ActionRow({ children }) { return children ? <div className="mt-3 flex flex-wrap gap-2">{children}</div> : null; }
function Footer({ onCancel, onSave, loading, label }) { return <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button loading={loading} onClick={onSave}>{label}</Button></div>; }
function SimpleTable({ rows, columns, actions }) { return <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-slate-200 text-left text-slate-500">{columns.map(([h])=><th key={h} className="py-3 pr-4">{h}</th>)}{actions ? <th className="py-3 text-right">Actions</th> : null}</tr></thead><tbody>{rows.map((row,i)=><tr key={row.id || i} className="border-b border-slate-100 align-top">{columns.map(([h,fn])=><td key={h} className="py-3 pr-4">{fn(row)}</td>)}{actions ? <td className="py-3"><div className="flex justify-end gap-2">{actions(row)}</div></td> : null}</tr>)}</tbody></table></div>; }
function ReportBlock({ title, data }) { const rows = rowsOf(data); return <div className="rounded-2xl border border-slate-200 p-4"><div className="font-medium text-slate-900">{title}</div>{rows.length ? <SimpleTable rows={rows.slice(0,10)} columns={Object.keys(rows[0] || {}).slice(0,5).map((k)=>[k, (r)=>String(r[k] ?? '—')])}/> : <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(data || {}, null, 2)}</pre>}</div>; }
function ObligationForm({ form, setForm }) { return <div className="grid gap-4 md:grid-cols-2"><Input label="Description" value={form.description} onChange={(e)=>setForm(s=>({...s, description:e.target.value}))} className="md:col-span-2"/><Select label="Obligation type" value={form.obligation_type} onChange={(e)=>setForm(s=>({...s, obligation_type:e.target.value}))} options={[{value:'OVER_TIME', label:'Over time'}, {value:'POINT_IN_TIME', label:'Point in time'}]}/><Select label="Satisfaction method" value={form.satisfaction_method} onChange={(e)=>setForm(s=>({...s, satisfaction_method:e.target.value}))} options={[{value:'TIME', label:'Time'}, {value:'OUTPUT', label:'Output'}, {value:'INPUT', label:'Input'}]}/><Input label="Standalone selling price" value={form.standalone_selling_price} onChange={(e)=>setForm(s=>({...s, standalone_selling_price:e.target.value}))}/><Input label="Satisfaction date" type="date" value={form.satisfaction_date} onChange={(e)=>setForm(s=>({...s, satisfaction_date:e.target.value}))}/><Input label="Start date" type="date" value={form.start_date} onChange={(e)=>setForm(s=>({...s, start_date:e.target.value}))}/><Input label="End date" type="date" value={form.end_date} onChange={(e)=>setForm(s=>({...s, end_date:e.target.value}))}/></div>; }
function CostForm({ form, setForm }) { return <div className="grid gap-4 md:grid-cols-2"><Select label="Cost type" value={form.cost_type} onChange={(e)=>setForm(s=>({...s, cost_type:e.target.value}))} options={[{value:'ACQUISITION', label:'Acquisition'}, {value:'FULFILMENT', label:'Fulfilment'}]}/><Input label="Amount" value={form.amount} onChange={(e)=>setForm(s=>({...s, amount:e.target.value}))}/><Input label="Amortisation start" type="date" value={form.amort_start_date} onChange={(e)=>setForm(s=>({...s, amort_start_date:e.target.value}))}/><Input label="Amortisation end" type="date" value={form.amort_end_date} onChange={(e)=>setForm(s=>({...s, amort_end_date:e.target.value}))}/><AccountSelect label="Cost asset account" value={form.asset_account_id} onChange={(e)=>setForm(s=>({...s, asset_account_id:e.target.value}))} allowEmpty/><AccountSelect label="Amortisation expense account" value={form.amort_expense_account_id} onChange={(e)=>setForm(s=>({...s, amort_expense_account_id:e.target.value}))} allowEmpty/><Textarea label="Description" value={form.description} onChange={(e)=>setForm(s=>({...s, description:e.target.value}))} className="md:col-span-2"/></div>; }
function ModificationForm({ form, setForm }) { return <div className="grid gap-4 md:grid-cols-2"><Input label="Modification date" type="date" value={form.modification_date} onChange={(e)=>setForm(s=>({...s, modification_date:e.target.value}))}/><Select label="Type" value={form.modification_type} onChange={(e)=>setForm(s=>({...s, modification_type:e.target.value}))} options={[{value:'PRICE_CHANGE', label:'Price change'}, {value:'SCOPE_CHANGE', label:'Scope change'}, {value:'SCOPE_AND_PRICE', label:'Scope and price'}]}/><Input label="New base transaction price" value={form.new_base_transaction_price} onChange={(e)=>setForm(s=>({...s, new_base_transaction_price:e.target.value}))}/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.adds_distinct_goods_services} onChange={(e)=>setForm(s=>({...s, adds_distinct_goods_services:e.target.checked}))}/> Adds distinct goods/services</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.price_increase_commensurate_with_ssp} onChange={(e)=>setForm(s=>({...s, price_increase_commensurate_with_ssp:e.target.checked}))}/> Price increase commensurate with SSP</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.remaining_goods_services_distinct} onChange={(e)=>setForm(s=>({...s, remaining_goods_services_distinct:e.target.checked}))}/> Remaining goods/services distinct</label><Textarea label="Notes" value={form.notes} onChange={(e)=>setForm(s=>({...s, notes:e.target.value}))} className="md:col-span-2"/></div>; }
function VariableForm({ form, setForm }) { return <div className="grid gap-4 md:grid-cols-2"><Input label="Effective date" type="date" value={form.effective_date} onChange={(e)=>setForm(s=>({...s, effective_date:e.target.value}))}/><Select label="Method" value={form.method} onChange={(e)=>setForm(s=>({...s, method:e.target.value}))} options={[{value:'EXPECTED_VALUE', label:'Expected value'}, {value:'MOST_LIKELY', label:'Most likely'}]}/><Input label="Estimate amount" value={form.estimate_amount} onChange={(e)=>setForm(s=>({...s, estimate_amount:e.target.value}))}/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.highly_probable_no_reversal} onChange={(e)=>setForm(s=>({...s, highly_probable_no_reversal:e.target.checked}))}/> Highly probable no significant reversal</label><Textarea label="Constraint basis" value={form.constraint_basis} onChange={(e)=>setForm(s=>({...s, constraint_basis:e.target.value}))}/><Textarea label="Rationale" value={form.rationale} onChange={(e)=>setForm(s=>({...s, rationale:e.target.value}))}/></div>; }
