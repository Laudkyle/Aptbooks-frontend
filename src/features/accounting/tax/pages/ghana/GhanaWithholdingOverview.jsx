import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, AlertTriangle, ReceiptText, Landmark, UsersRound } from 'lucide-react';

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
import { GhanaWithholdingNav } from '../../components/GhanaWithholdingNav.jsx';

function currentMonth() {
  const n = new Date(); const y=n.getFullYear(); const m=n.getMonth();
  const f=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return { fromDate:f(new Date(y,m,1)), toDate:f(new Date(y,m+1,0)) };
}
const regimeLabel=(v)=>v==='vat_withholding'?'VAT Withholding (WHVAT)':'Income WHT';

export default function GhanaWithholdingOverview(){
  const {http}=useApi(); const api=useMemo(()=>makeGhanaComplianceApi(http),[http]);
  const [range,setRange]=useState(currentMonth);
  const query=useQuery({queryKey:qk.ghanaWithholdingDashboard(range),queryFn:()=>api.getWithholdingDashboard(range)});
  const data=query.data ?? {eventSummary:[],returnSummary:[],vendorsOverThreshold:0};
  const payable=(data.eventSummary||[]).filter(r=>r.direction==='payable'&&r.status!=='voided');
  const receivable=(data.eventSummary||[]).filter(r=>r.direction==='receivable'&&r.status!=='voided');
  const sum=(rows)=>rows.reduce((a,r)=>a+Number(r.withheld_amount||0),0);
  const openPayable=payable.filter(r=>r.status==='open');
  const nextDue=(data.returnSummary||[]).map(r=>r.next_due_date).filter(Boolean).sort()[0] || null;
  const cards=[
    ['Open withholding payable',formatMoney(sum(openPayable),'GHS'),Landmark,'Amounts withheld and not yet remitted'],
    ['Withholding credits received',formatMoney(sum(receivable),'GHS'),ReceiptText,'Income WHT and WHVAT certificates received'],
    ['Vendors over annual threshold',String(data.vendorsOverThreshold||0),UsersRound,'Income-WHT cumulative threshold monitor'],
    ['Next prepared return due',nextDue || '—',AlertTriangle,'Earliest draft/finalized withholding return'],
  ];
  return <GhanaComplianceShell title="Ghana Withholding" subtitle="Control income withholding tax and VAT withholding from payment through certificate, return, remittance and reconciliation." actions={<Button variant="outline" onClick={()=>query.refetch()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button>}>
    <GhanaWithholdingNav/>
    <ContentCard title="Period"><div className="grid gap-4 sm:grid-cols-2"><Input label="From" type="date" value={range.fromDate} onChange={e=>setRange(s=>({...s,fromDate:e.target.value}))}/><Input label="To" type="date" value={range.toDate} onChange={e=>setRange(s=>({...s,toDate:e.target.value}))}/></div></ContentCard>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{cards.map(([t,v,Icon,n])=><div key={t} className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm text-slate-500">{t}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{v}</p></div><Icon className="h-5 w-5 text-brand-primary"/></div><p className="mt-2 text-xs text-slate-500">{n}</p></div>)}</div>
    <ContentCard title="Withholding activity">{query.isLoading?<div className="py-8 text-center text-sm text-slate-500">Loading withholding activity…</div>:<Table rows={data.eventSummary||[]} columns={[
      {header:'Regime',render:r=><div className="font-medium">{regimeLabel(r.regime)}</div>},
      {header:'Direction',render:r=><Badge tone={r.direction==='payable'?'warning':'info'}>{r.direction}</Badge>},
      {header:'Status',render:r=><Badge tone={r.status==='open'?'warning':r.status==='remitted'?'success':'info'}>{r.status}</Badge>},
      {header:'Events',className:'text-right',render:r=>r.event_count},
      {header:'Taxable basis',className:'text-right',render:r=>formatMoney(r.taxable_basis,'GHS')},
      {header:'Withheld',className:'text-right',render:r=><span className="font-semibold">{formatMoney(r.withheld_amount,'GHS')}</span>},
    ]}/>}</ContentCard>
  </GhanaComplianceShell>;
}
