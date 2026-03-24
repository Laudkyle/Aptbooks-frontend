import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeReportingApi } from '../api/reporting.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { makePartnersApi } from '../../business/api/partners.api.js';
import { toOptions, NONE_OPTION } from '../../../shared/utils/options.js';

/* ─── helpers ─── */

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

function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

function parseStatementData(data) {
  if (!data) return null;
  const responseData   = data.data || data;
  const customer       = responseData.customer || {};
  const openingBalance = responseData.opening_balance || 0;
  const closingBalance = responseData.closing_balance || 0;

  const transactions = (responseData.lines || [])
    .filter(line => line.type !== 'opening_balance')
    .map(line => ({
      date:        line.date,
      type:        line.type,
      reference:   line.reference,
      description: line.description,
      debit:       line.debit  || 0,
      credit:      line.credit || 0,
      balance:     line.balance,
    }));

  let totalCharges = 0;
  let totalPayments = 0;
  transactions.forEach(tx => {
    if (tx.type === 'invoice')                          totalCharges  += tx.debit;
    if (tx.type === 'payment' || tx.type === 'receipt') totalPayments += tx.credit;
  });

  return {
    customer: { id: customer.id, name: customer.name },
    period:   { from: responseData.from, to: responseData.to },
    summary:  { beginningBalance: openingBalance, totalCharges, totalPayments, endingBalance: closingBalance },
    transactions,
  };
}

function txTypeMeta(type) {
  const map = {
    invoice: { label: 'Invoice', bg: 'bg-blue-50',    text: 'text-blue-700'   },
    payment: { label: 'Payment', bg: 'bg-green-50',   text: 'text-green-700'  },
    receipt: { label: 'Receipt', bg: 'bg-green-50',   text: 'text-green-700'  },
    credit:  { label: 'Credit',  bg: 'bg-purple-50',  text: 'text-purple-700' },
    debit:   { label: 'Debit',   bg: 'bg-orange-50',  text: 'text-orange-700' },
  };
  return map[type] ?? { label: type, bg: 'bg-slate-100', text: 'text-slate-600' };
}

function TypePill({ type }) {
  const { label, bg, text } = txTypeMeta(type);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}

function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

/* ─── main component ─── */

