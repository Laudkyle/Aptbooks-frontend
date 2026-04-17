import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle,
  Download,
  ExternalLink,
  FileText,
  Filter,
  History,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Sparkles,
  Wrench,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Calendar,
  BarChart3,
  Activity,
  Shield,
  Database,
} from 'lucide-react';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeReconciliationApi } from '../api/reconciliation.api.js';
import { makePeriodsApi } from '../../periods/api/periods.api.js';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { downloadBlob, filenameFromContentDisposition } from '../../../../shared/utils/fileDownload.js';

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function StatCard({ label, value, hint, tone = 'default', icon: Icon, trend }) {
  const gradients = {
    default: 'from-white to-gray-50/50 border-gray-200',
    success: 'from-emerald-50 to-emerald-50/30 border-emerald-200',
    danger: 'from-red-50 to-red-50/30 border-red-200',
    warning: 'from-amber-50 to-amber-50/30 border-amber-200',
    info: 'from-blue-50 to-blue-50/30 border-blue-200',
  };

  const iconColors = {
    default: 'text-gray-400 bg-gray-100',
    success: 'text-emerald-600 bg-emerald-100',
    danger: 'text-red-600 bg-red-100',
    warning: 'text-amber-600 bg-amber-100',
    info: 'text-blue-600 bg-blue-100',
  };

  return (
    <div className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br ${gradients[tone]} p-5 transition-all duration-200 hover:shadow-md`}>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/[0.02] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
            {trend !== undefined && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              </span>
            )}
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{value}</div>
          {hint && <div className="mt-1.5 text-xs text-gray-500">{hint}</div>}
        </div>
        {Icon && (
          <div className={`rounded-lg p-2.5 ${iconColors[tone]} transition-transform duration-200 group-hover:scale-105`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, actions, children, variant = 'default' }) {
  const variants = {
    default: 'border-gray-200 bg-white',
    elevated: 'border-gray-200 bg-white shadow-lg',
    highlight: 'border-blue-200 bg-gradient-to-br from-blue-50/50 to-white',
  };

  return (
    <div className={`overflow-hidden rounded-xl border ${variants[variant]} transition-shadow duration-200 hover:shadow-md`}>
      <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-transparent px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function StatusBadge({ status, icon: Icon }) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  const getStatusStyle = (status) => {
    const statusMap = {
      'Reconciled': 'success',
      'Issues found': 'warning',
      'COMPLETED': 'success',
      'OPEN': 'success',
      'CLOSED': 'neutral',
      'PENDING': 'warning',
      'FAILED': 'danger',
    };
    return styles[statusMap[status] || 'neutral'];
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusStyle(status)}`}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {status}
    </span>
  );
}

