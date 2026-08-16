import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Search } from 'lucide-react';

import { useApi } from '../../../../../shared/hooks/useApi.js';
import { qk } from '../../../../../shared/query/keys.js';
import { formatMoney } from '../../../../../shared/utils/formatMoney.js';
import { ContentCard } from '../../../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../../../shared/components/ui/Button.jsx';
import { Input } from '../../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../../shared/components/ui/Select.jsx';
import { Badge } from '../../../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../../../shared/components/ui/Table.jsx';
import { makePartnersApi } from '../../../../business/api/partners.api.js';
import { makeGhanaComplianceApi } from '../../api/ghanaCompliance.api.js';
import { GhanaComplianceShell } from '../../components/GhanaComplianceShell.jsx';
import { GhanaWithholdingNav } from '../../components/GhanaWithholdingNav.jsx';

export default function GhanaWithholdingEvents(){
 const {http}=useApi(); const api=useMemo(()=>makeGhanaComplianceApi(http),[http]); const partnersApi=useMemo(()=>makePartnersApi(http),[http]);
 const [f,setF]=useState({regime:'',direction:'',status:'',partnerId:'',fromDate:'',toDate:''});
 const params=useMemo(()=>Object.fromEntries(Object.entries(f).filter(([,v])=>v!=='')),[f]);
 const query=useQuery({queryKey:qk.ghanaWithholdingEvents(params),queryFn:()=>api.listWithholdingEvents(params)});
 const partnersQ=useQuery({queryKey:qk.partners({}),queryFn:()=>partnersApi.list({}),staleTime:60000});
 const partners=partnersQ.data ?? [];
 return <GhanaComplianceShell title="Withholding Events" subtitle="Audit every income-WHT and WHVAT event from the original payment or received certificate through remittance and return membership." actions={<Button variant="outline" onClick={()=>query.refetch()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button>}>
  <GhanaWithholdingNav/>
  <ContentCard title="Filters"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6"><Select label="Regime" value={f.regime} onChange={e=>setF(s=>({...s,regime:e.target.value}))} options={[{value:'',label:'All regimes'},{value:'income_wht',label:'Income WHT'},{value:'vat_withholding',label:'VAT Withholding (WHVAT)'}]}/><Select label="Direction" value={f.direction} onChange={e=>setF(s=>({...s,direction:e.target.value}))} options={[{value:'',label:'All directions'},{value:'payable',label:'Payable'},{value:'receivable',label:'Receivable credit'}]}/><Select label="Status" value={f.status} onChange={e=>setF(s=>({...s,status:e.target.value}))} options={[{value:'',label:'All statuses'},{value:'open',label:'Open'},{value:'remitted',label:'Remitted'},{value:'voided',label:'Voided'}]}/><Select label="Partner" value={f.partnerId} onChange={e=>setF(s=>({...s,partnerId:e.target.value}))} options={[{value:'',label:'All partners'},...partners.map(p=>({value:p.id,label:`${p.code?`${p.code} — `:''}${p.name}`}))]}/><Input label="From" type="date" value={f.fromDate} onChange={e=>setF(s=>({...s,fromDate:e.target.value}))}/><Input label="To" type="date" value={f.toDate} onChange={e=>setF(s=>({...s,toDate:e.target.value}))}/></div></ContentCard>
  <ContentCard title={`Events (${(query.data??[]).length})`}>{query.isLoading?<div className="py-10 text-center text-sm text-slate-500">Loading events…</div>:(query.data??[]).length===0?<div className="py-10 text-center text-sm text-slate-500"><Search className="mx-auto mb-2 h-5 w-5"/>No events match these filters.</div>:<Table rows={query.data??[]} columns={[
    {header:'Date / source',render:r=><div><div className="font-medium">{r.event_date}</div><div className="text-xs text-slate-500">{r.source_document_no || String(r.source_type||'manual').replaceAll('_',' ')}</div></div>},
    {header:'Partner',render:r=><div><div className="font-medium">{r.partner_name || '—'}</div><div className="text-xs text-slate-500">{r.category_code || '—'}</div></div>},
    {header:'Regime',render:r=><Badge tone={r.regime==='vat_withholding'?'info':'default'}>{r.regime==='vat_withholding'?'WHVAT':'Income WHT'}</Badge>},
    {header:'Basis',className:'text-right',render:r=>formatMoney(r.taxable_basis,'GHS')},
    {header:'Rate',className:'text-right',render:r=>`${Number(r.tax_rate||0).toFixed(2)}%`},
    {header:'Withheld',className:'text-right',render:r=><span className="font-semibold">{formatMoney(r.withheld_amount,'GHS')}</span>},
    {header:'Certificate',render:r=>r.certificate_no || '—'},
    {header:'Status',render:r=><Badge tone={r.status==='remitted'?'success':r.status==='open'?'warning':'danger'}>{r.status}</Badge>},
  ]}/>}</ContentCard>
 </GhanaComplianceShell>;
}