export default function ReportArCustomerStatement() {
  const { http } = useApi();
  const api         = useMemo(() => makeReportingApi(http), [http]);
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);

  const [customerId, setCustomerId] = useState('');
  const [from, setFrom]             = useState('');
  const [to, setTo]                 = useState('');
  const [errors, setErrors]         = useState({});
  const [hasSearched, setHasSearched] = useState(false);

  const qs = useMemo(
    () => ({ customerId: customerId || undefined, from: from || undefined, to: to || undefined }),
    [customerId, from, to],
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: qk.reportArCustomerStatement(qs),
    queryFn:  () => api.ar.customerStatement(qs),
    enabled:  false,
    staleTime: 60_000,
  });

  const customersQ = useQuery({
    queryKey: ['partners', 'customers'],
    queryFn:  () => partnersApi.list({ type: 'customer' }),
    staleTime: 60_000,
  });

  const customers = Array.isArray(customersQ.data) ? customersQ.data : customersQ.data?.data ?? [];
  const customerOptions = [NONE_OPTION, ...toOptions(customers, {
    valueKey: 'id',
    label: c => `${c.code ?? ''} ${c.name ?? c.business_name ?? ''}`.trim() || c.id,
  })];

  const selectedCustomerLabel = customerOptions.find(o => o.value === customerId)?.label ?? customerId;
  const statement = parseStatementData(data);

  const validateAndRun = () => {
    const newErrors = {};
    if (!customerId.trim())                                            newErrors.customerId = 'Customer is required';
    if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from))                   newErrors.from       = 'Date must be in YYYY-MM-DD format';
    if (to   && !/^\d{4}-\d{2}-\d{2}$/.test(to))                     newErrors.to         = 'Date must be in YYYY-MM-DD format';
    if (from && to && new Date(from) > new Date(to))                  newErrors.to         = 'End date must be after start date';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setHasSearched(true);
    refetch();
  };

  const handlePrint = () => window.print();

  const handleEmail = () => {
    alert('Email functionality would be implemented here to send the statement to the customer.');
  };

  const handleExport = () => {
    if (!statement) return;
    let text = `CUSTOMER STATEMENT\n==================\n\n`;
    if (statement.customer.name)               text += `Customer: ${statement.customer.name}\n`;
    if (statement.customer.id || customerId)   text += `Customer ID: ${statement.customer.id || customerId}\n`;
    text += `\nStatement Period: ${formatDate(statement.period.from)} to ${formatDate(statement.period.to)}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n\n`;
    text += `SUMMARY\n-------\n`;
    text += `Beginning Balance: ${formatCurrency(statement.summary.beginningBalance)}\n`;
    text += `Total Charges:     ${formatCurrency(statement.summary.totalCharges)}\n`;
    text += `Total Payments:    ${formatCurrency(statement.summary.totalPayments)}\n`;
    text += `Amount Due:        ${formatCurrency(statement.summary.endingBalance)}\n\n`;
    if (statement.transactions.length > 0) {
      text += `TRANSACTIONS\n------------\n`;
      statement.transactions.forEach(tx => {
        const amt = tx.type === 'invoice' ? tx.debit : tx.credit;
        text += `${formatDate(tx.date)} | ${tx.type.toUpperCase()} | ${tx.reference || ''} | ${tx.description || ''} | ${formatCurrency(amt)}\n`;
      });
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = window.URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `customer-statement-${customerId}-${from || 'all'}-${to || 'all'}.txt`,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const isEmpty = !statement || (
    !statement.transactions?.length
    && statement.summary.endingBalance    === 0
    && statement.summary.beginningBalance === 0
  );

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-8">
      <PageHeader
        title="Customer Account Statement"
        subtitle="Generate detailed statements showing all transactions with a customer for a specific period"
      />

      {/* parameters */}
      <ContentCard>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Statement parameters</h3>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Select
                label="Customer"
                value={customerId}
                onChange={e => {
                  setCustomerId(e.target.value);
                  if (errors.customerId) setErrors(prev => ({ ...prev, customerId: undefined }));
                }}
                options={customerOptions}
                error={errors.customerId}
                required
              />
              <p className="mt-1.5 text-xs text-slate-500">Required</p>
            </div>
            <div>
              <Input
                label="Start date"
                type="date"
                value={from}
                onChange={e => {
                  setFrom(e.target.value);
                  if (errors.from) setErrors(prev => ({ ...prev, from: undefined }));
                }}
                error={errors.from}
                placeholder="YYYY-MM-DD"
              />
              <p className="mt-1.5 text-xs text-slate-500">Period start (optional)</p>
            </div>
            <div>
              <Input
                label="End date"
                type="date"
                value={to}
                onChange={e => {
                  setTo(e.target.value);
                  if (errors.to) setErrors(prev => ({ ...prev, to: undefined }));
                }}
                error={errors.to}
                placeholder="YYYY-MM-DD"
              />
              <p className="mt-1.5 text-xs text-slate-500">Period end (optional)</p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button onClick={validateAndRun} disabled={isLoading || isFetching}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {isFetching ? 'Generating…' : 'Generate statement'}
            </Button>
          </div>
        </div>
      </ContentCard>

      {/* states */}
      {!hasSearched ? (
        <ContentCard>
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1.5">Generate a customer statement</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Select a customer above and optionally set a date range, then click <span className="font-medium text-slate-700">Generate statement</span>.
            </p>
          </div>
        </ContentCard>
      ) : isLoading || isFetching ? (
        <ContentCard>
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-slate-500">Generating statement…</p>
            </div>
          </div>
        </ContentCard>
      ) : isEmpty ? (
        <ContentCard>
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1.5">No statement data</h3>
            <p className="text-sm text-slate-500 mb-6">
              No transactions found for <span className="font-mono font-semibold text-slate-700">{customerId}</span> in the specified period.
            </p>
            <Button variant="secondary" onClick={() => { setHasSearched(false); setCustomerId(''); setFrom(''); setTo(''); }}>
              Start over
            </Button>
          </div>
        </ContentCard>
      ) : (
        <>
          {/* period banner */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            Statement for&nbsp;
            <span className="font-semibold text-slate-700">{statement.customer.name || selectedCustomerLabel}</span>
            &nbsp;·&nbsp;
            {statement.period.from ? formatDate(statement.period.from) : 'Beginning'}
            &nbsp;–&nbsp;
            {statement.period.to ? formatDate(statement.period.to) : 'Current'}
            &nbsp;·&nbsp;
            {statement.transactions.length} transaction{statement.transactions.length !== 1 ? 's' : ''}
          </div>

          {/* KPI summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">Opening balance</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {formatCurrency(statement.summary.beginningBalance)}
              </p>
            </div>
            <div className="bg-white border border-blue-200 rounded-lg p-4">
              <p className="text-xs font-medium text-blue-700 mb-1">Total charges</p>
              <p className="text-2xl font-bold text-blue-700 tabular-nums">
                {formatCurrency(statement.summary.totalCharges)}
              </p>
            </div>
            <div className="bg-white border border-green-200 rounded-lg p-4">
              <p className="text-xs font-medium text-green-700 mb-1">Total payments</p>
              <p className="text-2xl font-bold text-green-700 tabular-nums">
                {formatCurrency(statement.summary.totalPayments)}
              </p>
            </div>
            <div className={`bg-white rounded-lg p-4 ${statement.summary.endingBalance > 0 ? 'border border-red-300' : 'border border-slate-200'}`}>
              <p className={`text-xs font-medium mb-1 ${statement.summary.endingBalance > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                Amount due
              </p>
              <p className={`text-2xl font-bold tabular-nums ${statement.summary.endingBalance > 0 ? 'text-red-700' : 'text-slate-900'}`}>
                {formatCurrency(statement.summary.endingBalance)}
              </p>
            </div>
          </div>

          {/* amount due callout */}
          {statement.summary.endingBalance > 0 && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-900">Outstanding balance</p>
                  <p className="text-xs text-red-700 mt-0.5">Please remit payment at your earliest convenience</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-red-900 tabular-nums">
                {formatCurrency(statement.summary.endingBalance)}
              </span>
            </div>
          )}

          {/* statement document */}
          <ContentCard>
            <div className="print:p-8">

              {/* action bar */}
              <div className="mb-6 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-xs font-semibold text-blue-700 flex-shrink-0 select-none">
                    {initials(statement.customer.name || selectedCustomerLabel)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{statement.customer.name || selectedCustomerLabel}</p>
                    <p className="text-xs text-slate-400 font-mono">{statement.customer.id || customerId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={handleEmail}>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </Button>
                  <Button variant="secondary" onClick={handlePrint}>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </Button>
                  <Button variant="secondary" onClick={handleExport}>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export
                  </Button>
                </div>
              </div>

              {/* print-only header */}
              <div className="hidden print:block border-b-2 border-slate-900 pb-6 mb-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-4">CUSTOMER STATEMENT</h1>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Customer</p>
                    {statement.customer.name && <p className="text-sm font-semibold text-slate-900">{statement.customer.name}</p>}
                    <p className="text-sm text-slate-600 font-mono">{statement.customer.id || customerId}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Period</p>
                    <p className="text-sm text-slate-900">
                      {statement.period.from ? formatDate(statement.period.from) : 'Beginning'}&nbsp;–&nbsp;
                      {statement.period.to   ? formatDate(statement.period.to)   : 'Current'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Generated: {new Date().toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* account summary strip */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Account summary</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Opening balance</span>
                      <span className="text-sm font-medium text-slate-900 tabular-nums">
                        {formatCurrency(statement.summary.beginningBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Total charges</span>
                      <span className="text-sm font-medium text-blue-700 tabular-nums">
                        + {formatCurrency(statement.summary.totalCharges)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Total payments</span>
                      <span className="text-sm font-medium text-green-700 tabular-nums">
                        − {formatCurrency(statement.summary.totalPayments)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <div className="w-full flex justify-between items-center pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-200 md:pl-6">
                      <span className="text-sm font-semibold text-slate-900">Amount due</span>
                      <span className={`text-2xl font-bold tabular-nums ${statement.summary.endingBalance > 0 ? 'text-red-700' : 'text-slate-900'}`}>
                        {formatCurrency(statement.summary.endingBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* transactions */}
              {statement.transactions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">Transaction details</h3>
                    <span className="text-xs text-slate-500">
                      {statement.transactions.length} transaction{statement.transactions.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50">
                        <tr>
                          {['Date', 'Type', 'Reference', 'Description', 'Charges', 'Payments', 'Balance'].map(h => (
                            <th
                              key={h}
                              className={`px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide ${
                                ['Charges', 'Payments', 'Balance'].includes(h) ? 'text-right' : 'text-left'
                              }`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 bg-white">
                        {statement.transactions.map((tx, idx) => {
                          const isPayment = tx.type === 'payment' || tx.type === 'receipt';
                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                                {formatDate(tx.date)}
                              </td>
                              <td className="px-4 py-3">
                                <TypePill type={tx.type} />
                              </td>
                              <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-600">
                                {tx.reference || '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {tx.description || '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-right tabular-nums whitespace-nowrap">
                                {tx.debit > 0
                                  ? <span className="font-medium text-blue-700">+ {formatCurrency(tx.debit)}</span>
                                  : <span className="text-slate-300">—</span>
                                }
                              </td>
                              <td className="px-4 py-3 text-sm text-right tabular-nums whitespace-nowrap">
                                {tx.credit > 0
                                  ? <span className="font-medium text-green-700">− {formatCurrency(tx.credit)}</span>
                                  : <span className="text-slate-300">—</span>
                                }
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right tabular-nums whitespace-nowrap">
                                {formatCurrency(tx.balance)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t border-slate-200">
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Amount due
                          </td>
                          <td />
                          <td className={`px-4 py-3 text-base font-bold text-right tabular-nums ${
                            statement.summary.endingBalance > 0 ? 'text-red-700' : 'text-slate-900'
                          }`}>
                            {formatCurrency(statement.summary.endingBalance)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* payment instructions */}
              {statement.summary.endingBalance > 0 && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-1">Payment instructions</p>
                  <p className="text-xs text-blue-800">
                    Please include your customer ID (<span className="font-mono font-semibold">{statement.customer.id || customerId}</span>) with your payment.
                    For questions about this statement, contact our accounts receivable department.
                  </p>
                </div>
              )}

              {/* footer */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-400 text-center">
                Thank you for your business. This statement reflects all transactions recorded in our system for the specified period.
              </div>
            </div>
          </ContentCard>
        </>
      )}

      {/* help */}
      <ContentCard className="print:hidden">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">About customer statements</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-900 mb-2">What is a customer statement?</h4>
              <p className="text-xs text-slate-500">
                A customer statement is a comprehensive record of all financial transactions between your company and a specific customer.
                It shows invoices, payments, credits, and the current outstanding balance over a specified period.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-900 mb-2">How to use this report</h4>
              <ul className="text-xs text-slate-500 space-y-1">
                <li>• Send to customers for account reconciliation</li>
                <li>• Use for collection follow-ups on overdue accounts</li>
                <li>• Print or email directly to customers</li>
                <li>• Export for record-keeping and audit purposes</li>
              </ul>
            </div>
          </div>
        </div>
      </ContentCard>
    </div>
  );
}