export default function Reconciliation() {
  const { http } = useApi();
  const api = useMemo(() => makeReconciliationApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [periodId, setPeriodId] = useState('');
  const [showOnlyMismatches, setShowOnlyMismatches] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [showAutoCorrectModal, setShowAutoCorrectModal] = useState(false);
  const [showRebuildModal, setShowRebuildModal] = useState(false);
  const [policyDraft, setPolicyDraft] = useState(null);
  const [autoCorrectThreshold, setAutoCorrectThreshold] = useState('0.01');
  const [exportFormat, setExportFormat] = useState('csv');

  const periodsQ = useQuery({
    queryKey: ['periods'],
    queryFn: periodsApi.list,
    staleTime: 10_000,
  });

  const reconcileQ = useQuery({
    queryKey: ['reconcile-period', periodId, showOnlyMismatches],
    queryFn: () => api.period({ periodId, onlyMismatches: showOnlyMismatches }),
    enabled: !!periodId,
  });

  const discrepancyDetailsQ = useQuery({
    queryKey: ['reconciliation-discrepancy-details', periodId, selectedAccountId],
    queryFn: () => api.getDiscrepancyDetails({ periodId, accountId: selectedAccountId }),
    enabled: !!periodId && !!selectedAccountId && showDiscrepancyModal,
  });

  const historyQ = useQuery({
    queryKey: ['reconciliation-history', periodId],
    queryFn: () => api.history({ periodId, limit: 12 }),
    enabled: !!periodId,
  });

  const policyQ = useQuery({
    queryKey: ['reconciliation-policy'],
    queryFn: api.getPolicy,
  });

  React.useEffect(() => {
    if (policyQ.data?.data) {
      const policy = policyQ.data.data;
      setPolicyDraft({
        defaultThreshold: String(policy.defaultThreshold ?? 0.01),
        exactMatchTolerance: String(policy.exactMatchTolerance ?? 0.005),
        thresholdsByAccountType: {
          ASSET: String(policy.thresholdsByAccountType?.ASSET ?? 0.01),
          LIABILITY: String(policy.thresholdsByAccountType?.LIABILITY ?? 0.01),
          EQUITY: String(policy.thresholdsByAccountType?.EQUITY ?? 0.01),
          REVENUE: String(policy.thresholdsByAccountType?.REVENUE ?? 0.01),
          EXPENSE: String(policy.thresholdsByAccountType?.EXPENSE ?? 0.01),
        },
      });
      setAutoCorrectThreshold(String(policy.defaultThreshold ?? 0.01));
    }
  }, [policyQ.data]);

  const autoCorrectMutation = useMutation({
    mutationFn: ({ dryRun }) => api.autoCorrect({
      periodId,
      threshold: parseFloat(autoCorrectThreshold),
      dryRun,
    }),
    onSuccess: (payload) => {
      const data = payload?.data;
      if (data?.dryRun) {
        toast.success(`Preview ready: ${data.summary.correctableAccounts} account(s) can be corrected.`);
        return;
      }
      toast.success(`Applied corrections to ${data?.summary?.correctableAccounts ?? 0} account(s).`);
      qc.invalidateQueries({ queryKey: ['reconcile-period'] });
      qc.invalidateQueries({ queryKey: ['reconciliation-history', periodId] });
      setShowAutoCorrectModal(false);
    },
    onError: (error) => {
      toast.error(error?.message ?? 'Auto-correction failed');
    },
  });

  const rebuildMutation = useMutation({
    mutationFn: ({ dryRun }) => api.rebuildBalances({ periodId, dryRun }),
    onSuccess: (payload) => {
      const data = payload?.data;
      if (data?.dryRun) {
        toast.success(`Preview ready: ${data.rowsToRebuild} balance row(s) would be rebuilt.`);
        return;
      }
      toast.success('Ledger balance cache rebuilt successfully.');
      qc.invalidateQueries({ queryKey: ['reconcile-period'] });
      qc.invalidateQueries({ queryKey: ['reconciliation-history', periodId] });
      setShowRebuildModal(false);
    },
    onError: (error) => {
      toast.error(error?.message ?? 'Rebuild failed');
    },
  });

  const savePolicyMutation = useMutation({
    mutationFn: () => api.updatePolicy({
      defaultThreshold: parseFloat(policyDraft?.defaultThreshold || 0),
      exactMatchTolerance: parseFloat(policyDraft?.exactMatchTolerance || 0),
      thresholdsByAccountType: Object.fromEntries(
        Object.entries(policyDraft?.thresholdsByAccountType || {}).map(([k, v]) => [k, parseFloat(v || 0)])
      ),
    }),
    onSuccess: () => {
      toast.success('Reconciliation policy updated.');
      qc.invalidateQueries({ queryKey: ['reconciliation-policy'] });
      qc.invalidateQueries({ queryKey: ['reconcile-period'] });
    },
    onError: (error) => {
      toast.error(error?.message ?? 'Policy update failed');
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => api.exportReconciliation({
      periodId,
      onlyMismatches: showOnlyMismatches,
      format: exportFormat,
    }),
    onSuccess: ({ blob, headers }) => {
      const name = filenameFromContentDisposition(headers?.['content-disposition'])
        || `ledger-reconciliation-${periodId}.${exportFormat}`;
      downloadBlob(blob, name);
      toast.success(`Exported reconciliation as ${exportFormat.toUpperCase()}.`);
    },
    onError: (error) => {
      toast.error(error?.message ?? 'Export failed');
    },
  });

  const periodOptions = [{ value: '', label: 'Select period…' }].concat(
    (periodsQ.data ?? []).map((p) => ({ value: p.id, label: p.code }))
  );

  const reconciliationData = reconcileQ.data?.data;
  const discrepancyDetails = discrepancyDetailsQ.data?.data;
  const historyRows = historyQ.data?.data ?? [];
  const autoCorrectPreview = autoCorrectMutation.data?.data;
  const rebuildPreview = rebuildMutation.data?.data;
  const diffs = reconciliationData?.diffs ?? [];
  const selectedPeriod = (periodsQ.data ?? []).find((p) => p.id === periodId);

  const isReconciled = reconciliationData?.ok === true;
  const accountsCompared = reconciliationData?.summary?.accountsCompared || 0;
  const mismatchCount = reconciliationData?.summary?.mismatches || 0;
  const exactMismatchCount = reconciliationData?.summary?.exactMismatches || 0;
  const correctableAccounts = reconciliationData?.summary?.correctableAccounts || 0;
  const totalVariance = reconciliationData?.summary?.totalVariance || 0;
  const policy = reconciliationData?.policy || policyQ.data?.data;

  const closeDetails = () => {
    setShowDiscrepancyModal(false);
    setSelectedAccountId(null);
  };

  const handleViewDetails = (accountId) => {
    setSelectedAccountId(accountId);
    setShowDiscrepancyModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-gray-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2 shadow-lg shadow-blue-500/20">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900">Ledger Reconciliation</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Reconcile stored GL balances against posted journal totals with audit trail
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                <Select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  options={[
                    { value: 'csv', label: 'CSV' },
                    { value: 'json', label: 'JSON' },
                  ]}
                  className="min-w-[100px] border-0 bg-transparent text-sm"
                />
                <button
                  onClick={() => exportMutation.mutate()}
                  disabled={!periodId || exportMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {exportMutation.isPending ? 'Exporting...' : 'Export'}
                </button>
              </div>
              
              <button
                onClick={() => reconcileQ.refetch()}
                disabled={!periodId || reconcileQ.isFetching}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${reconcileQ.isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button
                onClick={() => setShowRebuildModal(true)}
                disabled={!periodId}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 shadow-sm transition-all hover:bg-amber-100 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Database className="h-4 w-4" />
                Rebuild
              </button>
              
              {mismatchCount > 0 && (
                <button
                  onClick={() => setShowAutoCorrectModal(true)}
                  disabled={!periodId}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  Auto-Correct
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Period Selection and Policy Section */}
        <div className="mb-8 grid gap-6 lg:grid-cols-[0.8fr_1fr]">
          <SectionCard
            title="Reconciliation Setup"
            subtitle="Select accounting period and configure display options"
          >
            <div className="space-y-4">
              <div className="relative">
                <Select
                  label={
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Accounting Period
                    </span>
                  }
                  value={periodId}
                  onChange={(e) => setPeriodId(e.target.value)}
                  options={periodOptions}
                  className="w-full"
                />
              </div>
              
              {selectedPeriod && (
                <div className="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Selected Period</div>
                      <div className="mt-1 text-base font-semibold text-gray-900">
                        {selectedPeriod.code}
                        {selectedPeriod.name && (
                          <span className="ml-2 text-sm font-normal text-gray-600">• {selectedPeriod.name}</span>
                        )}
                      </div>
                    </div>
                    {reconciliationData?.periodStatus && (
                      <StatusBadge 
                        status={reconciliationData.periodStatus} 
                        icon={Activity}
                      />
                    )}
                  </div>
                  
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => setShowOnlyMismatches((v) => !v)}
                      className={`group inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                        showOnlyMismatches 
                          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' 
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:shadow-sm'
                      }`}
                    >
                      <Filter className="h-4 w-4 transition-transform group-hover:scale-110" />
                      {showOnlyMismatches ? 'Showing Mismatches Only' : 'Show Mismatches Only'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Materiality Policy"
            subtitle="Configure thresholds and tolerances"
            variant="highlight"
            actions={
              <button
                onClick={() => savePolicyMutation.mutate()}
                disabled={!policyDraft || savePolicyMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-gray-900/20 transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savePolicyMutation.isPending ? 'Saving...' : 'Save Policy'}
              </button>
            }
          >
            {policyDraft ? (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Default Threshold
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={policyDraft.defaultThreshold}
                        onChange={(e) => setPolicyDraft((prev) => ({ ...prev, defaultThreshold: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm shadow-sm transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Exact Match Tolerance
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.001"
                        value={policyDraft.exactMatchTolerance}
                        onChange={(e) => setPolicyDraft((prev) => ({ ...prev, exactMatchTolerance: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm shadow-sm transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Thresholds by Account Type
                    </span>
                  </div>
                  <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
                    {Object.entries(policyDraft.thresholdsByAccountType).map(([key, value]) => (
                      <label key={key} className="block">
                        <span className="mb-1.5 block text-xs font-medium text-gray-600">{key}</span>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={value}
                            onChange={(e) => setPolicyDraft((prev) => ({
                              ...prev,
                              thresholdsByAccountType: {
                                ...prev.thresholdsByAccountType,
                                [key]: e.target.value,
                              },
                            }))}
                            className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-7 pr-2 text-sm shadow-sm transition-all focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            )}
          </SectionCard>
        </div>

        {/* Main Content Area */}
        {!periodId ? (
          <SectionCard title="No Period Selected" subtitle="Choose an accounting period to begin reconciliation">
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <BarChart3 className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Ready to reconcile</h3>
              <p className="mt-2 text-sm text-gray-500">
                Select an accounting period above to start the reconciliation process
              </p>
            </div>
          </SectionCard>
        ) : reconcileQ.isLoading ? (
          <SectionCard title="Running Reconciliation" subtitle="Comparing ledger balances to journal totals">
            <div className="py-16 text-center">
              <div className="relative mx-auto mb-6 h-20 w-20">
                <div className="absolute inset-0 animate-ping rounded-full bg-blue-100"></div>
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                  <RefreshCw className="h-10 w-10 animate-spin text-blue-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Processing reconciliation</h3>
              <p className="mt-2 text-sm text-gray-500">This may take a moment for large periods</p>
            </div>
          </SectionCard>
        ) : reconcileQ.isError ? (
          <SectionCard title="Reconciliation Failed" subtitle="Unable to complete the reconciliation request">
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-900">Error occurred</h3>
              <p className="mt-2 text-sm text-red-600">
                {reconcileQ.error?.message ?? 'Failed to load reconciliation data.'}
              </p>
            </div>
          </SectionCard>
        ) : (
          <>
            {/* Warnings */}
            {reconciliationData?.warnings?.length > 0 && (
              <div className="mb-6 space-y-3">
                {reconciliationData.warnings.map((warning, idx) => (
                  <div key={idx} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-sm">
                    <div className="rounded-full bg-amber-100 p-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="text-sm font-medium text-amber-800">{warning}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Stats Grid */}
            <div className="mb-8 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
              <StatCard
                label="Status"
                value={isReconciled ? 'Reconciled' : 'Issues Found'}
                hint={isReconciled ? 'All accounts within thresholds' : 'Review discrepancies below'}
                tone={isReconciled ? 'success' : 'warning'}
                icon={isReconciled ? CheckCircle : AlertTriangle}
              />
              <StatCard
                label="Accounts Compared"
                value={accountsCompared.toLocaleString()}
                hint="Total accounts scanned"
                icon={FileText}
                tone="info"
              />
              <StatCard
                label="Material Mismatches"
                value={mismatchCount.toLocaleString()}
                hint="Beyond threshold"
                tone={mismatchCount ? 'danger' : 'success'}
                icon={XCircle}
                trend={mismatchCount}
              />
              <StatCard
                label="Exact Mismatches"
                value={exactMismatchCount.toLocaleString()}
                hint="Technical differences"
                tone={exactMismatchCount ? 'warning' : 'success'}
                icon={Search}
              />
              <StatCard
                label="Total Variance"
                value={formatMoney(totalVariance)}
                hint={`${correctableAccounts} correctable`}
                tone={totalVariance ? 'danger' : 'success'}
                icon={Sparkles}
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
              <SectionCard
                title="Account Discrepancies"
                subtitle="Investigate and drill down into account-level differences"
                actions={
                  <div className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                    Threshold: {formatMoney(policy?.defaultThreshold || 0)}
                  </div>
                }
              >
                {diffs.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                      <CheckCircle className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">All balanced</h3>
                    <p className="mt-2 text-sm text-gray-500">No discrepancies found for this period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px]">
                      <thead>
                        <tr className="border-b border-gray-200 text-left">
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Account</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">GL Balance</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Recomputed</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Variance</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Threshold</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {diffs.map((diff) => {
                          const materialIssue = !diff.isMatch;
                          return (
                            <tr 
                              key={diff.accountId} 
                              className={`group transition-colors ${
                                materialIssue 
                                  ? 'bg-gradient-to-r from-red-50/50 to-transparent hover:from-red-50' 
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <td className="px-4 py-4 align-top">
                                <div className="font-mono text-sm font-semibold text-gray-900">
                                  {diff.accountCode || '—'}
                                </div>
                                <div className="mt-1 text-sm text-gray-600">
                                  {diff.accountName || 'Unnamed account'}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                                  {diff.accountTypeName || diff.accountType || '—'}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-right font-mono text-sm text-gray-900">
                                {formatMoney(diff.glBalance)}
                              </td>
                              <td className="px-4 py-4 text-right font-mono text-sm text-gray-900">
                                {formatMoney(diff.recomputedBalance)}
                              </td>
                              <td className={`px-4 py-4 text-right font-mono text-sm font-semibold ${
                                materialIssue ? 'text-red-600' : 'text-emerald-600'
                              }`}>
                                {formatMoney(Math.abs(diff.balanceDifference || 0))}
                              </td>
                              <td className="px-4 py-4 text-right font-mono text-sm text-gray-500">
                                {formatMoney(diff.materialityThreshold)}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <StatusBadge 
                                  status={materialIssue ? 'Out of balance' : diff.technicalMatch ? 'Balanced' : 'Within threshold'}
                                  icon={materialIssue ? XCircle : diff.technicalMatch ? CheckCircle : AlertTriangle}
                                />
                              </td>
                              <td className="px-4 py-4 text-center">
                                <button
                                  onClick={() => handleViewDetails(diff.accountId)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 opacity-0 transition-all hover:bg-blue-100 group-hover:opacity-100"
                                >
                                  <Search className="h-3.5 w-3.5" />
                                  Investigate
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>

              <SectionCard 
                title="Audit Trail" 
                subtitle="Recent reconciliation history"
                actions={
                  <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1">
                    <History className="h-3.5 w-3.5 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">Last 12 runs</span>
                  </div>
                }
              >
                {historyQ.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : historyQ.isError ? (
                  <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    {historyQ.error?.message ?? 'Failed to load history.'}
                  </div>
                ) : historyRows.length === 0 ? (
                  <div className="py-12 text-center">
                    <History className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-3 text-sm font-medium text-gray-500">No history yet</p>
                    <p className="mt-1 text-xs text-gray-400">Run a reconciliation to see audit trail</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyRows.map((row) => (
                      <div 
                        key={row.id} 
                        className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-gray-100 to-gray-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-gray-700">
                                <Activity className="h-3 w-3" />
                                {String(row.action_type || '').replace(/_/g, ' ')}
                              </span>
                              <StatusBadge status={row.status || 'PENDING'} />
                            </div>
                            <div className="mt-2 text-sm font-medium text-gray-900">
                              {row.triggered_by_name || row.triggered_by_email || 'System'}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {formatDateTime(row.created_at)}
                            </div>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-3 text-right">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              <span className="text-gray-500">Accounts:</span>
                              <span className="font-medium text-gray-900">
                                {Number(row.accounts_compared || 0).toLocaleString()}
                              </span>
                              <span className="text-gray-500">Mismatches:</span>
                              <span className={`font-medium ${row.mismatch_count ? 'text-red-600' : 'text-gray-900'}`}>
                                {Number(row.mismatch_count || 0).toLocaleString()}
                              </span>
                              <span className="text-gray-500">Variance:</span>
                              <span className={`font-medium ${row.total_variance ? 'text-red-600' : 'text-gray-900'}`}>
                                {formatMoney(row.total_variance || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </>
        )}
      </div>

      {/* Discrepancy Details Modal */}
      {showDiscrepancyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Discrepancy Investigation</h2>
                {discrepancyDetails?.account ? (
                  <p className="mt-1 text-sm text-gray-600">
                    {discrepancyDetails.account.code} · {discrepancyDetails.account.name}
                  </p>
                ) : null}
              </div>
              <button onClick={closeDetails} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-84px)] overflow-y-auto px-6 py-5">
              {discrepancyDetailsQ.isLoading ? (
                <div className="py-10 text-center">
                  <RefreshCw className="mx-auto mb-3 h-10 w-10 animate-spin text-blue-500" />
                  <p className="text-sm text-gray-500">Loading account investigation…</p>
                </div>
              ) : discrepancyDetailsQ.isError ? (
                <div className="py-10 text-center">
                  <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
                  <p className="text-sm text-red-600">
                    {discrepancyDetailsQ.error?.message ?? 'Failed to load discrepancy details.'}
                  </p>
                </div>
              ) : discrepancyDetails ? (
                <>
                  <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <StatCard label="Transactions" value={String(discrepancyDetails.summary.transactionCount || 0)} icon={FileText} tone="info" />
                    <StatCard label="GL Balance" value={formatMoney(discrepancyDetails.summary.glBalance)} icon={FileText} />
                    <StatCard label="Computed Balance" value={formatMoney(discrepancyDetails.summary.computedBalance)} icon={RotateCcw} />
                    <StatCard label="Variance" value={formatMoney(Math.abs(discrepancyDetails.summary.variance || 0))} tone="danger" icon={AlertTriangle} />
                    <StatCard label="Threshold" value={formatMoney(discrepancyDetails.summary.materialityThreshold || 0)} tone="warning" icon={Settings2} />
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full min-w-[1060px]">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-left">
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Reference</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Description</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Debit</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Credit</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Running Balance</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Journal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {discrepancyDetails.transactions.map((txn) => (
                          <tr key={txn.lineId} className="transition-colors hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700">{txn.entryDate || '—'}</td>
                            <td className="px-4 py-3 font-mono text-sm text-gray-700">{txn.reference || txn.entryNo || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{txn.memo || txn.lineDescription || '—'}</td>
                            <td className="px-4 py-3 text-right font-mono text-sm text-gray-700">
                              {txn.type === 'debit' ? formatMoney(txn.amount) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-sm text-gray-700">
                              {txn.type === 'credit' ? formatMoney(txn.amount) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-gray-900">
                              {formatMoney(txn.runningBalance)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {txn.drillThrough?.appPath ? (
                                <Link
                                  to={txn.drillThrough.appPath}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-all hover:bg-blue-100"
                                  onClick={closeDetails}
                                >
                                  Open journal
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Auto-Correct Modal */}
      {showAutoCorrectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-white px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Auto-Correct Small Differences</h2>
                <p className="mt-1 text-sm text-gray-600">Preview and apply GL balance repairs for small ledger variances.</p>
              </div>
              <button onClick={() => setShowAutoCorrectModal(false)} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Maximum Variance Threshold
                </span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={autoCorrectThreshold}
                    onChange={(e) => setAutoCorrectThreshold(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm shadow-sm transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </label>

              {autoCorrectPreview ? (
                <div className="mt-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                  <div className="font-semibold text-blue-900">Preview Summary</div>
                  <div className="mt-3 grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-white/50 p-3">
                      <div className="text-xs font-medium text-blue-700">Correctable Accounts</div>
                      <div className="mt-1 text-2xl font-bold text-blue-900">{autoCorrectPreview.summary.correctableAccounts}</div>
                    </div>
                    <div className="rounded-lg bg-white/50 p-3">
                      <div className="text-xs font-medium text-blue-700">Total Mismatches</div>
                      <div className="mt-1 text-2xl font-bold text-blue-900">{autoCorrectPreview.summary.totalMismatches}</div>
                    </div>
                    <div className="rounded-lg bg-white/50 p-3">
                      <div className="text-xs font-medium text-blue-700">Variance to Correct</div>
                      <div className="mt-1 text-2xl font-bold text-blue-900">{formatMoney(autoCorrectPreview.summary.totalVarianceCorrected)}</div>
                    </div>
                  </div>
                  {autoCorrectPreview.corrections?.length > 0 && (
                    <div className="mt-4 max-h-56 overflow-y-auto rounded-lg border border-blue-200 bg-white">
                      <table className="w-full text-xs">
                        <thead className="border-b border-blue-200 bg-blue-100 text-left uppercase tracking-wider text-blue-800">
                          <tr>
                            <th className="px-3 py-2">Account</th>
                            <th className="px-3 py-2 text-right">Variance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {autoCorrectPreview.corrections.map((corr) => (
                            <tr key={corr.accountId} className="border-t border-blue-100">
                              <td className="px-3 py-2">{corr.accountCode} · {corr.accountName}</td>
                              <td className="px-3 py-2 text-right font-mono">{formatMoney(Math.abs(corr.variance || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button 
                onClick={() => setShowAutoCorrectModal(false)} 
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => autoCorrectMutation.mutate({ dryRun: true })}
                disabled={autoCorrectMutation.isPending || !autoCorrectThreshold}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Preview
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Apply corrections to ${autoCorrectPreview?.summary?.correctableAccounts || 0} account(s)?`)) {
                    autoCorrectMutation.mutate({ dryRun: false });
                  }
                }}
                disabled={autoCorrectMutation.isPending || !autoCorrectThreshold || !autoCorrectPreview}
                className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {autoCorrectMutation.isPending ? 'Applying...' : 'Apply Corrections'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rebuild Modal */}
      {showRebuildModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 bg-gradient-to-r from-amber-50 to-white px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Rebuild Ledger Balances</h2>
                <p className="mt-1 text-sm text-gray-600">Recompute and replace period GL balance cache from posted journals.</p>
              </div>
              <button onClick={() => setShowRebuildModal(false)} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5 text-sm text-gray-700">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-medium text-amber-800">
                  Use this when the stored general ledger balance table is stale or corrupted. 
                  This action is explicit and auditable.
                </p>
              </div>

              {rebuildPreview ? (
                <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                  <div className="font-semibold text-blue-900">Preview Summary</div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-white/50 p-3">
                      <div className="text-xs font-medium text-blue-700">Rows to Rebuild</div>
                      <div className="mt-1 text-2xl font-bold text-blue-900">{rebuildPreview.rowsToRebuild}</div>
                    </div>
                    <div className="rounded-lg bg-white/50 p-3">
                      <div className="text-xs font-medium text-blue-700">Mismatches Before</div>
                      <div className="mt-1 text-2xl font-bold text-blue-900">{rebuildPreview.mismatchesBefore}</div>
                    </div>
                    <div className="rounded-lg bg-white/50 p-3">
                      <div className="text-xs font-medium text-blue-700">Total Variance Before</div>
                      <div className="mt-1 text-2xl font-bold text-blue-900">{formatMoney(rebuildPreview.totalVarianceBefore)}</div>
                    </div>
                    {rebuildPreview.mismatchesAfter != null && (
                      <div className="rounded-lg bg-white/50 p-3">
                        <div className="text-xs font-medium text-blue-700">Mismatches After</div>
                        <div className="mt-1 text-2xl font-bold text-blue-900">{rebuildPreview.mismatchesAfter}</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button 
                onClick={() => setShowRebuildModal(false)} 
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => rebuildMutation.mutate({ dryRun: true })}
                disabled={rebuildMutation.isPending}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Preview
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Rebuild the ledger balances for this period now?')) {
                    rebuildMutation.mutate({ dryRun: false });
                  }
                }}
                disabled={rebuildMutation.isPending || !rebuildPreview}
                className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/25 transition-all hover:from-amber-600 hover:to-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rebuildMutation.isPending ? 'Running...' : 'Rebuild Balances'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}