import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRightLeft,
  Calculator,
  CheckCircle2,
  Download,
  FileSearch,
  FileSpreadsheet,
  Filter,
  Percent,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TableProperties
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeReportingApi } from '../api/reporting.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { downloadBlob } from '../../../shared/utils/fileDownload.js';

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function rowsFrom(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;

  const directKeys = [
    'data',
    'rows',
    'items',
    'lines',
    'entries',
    'results',
    'returns',
    'filings',
    'transactions',
    'diagnostics',
    'exceptions',
    'issues',
    'summaryBySource',
    'byBox',
    'byDirection',
    'sources'
  ];

  for (const key of directKeys) {
    if (Array.isArray(data[key])) return data[key];
  }

  if (data.data && typeof data.data === 'object') {
    for (const key of directKeys) {
      if (Array.isArray(data.data[key])) return data.data[key];
    }
  }

  return [];
}

function normalizeNestedRows(data, key) {
  const arr = data?.[key] ?? data?.data?.[key];
  return Array.isArray(arr) ? arr : [];
}

function formatLabel(value) {
  return String(value ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function isNumericLike(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^-?\d+(\.\d+)?$/.test(trimmed);
}

function isDateLike(value, key = '') {
  if (value == null || value === '') return false;
  if (key && /(date|period|filed|submitted|created|updated|due|from|to|effective)$/i.test(key)) return true;
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);
}

function toNumber(value) {
  if (typeof value === 'number') return value;
  if (!isNumericLike(value)) return NaN;
  return Number(value);
}

function formatNumber(value, { money = false } = {}) {
  const num = toNumber(value);
  if (!Number.isFinite(num)) return value == null || value === '' ? '—' : String(value);
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: money ? 2 : 0,
    maximumFractionDigits: money ? 2 : 2
  }).format(num);
}

function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(parsed);
}

function looksLikeMoneyKey(key) {
  return /(tax|vat|gst|levy|amount|total|payable|credit|debit|base|sales|purchase|output|input|net|value|balance|variance|difference)/i.test(key);
}

function formatValue(key, value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (isDateLike(value, key)) return formatDate(value);
  if (isNumericLike(value)) return formatNumber(value, { money: looksLikeMoneyKey(key) });
  return String(value);
}

function flattenMetrics(data, parentKey = '') {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];

  const entries = [];
  Object.entries(data).forEach(([key, value]) => {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    if (value == null || value === '') return;
    if (Array.isArray(value)) return;
    if (typeof value === 'object') {
      entries.push(...flattenMetrics(value, fullKey));
      return;
    }
    if (typeof value === 'number' || isNumericLike(value) || typeof value === 'boolean' || isDateLike(value, key)) {
      entries.push({ key: fullKey, value, rawKey: key });
    }
  });
  return entries;
}

function statusTone(value) {
  const v = String(value ?? '').toLowerCase();
  if (['filed', 'submitted', 'posted', 'complete', 'completed', 'accepted', 'ok', 'ready'].includes(v)) return 'success';
  if (['draft', 'pending', 'open', 'in_progress', 'processing', 'warning'].includes(v)) return 'warning';
  if (['rejected', 'failed', 'voided', 'cancelled', 'error', 'exception'].includes(v)) return 'danger';
  return 'muted';
}

function buildColumns(rows) {
  const sample = rows[0];
  const keys = sample ? Object.keys(sample) : [];

  return keys.slice(0, 14).map((key) => ({
    header: formatLabel(key),
    accessorKey: key,
    className: isNumericLike(sample?.[key]) ? 'text-right' : undefined,
    render: (row) => {
      const value = row?.[key];
      if (/status|severity|state/i.test(key)) {
        return <Badge tone={statusTone(value)}>{formatLabel(value)}</Badge>;
      }
      const formatted = formatValue(key, value);
      const mono = isNumericLike(value) || /code|reference|box|document|source|entity/i.test(key);
      return <span className={mono ? 'font-medium tabular-nums text-text-strong' : 'text-text-body'}>{formatted}</span>;
    }
  }));
}

