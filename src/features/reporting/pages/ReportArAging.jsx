import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeReportingApi } from '../api/reporting.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';

/* ─── data helpers ─── */

function rowsFrom(data) {
  if (!data) return [];
  if (data?.data?.customers && Array.isArray(data.data.customers)) return data.data.customers;
  if (data?.data?.vendors   && Array.isArray(data.data.vendors))   return data.data.vendors;
  if (Array.isArray(data?.customers)) return data.customers;
  if (Array.isArray(data?.data))      return data.data;
  if (Array.isArray(data?.rows))      return data.rows;
  if (Array.isArray(data?.items))     return data.items;
  if (Array.isArray(data))            return data;
  return [];
}

function totalsFrom(data) {
  return data?.totals ?? data?.data?.totals ?? null;
}

function asOfFrom(data) {
  return data?.as_of_date ?? data?.data?.as_of_date ?? null;
}

function formatCurrency(value) {
  if (value == null || value === '') return '—';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return value;
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function calculateSummary(rows, apiTotals) {
  if (apiTotals) {
    return {
      totalCustomers:   rows.length,
      invoiceCount:     rows.reduce((n, c) => n + (c.invoices?.length ?? 0), 0),
      totalOutstanding: apiTotals.total      ?? 0,
      current:          apiTotals.CURRENT    ?? 0,
      days30:           apiTotals['1-30']    ?? 0,
      days60:           apiTotals['31-60']   ?? 0,
      days90:           apiTotals['61-90']   ?? 0,
      days91_120:       apiTotals['91-120']  ?? 0,
      days120Plus:      apiTotals['120+']    ?? 0,
    };
  }
  // fallback: aggregate from rows
  const s = {
    totalCustomers: rows.length,
    invoiceCount:   rows.reduce((n, c) => n + (c.invoices?.length ?? 0), 0),
    totalOutstanding: 0, current: 0, days30: 0, days60: 0,
    days90: 0, days91_120: 0, days120Plus: 0,
  };
  rows.forEach(row => {
    const b = row.buckets || {};
    s.current        += parseFloat(b.CURRENT   ?? 0);
    s.days30         += parseFloat(b['1-30']   ?? 0);
    s.days60         += parseFloat(b['31-60']  ?? 0);
    s.days90         += parseFloat(b['61-90']  ?? 0);
    s.days91_120     += parseFloat(b['91-120'] ?? 0);
    s.days120Plus    += parseFloat(b['120+']   ?? 0);
    s.totalOutstanding += parseFloat(b.total ?? row.outstanding_total ?? 0);
  });
  return s;
}

function formatHeader(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

/* ─── bucket styling ─── */

function bucketMeta(bucket) {
  const map = {
    CURRENT:  { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Current'    },
    '1-30':   { bg: 'bg-lime-50',   text: 'text-lime-700',   label: '1–30 days'  },
    '31-60':  { bg: 'bg-yellow-50', text: 'text-yellow-700', label: '31–60 days' },
    '61-90':  { bg: 'bg-orange-50', text: 'text-orange-700', label: '61–90 days' },
    '91-120': { bg: 'bg-red-50',    text: 'text-red-600',    label: '91–120 days'},
    '120+':   { bg: 'bg-red-100',   text: 'text-red-700',    label: '120+ days'  },
  };
  return map[bucket] ?? { bg: 'bg-slate-100', text: 'text-slate-600', label: bucket };
}

/* ─── sub-components ─── */

function BucketPill({ bucket }) {
  const { bg, text } = bucketMeta(bucket);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {bucket}
    </span>
  );
}

function DaysPill({ days }) {
  const color = days > 180 ? 'bg-red-100 text-red-700'
    : days > 90  ? 'bg-red-50 text-red-600'
    : days > 60  ? 'bg-orange-50 text-orange-700'
    : days > 30  ? 'bg-yellow-50 text-yellow-700'
    : 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {days}d
    </span>
  );
}

function AgingBar({ summary }) {
  const { totalOutstanding: total, current, days30, days60, days90, days91_120, days120Plus } = summary;
  if (!total) return null;
  const pct = v => `${Math.max((v / total) * 100, v > 0 ? 1.5 : 0).toFixed(2)}%`;
  const segments = [
    { value: current,     color: '#22c55e', label: 'Current',     amount: current     },
    { value: days30,      color: '#84cc16', label: '1–30 days',   amount: days30      },
    { value: days60,      color: '#f59e0b', label: '31–60 days',  amount: days60      },
    { value: days90,      color: '#f97316', label: '61–90 days',  amount: days90      },
    { value: days91_120,  color: '#ef4444', label: '91–120 days', amount: days91_120  },
    { value: days120Plus, color: '#dc2626', label: '120+ days',   amount: days120Plus },
  ];
  return (
    <div className="space-y-3">
      <div className="flex h-2.5 rounded-full overflow-hidden gap-px bg-slate-100">
        {segments.map((seg, i) =>
          seg.value > 0 ? (
            <div key={i} style={{ width: pct(seg.value), background: seg.color, borderRadius: 99 }} />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: seg.color }} />
            {seg.label}:&nbsp;
            <span className="font-medium text-slate-700">{formatCurrency(seg.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerInvoiceBlock({ customer }) {
  const [open, setOpen] = useState(true);
  const { customer_name, customer_id, buckets, invoices = [] } = customer;
  const allOverdue = buckets?.total > 0 && (buckets?.['120+'] ?? 0) === buckets?.total;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-semibold text-blue-700 flex-shrink-0 select-none">
            {initials(customer_name)}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{customer_name}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{customer_id?.slice(0, 24)}…</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {allOverdue && <BucketPill bucket="120+" />}
          <span className="text-sm font-semibold text-slate-900 tabular-nums">
            {formatCurrency(buckets?.total)}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && invoices.length > 0 && (
        <div className="border-t border-slate-100 overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Invoice', 'Invoice date', 'Due date', 'Currency', 'Total', 'Outstanding', 'Days past due', 'Bucket'].map(h => (
                  <th
                    key={h}
                    className={`px-4 py-2 font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap ${
                      ['Total', 'Outstanding', 'Days past due', 'Bucket'].includes(h) ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, idx) => (
                <tr
                  key={inv.invoice_id}
                  className={`hover:bg-slate-50 transition-colors ${idx < invoices.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  <td className="px-4 py-2.5">
                    <span className="font-mono font-semibold text-blue-600">{inv.invoice_no}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{fmtDate(inv.invoice_date)}</td>
                  <td className="px-4 py-2.5 text-slate-600">{fmtDate(inv.due_date)}</td>
                  <td className="px-4 py-2.5 text-slate-600">{inv.currency_code}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-700">{formatCurrency(inv.total)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900">{formatCurrency(inv.outstanding)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {inv.days_past_due != null && <DaysPill days={inv.days_past_due} />}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <BucketPill bucket={inv.bucket} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-4 text-xs">
            {Object.entries(buckets ?? {})
              .filter(([k, v]) => k !== 'total' && parseFloat(v) > 0)
              .map(([k, v]) => {
                const { text } = bucketMeta(k);
                return (
                  <span key={k} className={`font-medium ${text}`}>
                    {k}: {formatCurrency(v)}
                  </span>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── main page ─── */

export default function ReportArAging() {
  const { http } = useApi();
  const api = useMemo(() => makeReportingApi(http), [http]);

  const [asOfDate, setAsOfDate]       = useState('');
  const [bucketSetId, setBucketSetId] = useState('');
  const [errors, setErrors]           = useState({});

  const qs = useMemo(
    () => ({ asOfDate: asOfDate || undefined, bucketSetId: bucketSetId || undefined }),
    [asOfDate, bucketSetId],
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: qk.reportArAging(qs),
    queryFn:  () => api.ar.agedReceivables(qs),
    staleTime: 60_000,
  });

  const rows      = rowsFrom(data);
  const apiTotals = totalsFrom(data);
  const asOf      = asOfFrom(data);
  const summary   = rows.length > 0 ? calculateSummary(rows, apiTotals) : null;

  console.log('Aging report data:', { rows, summary, apiTotals, fullData: data });

  const columns = useMemo(() => {
    if (rows.length === 0) return [
      { header: 'Customer',           accessor: 'customer_name'    },
      { header: 'Total Outstanding',  accessor: 'total_outstanding'},
    ];
    return [
      {
        header: 'Customer', accessor: 'customer_name',
        render: row => <span className="text-sm font-medium text-slate-900">{row.customer_name || '—'}</span>,
      },
      {
        header: 'Total', accessor: 'total_outstanding',
        render: row => <span className="text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(row.buckets?.total)}</span>,
      },
      {
        header: 'Current', accessor: 'current',
        render: row => <span className="text-sm text-slate-600 tabular-nums">{formatCurrency(row.buckets?.CURRENT ?? 0)}</span>,
      },
      {
        header: '1–30 days', accessor: 'days_1_30',
        render: row => <span className="text-sm text-slate-600 tabular-nums">{formatCurrency(row.buckets?.['1-30'] ?? 0)}</span>,
      },
      {
        header: '31–60 days', accessor: 'days_31_60',
        render: row => <span className="text-sm text-slate-600 tabular-nums">{formatCurrency(row.buckets?.['31-60'] ?? 0)}</span>,
      },
      {
        header: '61–90 days', accessor: 'days_61_90',
        render: row => <span className="text-sm text-slate-600 tabular-nums">{formatCurrency(row.buckets?.['61-90'] ?? 0)}</span>,
      },
      {
        header: '91–120 days', accessor: 'days_91_120',
        render: row => <span className="text-sm text-slate-600 tabular-nums">{formatCurrency(row.buckets?.['91-120'] ?? 0)}</span>,
      },
      {
        header: '120+ days', accessor: 'days_120_plus',
        render: row => {
          const v = row.buckets?.['120+'] ?? 0;
          return <span className={`text-sm font-medium tabular-nums ${v > 0 ? 'text-red-600' : 'text-slate-600'}`}>{formatCurrency(v)}</span>;
        },
      },
    ];
  }, [rows]);

  const handleRefresh = () => {
    const newErrors = {};
    if (asOfDate && !/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
      newErrors.asOfDate = 'Date must be in YYYY-MM-DD format';
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    refetch();
  };

  const handleExport = () => {
    if (rows.length === 0) return;
    const accessorMap = {
      total_outstanding: r => r.buckets?.total      ?? 0,
      current:           r => r.buckets?.CURRENT    ?? 0,
      days_1_30:         r => r.buckets?.['1-30']   ?? 0,
      days_31_60:        r => r.buckets?.['31-60']  ?? 0,
      days_61_90:        r => r.buckets?.['61-90']  ?? 0,
      days_91_120:       r => r.buckets?.['91-120'] ?? 0,
      days_120_plus:     r => r.buckets?.['120+']   ?? 0,
    };
    const headers = columns.map(c => c.header).join(',');
    const csvRows = rows.map(row =>
      columns.map(col => {
        const fn  = accessorMap[col.accessor];
        const val = fn ? fn(row) : (row[col.accessor] ?? '');
        return typeof val === 'string' && (val.includes(',') || val.includes('"'))
          ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(',')
    );
    const csv  = [headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = window.URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `ar-aging-${asOfDate || new Date().toISOString().split('T')[0]}.csv`,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const showOverdueAlert = summary && summary.totalOutstanding > 0
    && (summary.days120Plus / summary.totalOutstanding) > 0.5;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-8">
      <PageHeader
        title="Accounts Receivable Aging"
        subtitle="Track outstanding customer invoices and monitor collection effectiveness"
      />

      {/* as-of banner */}
      {asOf && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
          Report as of&nbsp;
          <span className="font-semibold text-slate-700">
            {new Date(asOf).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          &nbsp;·&nbsp;{summary?.totalCustomers ?? 0} customer{summary?.totalCustomers !== 1 ? 's' : ''}
          &nbsp;·&nbsp;{summary?.invoiceCount ?? 0} invoice{summary?.invoiceCount !== 1 ? 's' : ''}
        </div>
      )}

      {/* KPI summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Total customers</p>
            <p className="text-2xl font-bold text-slate-900">{summary.totalCustomers}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Total outstanding</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary.totalOutstanding)}</p>
          </div>
          {summary.current > 0 && (
            <div className="bg-white border border-green-200 rounded-lg p-4">
              <p className="text-xs font-medium text-green-700 mb-1">Current</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.current)}</p>
            </div>
          )}
          {summary.days30 > 0 && (
            <div className="bg-white border border-yellow-200 rounded-lg p-4">
              <p className="text-xs font-medium text-yellow-700 mb-1">1–30 days</p>
              <p className="text-2xl font-bold text-yellow-700">{formatCurrency(summary.days30)}</p>
            </div>
          )}
          {summary.days60 > 0 && (
            <div className="bg-white border border-orange-200 rounded-lg p-4">
              <p className="text-xs font-medium text-orange-700 mb-1">31–60 days</p>
              <p className="text-2xl font-bold text-orange-700">{formatCurrency(summary.days60)}</p>
            </div>
          )}
          {(summary.days90 > 0 || summary.days91_120 > 0 || summary.days120Plus > 0) && (
            <div className="bg-white border border-red-200 rounded-lg p-4">
              <p className="text-xs font-medium text-red-700 mb-1">Over 60 days</p>
              <p className="text-2xl font-bold text-red-700">
                {formatCurrency(summary.days90 + summary.days91_120 + summary.days120Plus)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* key metrics */}
      {summary && summary.totalOutstanding > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-blue-900">Collection rate</p>
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {((summary.current / summary.totalOutstanding) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-blue-700 mt-1">Current vs total</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-amber-900">At risk</p>
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-amber-900">
              {formatCurrency(summary.days90 + summary.days91_120 + summary.days120Plus)}
            </p>
            <p className="text-xs text-amber-700 mt-1">Over 60 days past due</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-green-900">Average per customer</p>
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(summary.totalOutstanding / summary.totalCustomers)}
            </p>
            <p className="text-xs text-green-700 mt-1">Per customer balance</p>
          </div>
        </div>
      )}

      {/* aging distribution bar */}
      {summary && summary.totalOutstanding > 0 && (
        <ContentCard>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Aging distribution</h3>
          <AgingBar summary={summary} />
        </ContentCard>
      )}

      {/* filters */}
      <ContentCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Report filters</h3>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleRefresh} disabled={isLoading || isFetching}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isFetching ? 'Refreshing…' : 'Refresh'}
              </Button>
              <Button variant="secondary" onClick={handleExport} disabled={rows.length === 0}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Input
                label="As of date"
                type="date"
                value={asOfDate}
                onChange={e => {
                  setAsOfDate(e.target.value);
                  if (errors.asOfDate) setErrors(prev => ({ ...prev, asOfDate: undefined }));
                }}
                error={errors.asOfDate}
                placeholder="YYYY-MM-DD"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                View receivables as of a specific date (leave blank for current date)
              </p>
            </div>
            <div>
              <Input
                label="Bucket set ID (optional)"
                value={bucketSetId}
                onChange={e => setBucketSetId(e.target.value)}
                placeholder="Enter bucket set ID"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Use a custom aging bucket configuration
              </p>
            </div>
          </div>

          {asOfDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-800">
                  Viewing receivables as of&nbsp;
                  <span className="font-semibold">
                    {new Date(asOfDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </ContentCard>

      {/* overdue alert */}
      {showOverdueAlert && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-800">Immediate collection action required</p>
            <p className="text-xs text-red-700 mt-0.5">
              Over 50% of outstanding receivables ({formatCurrency(summary.days120Plus)}) are 120+ days overdue.
              Escalate collection efforts for affected customers.
            </p>
          </div>
        </div>
      )}

      {/* customer detail + DataTable */}
      <ContentCard>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-slate-600">Loading aging report…</p>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No data available</h3>
            <p className="text-sm text-slate-600">
              No receivables found for the selected criteria. Try adjusting your filters or date range.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Customer details</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {rows.length} customer{rows.length !== 1 ? 's' : ''} with outstanding balances · click to expand invoices
                </p>
              </div>
            </div>

            {/* expandable per-customer invoice breakdown */}
            <div className="space-y-2 mb-6">
              {rows.map(customer => (
                <CustomerInvoiceBlock key={customer.customer_id} customer={customer} />
              ))}
            </div>

            {/* summary rollup via DataTable */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Summary by customer</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <DataTable
                  columns={columns}
                  rows={rows}
                  loading={isLoading}
                  empty={{ title: 'No receivables found', description: 'Adjust filters and refresh to view data.' }}
                />
              </div>
            </div>
          </>
        )}
      </ContentCard>

      {/* help */}
      <ContentCard>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">About AR aging</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-700">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">What is AR aging?</h4>
              <p className="text-xs text-slate-500">
                The Accounts Receivable Aging report shows how long customer invoices have been outstanding.
                This helps you monitor cash flow, identify collection issues, and maintain healthy customer relationships.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">How to use this report</h4>
              <ul className="text-xs text-slate-500 space-y-1">
                <li>• Identify customers with overdue balances (61+ days)</li>
                <li>• Prioritize collection efforts based on aging buckets</li>
                <li>• Monitor trends by comparing different time periods</li>
                <li>• Export to CSV for detailed analysis or follow-up</li>
              </ul>
            </div>
          </div>
        </div>
      </ContentCard>
    </div>
  );
}