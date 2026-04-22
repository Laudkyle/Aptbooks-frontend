import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  ShieldCheck,
  Workflow,
  Landmark,
  Wallet,
  BarChart3,
  Activity,
  XCircle,
  PlayCircle,
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

function rowsOf(data, keys = ['items', 'data', 'rows', 'lines']) {
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
  if (['active', 'approved', 'posted'].includes(s)) return 'success';
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
  const [statusForm, setStatusForm] = useState({ status: 'active' });
  const [initialForm, setInitialForm] = useState({ entry_date: '', memo: '' });
  const [postForm, setPostForm] = useState({ from_date: '', to_date: '', memo: '' });

  const leaseQ = useQuery({
    queryKey: qk.ifrs16Lease(leaseId),
    queryFn: () => api.getLease(leaseId),
    enabled: !!leaseId,
    staleTime: 10_000,
  });
  const scheduleQ = useQuery({
    queryKey: qk.ifrs16LeaseSchedule(leaseId),
    queryFn: () => api.getSchedule(leaseId),
    enabled: !!leaseId,
    staleTime: 10_000,
  });
  const periodsQ = useQuery({
    queryKey: ['ifrs16', 'periods'],
    queryFn: () => periodsApi.list({ limit: 500, offset: 0 }),
    staleTime: 60_000,
  });

  const lease = useMemo(() => {
    const data = leaseQ.data || {};
    return data.lease && typeof data.lease === 'object' ? { ...data.lease, ...data } : data;
  }, [leaseQ.data]);
  const scheduleLines = useMemo(() => rowsOf(scheduleQ.data), [scheduleQ.data]);
  const periods = useMemo(() => rowsOf(periodsQ.data), [periodsQ.data]);
  const contract = leaseQ.data?.contract || null;
  const currency = lease.currency_code || contract?.currency_code || 'GHS';
  const currentStatus = String(lease.status || '').toLowerCase();

  React.useEffect(() => {
    if (!statusForm.status) setStatusForm({ status: currentStatus || 'active' });
  }, [currentStatus, statusForm.status]);

  const invalidateAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: qk.ifrs16Lease(leaseId) }),
      qc.invalidateQueries({ queryKey: qk.ifrs16LeaseSchedule(leaseId) }),
      qc.invalidateQueries({ queryKey: ['compliance', 'ifrs16', 'leases'] }),
    ]);
  };

  const statusMutation = useMutation({
    mutationFn: () => api.updateLeaseStatus(leaseId, { status: statusForm.status }),
    onSuccess: async () => {
      toast.success('Lease status updated');
      setStatusOpen(false);
      await invalidateAll();
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to update lease status'),
  });

  const scheduleMutation = useMutation({
    mutationFn: () => api.generateSchedule(leaseId, {}),
    onSuccess: async () => {
      toast.success('Lease schedule generated');
      setScheduleOpen(false);
      await invalidateAll();
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to generate schedule'),
  });

  const initialMutation = useMutation({
    mutationFn: () => api.postInitialRecognition(leaseId, {
      entry_date: initialForm.entry_date || undefined,
      memo: initialForm.memo || undefined,
    }),
    onSuccess: async () => {
      toast.success('Initial recognition posted');
      setInitialOpen(false);
      setInitialForm({ entry_date: '', memo: '' });
      await invalidateAll();
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to post initial recognition'),
  });

  const postMutation = useMutation({
    mutationFn: () => api.postForRange(leaseId, {
      from_date: postForm.from_date,
      to_date: postForm.to_date,
      memo: postForm.memo || undefined,
    }),
    onSuccess: async () => {
      toast.success('Lease period posted');
      setPostOpen(false);
      setPostForm({ from_date: '', to_date: '', memo: '' });
      await invalidateAll();
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Failed to post lease period'),
  });

  const metrics = useMemo(() => {
    const payments = scheduleLines.reduce((sum, row) => sum + numberOf(row.payment_amount), 0);
    const interest = scheduleLines.reduce((sum, row) => sum + numberOf(row.interest_amount), 0);
    const closing = scheduleLines.length ? numberOf(scheduleLines[scheduleLines.length - 1]?.closing_balance) : numberOf(lease.lease_liability_balance, lease.initial_lease_liability);
    return {
      payments,
      interest,
      closing,
      lines: scheduleLines.length,
    };
  }, [lease, scheduleLines]);

  if (leaseQ.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Loading IFRS 16 lease..."
          subtitle="Preparing lease workspace"
          icon={FileText}
          actions={<Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.complianceIFRS16)}>Back to leases</Button>}
        />
        <ContentCard>
          <div className="py-10 text-sm text-slate-500">Loading lease...</div>
        </ContentCard>
      </div>
    );
  }

  if (leaseQ.isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="IFRS 16 lease"
          subtitle="Unable to load the selected lease"
          icon={FileText}
          actions={<Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.complianceIFRS16)}>Back to leases</Button>}
        />
        <ContentCard>
          <div className="py-10 text-sm text-red-600">{leaseQ.error?.response?.data?.message ?? 'Failed to load lease details'}</div>
        </ContentCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={lease.name || 'IFRS 16 Lease'}
        subtitle={
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{lease.code || 'No code'}</span>
            {lease.commencement_date ? <><span>·</span><span>Commencement {formatDate(lease.commencement_date)}</span></> : null}
            {lease.term_months ? <><span>·</span><span>{lease.term_months} months</span></> : null}
          </div>
        }
        icon={FileText}
        actions={
          <>
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.complianceIFRS16)}>
              Back to leases
            </Button>
            <Button variant="outline" leftIcon={RefreshCw} onClick={() => { leaseQ.refetch(); scheduleQ.refetch(); }}>
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <StatCard label="Lease status" value={<Badge tone={toneForStatus(lease.status)}>{lease.status || 'unknown'}</Badge>} subvalue="Current lifecycle state" icon={Workflow} />
        <StatCard label="Recurring payment" value={formatMoney(numberOf(lease.payment_amount), currency)} subvalue={`${numberOf(lease.payments_per_year)} payments per year`} icon={Wallet} />
        <StatCard label="Discount rate" value={`${(numberOf(lease.annual_discount_rate) * 100).toFixed(2)}%`} subvalue={lease.payment_timing === 'advance' ? 'Advance timing' : 'Arrears timing'} icon={BarChart3} />
        <StatCard label="Schedule lines" value={metrics.lines} subvalue={`${formatMoney(metrics.closing, currency)} closing liability`} icon={Activity} />
      </div>

      <ContentCard className="py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge tone={toneForStatus(lease.status)}>{lease.status || 'unknown'}</Badge>
            <div className="text-sm text-slate-500">Use the actions on the right to progress the lease through schedule generation and posting.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" leftIcon={ShieldCheck} onClick={() => setStatusOpen(true)}>Update status</Button>
            <Button variant="outline" leftIcon={PlayCircle} onClick={() => setScheduleOpen(true)}>Generate schedule</Button>
            <Button variant="outline" leftIcon={Landmark} onClick={() => setInitialOpen(true)}>Post initial recognition</Button>
            <Button leftIcon={CheckCircle2} onClick={() => setPostOpen(true)}>Post period</Button>
          </div>
        </div>
      </ContentCard>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview', icon: FileText },
          { value: 'schedule', label: 'Measurement schedule', icon: Calendar },
          { value: 'posting', label: 'Posting readiness', icon: ShieldCheck },
        ]}
      />

      {tab === 'overview' ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
          <ContentCard title="Lease profile">
            <div className="grid gap-3 md:grid-cols-2">
              <DetailRow label="Lease code" value={lease.code} />
              <DetailRow label="Lease name" value={lease.name} />
              <DetailRow label="Commencement date" value={formatDate(lease.commencement_date)} />
              <DetailRow label="Term" value={lease.term_months ? `${lease.term_months} months` : '—'} />
              <DetailRow label="Payment amount" value={formatMoney(numberOf(lease.payment_amount), currency)} />
              <DetailRow label="Payments per year" value={String(oneOf(lease.payments_per_year, '—'))} />
              <DetailRow label="Annual discount rate" value={`${(numberOf(lease.annual_discount_rate) * 100).toFixed(2)}%`} />
              <DetailRow label="Payment timing" value={lease.payment_timing === 'advance' ? 'Advance (start of period)' : 'Arrears (end of period)'} />
            </div>
            {lease.notes ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="mb-1 font-medium text-slate-900">Notes</div>
                {lease.notes}
              </div>
            ) : null}
          </ContentCard>

          <ContentCard title="Account mapping">
            <div className="grid gap-3">
              <DetailRow label="ROU asset account" value={lease.rou_asset_account_name || lease.rou_asset_account_id} />
              <DetailRow label="Lease liability account" value={lease.lease_liability_account_name || lease.lease_liability_account_id} />
              <DetailRow label="Interest expense account" value={lease.interest_expense_account_name || lease.interest_expense_account_id} />
              <DetailRow label="Depreciation expense account" value={lease.depreciation_expense_account_name || lease.depreciation_expense_account_id} />
              <DetailRow label="Accumulated depreciation account" value={lease.accumulated_depreciation_account_name || lease.accumulated_depreciation_account_id} />
              <DetailRow label="Cash / bank account" value={lease.cash_account_name || lease.cash_account_id} />
            </div>
          </ContentCard>
        </div>
      ) : null}

      {tab === 'schedule' ? (
        <ContentCard
          title="Lease measurement schedule"
          subtitle="Review the amortisation profile generated from the current lease assumptions."
          actions={<Badge tone="muted">{scheduleLines.length} rows</Badge>}
        >
          {scheduleQ.isLoading ? (
            <div className="py-10 text-sm text-slate-500">Loading schedule...</div>
          ) : scheduleLines.length === 0 ? (
            <div className="py-10 text-sm text-slate-500">No schedule has been generated for this lease yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-3 pr-4">Due date</th>
                    <th className="py-3 pr-4 text-right">Opening balance</th>
                    <th className="py-3 pr-4 text-right">Payment</th>
                    <th className="py-3 pr-4 text-right">Interest</th>
                    <th className="py-3 pr-4 text-right">Principal</th>
                    <th className="py-3 text-right">Closing balance</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleLines.map((line, idx) => (
                    <tr key={line.id || `${line.due_date || 'line'}-${idx}`} className="border-b border-slate-100">
                      <td className="py-3 pr-4 text-slate-700">{formatDate(line.due_date)}</td>
                      <td className="py-3 pr-4 text-right text-slate-700">{formatMoney(numberOf(line.opening_balance), currency)}</td>
                      <td className="py-3 pr-4 text-right text-slate-700">{formatMoney(numberOf(line.payment_amount), currency)}</td>
                      <td className="py-3 pr-4 text-right text-slate-700">{formatMoney(numberOf(line.interest_amount), currency)}</td>
                      <td className="py-3 pr-4 text-right text-slate-700">{formatMoney(numberOf(line.principal_amount), currency)}</td>
                      <td className="py-3 text-right text-slate-700">{formatMoney(numberOf(line.closing_balance), currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ContentCard>
      ) : null}

      {tab === 'posting' ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <ContentCard title="Measurement summary">
            <div className="grid gap-3 md:grid-cols-2">
              <DetailRow label="Schedule rows" value={String(metrics.lines)} />
              <DetailRow label="Total undiscounted payments" value={formatMoney(metrics.payments, currency)} />
              <DetailRow label="Total finance charge" value={formatMoney(metrics.interest, currency)} />
              <DetailRow label="Closing lease liability" value={formatMoney(metrics.closing, currency)} />
            </div>
          </ContentCard>

          <ContentCard title="Posting readiness">
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                <div className="font-medium text-slate-900">Lifecycle checks</div>
                <ul className="mt-2 space-y-1 list-disc pl-5">
                  <li>Status: {lease.status || 'unknown'}</li>
                  <li>Schedule generated: {scheduleLines.length > 0 ? 'Yes' : 'No'}</li>
                  <li>Lease liability account: {lease.lease_liability_account_id ? 'Configured' : 'Missing'}</li>
                  <li>ROU asset account: {lease.rou_asset_account_id ? 'Configured' : 'Missing'}</li>
                  <li>Cash / bank account: {lease.cash_account_id ? 'Configured' : 'Missing'}</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Use <span className="font-medium text-slate-900">Generate schedule</span> after changing lease assumptions, then run <span className="font-medium text-slate-900">Post initial recognition</span> once and <span className="font-medium text-slate-900">Post period</span> for subsequent accounting periods.
              </div>
            </div>
          </ContentCard>
        </div>
      ) : null}

      <Modal
        open={statusOpen}
        title="Update IFRS 16 lease status"
        onClose={() => setStatusOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStatusOpen(false)}>Cancel</Button>
            <Button loading={statusMutation.isPending} onClick={() => statusMutation.mutate()}>
              Save status
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Select
            label="Status"
            value={statusForm.status}
            onChange={(e) => setStatusForm({ status: e.target.value })}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' },
              { value: 'closed', label: 'Closed' },
              { value: 'terminated', label: 'Terminated' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </div>
      </Modal>

      <Modal
        open={scheduleOpen}
        title="Generate IFRS 16 schedule"
        onClose={() => setScheduleOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button loading={scheduleMutation.isPending} onClick={() => scheduleMutation.mutate()}>
              Generate schedule
            </Button>
          </div>
        }
      >
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          This recomputes the lease amortisation schedule using the current lease assumptions and replaces any earlier generated schedule lines.
        </div>
      </Modal>

      <Modal
        open={initialOpen}
        title="Post initial recognition"
        onClose={() => setInitialOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setInitialOpen(false)}>Cancel</Button>
            <Button loading={initialMutation.isPending} onClick={() => initialMutation.mutate()}>
              Post initial recognition
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Posting date" type="date" value={initialForm.entry_date} onChange={(e) => setInitialForm((s) => ({ ...s, entry_date: e.target.value }))} />
          <Textarea className="md:col-span-2" label="Memo" value={initialForm.memo} onChange={(e) => setInitialForm((s) => ({ ...s, memo: e.target.value }))} rows={4} />
        </div>
      </Modal>

      <Modal
        open={postOpen}
        title="Post lease period"
        onClose={() => setPostOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPostOpen(false)}>Cancel</Button>
            <Button loading={postMutation.isPending} onClick={() => postMutation.mutate()}>
              Post lease period
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="From date" type="date" value={postForm.from_date} onChange={(e) => setPostForm((s) => ({ ...s, from_date: e.target.value }))} />
          <Input label="To date" type="date" value={postForm.to_date} onChange={(e) => setPostForm((s) => ({ ...s, to_date: e.target.value }))} />
          <Textarea className="md:col-span-2" label="Memo" value={postForm.memo} onChange={(e) => setPostForm((s) => ({ ...s, memo: e.target.value }))} rows={4} />
        </div>
      </Modal>
    </div>
  );
}