function toCsv(rows) {
  if (!rows?.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (value) => {
    if (value == null) return '';
    const text = String(value);
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((h) => esc(row[h])).join(','))].join('\n');
}

function KpiCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="app-card">
      <div className="app-card-body flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-deep">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-text-strong">{value}</div>
          {hint ? <div className="mt-1 text-xs text-text-muted">{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}

function InsightList({ title = 'Highlights', items }) {
  if (!items?.length) return null;
  return (
    <ContentCard title={title}>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex gap-3 rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3">
            <div className="mt-0.5 h-2 w-2 rounded-full bg-brand-primary" />
            <p className="text-sm text-text-body">{item}</p>
          </div>
        ))}
      </div>
    </ContentCard>
  );
}

function KeyValueList({ data }) {
  const entries = Object.entries(data ?? {}).filter(([, value]) => value != null && typeof value !== 'object');
  if (!entries.length) return <div className="text-sm text-text-muted">No simple fields available.</div>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-text-muted">{formatLabel(key)}</div>
          <div className="mt-1 text-sm font-medium text-text-strong">{formatValue(key, value)}</div>
        </div>
      ))}
    </div>
  );
}

function deriveSummaryCards(tab, data, rows) {
  const metrics = flattenMetrics(data);
  const findMetric = (...needles) =>
    metrics.find((item) => needles.some((needle) => item.key.toLowerCase().includes(needle) || item.rawKey.toLowerCase() === needle));

  if (tab === 'returns') {
    const filedCount = rows.filter((row) => ['filed', 'submitted', 'posted', 'accepted'].includes(String(row.status ?? '').toLowerCase())).length;
    const draftCount = rows.filter((row) => ['draft', 'pending'].includes(String(row.status ?? '').toLowerCase())).length;
    const totalLiability = rows.reduce((sum, row) => {
      const candidateKey = Object.keys(row).find((key) => /(payable|tax_due|liability|net_tax|net_amount|amount)/i.test(key));
      return sum + (Number(row?.[candidateKey]) || 0);
    }, 0);

    return [
      { label: 'Returns in result', value: formatNumber(rows.length), icon: FileSpreadsheet },
      { label: 'Filed / submitted', value: formatNumber(filedCount), icon: CheckCircle2 },
      { label: 'Draft / pending', value: formatNumber(draftCount), icon: RefreshCw },
      { label: 'Total tax exposure', value: formatNumber(totalLiability, { money: true }), icon: Calculator }
    ];
  }

  if (tab === 'transactions') {
    const uniqueDocuments = new Set(rows.map((row) => row.document_no ?? row.documentNo ?? row.reference ?? row.id).filter(Boolean)).size;
    const totalTax = rows.reduce((sum, row) => {
      const key = Object.keys(row).find((k) => /tax_amount|taxAmount|tax$|vat/i.test(k));
      return sum + (Number(row[key]) || 0);
    }, 0);
    const uniqueSources = new Set(rows.map((row) => row.source_type ?? row.sourceType ?? row.document_type ?? row.documentType).filter(Boolean)).size;
    return [
      { label: 'Tax lines', value: formatNumber(rows.length), icon: TableProperties },
      { label: 'Documents', value: formatNumber(uniqueDocuments), icon: ReceiptText },
      { label: 'Source types', value: formatNumber(uniqueSources), icon: ArrowRightLeft },
      { label: 'Tax amount', value: formatNumber(totalTax, { money: true }), icon: Percent }
    ];
  }

  if (tab === 'reconciliation') {
    const variance = findMetric('variance', 'difference');
    const reportTotal = findMetric('reporttotal', 'report_total', 'computedtotal', 'computed_total', 'taxtotal');
    const ledgerTotal = findMetric('ledgertotal', 'ledger_total', 'controlaccounttotal', 'gltotal');
    const sourceCount = rows.length || normalizeNestedRows(data, 'sources').length || normalizeNestedRows(data, 'byBox').length;
    return [
      { label: 'Reconciliation rows', value: formatNumber(sourceCount), icon: ArrowRightLeft },
      { label: 'Reported total', value: formatValue(reportTotal?.rawKey ?? 'reportTotal', reportTotal?.value), icon: Calculator },
      { label: 'Reference total', value: formatValue(ledgerTotal?.rawKey ?? 'ledgerTotal', ledgerTotal?.value), icon: ShieldCheck },
      { label: 'Variance', value: formatValue(variance?.rawKey ?? 'variance', variance?.value), icon: variance && Number(variance.value) === 0 ? CheckCircle2 : AlertTriangle }
    ];
  }

  if (tab === 'diagnostics') {
    const issueRows = rows.length;
    const blocking = rows.filter((row) => /high|error|critical/i.test(String(row.severity ?? row.status ?? ''))).length;
    const warnings = rows.filter((row) => /medium|warning|warn/i.test(String(row.severity ?? row.status ?? ''))).length;
    const affectedDocs = new Set(rows.map((row) => row.document_no ?? row.documentNo ?? row.reference ?? row.entity_id ?? row.id).filter(Boolean)).size;
    return [
      { label: 'Issues detected', value: formatNumber(issueRows), icon: ShieldAlert },
      { label: 'Blocking / critical', value: formatNumber(blocking), icon: AlertTriangle },
      { label: 'Warnings', value: formatNumber(warnings), icon: RefreshCw },
      { label: 'Affected documents', value: formatNumber(affectedDocs), icon: ReceiptText }
    ];
  }

  const output = findMetric('outputvat', 'output_tax', 'outputtax');
  const input = findMetric('inputvat', 'input_tax', 'inputtax');
  const net = findMetric('netvatpayable', 'net_tax', 'netpayable', 'vatpayable');
  const taxableSales = findMetric('taxablesales', 'salesbase', 'outputbase');
  const taxablePurchases = findMetric('taxablepurchases', 'purchasebase', 'inputbase');

  return [
    { label: 'Output tax', value: formatValue(output?.rawKey ?? 'outputTax', output?.value), icon: ReceiptText },
    { label: 'Input tax', value: formatValue(input?.rawKey ?? 'inputTax', input?.value), icon: ArrowRightLeft },
    { label: 'Net tax', value: formatValue(net?.rawKey ?? 'netTax', net?.value), icon: Percent },
    { label: tab === 'summary' ? 'Taxable sales' : 'Taxable purchases', value: formatValue((tab === 'summary' ? taxableSales : taxablePurchases)?.rawKey ?? 'taxableBase', (tab === 'summary' ? taxableSales : taxablePurchases)?.value), icon: Calculator }
  ];
}

