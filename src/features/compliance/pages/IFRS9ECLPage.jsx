import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  RefreshCw,
  ShieldCheck,
  Calculator,
  BookOpenCheck,
  RotateCcw,
  BarChart3,
  GitBranch,
  Users,
  Brain,
  AlertTriangle,
  Workflow,
  CheckCircle2,
  XCircle,
  Send
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeIfrs9Api } from '../api/ifrs9.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { AccountSelect } from '../../../shared/components/forms/AccountSelect.jsx';
import { PartnerSelect } from '../../../shared/components/forms/PartnerSelect.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { formatDate } from '../../../shared/utils/formatDate.js';
import { formatMoney } from '../../../shared/utils/formatMoney.js';

const percent = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `${(n * 100).toFixed(2)}%`;
};

const numberOrUndefined = (value) => (value === '' || value === null || value === undefined ? undefined : Number(value));
const numberOrNull = (value) => (value === '' || value === null || value === undefined ? null : Number(value));
const parseJsonSafe = (value, fallback = {}) => {
  if (!value || !String(value).trim()) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function Pill({ tone = 'slate', children }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200'
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone] ?? tones.slate}`}>{children}</span>;
}

export default function IFRS9ECLPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { http } = useApi();
  const api = useMemo(() => makeIfrs9Api(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [runsPeriodId, setRunsPeriodId] = useState('');
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [changeStatusFilter, setChangeStatusFilter] = useState('');

  const { data: settings, isLoading: settingsLoading } = useQuery({ queryKey: qk.ifrs9Settings, queryFn: () => api.getSettings() });
  const { data: models = [], isLoading: modelsLoading } = useQuery({ queryKey: qk.ifrs9Models, queryFn: () => api.listModels() });
  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }),
    queryFn: () => api.listRuns({ period_id: runsPeriodId || undefined })
  });
  const { data: periods = [] } = useQuery({ queryKey: ['periods'], queryFn: () => periodsApi.list() });
  const macroScenariosQuery = useQuery({ queryKey: ['compliance', 'ifrs9', 'macroScenarios'], queryFn: () => api.listMacroScenarios() });
  const sicrTriggersQuery = useQuery({ queryKey: ['compliance', 'ifrs9', 'sicrTriggers'], queryFn: () => api.listSicrTriggers() });
  const modelChangesQuery = useQuery({
    queryKey: ['compliance', 'ifrs9', 'modelChanges', changeStatusFilter || 'all'],
    queryFn: () => api.listModelChanges(changeStatusFilter ? { status: changeStatusFilter } : {})
  });
  const counterpartyProfileQuery = useQuery({
    queryKey: ['compliance', 'ifrs9', 'counterpartyProfile', selectedPartnerId || 'none'],
    queryFn: () => api.getCounterpartyProfile(selectedPartnerId),
    enabled: !!selectedPartnerId
  });

  const periodRows = Array.isArray(periods) ? periods : periods?.data ?? [];
  const modelRows = Array.isArray(models) ? models : models?.data ?? [];
  const runRows = Array.isArray(runs) ? runs : runs?.data ?? [];
  const scenarioRows = Array.isArray(macroScenariosQuery.data) ? macroScenariosQuery.data : macroScenariosQuery.data?.data ?? [];
  const sicrRows = Array.isArray(sicrTriggersQuery.data) ? sicrTriggersQuery.data : sicrTriggersQuery.data?.data ?? [];
  const modelChangeRows = Array.isArray(modelChangesQuery.data) ? modelChangesQuery.data : modelChangesQuery.data?.data ?? [];

  useEffect(() => {
    if (!selectedRunId && runRows.length) setSelectedRunId(runRows[0].id);
  }, [runRows, selectedRunId]);

  const periodOptions = [{ value: '', label: 'Select…' }].concat(periodRows.map((p) => ({ value: p.id, label: `${p.code ?? ''} — ${p.name ?? ''}`.trim() })));
  const modelOptions = [{ value: '', label: 'Select…' }].concat(modelRows.map((m) => ({ value: m.id, label: `${m.code ?? ''} — ${m.name ?? ''}`.trim() })));
  const scenarioOptions = [{ value: '', label: 'Select…' }].concat(scenarioRows.map((s) => ({ value: s.id, label: `${s.code ?? ''} — ${s.name ?? ''}`.trim() })));

  const [settingsForm, setSettingsForm] = useState({
    loss_allowance_account_id: '',
    impairment_expense_account_id: '',
    default_model_id: '',
    rounding_decimals: 2,
    stage2_threshold_days: 30,
    stage3_threshold_days: 90,
    default_lgd: 0.45,
    annual_discount_rate: 0.10,
    model_change_approval_required: false
  });

  useEffect(() => {
    if (!settings) return;
    setSettingsForm({
      loss_allowance_account_id: settings.loss_allowance_account_id ?? settings.allowance_account_id ?? '',
      impairment_expense_account_id: settings.impairment_expense_account_id ?? '',
      default_model_id: settings.default_model_id ?? '',
      rounding_decimals: settings.rounding_decimals ?? 2,
      stage2_threshold_days: settings.stage2_threshold_days ?? settings.stage2_days_past_due ?? 30,
      stage3_threshold_days: settings.stage3_threshold_days ?? settings.stage3_days_past_due ?? 90,
      default_lgd: settings.default_lgd ?? 0.45,
      annual_discount_rate: settings.annual_discount_rate ?? 0.10,
      model_change_approval_required: !!(settings.model_change_approval_required ?? settings.modelChangeApprovalRequired)
    });
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: () => api.updateSettings({
      ...settingsForm,
      rounding_decimals: Number(settingsForm.rounding_decimals),
      stage2_threshold_days: Number(settingsForm.stage2_threshold_days),
      stage3_threshold_days: Number(settingsForm.stage3_threshold_days),
      default_lgd: Number(settingsForm.default_lgd),
      annual_discount_rate: Number(settingsForm.annual_discount_rate),
      model_change_approval_required: !!settingsForm.model_change_approval_required
    }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Saved', message: 'IFRS 9 settings updated.' });
      await qc.invalidateQueries({ queryKey: qk.ifrs9Settings });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Save failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [modelOpen, setModelOpen] = useState(false);
  const [modelForm, setModelForm] = useState({ code: '', name: '', model_type: 'SIMPLIFIED', description: '' });
  const createModel = useMutation({
    mutationFn: () => api.createModel(modelForm),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Model created', message: 'The ECL model is ready for configuration.' });
      setModelOpen(false);
      setModelForm({ code: '', name: '', model_type: 'SIMPLIFIED', description: '' });
      await qc.invalidateQueries({ queryKey: qk.ifrs9Models });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Create failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [bucketOpen, setBucketOpen] = useState(false);
  const [bucketTarget, setBucketTarget] = useState(null);
  const [bucketForm, setBucketForm] = useState({ label: '', days_past_due_from: 0, days_past_due_to: '', loss_rate: '' });
  const addBucket = useMutation({
    mutationFn: () => api.addBucket(bucketTarget?.id, {
      ...bucketForm,
      days_past_due_from: Number(bucketForm.days_past_due_from),
      days_past_due_to: numberOrNull(bucketForm.days_past_due_to),
      loss_rate: Number(bucketForm.loss_rate)
    }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Bucket added', message: 'Loss-rate bucket saved.' });
      setBucketOpen(false);
      setBucketTarget(null);
      setBucketForm({ label: '', days_past_due_from: 0, days_past_due_to: '', loss_rate: '' });
      await qc.invalidateQueries({ queryKey: qk.ifrs9Models });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Save failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [parameterOpen, setParameterOpen] = useState(false);
  const [parameterTarget, setParameterTarget] = useState(null);
  const [parameterForm, setParameterForm] = useState({ stage: 1, label: '', days_past_due_from: 0, days_past_due_to: '', pd_12m: '', pd_lifetime: '', lgd: '' });
  const addParameter = useMutation({
    mutationFn: () => api.addParameter(parameterTarget?.id, {
      ...parameterForm,
      stage: Number(parameterForm.stage),
      days_past_due_from: Number(parameterForm.days_past_due_from),
      days_past_due_to: numberOrNull(parameterForm.days_past_due_to),
      pd_12m: Number(parameterForm.pd_12m),
      pd_lifetime: Number(parameterForm.pd_lifetime),
      lgd: numberOrNull(parameterForm.lgd)
    }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Parameter added', message: 'Stage parameter row saved.' });
      setParameterOpen(false);
      setParameterTarget(null);
      setParameterForm({ stage: 1, label: '', days_past_due_from: 0, days_past_due_to: '', pd_12m: '', pd_lifetime: '', lgd: '' });
      await qc.invalidateQueries({ queryKey: qk.ifrs9Models });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Save failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [computeOpen, setComputeOpen] = useState(false);
  const [computeForm, setComputeForm] = useState({ period_id: '', model_id: '', as_of_date: '', memo: '', scenario_ids: [], use_behavioral_metrics: false });
  const computeRun = useMutation({
    mutationFn: () => api.computeEcl({
      ...computeForm,
      model_id: computeForm.model_id || undefined,
      as_of_date: computeForm.as_of_date || undefined,
      memo: computeForm.memo || undefined,
      scenario_ids: computeForm.scenario_ids.length ? computeForm.scenario_ids : undefined,
      use_behavioral_metrics: !!computeForm.use_behavioral_metrics
    }),
    onSuccess: async (result) => {
      toast.push({ tone: 'success', title: 'Run computed', message: 'Expected credit loss was computed successfully.' });
      setComputeOpen(false);
      setSelectedRunId(result?.run?.id ?? result?.id ?? null);
      await qc.invalidateQueries({ queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }) });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Compute failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const { data: runDetail, isLoading: runDetailLoading } = useQuery({
    queryKey: qk.ifrs9Run(selectedRunId ?? 'none'),
    queryFn: () => api.getRun(selectedRunId),
    enabled: !!selectedRunId
  });

  const disclosureQuery = useQuery({
    queryKey: ['compliance', 'ifrs9', 'disclosures', selectedRunId ?? 'none'],
    queryFn: () => api.reportDisclosures({ run_id: selectedRunId }),
    enabled: !!selectedRunId
  });

  const allowanceQuery = useQuery({
    queryKey: ['compliance', 'ifrs9', 'allowanceMovement', runsPeriodId || 'none'],
    queryFn: () => api.reportAllowanceMovement({ period_id: runsPeriodId }),
    enabled: !!runsPeriodId
  });

  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const finalizeRun = useMutation({
    mutationFn: () => api.finalizeRun(selectedRunId),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Run finalized', message: 'The selected run is now locked for audit.' });
      setFinalizeOpen(false);
      await qc.invalidateQueries({ queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }) });
      if (selectedRunId) await qc.invalidateQueries({ queryKey: qk.ifrs9Run(selectedRunId) });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Finalize failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [postOpen, setPostOpen] = useState(false);
  const [postForm, setPostForm] = useState({ period_id: '', entry_date: '', memo: '' });
  const postRun = useMutation({
    mutationFn: () => api.postEcl({ ...postForm, run_id: selectedRunId, entry_date: postForm.entry_date || undefined, memo: postForm.memo || undefined }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Posted', message: 'The ECL journal entry was posted.' });
      setPostOpen(false);
      await qc.invalidateQueries({ queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }) });
      if (selectedRunId) await qc.invalidateQueries({ queryKey: qk.ifrs9Run(selectedRunId) });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Post failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [reverseOpen, setReverseOpen] = useState(false);
  const [reverseForm, setReverseForm] = useState({ target_period_id: '', entry_date: '', reason: '' });
  const reverseRun = useMutation({
    mutationFn: () => api.reverseEcl({ ...reverseForm, run_id: selectedRunId }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Reversed', message: 'The IFRS 9 posting was reversed.' });
      setReverseOpen(false);
      await qc.invalidateQueries({ queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }) });
      if (selectedRunId) await qc.invalidateQueries({ queryKey: qk.ifrs9Run(selectedRunId) });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Reverse failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [profileForm, setProfileForm] = useState({ business_partner_id: '', segment: '', stage_override: '', override_reason: '', status: 'active' });
  useEffect(() => {
    const profile = counterpartyProfileQuery.data;
    setProfileForm({
      business_partner_id: selectedPartnerId || '',
      segment: profile?.segment ?? '',
      stage_override: profile?.stage_override ?? '',
      override_reason: profile?.override_reason ?? '',
      status: profile?.status ?? 'active'
    });
  }, [counterpartyProfileQuery.data, selectedPartnerId]);

  const upsertCounterpartyProfile = useMutation({
    mutationFn: () => api.upsertCounterpartyProfile({
      business_partner_id: profileForm.business_partner_id,
      segment: profileForm.segment || undefined,
      stage_override: numberOrNull(profileForm.stage_override),
      override_reason: profileForm.override_reason || undefined,
      status: profileForm.status
    }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Profile saved', message: 'Counterparty staging override profile saved.' });
      await qc.invalidateQueries({ queryKey: ['compliance', 'ifrs9', 'counterpartyProfile', selectedPartnerId || 'none'] });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Profile save failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [scenarioForm, setScenarioForm] = useState({
    code: '',
    name: '',
    description: '',
    scenario_type: 'BASE',
    probability_weight: '1',
    status: 'active',
    effective_from: '',
    effective_to: '',
    variable_set_json: '{\n  "gdp_growth": 0.03,\n  "inflation": 0.12\n}'
  });
  const createScenario = useMutation({
    mutationFn: () => api.createMacroScenario({
      code: scenarioForm.code || undefined,
      name: scenarioForm.name,
      description: scenarioForm.description || undefined,
      scenario_type: scenarioForm.scenario_type,
      probability_weight: Number(scenarioForm.probability_weight || 1),
      status: scenarioForm.status,
      effective_from: scenarioForm.effective_from || undefined,
      effective_to: scenarioForm.effective_to || undefined,
      variable_set: parseJsonSafe(scenarioForm.variable_set_json, {})
    }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Scenario created', message: 'Macro scenario saved.' });
      setScenarioOpen(false);
      setScenarioForm({ code: '', name: '', description: '', scenario_type: 'BASE', probability_weight: '1', status: 'active', effective_from: '', effective_to: '', variable_set_json: '{\n  "gdp_growth": 0.03,\n  "inflation": 0.12\n}' });
      await qc.invalidateQueries({ queryKey: ['compliance', 'ifrs9', 'macroScenarios'] });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Scenario save failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayForm, setOverlayForm] = useState({ scenario_id: '', model_id: '', segment: '', stage: '', days_past_due_from: '', days_past_due_to: '', pd_multiplier: '1', lgd_multiplier: '1', loss_rate_multiplier: '1', ecl_multiplier: '1', notes: '' });
  const addOverlay = useMutation({
    mutationFn: () => api.addMacroOverlay(overlayForm.scenario_id, {
      model_id: overlayForm.model_id || null,
      segment: overlayForm.segment || undefined,
      stage: numberOrNull(overlayForm.stage),
      days_past_due_from: numberOrNull(overlayForm.days_past_due_from),
      days_past_due_to: numberOrNull(overlayForm.days_past_due_to),
      pd_multiplier: Number(overlayForm.pd_multiplier || 1),
      lgd_multiplier: Number(overlayForm.lgd_multiplier || 1),
      loss_rate_multiplier: Number(overlayForm.loss_rate_multiplier || 1),
      ecl_multiplier: Number(overlayForm.ecl_multiplier || 1),
      notes: overlayForm.notes || undefined
    }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Overlay added', message: 'Scenario overlay saved.' });
      setOverlayOpen(false);
      setOverlayForm({ scenario_id: '', model_id: '', segment: '', stage: '', days_past_due_from: '', days_past_due_to: '', pd_multiplier: '1', lgd_multiplier: '1', loss_rate_multiplier: '1', ecl_multiplier: '1', notes: '' });
      await qc.invalidateQueries({ queryKey: ['compliance', 'ifrs9', 'macroScenarios'] });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Overlay save failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [sicrOpen, setSicrOpen] = useState(false);
  const [sicrForm, setSicrForm] = useState({ business_partner_id: '', segment: '', trigger_code: '', trigger_name: '', severity: 'medium', force_stage_min: '', pd_multiplier: '1', lgd_multiplier: '1', status: 'active', valid_from: '', valid_to: '', source: '', notes: '', metadata_json: '{\n  "basis": "qualitative review"\n}' });
  const createSicr = useMutation({
    mutationFn: () => api.createSicrTrigger({
      business_partner_id: sicrForm.business_partner_id || undefined,
      segment: sicrForm.segment || undefined,
      trigger_code: sicrForm.trigger_code,
      trigger_name: sicrForm.trigger_name,
      severity: sicrForm.severity,
      force_stage_min: numberOrNull(sicrForm.force_stage_min),
      pd_multiplier: Number(sicrForm.pd_multiplier || 1),
      lgd_multiplier: Number(sicrForm.lgd_multiplier || 1),
      status: sicrForm.status,
      valid_from: sicrForm.valid_from || undefined,
      valid_to: sicrForm.valid_to || undefined,
      source: sicrForm.source || undefined,
      notes: sicrForm.notes || undefined,
      metadata: parseJsonSafe(sicrForm.metadata_json, {})
    }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'SICR trigger saved', message: 'Qualitative SICR trigger created.' });
      setSicrOpen(false);
      setSicrForm({ business_partner_id: '', segment: '', trigger_code: '', trigger_name: '', severity: 'medium', force_stage_min: '', pd_multiplier: '1', lgd_multiplier: '1', status: 'active', valid_from: '', valid_to: '', source: '', notes: '', metadata_json: '{\n  "basis": "qualitative review"\n}' });
      await qc.invalidateQueries({ queryKey: ['compliance', 'ifrs9', 'sicrTriggers'] });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'SICR save failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [behavioralForm, setBehavioralForm] = useState({ as_of_date: '', horizon_months: '12', transition_window_days: '30', persist_snapshot: false });
  const behavioralAnalytics = useMutation({
    mutationFn: () => api.getBehavioralAnalytics({
      as_of_date: behavioralForm.as_of_date,
      horizon_months: Number(behavioralForm.horizon_months || 12),
      transition_window_days: Number(behavioralForm.transition_window_days || 30),
      persist_snapshot: !!behavioralForm.persist_snapshot
    }),
    onError: (e) => toast.push({ tone: 'danger', title: 'Behavioral analytics failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const [changeOpen, setChangeOpen] = useState(false);
  const [changeForm, setChangeForm] = useState({ model_id: '', change_type: 'SETTINGS_UPSERT', title: '', reason: '', payload_json: '{\n  \n}' });
  const createModelChange = useMutation({
    mutationFn: () => api.createModelChange({
      model_id: changeForm.model_id || undefined,
      change_type: changeForm.change_type,
      title: changeForm.title,
      reason: changeForm.reason || undefined,
      payload: parseJsonSafe(changeForm.payload_json, {})
    }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Change request created', message: 'IFRS 9 model change draft saved.' });
      setChangeOpen(false);
      setChangeForm({ model_id: '', change_type: 'SETTINGS_UPSERT', title: '', reason: '', payload_json: '{\n  \n}' });
      await qc.invalidateQueries({ queryKey: ['compliance', 'ifrs9', 'modelChanges', changeStatusFilter || 'all'] });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Change request failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const submitModelChange = useMutation({
    mutationFn: ({ id, comment }) => api.submitModelChange(id, comment ? { comment } : {}),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Submitted', message: 'Model change submitted for approval.' });
      await qc.invalidateQueries({ queryKey: ['compliance', 'ifrs9', 'modelChanges', changeStatusFilter || 'all'] });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Submit failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });
  const approveModelChange = useMutation({
    mutationFn: ({ id, comment }) => api.approveModelChange(id, comment ? { comment } : {}),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Approved', message: 'Model change approved.' });
      await qc.invalidateQueries({ queryKey: ['compliance', 'ifrs9', 'modelChanges', changeStatusFilter || 'all'] });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Approval failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });
  const rejectModelChange = useMutation({
    mutationFn: ({ id, comment }) => api.rejectModelChange(id, comment ? { comment } : {}),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Rejected', message: 'Model change rejected.' });
      await qc.invalidateQueries({ queryKey: ['compliance', 'ifrs9', 'modelChanges', changeStatusFilter || 'all'] });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Rejection failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });
  const applyModelChange = useMutation({
    mutationFn: (id) => api.applyModelChange(id),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Applied', message: 'Approved model change applied.' });
      await qc.invalidateQueries({ queryKey: ['compliance', 'ifrs9', 'modelChanges', changeStatusFilter || 'all'] });
      await qc.invalidateQueries({ queryKey: qk.ifrs9Settings });
      await qc.invalidateQueries({ queryKey: qk.ifrs9Models });
      await qc.invalidateQueries({ queryKey: ['compliance', 'ifrs9', 'macroScenarios'] });
      await qc.invalidateQueries({ queryKey: ['compliance', 'ifrs9', 'sicrTriggers'] });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Apply failed', message: String(e?.response?.data?.message ?? e?.message ?? e) })
  });

  const run = runDetail?.run;
  const runLines = runDetail?.lines ?? [];
  const dashboard = {
    models: modelRows.length,
    activeModels: modelRows.filter((m) => m.status === 'active').length,
    runs: runRows.length,
    postedRuns: runRows.filter((r) => r.status === 'posted').length,
    scenarios: scenarioRows.length,
    sicrTriggers: sicrRows.length,
    pendingChanges: modelChangeRows.filter((r) => ['draft', 'submitted', 'approved'].includes(r.status)).length
  };

  const modelColumns = useMemo(() => [
    { header: 'Model', render: (m) => <div><div className="font-medium text-slate-900">{m.name}</div><div className="text-xs text-slate-500">{m.code}</div></div> },
    { header: 'Type', render: (m) => <span className="text-sm text-slate-700">{m.model_type}</span> },
    { header: 'Buckets', render: (m) => <span className="text-sm text-slate-700">{m.bucket_count ?? 0}</span> },
    { header: 'Parameters', render: (m) => <span className="text-sm text-slate-700">{m.parameter_count ?? 0}</span> },
    { header: 'Status', render: (m) => <Pill tone={m.status === 'active' ? 'green' : 'slate'}>{m.status}</Pill> },
    { header: '', render: (m) => (
      <div className="flex gap-2">
        {m.model_type === 'SIMPLIFIED' ? <Button size="sm" variant="secondary" onClick={() => { setBucketTarget(m); setBucketOpen(true); }}>Add bucket</Button> : null}
        {m.model_type === 'GENERAL' ? <Button size="sm" variant="secondary" onClick={() => { setParameterTarget(m); setParameterOpen(true); }}>Add parameter</Button> : null}
      </div>
    ) }
  ], []);

  const runColumns = useMemo(() => [
    { header: 'Run', render: (r) => <button type="button" className="text-left" onClick={() => setSelectedRunId(r.id)}><div className="font-medium text-brand-deep hover:underline">{r.model_code ? `${r.model_code}` : r.id}</div><div className="text-xs text-slate-500">{formatDate(r.created_at)}</div></button> },
    { header: 'Period', render: (r) => <span>{r.period_code ?? r.period_name ?? '—'}</span> },
    { header: 'Model', render: (r) => <span>{r.model_name ?? '—'}</span> },
    { header: 'Approach', render: (r) => <span>{r.approach ?? '—'}</span> },
    { header: 'Exposure', render: (r) => <span>{formatMoney(r.total_exposure)}</span> },
    { header: 'ECL', render: (r) => <span>{formatMoney(r.total_ecl)}</span> },
    { header: 'Delta', render: (r) => <span>{formatMoney(r.delta_allowance)}</span> },
    { header: 'Status', render: (r) => <Pill tone={r.status === 'posted' ? 'green' : r.status === 'finalized' ? 'blue' : 'slate'}>{r.status}</Pill> }
  ], []);

  const lineColumns = useMemo(() => [
    { header: 'Counterparty', render: (l) => <div><div className="font-medium text-slate-900">{l.customer_name ?? l.customer_id}</div><div className="text-xs text-slate-500">{l.bucket_label ?? '—'}</div></div> },
    { header: 'Stage', render: (l) => <span>{l.stage ?? '—'}</span> },
    { header: 'DPD band', render: (l) => <span>{`${l.days_past_due_from ?? 0} - ${l.days_past_due_to ?? '∞'}`}</span> },
    { header: 'Loss rate / PD', render: (l) => <span>{l.loss_rate != null ? percent(l.loss_rate) : percent(l.pd_used)}</span> },
    { header: 'LGD', render: (l) => <span>{l.lgd_used != null ? percent(l.lgd_used) : '—'}</span> },
    { header: 'Exposure', render: (l) => <span>{formatMoney(l.exposure_amount)}</span> },
    { header: 'ECL', render: (l) => <span>{formatMoney(l.ecl_amount)}</span> }
  ], []);

  const stageColumns = useMemo(() => [
    { header: 'Stage', render: (r) => <span>{r.stage}</span> },
    { header: 'Lines', render: (r) => <span>{r.line_count}</span> },
    { header: 'Invoices', render: (r) => <span>{r.invoice_count}</span> },
    { header: 'Contract assets', render: (r) => <span>{r.contract_asset_count}</span> },
    { header: 'Exposure', render: (r) => <span>{formatMoney(r.exposure_amount)}</span> },
    { header: 'ECL', render: (r) => <span>{formatMoney(r.ecl_amount)}</span> }
  ], []);

  const bucketColumns = useMemo(() => [
    { header: 'Bucket', render: (r) => <span>{r.bucket_label}</span> },
    { header: 'Invoices', render: (r) => <span>{r.invoice_count}</span> },
    { header: 'Contract assets', render: (r) => <span>{r.contract_asset_count}</span> },
    { header: 'Exposure', render: (r) => <span>{formatMoney(r.exposure_amount)}</span> },
    { header: 'ECL', render: (r) => <span>{formatMoney(r.ecl_amount)}</span> }
  ], []);

  const topCounterpartyColumns = useMemo(() => [
    { header: 'Counterparty', render: (r) => <span>{r.customer_name}</span> },
    { header: 'Exposure', render: (r) => <span>{formatMoney(r.exposure_amount)}</span> },
    { header: 'ECL', render: (r) => <span>{formatMoney(r.ecl_amount)}</span> },
    { header: 'Invoices', render: (r) => <span>{r.invoice_count}</span> },
    { header: 'Contract assets', render: (r) => <span>{r.contract_asset_count}</span> }
  ], []);

  const scenarioColumns = useMemo(() => [
    { header: 'Scenario', render: (r) => <div><div className="font-medium text-slate-900">{r.name}</div><div className="text-xs text-slate-500">{r.code}</div></div> },
    { header: 'Type', render: (r) => <Pill tone="purple">{r.scenario_type}</Pill> },
    { header: 'Probability', render: (r) => <span>{percent(r.probability_weight)}</span> },
    { header: 'Overlays', render: (r) => <span>{r.overlay_count ?? 0}</span> },
    { header: 'Effective', render: (r) => <span>{r.effective_from ? `${formatDate(r.effective_from)} → ${formatDate(r.effective_to)}` : 'Open'}</span> },
    { header: 'Status', render: (r) => <Pill tone={r.status === 'active' ? 'green' : 'slate'}>{r.status}</Pill> }
  ], []);

  const sicrColumns = useMemo(() => [
    { header: 'Trigger', render: (r) => <div><div className="font-medium text-slate-900">{r.trigger_name}</div><div className="text-xs text-slate-500">{r.trigger_code}</div></div> },
    { header: 'Segment / Partner', render: (r) => <span>{r.segment ?? r.business_partner_id ?? 'Global'}</span> },
    { header: 'Severity', render: (r) => <Pill tone={r.severity === 'critical' ? 'red' : r.severity === 'high' ? 'amber' : 'slate'}>{r.severity}</Pill> },
    { header: 'Force stage', render: (r) => <span>{r.force_stage_min ?? '—'}</span> },
    { header: 'PD x', render: (r) => <span>{Number(r.pd_multiplier ?? 1).toFixed(2)}</span> },
    { header: 'LGD x', render: (r) => <span>{Number(r.lgd_multiplier ?? 1).toFixed(2)}</span> },
    { header: 'Status', render: (r) => <Pill tone={r.status === 'active' ? 'green' : 'slate'}>{r.status}</Pill> }
  ], []);

  const transitionColumns = useMemo(() => [
    { header: 'Transition', render: (r) => <span>{r.transition}</span> },
    { header: 'Count', render: (r) => <span>{r.count}</span> }
  ], []);

  const cohortColumns = useMemo(() => [
    { header: 'Cohort', render: (r) => <span>{r.cohort}</span> },
    { header: 'Invoices', render: (r) => <span>{r.invoice_count}</span> },
    { header: 'Total', render: (r) => <span>{formatMoney(r.total_amount)}</span> },
    { header: 'Default', render: (r) => <span>{formatMoney(r.default_amount)}</span> },
    { header: 'Default ratio', render: (r) => <span>{percent(r.default_ratio)}</span> }
  ], []);

  const modelChangeColumns = useMemo(() => [
    { header: 'Title', render: (r) => <div><div className="font-medium text-slate-900">{r.title}</div><div className="text-xs text-slate-500">{r.change_type}</div></div> },
    { header: 'Model', render: (r) => <span>{r.model_name ?? r.model_code ?? 'Global / settings'}</span> },
    { header: 'Status', render: (r) => <Pill tone={r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : r.status === 'submitted' ? 'blue' : r.status === 'applied' ? 'purple' : 'slate'}>{r.status}</Pill> },
    { header: 'Created', render: (r) => <span>{formatDate(r.created_at)}</span> },
    {
      header: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap gap-2">
          {['draft', 'rejected'].includes(r.status) ? <Button size="sm" variant="secondary" leftIcon={Send} onClick={() => submitModelChange.mutate({ id: r.id, comment: '' })}>Submit</Button> : null}
          {r.status === 'submitted' ? <Button size="sm" variant="secondary" leftIcon={CheckCircle2} onClick={() => approveModelChange.mutate({ id: r.id, comment: '' })}>Approve</Button> : null}
          {r.status === 'submitted' ? <Button size="sm" variant="secondary" leftIcon={XCircle} onClick={() => rejectModelChange.mutate({ id: r.id, comment: '' })}>Reject</Button> : null}
          {r.status === 'approved' ? <Button size="sm" variant="primary" onClick={() => applyModelChange.mutate(r.id)}>Apply</Button> : null}
        </div>
      )
    }
  ], [applyModelChange, approveModelChange, rejectModelChange, submitModelChange]);

  const behavioralResult = behavioralAnalytics.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="IFRS 9 — Expected Credit Loss"
        subtitle="Production-grade ECL settings, models, macro overlays, SICR controls, counterparty overrides, run lifecycle, disclosures and model governance."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={RefreshCw} variant="secondary" onClick={() => {
              qc.invalidateQueries({ queryKey: qk.ifrs9Settings });
              qc.invalidateQueries({ queryKey: qk.ifrs9Models });
              qc.invalidateQueries({ queryKey: qk.ifrs9Runs({ period_id: runsPeriodId || undefined }) });
              qc.invalidateQueries({ queryKey: ['compliance', 'ifrs9', 'macroScenarios'] });
              qc.invalidateQueries({ queryKey: ['compliance', 'ifrs9', 'sicrTriggers'] });
              qc.invalidateQueries({ queryKey: ['compliance', 'ifrs9', 'modelChanges', changeStatusFilter || 'all'] });
            }}>
              Refresh
            </Button>
            <Button leftIcon={Calculator} variant="primary" onClick={() => setComputeOpen(true)}>
              Compute ECL
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Models" value={dashboard.models} hint={`${dashboard.activeModels} active`} />
        <StatCard label="Runs" value={dashboard.runs} hint={`${dashboard.postedRuns} posted`} />
        <StatCard label="Scenarios" value={dashboard.scenarios} hint={`${dashboard.sicrTriggers} SICR triggers`} />
        <StatCard label="Governance" value={dashboard.pendingChanges} hint="Open model-change requests" />
      </div>

      <ContentCard>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          tabs={[
            {
              value: 'dashboard',
              label: 'Dashboard',
              icon: BarChart3,
              content: (
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-border-subtle p-4">
                      <div className="text-sm font-semibold text-brand-deep">Current run snapshot</div>
                      {run ? (
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <StatCard label="Model" value={run.model_name ?? '—'} hint={run.model_code ?? ''} />
                          <StatCard label="Approach" value={run.approach ?? '—'} hint={run.period_code ?? run.period_name ?? ''} />
                          <StatCard label="Exposure" value={formatMoney(run.total_exposure)} hint={`As of ${formatDate(run.as_of_date)}`} />
                          <StatCard label="Total ECL" value={formatMoney(run.total_ecl)} hint={`Delta ${formatMoney(run.delta_allowance)}`} />
                        </div>
                      ) : <div className="mt-3 text-sm text-slate-500">No run selected.</div>}
                    </div>
                    <div className="rounded-2xl border border-border-subtle p-4">
                      <div className="text-sm font-semibold text-brand-deep">Allowance movement</div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <Select label="Period" value={runsPeriodId} onChange={(e) => setRunsPeriodId(e.target.value)} options={periodOptions} />
                        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Pick a period to load opening, movement and closing allowance.</div>
                      </div>
                      {allowanceQuery.data ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <StatCard label="Opening allowance" value={formatMoney(allowanceQuery.data.opening_allowance)} />
                          <StatCard label="Closing allowance" value={formatMoney(allowanceQuery.data.closing_allowance)} />
                          <StatCard label="Additions" value={formatMoney(allowanceQuery.data.additions)} />
                          <StatCard label="Releases" value={formatMoney(allowanceQuery.data.releases)} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <ContentCard title="Macro scenarios"><div className="text-2xl font-semibold text-brand-deep">{scenarioRows.length}</div><p className="mt-1 text-sm text-slate-600">Probability-weighted overlays available for forward-looking ECL adjustments.</p></ContentCard>
                    <ContentCard title="Qualitative SICR"><div className="text-2xl font-semibold text-brand-deep">{sicrRows.filter((r) => r.status === 'active').length}</div><p className="mt-1 text-sm text-slate-600">Active qualitative stage migration controls beyond days-past-due thresholds.</p></ContentCard>
                    <ContentCard title="Model governance"><div className="text-2xl font-semibold text-brand-deep">{modelChangeRows.length}</div><p className="mt-1 text-sm text-slate-600">Approval-controlled configuration changes for auditability.</p></ContentCard>
                  </div>
                </div>
              )
            },
            {
              value: 'settings',
              label: 'Settings',
              icon: ShieldCheck,
              content: (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2 rounded-2xl border border-border-subtle p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <AccountSelect label="Loss allowance account" value={settingsForm.loss_allowance_account_id} onChange={(e) => setSettingsForm((s) => ({ ...s, loss_allowance_account_id: e.target.value }))} allowEmpty />
                      <AccountSelect label="Impairment expense account" value={settingsForm.impairment_expense_account_id} onChange={(e) => setSettingsForm((s) => ({ ...s, impairment_expense_account_id: e.target.value }))} allowEmpty filters={{ accountTypeCodes: ['EXPENSE'] }} />
                      <Select label="Default ECL model" value={settingsForm.default_model_id} onChange={(e) => setSettingsForm((s) => ({ ...s, default_model_id: e.target.value }))} options={modelOptions} />
                      <Input label="Rounding decimals" type="number" value={settingsForm.rounding_decimals} onChange={(e) => setSettingsForm((s) => ({ ...s, rounding_decimals: e.target.value }))} />
                      <Input label="Stage 2 threshold (days past due)" type="number" value={settingsForm.stage2_threshold_days} onChange={(e) => setSettingsForm((s) => ({ ...s, stage2_threshold_days: e.target.value }))} />
                      <Input label="Stage 3 threshold (days past due)" type="number" value={settingsForm.stage3_threshold_days} onChange={(e) => setSettingsForm((s) => ({ ...s, stage3_threshold_days: e.target.value }))} />
                      <Input label="Default LGD" type="number" step="0.0001" value={settingsForm.default_lgd} onChange={(e) => setSettingsForm((s) => ({ ...s, default_lgd: e.target.value }))} />
                      <Input label="Annual discount rate" type="number" step="0.0001" value={settingsForm.annual_discount_rate} onChange={(e) => setSettingsForm((s) => ({ ...s, annual_discount_rate: e.target.value }))} />
                      <label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm md:col-span-2">
                        <input type="checkbox" checked={settingsForm.model_change_approval_required} onChange={(e) => setSettingsForm((s) => ({ ...s, model_change_approval_required: e.target.checked }))} />
                        Require formal approval before IFRS 9 model/configuration changes are applied
                      </label>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button variant="primary" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending || settingsLoading}>Save settings</Button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-slate-50 p-4 text-sm text-slate-600">
                    These settings govern stage migration thresholds, fallback LGD, posting accounts, default model selection, and whether model changes follow an approval-controlled workflow.
                  </div>
                </div>
              )
            },
            {
              value: 'models',
              label: 'Models',
              icon: BookOpenCheck,
              content: (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button leftIcon={Plus} variant="primary" onClick={() => setModelOpen(true)}>New model</Button>
                  </div>
                  <DataTable columns={modelColumns} rows={modelRows} isLoading={modelsLoading} empty={{ title: 'No IFRS 9 models', description: 'Create simplified or general ECL models to begin.' }} />
                </div>
              )
            },
            {
              value: 'counterparties',
              label: 'Counterparties',
              icon: Users,
              content: (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2 rounded-2xl border border-border-subtle p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <PartnerSelect label="Customer / counterparty" type="customer" value={selectedPartnerId} onChange={(e) => setSelectedPartnerId(e.target.value)} />
                      <Input label="Segment" value={profileForm.segment} onChange={(e) => setProfileForm((s) => ({ ...s, segment: e.target.value, business_partner_id: selectedPartnerId || s.business_partner_id }))} />
                      <Select label="Stage override" value={String(profileForm.stage_override ?? '')} onChange={(e) => setProfileForm((s) => ({ ...s, stage_override: e.target.value, business_partner_id: selectedPartnerId || s.business_partner_id }))} options={[{ value: '', label: 'No override' }, { value: '1', label: 'Stage 1' }, { value: '2', label: 'Stage 2' }, { value: '3', label: 'Stage 3' }]} />
                      <Select label="Status" value={profileForm.status} onChange={(e) => setProfileForm((s) => ({ ...s, status: e.target.value, business_partner_id: selectedPartnerId || s.business_partner_id }))} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                    </div>
                    <Textarea className="mt-3" label="Override reason" value={profileForm.override_reason} onChange={(e) => setProfileForm((s) => ({ ...s, override_reason: e.target.value, business_partner_id: selectedPartnerId || s.business_partner_id }))} />
                    <div className="mt-4 flex justify-end">
                      <Button variant="primary" onClick={() => upsertCounterpartyProfile.mutate()} disabled={!selectedPartnerId || upsertCounterpartyProfile.isPending}>Save profile</Button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-slate-50 p-4 text-sm text-slate-600">
                    Use counterparty-level staging overrides sparingly and always provide rationale. This aligns the frontend with backend profile retrieval and upsert support for partner-specific IFRS 9 treatment.
                  </div>
                </div>
              )
            },
            {
              value: 'scenarios',
              label: 'Macro scenarios',
              icon: GitBranch,
              content: (
                <div className="space-y-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="secondary" onClick={() => setOverlayOpen(true)}>Add overlay</Button>
                    <Button leftIcon={Plus} variant="primary" onClick={() => setScenarioOpen(true)}>New scenario</Button>
                  </div>
                  <DataTable columns={scenarioColumns} rows={scenarioRows} isLoading={macroScenariosQuery.isLoading} empty={{ title: 'No macro scenarios', description: 'Create base, upside, downside or custom scenarios for forward-looking ECL.' }} />
                </div>
              )
            },
            {
              value: 'sicr',
              label: 'SICR triggers',
              icon: AlertTriangle,
              content: (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button leftIcon={Plus} variant="primary" onClick={() => setSicrOpen(true)}>New trigger</Button>
                  </div>
                  <DataTable columns={sicrColumns} rows={sicrRows} isLoading={sicrTriggersQuery.isLoading} empty={{ title: 'No SICR triggers', description: 'Create qualitative significant increase in credit risk triggers.' }} />
                </div>
              )
            },
            {
              value: 'behavioral',
              label: 'Behavioral analytics',
              icon: Brain,
              content: (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border-subtle p-4">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <Input label="As of date" type="date" value={behavioralForm.as_of_date} onChange={(e) => setBehavioralForm((s) => ({ ...s, as_of_date: e.target.value }))} />
                      <Input label="Horizon months" type="number" value={behavioralForm.horizon_months} onChange={(e) => setBehavioralForm((s) => ({ ...s, horizon_months: e.target.value }))} />
                      <Input label="Transition window days" type="number" value={behavioralForm.transition_window_days} onChange={(e) => setBehavioralForm((s) => ({ ...s, transition_window_days: e.target.value }))} />
                      <label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm">
                        <input type="checkbox" checked={behavioralForm.persist_snapshot} onChange={(e) => setBehavioralForm((s) => ({ ...s, persist_snapshot: e.target.checked }))} />
                        Persist snapshot
                      </label>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button variant="primary" onClick={() => behavioralAnalytics.mutate()} disabled={!behavioralForm.as_of_date || behavioralAnalytics.isPending}>Run analytics</Button>
                    </div>
                  </div>
                  {behavioralResult ? (
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <StatCard label="Cure rate" value={percent(behavioralResult.cure_rate)} />
                        <StatCard label="Vintage multiplier" value={Number(behavioralResult.vintage_multiplier ?? 1).toFixed(2)} />
                        <StatCard label="Transition multiplier" value={Number(behavioralResult.transition_multiplier ?? 1).toFixed(2)} />
                        <StatCard label="LGD multiplier" value={Number(behavioralResult.lgd_multiplier ?? 1).toFixed(2)} />
                        <StatCard label="Loss-rate multiplier" value={Number(behavioralResult.loss_rate_multiplier ?? 1).toFixed(2)} />
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <ContentCard title="Cohorts">
                          <DataTable columns={cohortColumns} rows={behavioralResult.cohorts ?? []} empty={{ title: 'No cohort rows', description: 'No invoice history matched the selected window.' }} />
                        </ContentCard>
                        <ContentCard title="Transition matrix">
                          <DataTable columns={transitionColumns} rows={behavioralResult.transition_matrix ?? []} empty={{ title: 'No transitions', description: 'No transitions were generated.' }} />
                        </ContentCard>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            },
            {
              value: 'changes',
              label: 'Model changes',
              icon: Workflow,
              content: (
                <div className="space-y-4">
                  <div className="grid gap-3 lg:grid-cols-4">
                    <Select label="Status filter" value={changeStatusFilter} onChange={(e) => setChangeStatusFilter(e.target.value)} options={[{ value: '', label: 'All statuses' }, { value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'applied', label: 'Applied' }]} />
                    <div className="lg:col-span-3 flex items-end justify-end">
                      <Button leftIcon={Plus} variant="primary" onClick={() => setChangeOpen(true)}>New change request</Button>
                    </div>
                  </div>
                  <DataTable columns={modelChangeColumns} rows={modelChangeRows} isLoading={modelChangesQuery.isLoading} empty={{ title: 'No change requests', description: 'Draft settings, model, scenario or SICR changes for approval.' }} />
                </div>
              )
            },
            {
              value: 'runs',
              label: 'Runs',
              icon: Calculator,
              content: (
                <div className="space-y-4">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <Select label="Filter by period" value={runsPeriodId} onChange={(e) => setRunsPeriodId(e.target.value)} options={periodOptions} />
                    <div className="lg:col-span-2 rounded-2xl border border-border-subtle p-3 text-sm text-slate-600">Select a run to view line-level exposure, disclosure breakdowns, posting status and audit actions.</div>
                  </div>
                  <DataTable columns={runColumns} rows={runRows} isLoading={runsLoading} empty={{ title: 'No runs', description: 'Compute an ECL run for an open period.' }} />
                  <div className="rounded-2xl border border-border-subtle p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-brand-deep">Run detail</div>
                        <div className="text-xs text-slate-500">Detailed view for the selected run.</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => setFinalizeOpen(true)} disabled={!selectedRunId || !run || run.status !== 'computed'}>Finalize</Button>
                        <Button variant="primary" onClick={() => setPostOpen(true)} disabled={!selectedRunId || !run || !['finalized', 'posted'].includes(run.status)}>Post</Button>
                        <Button variant="secondary" leftIcon={RotateCcw} onClick={() => setReverseOpen(true)} disabled={!selectedRunId || !run || run.status !== 'posted'}>Reverse</Button>
                      </div>
                    </div>

                    {runDetailLoading ? <div className="mt-3 text-sm text-slate-500">Loading run detail…</div> : run ? (
                      <div className="mt-4 space-y-4">
                        <div className="grid gap-3 md:grid-cols-4">
                          <StatCard label="Status" value={run.status} hint={run.model_name ?? ''} />
                          <StatCard label="Exposure" value={formatMoney(run.total_exposure)} hint={`As of ${formatDate(run.as_of_date)}`} />
                          <StatCard label="Total ECL" value={formatMoney(run.total_ecl)} hint={`Prior ${formatMoney(run.prior_posted_ecl)}`} />
                          <StatCard label="Delta allowance" value={formatMoney(run.delta_allowance)} hint={run.journal_entry_id ? `Journal ${run.journal_entry_id}` : 'Not yet posted'} />
                        </div>
                        <DataTable columns={lineColumns} rows={runLines} empty={{ title: 'No line detail', description: 'No aggregated exposures were produced for this run.' }} />
                      </div>
                    ) : <div className="mt-3 text-sm text-slate-500">Select a run to inspect.</div>}
                  </div>
                </div>
              )
            },
            {
              value: 'reports',
              label: 'Disclosures',
              icon: BarChart3,
              content: (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border-subtle p-4 text-sm text-slate-600">
                    Disclosure reports are derived from the selected run and the currently selected allowance-movement period.
                  </div>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-4">
                      <ContentCard title="Breakdown by stage">
                        <DataTable columns={stageColumns} rows={disclosureQuery.data?.breakdown?.by_stage ?? []} empty={{ title: 'No stage breakdown', description: 'Select a run to load disclosure analytics.' }} />
                      </ContentCard>
                      <ContentCard title="Breakdown by bucket">
                        <DataTable columns={bucketColumns} rows={disclosureQuery.data?.breakdown?.by_bucket ?? []} empty={{ title: 'No bucket breakdown', description: 'This run may use general staging only, or no run is selected.' }} />
                      </ContentCard>
                    </div>
                    <div>
                      <ContentCard title="Top counterparties">
                        <DataTable columns={topCounterpartyColumns} rows={disclosureQuery.data?.breakdown?.top_counterparties ?? []} empty={{ title: 'No counterparties', description: 'Compute or select a run first.' }} />
                      </ContentCard>
                    </div>
                  </div>
                </div>
              )
            }
          ]}
        />
      </ContentCard>

      <Modal open={modelOpen} title="New ECL model" onClose={() => setModelOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModelOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => createModel.mutate()} disabled={createModel.isPending}>Create</Button></div>}>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Code (optional)" value={modelForm.code} onChange={(e) => setModelForm((s) => ({ ...s, code: e.target.value }))} />
          <Input label="Name" value={modelForm.name} onChange={(e) => setModelForm((s) => ({ ...s, name: e.target.value }))} />
          <Select label="Model type" value={modelForm.model_type} onChange={(e) => setModelForm((s) => ({ ...s, model_type: e.target.value }))} options={[{ value: 'SIMPLIFIED', label: 'Simplified' }, { value: 'GENERAL', label: 'General' }]} />
        </div>
        <Textarea className="mt-3" label="Description" value={modelForm.description} onChange={(e) => setModelForm((s) => ({ ...s, description: e.target.value }))} />
      </Modal>

      <Modal open={bucketOpen} title={`Add simplified bucket — ${bucketTarget?.name ?? ''}`} onClose={() => setBucketOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setBucketOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => addBucket.mutate()} disabled={addBucket.isPending}>Save bucket</Button></div>}>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Label" value={bucketForm.label} onChange={(e) => setBucketForm((s) => ({ ...s, label: e.target.value }))} />
          <Input label="Days past due from" type="number" value={bucketForm.days_past_due_from} onChange={(e) => setBucketForm((s) => ({ ...s, days_past_due_from: e.target.value }))} />
          <Input label="Days past due to" type="number" value={bucketForm.days_past_due_to} onChange={(e) => setBucketForm((s) => ({ ...s, days_past_due_to: e.target.value }))} />
          <Input label="Loss rate" type="number" step="0.0001" value={bucketForm.loss_rate} onChange={(e) => setBucketForm((s) => ({ ...s, loss_rate: e.target.value }))} />
        </div>
      </Modal>

      <Modal open={parameterOpen} title={`Add general parameter — ${parameterTarget?.name ?? ''}`} onClose={() => setParameterOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setParameterOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => addParameter.mutate()} disabled={addParameter.isPending}>Save parameter</Button></div>}>
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Stage" value={String(parameterForm.stage)} onChange={(e) => setParameterForm((s) => ({ ...s, stage: e.target.value }))} options={[{ value: '1', label: 'Stage 1' }, { value: '2', label: 'Stage 2' }, { value: '3', label: 'Stage 3' }]} />
          <Input label="Label" value={parameterForm.label} onChange={(e) => setParameterForm((s) => ({ ...s, label: e.target.value }))} />
          <Input label="Days past due from" type="number" value={parameterForm.days_past_due_from} onChange={(e) => setParameterForm((s) => ({ ...s, days_past_due_from: e.target.value }))} />
          <Input label="Days past due to" type="number" value={parameterForm.days_past_due_to} onChange={(e) => setParameterForm((s) => ({ ...s, days_past_due_to: e.target.value }))} />
          <Input label="12-month PD" type="number" step="0.0001" value={parameterForm.pd_12m} onChange={(e) => setParameterForm((s) => ({ ...s, pd_12m: e.target.value }))} />
          <Input label="Lifetime PD" type="number" step="0.0001" value={parameterForm.pd_lifetime} onChange={(e) => setParameterForm((s) => ({ ...s, pd_lifetime: e.target.value }))} />
          <Input label="LGD (optional)" type="number" step="0.0001" value={parameterForm.lgd} onChange={(e) => setParameterForm((s) => ({ ...s, lgd: e.target.value }))} />
        </div>
      </Modal>

      <Modal open={computeOpen} title="Compute ECL" onClose={() => setComputeOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setComputeOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => computeRun.mutate()} disabled={computeRun.isPending}>Compute</Button></div>}>
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Period" value={computeForm.period_id} onChange={(e) => setComputeForm((s) => ({ ...s, period_id: e.target.value }))} options={periodOptions} />
          <Select label="Model" value={computeForm.model_id} onChange={(e) => setComputeForm((s) => ({ ...s, model_id: e.target.value }))} options={modelOptions} />
          <Input label="As of date (optional)" type="date" value={computeForm.as_of_date} onChange={(e) => setComputeForm((s) => ({ ...s, as_of_date: e.target.value }))} />
          <Select label="Primary scenario (optional)" value={computeForm.scenario_ids[0] ?? ''} onChange={(e) => setComputeForm((s) => ({ ...s, scenario_ids: e.target.value ? [e.target.value] : [] }))} options={scenarioOptions} />
          <label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm md:col-span-2">
            <input type="checkbox" checked={computeForm.use_behavioral_metrics} onChange={(e) => setComputeForm((s) => ({ ...s, use_behavioral_metrics: e.target.checked }))} />
            Apply behavioral analytics multipliers during compute
          </label>
        </div>
        <Textarea className="mt-3" label="Memo (optional)" value={computeForm.memo} onChange={(e) => setComputeForm((s) => ({ ...s, memo: e.target.value }))} />
      </Modal>

      <ConfirmDialog open={finalizeOpen} title="Finalize selected run" message="Finalizing locks the run for audit and enables controlled posting." confirmText="Finalize" onClose={() => setFinalizeOpen(false)} onConfirm={() => finalizeRun.mutate()} />

      <Modal open={postOpen} title="Post ECL journal" onClose={() => setPostOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setPostOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => postRun.mutate()} disabled={postRun.isPending}>Post</Button></div>}>
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Posting period" value={postForm.period_id} onChange={(e) => setPostForm((s) => ({ ...s, period_id: e.target.value }))} options={periodOptions} />
          <Input label="Entry date" type="date" value={postForm.entry_date} onChange={(e) => setPostForm((s) => ({ ...s, entry_date: e.target.value }))} />
        </div>
        <Input className="mt-3" label="Memo" value={postForm.memo} onChange={(e) => setPostForm((s) => ({ ...s, memo: e.target.value }))} />
      </Modal>

      <Modal open={reverseOpen} title="Reverse IFRS 9 posting" onClose={() => setReverseOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setReverseOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => reverseRun.mutate()} disabled={reverseRun.isPending}>Reverse</Button></div>}>
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Target period" value={reverseForm.target_period_id} onChange={(e) => setReverseForm((s) => ({ ...s, target_period_id: e.target.value }))} options={periodOptions} />
          <Input label="Entry date" type="date" value={reverseForm.entry_date} onChange={(e) => setReverseForm((s) => ({ ...s, entry_date: e.target.value }))} />
        </div>
        <Textarea className="mt-3" label="Reason" value={reverseForm.reason} onChange={(e) => setReverseForm((s) => ({ ...s, reason: e.target.value }))} />
      </Modal>

      <Modal open={scenarioOpen} title="New macro scenario" onClose={() => setScenarioOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setScenarioOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => createScenario.mutate()} disabled={createScenario.isPending}>Save scenario</Button></div>}>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Code (optional)" value={scenarioForm.code} onChange={(e) => setScenarioForm((s) => ({ ...s, code: e.target.value }))} />
          <Input label="Name" value={scenarioForm.name} onChange={(e) => setScenarioForm((s) => ({ ...s, name: e.target.value }))} />
          <Select label="Scenario type" value={scenarioForm.scenario_type} onChange={(e) => setScenarioForm((s) => ({ ...s, scenario_type: e.target.value }))} options={[{ value: 'BASE', label: 'Base' }, { value: 'UPSIDE', label: 'Upside' }, { value: 'DOWNSIDE', label: 'Downside' }, { value: 'CUSTOM', label: 'Custom' }]} />
          <Input label="Probability weight" type="number" step="0.0001" value={scenarioForm.probability_weight} onChange={(e) => setScenarioForm((s) => ({ ...s, probability_weight: e.target.value }))} />
          <Input label="Effective from" type="date" value={scenarioForm.effective_from} onChange={(e) => setScenarioForm((s) => ({ ...s, effective_from: e.target.value }))} />
          <Input label="Effective to" type="date" value={scenarioForm.effective_to} onChange={(e) => setScenarioForm((s) => ({ ...s, effective_to: e.target.value }))} />
          <Select label="Status" value={scenarioForm.status} onChange={(e) => setScenarioForm((s) => ({ ...s, status: e.target.value }))} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </div>
        <Textarea className="mt-3" label="Description" value={scenarioForm.description} onChange={(e) => setScenarioForm((s) => ({ ...s, description: e.target.value }))} />
        <Textarea className="mt-3" label="Variable set JSON" rows={8} value={scenarioForm.variable_set_json} onChange={(e) => setScenarioForm((s) => ({ ...s, variable_set_json: e.target.value }))} />
      </Modal>

      <Modal open={overlayOpen} title="Add scenario overlay" onClose={() => setOverlayOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOverlayOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => addOverlay.mutate()} disabled={addOverlay.isPending || !overlayForm.scenario_id}>Save overlay</Button></div>}>
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Scenario" value={overlayForm.scenario_id} onChange={(e) => setOverlayForm((s) => ({ ...s, scenario_id: e.target.value }))} options={scenarioOptions} />
          <Select label="Model (optional)" value={overlayForm.model_id} onChange={(e) => setOverlayForm((s) => ({ ...s, model_id: e.target.value }))} options={modelOptions} />
          <Input label="Segment (optional)" value={overlayForm.segment} onChange={(e) => setOverlayForm((s) => ({ ...s, segment: e.target.value }))} />
          <Select label="Stage (optional)" value={overlayForm.stage} onChange={(e) => setOverlayForm((s) => ({ ...s, stage: e.target.value }))} options={[{ value: '', label: 'Any' }, { value: '1', label: 'Stage 1' }, { value: '2', label: 'Stage 2' }, { value: '3', label: 'Stage 3' }]} />
          <Input label="Days past due from" type="number" value={overlayForm.days_past_due_from} onChange={(e) => setOverlayForm((s) => ({ ...s, days_past_due_from: e.target.value }))} />
          <Input label="Days past due to" type="number" value={overlayForm.days_past_due_to} onChange={(e) => setOverlayForm((s) => ({ ...s, days_past_due_to: e.target.value }))} />
          <Input label="PD multiplier" type="number" step="0.0001" value={overlayForm.pd_multiplier} onChange={(e) => setOverlayForm((s) => ({ ...s, pd_multiplier: e.target.value }))} />
          <Input label="LGD multiplier" type="number" step="0.0001" value={overlayForm.lgd_multiplier} onChange={(e) => setOverlayForm((s) => ({ ...s, lgd_multiplier: e.target.value }))} />
          <Input label="Loss-rate multiplier" type="number" step="0.0001" value={overlayForm.loss_rate_multiplier} onChange={(e) => setOverlayForm((s) => ({ ...s, loss_rate_multiplier: e.target.value }))} />
          <Input label="ECL multiplier" type="number" step="0.0001" value={overlayForm.ecl_multiplier} onChange={(e) => setOverlayForm((s) => ({ ...s, ecl_multiplier: e.target.value }))} />
        </div>
        <Textarea className="mt-3" label="Notes" value={overlayForm.notes} onChange={(e) => setOverlayForm((s) => ({ ...s, notes: e.target.value }))} />
      </Modal>

      <Modal open={sicrOpen} title="New SICR trigger" onClose={() => setSicrOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setSicrOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => createSicr.mutate()} disabled={createSicr.isPending}>Save trigger</Button></div>}>
        <div className="grid gap-3 md:grid-cols-2">
          <PartnerSelect label="Partner (optional)" type="customer" value={sicrForm.business_partner_id} onChange={(e) => setSicrForm((s) => ({ ...s, business_partner_id: e.target.value }))} />
          <Input label="Segment (optional)" value={sicrForm.segment} onChange={(e) => setSicrForm((s) => ({ ...s, segment: e.target.value }))} />
          <Input label="Trigger code" value={sicrForm.trigger_code} onChange={(e) => setSicrForm((s) => ({ ...s, trigger_code: e.target.value }))} />
          <Input label="Trigger name" value={sicrForm.trigger_name} onChange={(e) => setSicrForm((s) => ({ ...s, trigger_name: e.target.value }))} />
          <Select label="Severity" value={sicrForm.severity} onChange={(e) => setSicrForm((s) => ({ ...s, severity: e.target.value }))} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }]} />
          <Select label="Force minimum stage" value={sicrForm.force_stage_min} onChange={(e) => setSicrForm((s) => ({ ...s, force_stage_min: e.target.value }))} options={[{ value: '', label: 'No forced stage' }, { value: '1', label: 'Stage 1' }, { value: '2', label: 'Stage 2' }, { value: '3', label: 'Stage 3' }]} />
          <Input label="PD multiplier" type="number" step="0.0001" value={sicrForm.pd_multiplier} onChange={(e) => setSicrForm((s) => ({ ...s, pd_multiplier: e.target.value }))} />
          <Input label="LGD multiplier" type="number" step="0.0001" value={sicrForm.lgd_multiplier} onChange={(e) => setSicrForm((s) => ({ ...s, lgd_multiplier: e.target.value }))} />
          <Input label="Valid from" type="date" value={sicrForm.valid_from} onChange={(e) => setSicrForm((s) => ({ ...s, valid_from: e.target.value }))} />
          <Input label="Valid to" type="date" value={sicrForm.valid_to} onChange={(e) => setSicrForm((s) => ({ ...s, valid_to: e.target.value }))} />
          <Input label="Source" value={sicrForm.source} onChange={(e) => setSicrForm((s) => ({ ...s, source: e.target.value }))} />
          <Select label="Status" value={sicrForm.status} onChange={(e) => setSicrForm((s) => ({ ...s, status: e.target.value }))} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </div>
        <Textarea className="mt-3" label="Notes" value={sicrForm.notes} onChange={(e) => setSicrForm((s) => ({ ...s, notes: e.target.value }))} />
        <Textarea className="mt-3" label="Metadata JSON" rows={6} value={sicrForm.metadata_json} onChange={(e) => setSicrForm((s) => ({ ...s, metadata_json: e.target.value }))} />
      </Modal>

      <Modal open={changeOpen} title="New model change request" onClose={() => setChangeOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setChangeOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => createModelChange.mutate()} disabled={createModelChange.isPending}>Save draft</Button></div>}>
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Change type" value={changeForm.change_type} onChange={(e) => setChangeForm((s) => ({ ...s, change_type: e.target.value }))} options={[
            { value: 'SETTINGS_UPSERT', label: 'Settings upsert' },
            { value: 'MODEL_CREATE', label: 'Model create' },
            { value: 'BUCKET_ADD', label: 'Bucket add' },
            { value: 'PARAMETER_ADD', label: 'Parameter add' },
            { value: 'SCENARIO_CREATE', label: 'Scenario create' },
            { value: 'SCENARIO_OVERLAY_UPSERT', label: 'Scenario overlay upsert' },
            { value: 'SICR_TRIGGER_UPSERT', label: 'SICR trigger upsert' }
          ]} />
          <Select label="Model (optional)" value={changeForm.model_id} onChange={(e) => setChangeForm((s) => ({ ...s, model_id: e.target.value }))} options={modelOptions} />
          <Input className="md:col-span-2" label="Title" value={changeForm.title} onChange={(e) => setChangeForm((s) => ({ ...s, title: e.target.value }))} />
        </div>
        <Textarea className="mt-3" label="Reason" value={changeForm.reason} onChange={(e) => setChangeForm((s) => ({ ...s, reason: e.target.value }))} />
        <Textarea className="mt-3" label="Payload JSON" rows={10} value={changeForm.payload_json} onChange={(e) => setChangeForm((s) => ({ ...s, payload_json: e.target.value }))} />
      </Modal>
    </div>
  );
}
