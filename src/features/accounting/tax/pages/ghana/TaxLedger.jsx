import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Filter, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '../../../../../app/constants/routes.js';
import { useApi } from '../../../../../shared/hooks/useApi.js';
import { qk } from '../../../../../shared/query/keys.js';
import { formatMoney } from '../../../../../shared/utils/formatMoney.js';
import { ContentCard } from '../../../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../../../shared/components/ui/Button.jsx';
import { Select } from '../../../../../shared/components/ui/Select.jsx';
import { Input } from '../../../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../../../shared/components/ui/Table.jsx';
import { makeGhanaComplianceApi } from '../../api/ghanaCompliance.api.js';
import { GhanaComplianceShell } from '../../components/GhanaComplianceShell.jsx';

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'bill', label: 'Bill' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'debit_note', label: 'Debit Note' },
  { value: 'pos_sale', label: 'POS Sale' },
  { value: 'pos_return', label: 'POS Return' },
  { value: 'expense', label: 'Expense' },
  { value: 'petty_cash', label: 'Petty Cash' },
  { value: 'tax_adjustment', label: 'Tax Adjustment' },
  { value: 'imported_service', label: 'Imported Service' },
];

const DIRECTION_OPTIONS = [
  { value: '', label: 'Input and output' },
  { value: 'input', label: 'Input' },
  { value: 'output', label: 'Output' },
  { value: 'withholding', label: 'Withholding' },
  { value: 'reverse_charge', label: 'Reverse charge' },
];

function sourceLabel(value) {
  return SOURCE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function sourceRoute(row) {
  if (row.source_type === 'invoice') return ROUTES.invoiceDetail(row.source_id);
  if (row.source_type === 'bill') return ROUTES.billDetail(row.source_id);
  if (row.source_type === 'credit_note') return ROUTES.creditNoteDetail(row.source_id);
  if (row.source_type === 'debit_note') return ROUTES.debitNoteDetail(row.source_id);
  return null;
}

export default function TaxLedger() {
  const { http } = useApi();
  const nav = useNavigate();
  const api = useMemo(() => makeGhanaComplianceApi(http), [http]);
  const [filters, setFilters] = useState({ fromDate: '', toDate: '', sourceType: '', taxType: '', direction: '', taxCodeId: '' });

  const taxCodesQuery = useQuery({
    queryKey: qk.taxCodes({ status: 'active' }),
    queryFn: () => api.listTaxCodes({ status: 'active' }),
    staleTime: 60_000,
  });

  const query = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '')), [filters]);
  const ledgerQuery = useQuery({
    queryKey: qk.taxLedger(query),
    queryFn: () => api.listTaxLedger(query),
  });

  const taxCodeOptions = [
    { value: '', label: 'All tax codes' },
    ...(taxCodesQuery.data ?? []).map((code) => ({
      value: code.id,
      label: code.code && code.name ? `${code.code} — ${code.name}` : code.name || code.code || 'Unnamed tax code',
    })),
  ];

  const rows = ledgerQuery.data ?? [];

  return (
    <GhanaComplianceShell
      title="Tax Ledger"
      subtitle="Trace statutory tax from the source transaction through the canonical AptBooks tax subledger."
      actions={<Button variant="outline" onClick={() => ledgerQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}
    >
      <ContentCard title="Filters" actions={<Filter className="h-4 w-4 text-slate-400" />}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Input label="From" type="date" value={filters.fromDate} onChange={(e) => setFilters((s) => ({ ...s, fromDate: e.target.value }))} />
          <Input label="To" type="date" value={filters.toDate} onChange={(e) => setFilters((s) => ({ ...s, toDate: e.target.value }))} />
          <Select label="Source" value={filters.sourceType} onChange={(e) => setFilters((s) => ({ ...s, sourceType: e.target.value }))} options={SOURCE_OPTIONS} />
          <Select label="Direction" value={filters.direction} onChange={(e) => setFilters((s) => ({ ...s, direction: e.target.value }))} options={DIRECTION_OPTIONS} />
          <Select label="Tax type" value={filters.taxType} onChange={(e) => setFilters((s) => ({ ...s, taxType: e.target.value }))} options={[{ value: '', label: 'All tax types' }, { value: 'VAT', label: 'VAT / NHIL / GETFund' }, { value: 'GST', label: 'GST' }, { value: 'SALES', label: 'Sales tax' }, { value: 'WITHHOLDING', label: 'Withholding' }, { value: 'IMPORT', label: 'Import' }, { value: 'OTHER', label: 'Other' }]} />
          <Select label="Tax code" value={filters.taxCodeId} onChange={(e) => setFilters((s) => ({ ...s, taxCodeId: e.target.value }))} options={taxCodeOptions} />
        </div>
      </ContentCard>

      <ContentCard title={`Tax entries (${rows.length})`}>
        {ledgerQuery.isLoading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading tax ledger…</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">No tax ledger entries match the selected filters.</div>
        ) : (
          <Table
            rows={rows}
            columns={[
              { header: 'Date', render: (row) => row.document_date || '—' },
              { header: 'Document', render: (row) => <div><div className="font-semibold text-slate-900">{row.document_no || 'Unnumbered'}</div><div className="mt-1 text-xs text-slate-500">{sourceLabel(row.source_type)}</div></div> },
              { header: 'Partner', render: (row) => row.partner_name || '—' },
              { header: 'Tax', render: (row) => <div><div className="font-medium">{row.tax_code || '—'}</div><div className="text-xs text-slate-500">{row.tax_code_name || row.tax_type || '—'}</div></div> },
              { header: 'Treatment', render: (row) => <div className="flex flex-wrap gap-1"><Badge tone="info">{row.direction || '—'}</Badge><Badge tone="muted">{row.tax_scope || '—'}</Badge></div> },
              { header: 'Taxable', className: 'text-right', render: (row) => <span className="tabular-nums">{formatMoney(row.signed_taxable_amount || '0.00', 'GHS')}</span> },
              { header: 'Tax', className: 'text-right', render: (row) => <span className="font-semibold tabular-nums">{formatMoney(row.signed_tax_amount || '0.00', 'GHS')}</span> },
              { header: 'Recoverable', className: 'text-right', render: (row) => <span className="tabular-nums">{formatMoney(row.signed_recoverable_amount || '0.00', 'GHS')}</span> },
              { header: '', render: (row) => { const to = sourceRoute(row); return to ? <Button variant="ghost" size="sm" onClick={() => nav(to)} aria-label="Open source document"><ExternalLink className="h-4 w-4" /></Button> : null; } },
            ]}
          />
        )}
      </ContentCard>
    </GhanaComplianceShell>
  );
}