function deriveHighlights(tab, data, rows) {
  const metrics = flattenMetrics(data).slice(0, 8);
  if (tab === 'transactions') {
    const sources = Array.from(new Set(rows.map((row) => row.source_type ?? row.sourceType ?? row.document_type ?? row.documentType).filter(Boolean)));
    return [
      rows.length ? `Loaded ${rows.length} tax-bearing line${rows.length === 1 ? '' : 's'} for the selected filters.` : 'Run the report to review tax-bearing transaction detail.',
      sources.length ? `Included source document families: ${sources.slice(0, 6).join(', ')}${sources.length > 6 ? '…' : ''}.` : 'Use this view to audit document-level tax lines and adjustments.',
      'This dataset is designed for drilldown and should include operational adjustments such as credit notes, debit notes, and tax-bearing operational documents where available.'
    ];
  }

  if (tab === 'reconciliation') {
    return [
      'Use reconciliation to compare computed tax totals with the grouped source detail the backend exposes.',
      metrics[0] ? `${formatLabel(metrics[0].rawKey)}: ${formatValue(metrics[0].rawKey, metrics[0].value)}.` : 'Run the report to inspect period variances.',
      'A non-zero variance should be investigated before filing or finalising a return.'
    ];
  }

  if (tab === 'diagnostics') {
    return [
      rows.length ? `Detected ${rows.length} tax data issue${rows.length === 1 ? '' : 's'} for the current filter set.` : 'Run diagnostics to surface tax coding and data-integrity exceptions.',
      'Typical issues include missing tax code, missing box mapping, missing direction, or zero tax amount on a coded line.',
      'Treat this view as the filing-readiness check before a period is submitted.'
    ];
  }

  if (tab === 'returns') {
    return [
      rows.length ? `Loaded ${rows.length} filing register item${rows.length === 1 ? '' : 's'} for the selected period.` : 'Run the report to load filed and draft tax returns.',
      metrics[0] ? `${formatLabel(metrics[0].rawKey)}: ${formatValue(metrics[0].rawKey, metrics[0].value)}.` : 'Use this view to track filing status and liabilities.',
      metrics[1] ? `${formatLabel(metrics[1].rawKey)}: ${formatValue(metrics[1].rawKey, metrics[1].value)}.` : null
    ].filter(Boolean);
  }

  return [
    metrics[0] ? `${formatLabel(metrics[0].rawKey)} stands at ${formatValue(metrics[0].rawKey, metrics[0].value)}.` : 'Run the report to review the current tax position.',
    metrics[1] ? `${formatLabel(metrics[1].rawKey)} is ${formatValue(metrics[1].rawKey, metrics[1].value)}.` : null,
    'This workspace now supports summary, filing, transaction drilldown, reconciliation, and diagnostics from one place.'
  ].filter(Boolean);
}

