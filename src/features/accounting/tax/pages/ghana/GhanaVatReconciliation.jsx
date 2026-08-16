import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

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
  const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return { from: fmt(new Date(y,m,1)), to: fmt(new Date(y,m+1,0)) };
}

export default function GhanaVatReconciliation() {
  const { http } = useApi();
  const api = useMemo(() => makeGhanaComplianceApi(http), [http]);
  const [range, setRange] = useState(() => monthRange());
  const query = useQuery({
    queryKey: qk.ghanaVatReconciliation(range),
    queryFn: () => api.getGhanaVatReconciliation(range),
    enabled: Boolean(range.from && range.to),
  });
  const data = query.data;
  const components = Object.entries(data?.ghanaComponentTotals ?? {}).map(([code, amount]) => ({ code, amount }));
  const accounts = data?.glTotals?.accounts ?? [];
  const issues = data?.issues ?? [];

  return (
    <GhanaComplianceShell title="VAT Reconciliation" subtitle="Reconcile Ghana VAT, NHIL, GETFund and reverse-charge tax from the tax subledger to posted GL tax-control accounts." actions={<Button variant="outline" onClick={() => query.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Re-run</Button>}>
      <GhanaVatNav />
      <ContentCard title="Period"><div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl"><Input label="From" type="date" value={range.from} onChange={(e)=>setRange((s)=>({...s,from:e.target.value}))}/><Input label="To" type="date" value={range.to} onChange={(e)=>setRange((s)=>({...s,to:e.target.value}))}/></div></ContentCard>
      {query.isLoading ? <ContentCard><div className="py-10 text-center text-sm text-slate-500">Reconciling tax subledger to GL…</div></ContentCard> : data ? <>
        <ContentCard>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">{data.status === 'balanced' ? <div className="rounded-xl bg-emerald-50 p-2"><CheckCircle2 className="h-6 w-6 text-emerald-600" /></div> : <div className="rounded-xl bg-amber-50 p-2"><AlertTriangle className="h-6 w-6 text-amber-600" /></div>}<div><div className="text-lg font-bold">{data.status === 'balanced' ? 'VAT is reconciled' : 'Reconciliation requires attention'}</div><div className="text-sm text-slate-500">{data.transactionCount} tax-ledger entries reviewed</div></div></div>
            <Badge tone={data.status === 'balanced' ? 'success' : 'warning'} size="md">{String(data.status).replaceAll('_',' ')}</Badge>
          </div>
        </ContentCard>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ContentCard><div className="text-xs uppercase text-slate-500">Output tax</div><div className="mt-2 text-2xl font-bold">{formatMoney(data.sourceTotals.outputTax,'GHS')}</div></ContentCard>
          <ContentCard><div className="text-xs uppercase text-slate-500">Recoverable input</div><div className="mt-2 text-2xl font-bold text-emerald-700">{formatMoney(data.sourceTotals.inputTax,'GHS')}</div></ContentCard>
          <ContentCard><div className="text-xs uppercase text-slate-500">GL tax balance</div><div className="mt-2 text-2xl font-bold">{formatMoney(data.glTotals.netAmount,'GHS')}</div><div className="mt-1 text-xs text-slate-500">Debit minus credit</div></ContentCard>
          <ContentCard><div className="text-xs uppercase text-slate-500">Difference</div><div className={`mt-2 text-2xl font-bold ${data.status === 'balanced' ? 'text-emerald-700' : 'text-red-700'}`}>{formatMoney(data.difference,'GHS')}</div></ContentCard>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <ContentCard title="Ghana tax components"><Table rows={components} columns={[{header:'Component',render:(r)=><span className="font-medium">{r.code}</span>},{header:'Amount',className:'text-right',render:(r)=><span className="font-semibold">{formatMoney(r.amount,'GHS')}</span>}]} /></ContentCard>
          <ContentCard title="GL tax-control accounts"><Table rows={accounts} columns={[{header:'Account',render:(r)=><div><div className="font-semibold">{r.account_code}</div><div className="text-xs text-slate-500">{r.account_name}</div></div>},{header:'Debit',className:'text-right',render:(r)=>formatMoney(r.debit_total,'GHS')},{header:'Credit',className:'text-right',render:(r)=>formatMoney(r.credit_total,'GHS')},{header:'Net',className:'text-right',render:(r)=><span className="font-semibold">{formatMoney(r.net_amount,'GHS')}</span>}]} /></ContentCard>
        </div>
        <ContentCard title={`Reconciliation issues (${issues.length})`}>
          {issues.length === 0 ? <div className="flex items-center gap-2 py-4 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />No missing tax directions or return-box mappings were detected.</div> : <Table rows={issues} columns={[{header:'Issue',render:(r)=><Badge tone="warning">{r.issue_code}</Badge>},{header:'Source',render:(r)=>r.entity_type},{header:'Document',render:(r)=>r.details?.document_no || '—'},{header:'Tax code',render:(r)=>r.details?.tax_code || '—'}]} />}
        </ContentCard>
      </> : null}
    </GhanaComplianceShell>
  );
}
