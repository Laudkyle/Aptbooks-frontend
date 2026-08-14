import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Activity, ArrowUpRight, BookOpenText, TrendingUp, WalletCards } from 'lucide-react';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeCoaApi } from '../api/coa.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { AccountSelect } from '../../../../shared/components/forms/AccountSelect.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';
import { usePermissions } from '../../../../shared/hooks/usePermissions.js';
import { PERMISSIONS } from '../../../../app/constants/permissions.js';
import { formatMoney } from '../../../../shared/utils/formatMoney.js';
import { formatDate } from '../../../../shared/utils/formatDate.js';

function Stat({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">{label}</div>
          <div className="mt-2 text-xl font-bold tracking-tight text-slate-950">{value}</div>
          {helper ? <div className="mt-1 text-xs text-slate-500">{helper}</div> : null}
        </div>
        <div className="rounded-xl bg-slate-100 p-2 text-slate-600"><Icon className="h-4 w-4" /></div>
      </div>
    </div>
  );
}

function TrendChart({ rows = [], currencyCode }) {
  const values = rows.map((row) => Number(row.net_movement || 0));
  const width = 700;
  const height = 190;
  const padX = 20;
  const padY = 24;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const x = (idx) => padX + (idx * (width - padX * 2)) / Math.max(rows.length - 1, 1);
  const y = (value) => padY + ((max - value) * (height - padY * 2)) / span;
  const points = values.map((value, idx) => `${x(idx)},${y(value)}`).join(' ');
  const zeroY = y(0);
  const areaPoints = `${x(0)},${zeroY} ${points} ${x(Math.max(rows.length - 1, 0))},${zeroY}`;

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.18em] text-slate-400">Movement trend</div>
          <div className="mt-1 text-sm text-slate-300">Natural-balance movement by month</div>
        </div>
        <TrendingUp className="h-5 w-5 text-brand-light" />
      </div>
      <div className="mt-4 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" role="img" aria-label="Account movement trend">
          <defs>
            <linearGradient id="accountTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          <line x1={padX} x2={width - padX} y1={zeroY} y2={zeroY} stroke="currentColor" strokeOpacity="0.16" strokeDasharray="5 7" />
          {rows.length ? <polygon points={areaPoints} fill="url(#accountTrendFill)" className="text-brand-light" /> : null}
          {rows.length ? <polyline points={points} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-brand-light" /> : null}
          {values.map((value, idx) => <circle key={rows[idx]?.month_start || idx} cx={x(idx)} cy={y(value)} r="4" fill="currentColor" className="text-white" />)}
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {rows.map((row) => (
          <div key={row.month_start} className="rounded-xl bg-white/5 px-2 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{row.month_label}</div>
            <div className="mt-1 truncate text-[11px] font-bold" title={formatMoney(row.net_movement, currencyCode)}>{formatMoney(row.net_movement, currencyCode)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountPulse({ report, loading, onJournal }) {
  if (loading) return <ContentCard title="Account pulse"><div className="text-sm text-slate-500">Building account report…</div></ContentCard>;
  if (!report) return null;
  const { summary = {}, trend = [], recent = [], account = {} } = report;
  const code = account.currencyCode || 'GHS';
  const periodLabel = `${summary.months || 6}-month activity`;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Stat icon={WalletCards} label="Current balance" value={formatMoney(summary.currentBalance || 0, code)} helper={`${account.normalBalance || 'debit'} natural balance`} />
        <Stat icon={TrendingUp} label="Period movement" value={formatMoney(summary.periodNet || 0, code)} helper={periodLabel} />
        <Stat icon={Activity} label="Debit / credit" value={`${formatMoney(summary.periodDebit || 0, code)} / ${formatMoney(summary.periodCredit || 0, code)}`} helper="Activity in selected trend window" />
        <Stat icon={BookOpenText} label="Posted journals" value={String(summary.journalCount || 0)} helper={summary.lastActivityDate ? `Last activity ${formatDate(summary.lastActivityDate, 'MMM DD, YYYY')}` : 'No posted activity yet'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_.8fr]">
        <TrendChart rows={trend} currencyCode={code} />
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div><div className="text-sm font-bold text-slate-900">Recent activity</div><div className="mt-1 text-xs text-slate-500">Latest posted ledger movements</div></div>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {recent.length ? recent.map((row) => (
              <button key={`${row.journal_id}-${row.line_no}`} type="button" onClick={() => onJournal(row.journal_id)} className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-slate-900">#{row.entry_no} · {row.description || 'Journal movement'}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{formatDate(row.entry_date, 'MMM DD, YYYY')}</div>
                </div>
                <div className={`shrink-0 text-xs font-bold ${Number(row.natural_movement || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {Number(row.natural_movement || 0) >= 0 ? '+' : ''}{formatMoney(row.natural_movement || 0, code)}
                </div>
              </button>
            )) : <div className="py-8 text-center text-sm text-slate-500">No posted activity yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountDetail() {
  const { id } = useParams();
  const { http } = useApi();
  const api = useMemo(() => makeCoaApi(http), [http]);
  const toast = useToast();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const canManage = permissions.can(PERMISSIONS.accountingCoaManage);
  const canArchive = permissions.can(PERMISSIONS.accountingCoaArchive);

  const q = useQuery({ queryKey: ['coa', id], queryFn: () => api.detail(id), enabled: !!id });
  const reportQ = useQuery({ queryKey: ['coa-report', id, 6], queryFn: () => api.report(id, { months: 6 }), enabled: !!id, staleTime: 30_000 });

  const [name, setName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [parentAccountId, setParentAccountId] = useState('');
  const [isPostable, setIsPostable] = useState(true);
  const [status, setStatus] = useState('active');
  const [archiveOpen, setArchiveOpen] = useState(false);

  React.useEffect(() => {
    if (!q.data) return;
    setName(q.data.name ?? '');
    setCategoryName(q.data.categoryName ?? q.data.category_name ?? '');
    setParentAccountId(q.data.parentAccountId ?? q.data.parent_account_id ?? '');
    setIsPostable(Boolean(q.data.isPostable ?? q.data.is_postable ?? true));
    setStatus(q.data.status ?? 'active');
  }, [q.data]);

  const update = useMutation({
    mutationFn: () => api.update(id, { name, categoryName: categoryName || undefined, parentAccountId: parentAccountId || null, isPostable, status }),
    onSuccess: () => toast.success('Account updated.'),
    onError: (e) => toast.error(e.message ?? 'Update failed')
  });

  const archive = useMutation({
    mutationFn: () => api.archive(id),
    onSuccess: () => { toast.success('Account archived.'); navigate(ROUTES.accountingCoa); },
    onError: (e) => toast.error(e.message ?? 'Archive failed')
  });

  const acc = q.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title={acc ? `${acc.code} — ${acc.name}` : 'Account'}
        subtitle="Account profile, ledger pulse and recent movement."
        actions={<div className="flex gap-2"><Button variant="secondary" onClick={() => navigate(ROUTES.accountingCoa)}>Back</Button>{canArchive && <Button variant="danger" onClick={() => setArchiveOpen(true)} disabled={archive.isLoading}>Archive</Button>}</div>}
      />

      {reportQ.isError ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Account details loaded, but the activity report could not be built. <button className="font-semibold underline" onClick={() => reportQ.refetch()}>Retry</button></div> : null}
      <AccountPulse report={reportQ.data} loading={reportQ.isLoading} onJournal={(journalId) => navigate(ROUTES.accountingJournalDetail(journalId))} />

      <ContentCard title="Account settings" subtitle="Classification and posting controls for this ledger account.">
        {q.isLoading ? <div className="text-sm text-slate-700">Loading…</div> : q.isError ? <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load account.'}</div> : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input label="Code" value={acc?.code ?? ''} disabled />
            <Input label="Account type" value={acc?.accountTypeCode ?? acc?.account_type_code ?? ''} disabled />
            <Input className="md:col-span-2" label="Name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canManage} />
            <Input label="Category (optional)" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} disabled={!canManage} />
            <AccountSelect label="Parent account (optional)" value={parentAccountId} onChange={(e) => setParentAccountId(e.target.value)} allowEmpty disabled={!canManage} />
            <Select label="Postable" value={String(isPostable)} onChange={(e) => setIsPostable(e.target.value === 'true')} options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} disabled={!canManage} />
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} disabled={!canManage} />
            <div className="md:col-span-2 mt-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => { q.refetch(); reportQ.refetch(); }} disabled={q.isFetching || reportQ.isFetching}>Refresh</Button>{canManage && <Button onClick={() => update.mutate()} disabled={update.isLoading || !name}>Save changes</Button>}</div>
          </div>
        )}
      </ContentCard>

      <ConfirmDialog open={archiveOpen} title="Archive account" message="This account will be archived. Proceed?" onCancel={() => setArchiveOpen(false)} onConfirm={() => archive.mutate()} />
    </div>
  );
}
