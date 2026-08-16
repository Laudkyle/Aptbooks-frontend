import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

import { useApi } from '../../../../../shared/hooks/useApi.js';
import { qk } from '../../../../../shared/query/keys.js';
import { formatMoney } from '../../../../../shared/utils/formatMoney.js';
import { ContentCard } from '../../../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../../../shared/components/ui/Button.jsx';
import { Input } from '../../../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../../../shared/components/ui/Table.jsx';
import { makeGhanaComplianceApi } from '../../api/ghanaCompliance.api.js';
import { GhanaComplianceShell } from '../../components/GhanaComplianceShell.jsx';
import { GhanaVatNav } from '../../components/GhanaVatNav.jsx';

function monthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) };
}

export default function GhanaVatReturn() {
  const { http } = useApi();
  const api = useMemo(() => makeGhanaComplianceApi(http), [http]);
  const [range, setRange] = useState(() => monthRange());

  const returnQuery = useQuery({
    queryKey: qk.ghanaVatReturn(range),
    queryFn: () => api.getGhanaVatReturn(range),
    enabled: Boolean(range.from && range.to),
  });

  const data = returnQuery.data;
  const componentRows = Object.entries(data?.componentTotals ?? {}).map(([code, amount]) => ({ code, amount }));
  const whvat = data?.vatWithholdingCredits;

  return (
    <GhanaComplianceShell
      title="Ghana VAT Return"
      subtitle="Review the VAT, NHIL and GETFund position from the canonical tax subledger before filing."
      actions={<Button variant="outline" onClick={() => returnQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}
    >
      <GhanaVatNav />
      <ContentCard title="Return period">
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
          <Input label="From" type="date" value={range.from} onChange={(e) => setRange((s) => ({ ...s, from: e.target.value }))} />
          <Input label="To" type="date" value={range.to} onChange={(e) => setRange((s) => ({ ...s, to: e.target.value }))} />
        </div>
      </ContentCard>

      {returnQuery.isLoading ? <ContentCard><div className="py-10 text-center text-sm text-slate-500">Preparing VAT return…</div></ContentCard> : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ContentCard><div className="text-xs font-semibold uppercase text-slate-500">Taxable value</div><div className="mt-2 text-2xl font-bold">{formatMoney(data.totals.taxable_amount, 'GHS')}</div></ContentCard>
            <ContentCard><div className="text-xs font-semibold uppercase text-slate-500">Output tax</div><div className="mt-2 text-2xl font-bold">{formatMoney(data.totals.output_tax, 'GHS')}</div></ContentCard>
            <ContentCard><div className="text-xs font-semibold uppercase text-slate-500">Recoverable input</div><div className="mt-2 text-2xl font-bold text-emerald-700">{formatMoney(data.totals.input_tax, 'GHS')}</div></ContentCard>
            <ContentCard><div className="text-xs font-semibold uppercase text-slate-500">Non-recoverable input</div><div className="mt-2 text-2xl font-bold text-amber-700">{formatMoney(data.totals.nonrecoverable_input_tax, 'GHS')}</div></ContentCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ContentCard className="lg:col-span-2" title="VAT position">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Before WHVAT credit</div><div className="mt-1 text-lg font-bold">{formatMoney(data.totals.net_tax_payable_before_vat_withholding_credit, 'GHS')}</div></div>
                <div className="rounded-xl bg-blue-50 p-4"><div className="text-xs text-blue-700">WHVAT credit</div><div className="mt-1 text-lg font-bold text-blue-800">{formatMoney(data.totals.vat_withholding_credit, 'GHS')}</div></div>
                <div className="rounded-xl bg-brand-primary/10 p-4"><div className="text-xs text-brand-deep">Net payable</div><div className="mt-1 text-lg font-bold text-brand-deep">{formatMoney(data.totals.net_tax_payable, 'GHS')}</div></div>
                <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Transactions</div><div className="mt-1 text-lg font-bold">{data.coverage.transaction_count}</div></div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border-subtle p-4"><div className="text-xs text-slate-500">Imported-services output tax</div><div className="mt-1 font-semibold">{formatMoney(data.totals.imported_services_output_tax, 'GHS')}</div></div>
                <div className="rounded-xl border border-border-subtle p-4"><div className="text-xs text-slate-500">Imported-services recoverable input</div><div className="mt-1 font-semibold">{formatMoney(data.totals.imported_services_recoverable_input_tax, 'GHS')}</div></div>
              </div>
            </ContentCard>

            <ContentCard title="WHVAT credits">
              <div className="text-3xl font-bold text-slate-950">{formatMoney(whvat?.amount || '0.00', 'GHS')}</div>
              <div className="mt-1 text-sm text-slate-500">{whvat?.certificateCount ?? 0} certificate(s) in this period</div>
              <div className="mt-4 text-xs leading-5 text-slate-500">Received VAT-withholding certificates are applied as a separate credit after the VAT/NHIL/GETFund position is calculated.</div>
            </ContentCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ContentCard title="Tax components">
              <Table rows={componentRows} columns={[
                { header: 'Tax code', render: (row) => <span className="font-medium">{row.code}</span> },
                { header: 'Tax amount', className: 'text-right', render: (row) => <span className="font-semibold tabular-nums">{formatMoney(row.amount, 'GHS')}</span> },
              ]} />
            </ContentCard>
            <ContentCard title="Return boxes">
              <Table rows={data.boxes} columns={[
                { header: 'Box', render: (row) => <div><div className="font-semibold">{row.box_code}</div><div className="text-xs text-slate-500">{row.label}</div></div> },
                { header: 'Direction', render: (row) => row.direction ? <Badge tone="info">{row.direction}</Badge> : '—' },
                { header: 'Taxable', className: 'text-right', render: (row) => formatMoney(row.taxable_amount, 'GHS') },
                { header: 'Tax', className: 'text-right', render: (row) => <span className="font-semibold">{formatMoney(row.tax_amount, 'GHS')}</span> },
                { header: 'Txns', className: 'text-right', render: (row) => row.transaction_count },
              ]} />
            </ContentCard>
          </div>

          <ContentCard title={`Underlying tax transactions (${data.transactions.length})`}>
            <Table rows={data.transactions} columns={[
              { header: 'Date', render: (row) => row.document_date },
              { header: 'Document', render: (row) => <div><div className="font-semibold">{row.document_no || '—'}</div><div className="text-xs text-slate-500">{row.entity_type}</div></div> },
              { header: 'Partner', render: (row) => row.partner_name || '—' },
              { header: 'Tax', render: (row) => <div><div className="font-medium">{row.tax_code}</div><div className="text-xs text-slate-500">{row.tax_code_name}</div></div> },
              { header: 'Direction', render: (row) => <Badge tone="info">{row.direction}</Badge> },
              { header: 'Taxable', className: 'text-right', render: (row) => formatMoney(row.signed_taxable_amount, 'GHS') },
              { header: 'Tax', className: 'text-right', render: (row) => <span className="font-semibold">{formatMoney(row.signed_tax_amount, 'GHS')}</span> },
              { header: 'Recoverable', className: 'text-right', render: (row) => formatMoney(row.signed_recoverable_amount, 'GHS') },
            ]} />
          </ContentCard>
        </>
      ) : <ContentCard><div className="py-10 text-center text-sm text-slate-500">No VAT return data for the selected period.</div></ContentCard>}
    </GhanaComplianceShell>
  );
}
