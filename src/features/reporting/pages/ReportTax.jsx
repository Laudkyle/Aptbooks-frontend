import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calculator, FileSearch, Globe2, ReceiptText, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react';

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
import { normalizeRows } from '../../../shared/tax/frontendTax.js';

function formatLabel(value) {
  return String(value ?? '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
}
function rowsToColumns(rows) {
  const sample = rows[0];
  if (!sample) return [];
  return Object.keys(sample).slice(0, 12).map((key) => ({ header: formatLabel(key), accessorKey: key, render: (row) => /status|state|severity/i.test(key) ? <Badge tone="muted">{String(row[key] ?? '—')}</Badge> : String(row[key] ?? '—') }));
}
function today() { return new Date().toISOString().slice(0, 10); }
function startOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }

export default function ReportTax() {
  const { http } = useApi();
  const api = useMemo(() => makeReportingApi(http), [http]);
  const [tab, setTab] = useState('summary');
  const [dateFrom, setDateFrom] = useState(startOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [jurisdictionCode, setJurisdictionCode] = useState('');
  const [taxType, setTaxType] = useState('');
  const [status, setStatus] = useState('');
  const [runToken, setRunToken] = useState(0);

  const qs = useMemo(() => ({ dateFrom, dateTo, jurisdictionCode: jurisdictionCode || undefined, taxType: taxType || undefined, status: status || undefined }), [dateFrom, dateTo, jurisdictionCode, taxType, status]);
  const enabled = runToken > 0;

  const queryMap = {
    summary: useQuery({ queryKey: qk.reportTaxVatSummary(qs), queryFn: () => api.tax.vatSummary(qs), enabled: enabled && tab === 'summary' }),
    returns: useQuery({ queryKey: qk.reportTaxReturns(qs), queryFn: () => api.tax.returns(qs), enabled: enabled && tab === 'returns' }),
    transactions: useQuery({ queryKey: qk.reportTaxTransactions(qs), queryFn: () => api.tax.transactions(qs), enabled: enabled && tab === 'transactions' }),
    reconciliation: useQuery({ queryKey: qk.reportTaxReconciliation(qs), queryFn: () => api.tax.reconciliation(qs), enabled: enabled && tab === 'reconciliation' }),
    withholding: useQuery({ queryKey: ['reports', 'tax', 'withholding', qs], queryFn: () => api.tax.withholdingSummary(qs), enabled: enabled && tab === 'withholding' }),
    recoverability: useQuery({ queryKey: ['reports', 'tax', 'recoverability', qs], queryFn: () => api.tax.recoverability(qs), enabled: enabled && tab === 'recoverability' }),
    einvoicing: useQuery({ queryKey: ['reports', 'tax', 'einvoicing', qs], queryFn: () => api.tax.einvoicing(qs), enabled: enabled && tab === 'einvoicing' }),
    jurisdictionReturns: useQuery({ queryKey: ['reports', 'tax', 'jurisdictionReturns', qs], queryFn: () => api.tax.jurisdictionReturns(qs), enabled: enabled && tab === 'jurisdictionReturns' }),
    realtimeFilings: useQuery({ queryKey: ['reports', 'tax', 'realtimeFilings', qs], queryFn: () => api.tax.realtimeFilings(qs), enabled: enabled && tab === 'realtimeFilings' }),
    countryPacks: useQuery({ queryKey: ['reports', 'tax', 'countryPacks', qs], queryFn: () => api.tax.countryPackReadiness(qs), enabled: enabled && tab === 'countryPacks' }),
  };

  const active = queryMap[tab];
  const data = active?.data;
  const rows = normalizeRows(data);
  const columns = rowsToColumns(rows);

  const cards = [
    { icon: Calculator, label: 'Summary', value: normalizeRows(queryMap.summary.data).length },
    { icon: WalletCards, label: 'Returns', value: normalizeRows(queryMap.returns.data).length },
    { icon: RefreshCw, label: 'Transactions', value: normalizeRows(queryMap.transactions.data).length },
    { icon: ShieldCheck, label: 'Withholding', value: normalizeRows(queryMap.withholding.data).length },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Tax reporting" subtitle="Cross-module reporting for wave 1–3 capabilities: reconciliation, withholding, recoverability, e-invoicing, jurisdiction returns, real-time filings, and country-pack readiness." icon={ReceiptText} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'summary', label: 'Summary' }, { value: 'returns', label: 'Returns' }, { value: 'transactions', label: 'Transactions' }, { value: 'reconciliation', label: 'Reconciliation' }, { value: 'withholding', label: 'Withholding' }, { value: 'recoverability', label: 'Recoverability' }, { value: 'einvoicing', label: 'E-invoicing' }, { value: 'jurisdictionReturns', label: 'Jurisdiction returns' }, { value: 'realtimeFilings', label: 'Real-time filings' }, { value: 'countryPacks', label: 'Country packs' }]} />
      <ContentCard title="Filters">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Input label="Date from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="Date to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Input label="Jurisdiction code" value={jurisdictionCode} onChange={(e) => setJurisdictionCode(e.target.value.toUpperCase())} />
          <Select label="Tax type" value={taxType} onChange={(e) => setTaxType(e.target.value)} options={[{ value: '', label: 'All' }, { value: 'VAT', label: 'VAT' }, { value: 'GST', label: 'GST' }, { value: 'WHT', label: 'Withholding' }]} />
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: '', label: 'All' }, { value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }, { value: 'posted', label: 'Posted' }, { value: 'accepted', label: 'Accepted' }]} />
        </div>
        <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => { setDateFrom(startOfMonth()); setDateTo(today()); setJurisdictionCode(''); setTaxType(''); setStatus(''); }}>Clear</Button><Button leftIcon={FileSearch} onClick={() => setRunToken((v) => v + 1)} loading={active?.isLoading}>Run report</Button></div>
      </ContentCard>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <ContentCard key={card.label}><div className="flex items-center justify-between"><div><div className="text-xs uppercase text-text-muted">{card.label}</div><div className="mt-1 text-2xl font-semibold text-text-strong">{card.value}</div></div><card.icon className="h-5 w-5 text-brand-deep" /></div></ContentCard>)}</div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
        <ContentCard title={formatLabel(tab)} actions={rows.length ? <Badge tone="success">{rows.length} rows</Badge> : null}>
          <DataTable columns={columns} rows={rows} isLoading={active?.isLoading} emptyTitle={runToken ? 'No data returned' : 'Run a report'} emptyDescription="Adjust the filters or switch report views." />
        </ContentCard>
        <div className="space-y-6">
          <ContentCard title="Highlights">
            <div className="space-y-2 text-sm text-text-body">
              <p>This workspace now includes withholding tax, recoverability and non-deductible tax analytics.</p>
              <p>E-invoicing readiness and near-real-time filing visibility are exposed on dedicated tabs.</p>
              <p>Jurisdiction-specific return output and country-pack readiness can be reviewed without leaving reporting.</p>
            </div>
          </ContentCard>
          <ContentCard title="Raw response"><JsonPanel title="API payload" value={data ?? { filters: qs, message: 'Run a report to load data.' }} /></ContentCard>
        </div>
      </div>
    </div>
  );
}
