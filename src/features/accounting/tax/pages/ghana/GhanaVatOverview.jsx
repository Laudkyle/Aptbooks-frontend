import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, RefreshCw, ShieldCheck, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ROUTES } from '../../../../../app/constants/routes.js';
import { useApi } from '../../../../../shared/hooks/useApi.js';
import { qk } from '../../../../../shared/query/keys.js';
import { formatMoney } from '../../../../../shared/utils/formatMoney.js';
import { ContentCard } from '../../../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../../../shared/components/ui/Button.jsx';
import { Input } from '../../../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../../../shared/components/ui/Badge.jsx';
import { makeGhanaComplianceApi } from '../../api/ghanaCompliance.api.js';
import { GhanaComplianceShell } from '../../components/GhanaComplianceShell.jsx';
import { GhanaVatNav } from '../../components/GhanaVatNav.jsx';

function monthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(start), to: fmt(end) };
}

function monitorTone(status) {
  if (status === 'registered' || status === 'below_threshold') return 'success';
  if (status === 'approaching_threshold') return 'warning';
  if (status === 'threshold_met') return 'danger';
  return 'info';
}

function label(value) {
  return String(value || 'manual_review').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function GhanaVatOverview() {
  const { http } = useApi();
  const api = useMemo(() => makeGhanaComplianceApi(http), [http]);
  const initial = useMemo(monthRange, []);
  const [range, setRange] = useState(initial);
  const [asOfDate, setAsOfDate] = useState(initial.to);

  const vatQuery = useQuery({
    queryKey: qk.ghanaVatReturn(range),
    queryFn: () => api.getGhanaVatReturn(range),
    enabled: Boolean(range.from && range.to),
  });
  const monitorQuery = useQuery({
    queryKey: qk.ghanaVatRegistrationMonitor({ asOfDate }),
    queryFn: () => api.getVatRegistrationMonitor({ asOfDate }),
    enabled: Boolean(asOfDate),
  });
  const importedSummaryQuery = useQuery({
    queryKey: qk.ghanaImportedServicesSummary(range),
    queryFn: () => api.getImportedServicesSummary(range),
    enabled: Boolean(range.from && range.to),
  });

  const vat = vatQuery.data;
  const monitor = monitorQuery.data;
  const imported = importedSummaryQuery.data;
  const progress = monitor?.thresholdProgress == null ? 0 : Math.max(0, Math.min(100, Number(monitor.thresholdProgress) * 100));

  return (
    <GhanaComplianceShell
      title="Ghana VAT"
      subtitle="Monitor VAT exposure, registration readiness, recoverable input tax and imported-services obligations from one workspace."
      actions={<Button variant="outline" onClick={() => { vatQuery.refetch(); monitorQuery.refetch(); importedSummaryQuery.refetch(); }}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}
    >
      <GhanaVatNav />

      <ContentCard title="Reporting period">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="From" type="date" value={range.from} onChange={(e) => setRange((s) => ({ ...s, from: e.target.value }))} />
          <Input label="To" type="date" value={range.to} onChange={(e) => setRange((s) => ({ ...s, to: e.target.value }))} />
          <Input label="Registration monitor as at" type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
        </div>
      </ContentCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ContentCard><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Output tax</div><div className="mt-2 text-2xl font-bold text-slate-950">{formatMoney(vat?.totals?.output_tax || '0.00', 'GHS')}</div><div className="mt-1 text-xs text-slate-500">VAT, NHIL, GETFund and reverse charge in period</div></ContentCard>
        <ContentCard><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recoverable input</div><div className="mt-2 text-2xl font-bold text-emerald-700">{formatMoney(vat?.totals?.input_tax || '0.00', 'GHS')}</div><div className="mt-1 text-xs text-slate-500">Input tax currently recoverable</div></ContentCard>
        <ContentCard><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Non-recoverable input</div><div className="mt-2 text-2xl font-bold text-amber-700">{formatMoney(vat?.totals?.nonrecoverable_input_tax || '0.00', 'GHS')}</div><div className="mt-1 text-xs text-slate-500">Input tax treated as tax cost</div></ContentCard>
        <ContentCard><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Net VAT position</div><div className="mt-2 text-2xl font-bold text-brand-deep">{formatMoney(vat?.totals?.net_tax_payable || '0.00', 'GHS')}</div><div className="mt-1 text-xs text-slate-500">After recoverable input and WHVAT credits</div></ContentCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ContentCard className="xl:col-span-2" title="VAT registration monitor">
          {monitorQuery.isLoading ? <div className="py-8 text-center text-sm text-slate-500">Calculating registration position…</div> : monitor ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2"><Badge tone={monitorTone(monitor.status)} size="md">{label(monitor.status)}</Badge>{monitor.registration ? <Badge tone="success">VAT registration on file</Badge> : null}</div>
                  <div className="mt-3 text-3xl font-bold text-slate-950">{formatMoney(monitor.taxableGoodsTurnover || '0.00', 'GHS')}</div>
                  <div className="mt-1 text-sm text-slate-500">Qualifying taxable-goods turnover for the monitor window</div>
                </div>
                <div className="rounded-2xl bg-brand-primary/10 p-3"><TrendingUp className="h-6 w-6 text-brand-primary" /></div>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-xs text-slate-500"><span>{progress.toFixed(1)}% of threshold</span><span>Threshold {formatMoney(monitor.threshold || '0.00', 'GHS')}</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-primary" style={{ width: `${progress}%` }} /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Remaining</div><div className="mt-1 font-semibold">{formatMoney(monitor.remaining || '0.00', 'GHS')}</div></div>
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Window</div><div className="mt-1 text-sm font-semibold">{monitor.windowStart || '—'} → {monitor.windowEnd || '—'}</div></div>
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Unclassified sales</div><div className="mt-1 font-semibold">{monitor.unclassifiedSalesCount}</div></div>
              </div>
              {monitor.manualReviewRequired ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><div className="font-semibold">Manual review required</div><div className="mt-1">Some sales are not tax-classified, so the monitor may understate or overstate the qualifying turnover.</div><Link className="mt-2 inline-flex font-semibold text-amber-950 underline" to={ROUTES.inventoryItems}>Classify inventory items</Link></div></div>
              ) : null}
            </div>
          ) : <div className="py-8 text-center text-sm text-slate-500">No VAT registration monitor data.</div>}
        </ContentCard>

        <ContentCard title="Imported services">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-2"><CalendarDays className="h-5 w-5 text-blue-600" /></div><div><div className="text-2xl font-bold">{imported?.transactionCount ?? 0}</div><div className="text-xs text-slate-500">Posted transactions</div></div></div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Taxable amount</span><span className="font-semibold">{formatMoney(imported?.taxableAmount || '0.00', 'GHS')}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Output tax due</span><span className="font-semibold">{formatMoney(imported?.outputTaxDue || '0.00', 'GHS')}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Recoverable input</span><span className="font-semibold text-emerald-700">{formatMoney(imported?.recoverableInputTax || '0.00', 'GHS')}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Net tax cost</span><span className="font-semibold text-amber-700">{formatMoney(imported?.netTaxCost || '0.00', 'GHS')}</span></div>
          </div>
          <Link to={ROUTES.accountingTaxGhanaImportedServices} className="mt-5 inline-flex text-sm font-semibold text-brand-primary hover:underline">Open imported services</Link>
        </ContentCard>
      </div>

      <ContentCard title="VAT workflow">
        <div className="grid gap-3 md:grid-cols-4">
          {[
            [ROUTES.accountingTaxGhanaVatReturn, 'Review VAT return', 'Review boxes, tax components and source transactions.'],
            [ROUTES.accountingTaxGhanaVatApportionment, 'Apportion mixed input VAT', 'Calculate and post recoverable mixed-input adjustments.'],
            [ROUTES.accountingTaxGhanaImportedServices, 'Review imported services', 'Capture reverse-charge tax and recoverability.'],
            [ROUTES.accountingTaxGhanaVatReconciliation, 'Reconcile to the GL', 'Confirm the tax subledger agrees with tax control accounts.'],
          ].map(([to, title, text]) => <Link key={to} to={to} className="rounded-2xl border border-border-subtle bg-white p-4 transition hover:border-brand-primary/30 hover:shadow-sm"><div className="flex items-center gap-2 font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-brand-primary" />{title}</div><div className="mt-2 text-sm leading-5 text-slate-500">{text}</div></Link>)}
        </div>
      </ContentCard>
    </GhanaComplianceShell>
  );
}
