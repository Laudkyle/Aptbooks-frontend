import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  RefreshCw,
  UploadCloud,
  AlertCircle,
  Calendar,
  BookOpen,
  CheckCircle,
  FileText,
  DollarSign,
  Percent,
  Clock,
  Landmark,
  CreditCard,
  Receipt,
  Edit2,
  XCircle
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { makeIfrs16Api } from '../api/ifrs16.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { formatDate } from '../../../shared/utils/formatDate.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeRows(data) {
  if (Array.isArray(data)) return data;
  else if (Array.isArray(data?.data)) return data.data;
  else if (Array.isArray(data?.data?.data)) return data.data.data;
  return data?.data ?? [];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IFRS16LeaseDetailPage() {
  const { leaseId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();

  const api = useMemo(() => makeIfrs16Api(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  // State
  const [activeTab, setActiveTab] = useState('schedule');
  const [regenConfirmOpen, setRegenConfirmOpen] = useState(false);
  const [initModalOpen, setInitModalOpen] = useState(false);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Forms
  const [postForm, setPostForm] = useState({ 
    from_date: '', 
    to_date: '', 
    dry_run: true 
  });
  
  const [initForm, setInitForm] = useState({ 
    posting_date: '', 
    period_id: '', 
    memo: '' 
  });

  // Queries
  const { 
    data: lease, 
    isLoading: leaseLoading, 
    isError: leaseError, 
    error: leaseErrorData,
    refetch: refetchLease 
  } = useQuery({
    queryKey: qk.ifrs16Lease(leaseId),
    queryFn: () => api.getLease(leaseId),
    staleTime: 30000,
    retry: 2
  });
console.log('Lease details query result:', { lease, leaseError, leaseErrorData });
  const { 
    data: scheduleData, 
    isLoading: scheduleLoading,
    refetch: refetchSchedule 
  } = useQuery({
    queryKey: qk.ifrs16LeaseSchedule(leaseId),
    queryFn: () => api.getSchedule(leaseId),
    enabled: !!leaseId,
    staleTime: 30000
  });

  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: () => periodsApi.list(),
    staleTime: 60000
  });

  // FIXED: Extract schedule lines correctly from the response
  const scheduleRows = useMemo(() => {
    // Based on console.log, scheduleData.lines contains the array
    if (scheduleData?.lines && Array.isArray(scheduleData.lines)) {
      return scheduleData.lines;
    }
    return [];
  }, [scheduleData]);

  const periodOptions = useMemo(() => {
    const rows = normalizeRows(periods);
    return [
      { value: '', label: '— Select period —' },
      ...rows.map((p) => ({ 
        value: p.id, 
        label: `${p.code ?? p.name ?? p.id}` 
      })),
    ];
  }, [periods]);

  // Form validation
  const validateInitForm = useCallback(() => {
    const errors = {};
    if (!initForm.posting_date) {
      errors.posting_date = 'Posting date is required';
    }
    if (!initForm.period_id) {
      errors.period_id = 'Period is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [initForm]);

  const validatePostForm = useCallback(() => {
    const errors = {};
    if (!postForm.from_date) {
      errors.from_date = 'From date is required';
    }
    if (!postForm.to_date) {
      errors.to_date = 'To date is required';
    }
    if (postForm.from_date && postForm.to_date && postForm.from_date > postForm.to_date) {
      errors.to_date = 'To date must be after from date';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [postForm]);

  // Handlers
  const handleFieldChange = useCallback((form, field, value) => {
    if (form === 'init') {
      setInitForm(prev => ({ ...prev, [field]: value }));
    } else {
      setPostForm(prev => ({ ...prev, [field]: value }));
    }
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [formErrors]);

  const handleRefresh = useCallback(() => {
    refetchLease();
    refetchSchedule();
  }, [refetchLease, refetchSchedule]);

  // Mutations
  const statusMutation = useMutation({
    mutationFn: (nextStatus) => api.updateLeaseStatus(leaseId, { status: nextStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.ifrs16Lease(leaseId) });
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.message ?? 'Failed to update status';
      alert(message);
    }
  });

  const regenMutation = useMutation({
    mutationFn: () => api.generateSchedule(leaseId, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.ifrs16LeaseSchedule(leaseId) });
      setRegenConfirmOpen(false);
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.message ?? 'Failed to regenerate schedule';
      alert(message);
    }
  });

  const initMutation = useMutation({
    mutationFn: async () => {
      if (!validateInitForm()) throw new Error('Please fix validation errors');
      return api.postInitialRecognition(leaseId, initForm);
    },
    onSuccess: () => {
      setInitModalOpen(false);
      setInitForm({ posting_date: '', period_id: '', memo: '' });
      qc.invalidateQueries({ queryKey: qk.ifrs16Lease(leaseId) });
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.message ?? 'Failed to post initial recognition';
      alert(message);
    }
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!validatePostForm()) throw new Error('Please fix validation errors');
      return api.postForRange(leaseId, { 
        ...postForm, 
        dry_run: !!postForm.dry_run 
      });
    },
    onSuccess: () => {
      setPostModalOpen(false);
      setPostForm({ from_date: '', to_date: '', dry_run: true });
      qc.invalidateQueries({ queryKey: qk.ifrs16Lease(leaseId) });
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.message ?? 'Failed to post journals';
      alert(message);
    }
  });

  // Loading state
  if (leaseLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Loading Lease..."
          subtitle="Please wait while we load the lease details"
          icon={FileText}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.complianceIfrs16)}>
              Back to Leases
            </Button>
          }
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading lease details...</div>
          </div>
        </ContentCard>
      </div>
    );
  }

  if (leaseError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Error Loading Lease"
          subtitle="There was a problem loading the lease details"
          icon={FileText}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.complianceIfrs16)}>
              Back to Leases
            </Button>
          }
        />
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-sm font-medium text-slate-900">Failed to load lease</div>
            <div className="text-sm text-slate-500">{leaseErrorData?.message ?? 'An error occurred'}</div>
            <Button variant="outline" onClick={handleRefresh} className="mt-2">
              Retry
            </Button>
          </div>
        </ContentCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={lease?.name ?? 'Lease Details'}
        subtitle={
          <div className="flex items-center gap-2">
            {lease?.code && <span>Code: {lease.code}</span>}
            {lease?.commencement_date && (
              <>
                <span>·</span>
                <span>Commenced {formatDate(lease.commencement_date)}</span>
              </>
            )}
            {lease?.term_months && (
              <>
                <span>·</span>
                <span>{lease.term_months} months</span>
              </>
            )}
          </div>
        }
        icon={FileText}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={ArrowLeft}
              onClick={() => navigate(ROUTES.complianceIfrs16)}
            >
              Back to Leases
            </Button>
            <Button
              variant="outline"
              leftIcon={RefreshCw}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Status Bar */}
      <ContentCard className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge
              tone={
                lease?.status === 'active' ? 'success' :
                lease?.status === 'draft' ? 'warning' : 'muted'
              }
              className="inline-flex items-center gap-1.5"
            >
              {lease?.status === 'active' ? <CheckCircle className="h-3 w-3" /> : 
               lease?.status === 'draft' ? <FileText className="h-3 w-3" /> : 
               <XCircle className="h-3 w-3" />}
              {lease?.status ?? 'draft'}
            </Badge>

            {lease?.payment_amount && (
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                Payment: ${Number(lease.payment_amount).toFixed(2)}
              </div>
            )}

            {lease?.annual_discount_rate && (
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <Percent className="h-3.5 w-3.5 text-slate-400" />
                Rate: {(lease.annual_discount_rate * 100).toFixed(2)}%
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => statusMutation.mutate('draft')}
              disabled={statusMutation.isPending || lease?.status === 'draft'}
            >
              Mark Draft
            </Button>
            <Button
              size="sm"
              onClick={() => statusMutation.mutate('active')}
              disabled={statusMutation.isPending || lease?.status === 'active'}
              loading={statusMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Activate
            </Button>
          </div>
        </div>
      </ContentCard>

      {/* Action Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <ContentCard className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setRegenConfirmOpen(true)}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <RefreshCw className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Regenerate Schedule</h3>
              <p className="text-xs text-slate-500 mt-1">
                Recompute lease schedule based on current parameters
              </p>
            </div>
          </div>
        </ContentCard>

        <ContentCard className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setInitModalOpen(true)}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <UploadCloud className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Initial Recognition</h3>
              <p className="text-xs text-slate-500 mt-1">
                Post the initial recognition journals for this lease
              </p>
            </div>
          </div>
        </ContentCard>

        <ContentCard className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setPostModalOpen(true)}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <BookOpen className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Post Period</h3>
              <p className="text-xs text-slate-500 mt-1">
                Post lease journals for a specific date range
              </p>
            </div>
          </div>
        </ContentCard>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <button
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'schedule'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('schedule')}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Amortization Schedule
            </div>
          </button>
          <button
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('details')}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Lease Details
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'schedule' && (
        <ContentCard>
          <div className="mb-4">
            <div className="text-base font-semibold text-slate-900">Amortization Schedule</div>
            <div className="mt-1 text-sm text-slate-500">
              Payment schedule and liability amortization over the lease term
            </div>
          </div>

          {scheduleLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-slate-500">Loading schedule...</div>
            </div>
          ) : scheduleRows.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <div className="text-sm font-medium text-slate-900 mb-1">No schedule generated</div>
              <div className="text-sm text-slate-500 mb-4">
                Generate a schedule to view payment amortization
              </div>
              <Button 
                size="sm" 
                leftIcon={RefreshCw} 
                onClick={() => setRegenConfirmOpen(true)}
              >
                Generate Schedule
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Interest</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Principal</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {scheduleRows.map((row, idx) => (
                    <tr key={row?.id ?? idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-700">
                            {row?.due_date ? formatDate(row.due_date) : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono text-sm text-slate-700">
                            {row?.payment_amount ? Number(row.payment_amount).toFixed(2) : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Percent className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono text-sm text-slate-700">
                            {row?.interest_amount ? Number(row.interest_amount).toFixed(2) : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono text-sm text-slate-700">
                            {row?.principal_amount ? Number(row.principal_amount).toFixed(2) : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono text-sm text-slate-700">
                            {row?.closing_balance ? Number(row.closing_balance).toFixed(2) : '—'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ContentCard>
      )}

      {activeTab === 'details' && lease && (
        <ContentCard>
          <div className="mb-4">
            <div className="text-base font-semibold text-slate-900">Lease Details</div>
            <div className="mt-1 text-sm text-slate-500">
              Complete lease configuration and account mappings
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Lease Terms */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                Lease Terms
              </h3>
              
              <div className="grid gap-3">
                <DetailRow icon={FileText} label="Code" value={lease.code} />
                <DetailRow icon={FileText} label="Name" value={lease.name} />
                <DetailRow icon={Calendar} label="Commencement Date" value={formatDate(lease.commencement_date)} />
                <DetailRow icon={Clock} label="Term" value={`${lease.term_months} months`} />
                <DetailRow icon={DollarSign} label="Payment Amount" value={`$${Number(lease.payment_amount).toFixed(2)}`} />
                <DetailRow icon={Receipt} label="Payments per Year" value={lease.payments_per_year} />
                <DetailRow icon={Percent} label="Annual Discount Rate" value={`${(lease.annual_discount_rate * 100).toFixed(2)}%`} />
                <DetailRow icon={Clock} label="Payment Timing" value={lease.payment_timing === 'arrears' ? 'Arrears (end of period)' : 'Advance (start of period)'} />
              </div>
            </div>

            {/* Account Mappings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-slate-500" />
                Account Mappings
              </h3>
              
              <div className="grid gap-3">
                <DetailRow icon={BookOpen} label="ROU Asset Account" value={lease.rou_asset_account_name} />
                <DetailRow icon={CreditCard} label="Lease Liability Account" value={lease.lease_liability_account_name} />
                <DetailRow icon={Percent} label="Interest Expense Account" value={lease.interest_expense_account_name} />
                <DetailRow icon={Receipt} label="Depreciation Expense Account" value={lease.depreciation_expense_account_name} />
                <DetailRow icon={BookOpen} label="Accumulated Depreciation Account" value={lease.accumulated_depreciation_account_name} />
                <DetailRow icon={Landmark} label="Cash / Bank Account" value={lease.cash_account_name} />
              </div>

              {lease.notes && (
                <div className="mt-4">
                  <h4 className="text-xs font-medium text-slate-500 mb-2">Notes</h4>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{lease.notes}</p>
                </div>
              )}
            </div>
          </div>
        </ContentCard>
      )}

      {/* Regenerate Confirmation Modal */}
      <Modal
        open={regenConfirmOpen}
        onClose={() => setRegenConfirmOpen(false)}
        title="Regenerate Schedule"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <div className="font-medium mb-1">Confirm Schedule Regeneration</div>
                <div className="text-amber-700">
                  This will recompute the lease schedule based on current lease parameters. 
                  Any manually adjusted lines will be overwritten.
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-600">
            Are you sure you want to regenerate the amortization schedule?
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setRegenConfirmOpen(false)}
            disabled={regenMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => regenMutation.mutate()}
            loading={regenMutation.isPending}
            leftIcon={RefreshCw}
          >
            Regenerate
          </Button>
        </div>
      </Modal>

      {/* Initial Recognition Modal */}
      <Modal
        open={initModalOpen}
        onClose={() => setInitModalOpen(false)}
        title="Post Initial Recognition"
      >
        <div className="space-y-6">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <UploadCloud className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <div className="font-medium mb-1">Initial Recognition Journals</div>
                <div className="text-blue-700">
                  Post the initial ROU asset and lease liability journals for this lease
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Posting Date"
              type="date"
              value={initForm.posting_date}
              onChange={(e) => handleFieldChange('init', 'posting_date', e.target.value)}
              required
              error={formErrors.posting_date}
              leftIcon={Calendar}
            />
            <Select
              label="Period"
              value={initForm.period_id}
              onChange={(e) => handleFieldChange('init', 'period_id', e.target.value)}
              options={periodOptions}
              required
              error={formErrors.period_id}
              leftIcon={Calendar}
            />
          </div>

          <Input
            label="Memo (Optional)"
            value={initForm.memo}
            onChange={(e) => handleFieldChange('init', 'memo', e.target.value)}
            placeholder="Audit reference or description…"
            leftIcon={FileText}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setInitModalOpen(false)}
            disabled={initMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => initMutation.mutate()}
            loading={initMutation.isPending}
            leftIcon={UploadCloud}
          >
            Post Initial Recognition
          </Button>
        </div>
      </Modal>

      {/* Post Period Modal */}
      <Modal
        open={postModalOpen}
        onClose={() => setPostModalOpen(false)}
        title="Post Lease Journals"
      >
        <div className="space-y-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-900">
                <div className="font-medium mb-1">Post Journals for Date Range</div>
                <div className="text-emerald-700">
                  Post lease journals for a specific period. Use preview mode first to validate.
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="From Date"
              type="date"
              value={postForm.from_date}
              onChange={(e) => handleFieldChange('post', 'from_date', e.target.value)}
              required
              error={formErrors.from_date}
              leftIcon={Calendar}
            />
            <Input
              label="To Date"
              type="date"
              value={postForm.to_date}
              onChange={(e) => handleFieldChange('post', 'to_date', e.target.value)}
              required
              error={formErrors.to_date}
              leftIcon={Calendar}
            />
          </div>

          <Select
            label="Mode"
            value={postForm.dry_run ? 'true' : 'false'}
            onChange={(e) => handleFieldChange('post', 'dry_run', e.target.value === 'true')}
            options={[
              { value: 'true', label: 'Preview (dry run) - Validate only' },
              { value: 'false', label: 'Post for real - Create journals' }
            ]}
            leftIcon={BookOpen}
          />

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Tip: Always run a preview first with the same date range to validate before posting for real.</span>
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setPostModalOpen(false)}
            disabled={postMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => postMutation.mutate()}
            loading={postMutation.isPending}
            leftIcon={BookOpen}
          >
            {postForm.dry_run ? 'Preview' : 'Post Journals'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// Helper component for detail rows
function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <span className="text-xs text-slate-500 block">{label}</span>
        <span className="text-sm text-slate-900 font-medium">{value}</span>
      </div>
    </div>
  );
}