function sectionRows(tab, data) {
  if (tab === 'reconciliation') {
    const boxes = normalizeNestedRows(data, 'byBox');
    const directions = normalizeNestedRows(data, 'byDirection');
    const sources = normalizeNestedRows(data, 'sources');
    return boxes.length ? boxes : directions.length ? directions : sources;
  }
  if (tab === 'diagnostics') {
    const issues = rowsFrom(data);
    if (issues.length) return issues;
    return normalizeNestedRows(data, 'exceptions');
  }
  return rowsFrom(data);
}

export default function ReportTax() {
  const { http } = useApi();
  const api = useMemo(() => makeReportingApi(http), [http]);

  const [tab, setTab] = useState('summary');
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());
  const [templateCode, setTemplateCode] = useState('');
  const [taxType, setTaxType] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [status, setStatus] = useState('');
  const [hasRun, setHasRun] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const sharedQs = useMemo(() => ({ from: from || undefined, to: to || undefined }), [from, to]);
  const returnQs = useMemo(() => ({ ...sharedQs, templateCode: templateCode || undefined }), [sharedQs, templateCode]);
  const returnsQs = useMemo(() => ({ ...sharedQs, taxType: taxType || undefined, status: status || undefined }), [sharedQs, taxType, status]);
  const txQs = useMemo(() => ({ ...sharedQs, taxType: taxType || undefined, documentType: documentType || undefined, status: status || undefined }), [sharedQs, taxType, documentType, status]);
  const reconciliationQs = useMemo(() => ({ ...sharedQs, taxType: taxType || undefined, templateCode: templateCode || undefined }), [sharedQs, taxType, templateCode]);
  const diagnosticsQs = useMemo(() => ({ ...sharedQs, taxType: taxType || undefined, documentType: documentType || undefined }), [sharedQs, taxType, documentType]);

  const summaryQ = useQuery({ queryKey: qk.reportTaxVatSummary(sharedQs), queryFn: () => api.tax.vatSummary(sharedQs), enabled: false, staleTime: 60_000 });
  const vatReturnQ = useQuery({ queryKey: qk.reportTaxVatReturn(returnQs), queryFn: () => api.tax.vatReturn(returnQs), enabled: false, staleTime: 60_000 });
  const returnsQ = useQuery({ queryKey: qk.reportTaxReturns(returnsQs), queryFn: () => api.tax.returns(returnsQs), enabled: false, staleTime: 60_000 });
  const transactionsQ = useQuery({ queryKey: qk.reportTaxTransactions(txQs), queryFn: () => api.tax.transactions(txQs), enabled: false, staleTime: 60_000 });
  const reconciliationQ = useQuery({ queryKey: qk.reportTaxReconciliation(reconciliationQs), queryFn: () => api.tax.reconciliation(reconciliationQs), enabled: false, staleTime: 60_000 });
  const diagnosticsQ = useQuery({ queryKey: qk.reportTaxDiagnostics(diagnosticsQs), queryFn: () => api.tax.diagnostics(diagnosticsQs), enabled: false, staleTime: 60_000 });

  const active = {
    summary: summaryQ,
    return: vatReturnQ,
    returns: returnsQ,
    transactions: transactionsQ,
    reconciliation: reconciliationQ,
    diagnostics: diagnosticsQ
  }[tab];

  const activeData = active?.data ?? {};
  const rows = useMemo(() => sectionRows(tab, activeData), [tab, activeData]);
  const columns = useMemo(() => buildColumns(rows), [rows]);
  const summaryCards = useMemo(() => deriveSummaryCards(tab, activeData, rows), [tab, activeData, rows]);
  const highlights = useMemo(() => deriveHighlights(tab, activeData, rows), [tab, activeData, rows]);

  const validationError = useMemo(() => {
    if (from && to && new Date(from) > new Date(to)) return 'The end date must be on or after the start date.';
    return '';
  }, [from, to]);

  const run = () => {
    if (validationError) return;
    setHasRun(true);
    setSelectedRow(null);
    if (tab === 'summary') return summaryQ.refetch();
    if (tab === 'return') return vatReturnQ.refetch();
    if (tab === 'returns') return returnsQ.refetch();
    if (tab === 'transactions') return transactionsQ.refetch();
    if (tab === 'reconciliation') return reconciliationQ.refetch();
    return diagnosticsQ.refetch();
  };

  const resetFilters = () => {
    setFrom(startOfMonth());
    setTo(today());
    setTemplateCode('');
    setTaxType('');
    setDocumentType('');
    setStatus('');
    setSelectedRow(null);
  };

  const exportRows = () => {
    if (!rows.length) return;
    const csv = toCsv(rows);
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `tax-${tab}-${today()}.csv`);
  };

  const filterBadge = {
    summary: 'Summary view',
    return: 'Return builder',
    returns: 'Returns register',
    transactions: 'Tax transactions',
    reconciliation: 'Reconciliation',
    diagnostics: 'Diagnostics'
  }[tab];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Tax Reports"
        subtitle="Production-grade tax reporting across summary, return preparation, transaction drilldown, reconciliation, and diagnostics."
        icon={Percent}
        actions={
          <>
            <Button variant="outline" onClick={resetFilters}>Reset filters</Button>
            <Button variant="outline" leftIcon={Download} onClick={exportRows} disabled={!rows.length}>Export CSV</Button>
          </>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'summary', label: 'VAT Summary' },
          { value: 'return', label: 'VAT Return' },
          { value: 'returns', label: 'Returns Register' },
          { value: 'transactions', label: 'Transactions' },
          { value: 'reconciliation', label: 'Reconciliation' },
          { value: 'diagnostics', label: 'Diagnostics' }
        ]}
      />

      <ContentCard title="Report filters" actions={<Badge tone="primary">{filterBadge}</Badge>}>
        <div className="grid gap-4 lg:grid-cols-6">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />

          {(tab === 'return' || tab === 'reconciliation') ? (
            <Input label="Template code" value={templateCode} onChange={(e) => setTemplateCode(e.target.value)} placeholder="e.g. VAT-STD" />
          ) : null}

          {(tab === 'returns' || tab === 'transactions' || tab === 'reconciliation' || tab === 'diagnostics') ? (
            <Select
              label="Tax type"
              value={taxType}
              onChange={(e) => setTaxType(e.target.value)}
              options={[
                { value: '', label: 'All tax types' },
                { value: 'VAT', label: 'VAT' },
                { value: 'GST', label: 'GST' },
                { value: 'NHIL', label: 'NHIL' },
                { value: 'GETFund', label: 'GETFund' },
                { value: 'COVID', label: 'COVID levy' }
              ]}
            />
          ) : null}

          {(tab === 'transactions' || tab === 'diagnostics') ? (
            <Select
              label="Document type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              options={[
                { value: '', label: 'All source documents' },
                { value: 'invoice', label: 'Invoice' },
                { value: 'bill', label: 'Bill' },
                { value: 'credit_note', label: 'Credit note' },
                { value: 'debit_note', label: 'Debit note' },
                { value: 'expense', label: 'Expense' },
                { value: 'petty_cash', label: 'Petty cash' },
                { value: 'return', label: 'Return' },
                { value: 'tax_adjustment', label: 'Tax adjustment' }
              ]}
            />
          ) : null}

          {(tab === 'returns' || tab === 'transactions') ? (
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'draft', label: 'Draft' },
                { value: 'pending', label: 'Pending' },
                { value: 'submitted', label: 'Submitted' },
                { value: 'posted', label: 'Posted' },
                { value: 'voided', label: 'Voided' }
              ]}
            />
          ) : null}

          <div className="lg:col-span-2 flex items-end justify-start gap-2 lg:justify-end">
            <Button variant="outline" leftIcon={Filter} onClick={resetFilters}>Clear</Button>
            <Button leftIcon={Search} loading={active?.isLoading || active?.isFetching} onClick={run} disabled={Boolean(validationError)}>
              Run report
            </Button>
          </div>
        </div>
        {validationError ? <p className="mt-3 text-sm text-red-600">{validationError}</p> : null}
      </ContentCard>

      {summaryCards.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => <KpiCard key={card.label} icon={card.icon} label={card.label} value={card.value} hint={card.hint} />)}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.6fr,1fr]">
        <ContentCard
          title={
            tab === 'summary' ? 'Computed summary' :
            tab === 'return' ? 'Return detail' :
            tab === 'returns' ? 'Filing register' :
            tab === 'transactions' ? 'Tax-bearing transactions' :
            tab === 'reconciliation' ? 'Reconciliation detail' :
            'Diagnostics and exceptions'
          }
          actions={
            hasRun && !active?.isLoading ? (
              <Badge tone={rows.length ? (tab === 'diagnostics' ? 'warning' : 'success') : 'warning'}>
                {rows.length ? `${rows.length} row${rows.length === 1 ? '' : 's'}` : 'No tabular rows'}
              </Badge>
            ) : null
          }
        >
          {rows.length ? (
            <DataTable
              columns={columns}
              rows={rows}
              isLoading={active?.isLoading || active?.isFetching}
              emptyTitle="No tax data returned"
              emptyDescription="Try widening the date range or adjusting the report filters."
              onRowClick={(row) => setSelectedRow(row)}
            />
          ) : (
            <div className="space-y-4">
              <DataTable
                columns={[]}
                rows={[]}
                isLoading={active?.isLoading || active?.isFetching}
                emptyTitle={hasRun ? 'No tabular result returned' : 'Run a tax report'}
                emptyDescription={
                  hasRun
                    ? 'This endpoint returned summary data without line rows, or no data matched the selected filters.'
                    : 'Choose a report view, set any filters you need, and run the report.'
                }
              />
              {hasRun ? <JsonPanel title="Structured response" value={activeData} /> : null}
            </div>
          )}
        </ContentCard>

        <div className="space-y-6">
          <InsightList items={highlights} />
          {tab === 'reconciliation' ? (
            <ContentCard title="Reconciliation groups">
              <div className="space-y-4 text-sm text-text-body">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">By box</div>
                  <JsonPanel title="Box grouping" value={normalizeNestedRows(activeData, 'byBox')} />
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">By direction</div>
                  <JsonPanel title="Direction grouping" value={normalizeNestedRows(activeData, 'byDirection')} />
                </div>
              </div>
            </ContentCard>
          ) : null}
          <ContentCard title="Raw response">
            <JsonPanel title="API payload" value={activeData} />
          </ContentCard>
        </div>
      </div>

      <Modal
        open={Boolean(selectedRow)}
        title="Tax row detail"
        onClose={() => setSelectedRow(null)}
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setSelectedRow(null)}>Close</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <KeyValueList data={selectedRow ?? {}} />
          <JsonPanel title="Full row payload" value={selectedRow} />
        </div>
      </Modal>
    </div>
  );
}
