import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';

import { PERMISSIONS } from '../../../../../app/constants/permissions.js';
import { PermissionGate } from '../../../../../app/routes/route-guards.jsx';
import { useApi } from '../../../../../shared/hooks/useApi.js';
import { qk } from '../../../../../shared/query/keys.js';
import { formatMoney } from '../../../../../shared/utils/formatMoney.js';
import { ContentCard } from '../../../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../../../shared/components/ui/Button.jsx';
import { Input } from '../../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../../shared/components/ui/Select.jsx';
import { Modal } from '../../../../../shared/components/ui/Modal.jsx';
import { Badge } from '../../../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../../shared/components/ui/Toast.jsx';
import { makePartnersApi } from '../../../../business/api/partners.api.js';
import { makeGhanaComplianceApi } from '../../api/ghanaCompliance.api.js';
import { GhanaComplianceShell } from '../../components/GhanaComplianceShell.jsx';
import { GhanaWithholdingNav } from '../../components/GhanaWithholdingNav.jsx';

const today=()=>new Date().toISOString().slice(0,10);
const EMPTY={regime:'income_wht',partnerId:'',certificateNo:'',certificateDate:today(),eventDate:today(),taxableBasis:'',withheldAmount:'',taxRate:'',taxCodeId:'',categoryCode:'',sourceDocumentNo:'',graReference:''};

export default function GhanaWithholdingCertificates(){
 const {http}=useApi(); const api=useMemo(()=>makeGhanaComplianceApi(http),[http]); const partnersApi=useMemo(()=>makePartnersApi(http),[http]); const qc=useQueryClient(); const toast=useToast();
 const [filters,setFilters]=useState({regime:'',partnerId:''}); const [open,setOpen]=useState(false); const [form,setForm]=useState(EMPTY);
 const params=useMemo(()=>Object.fromEntries(Object.entries(filters).filter(([,v])=>v!=='')),[filters]);
 const listQ=useQuery({queryKey:qk.ghanaWithholdingCertificates(params),queryFn:()=>api.listGhanaWithholdingCertificates(params)});
 const partnersQ=useQuery({queryKey:qk.partners({}),queryFn:()=>partnersApi.list({}),staleTime:60000});
 const ratesQ=useQuery({queryKey:qk.ghanaWithholdingRates,queryFn:()=>api.listWithholdingRates(),staleTime:60000});
 const partners=partnersQ.data??[]; const rates=ratesQ.data??[]; const rateOptions=rates.filter(r=>r.withholding_regime===form.regime);
 const create=useMutation({mutationFn:()=>api.recordReceivedWithholdingCertificate({regime:form.regime,partnerId:form.partnerId,certificateNo:form.certificateNo.trim(),certificateDate:form.certificateDate,eventDate:form.eventDate||undefined,taxableBasis:form.taxableBasis,withheldAmount:form.withheldAmount,taxRate:form.taxRate,taxCodeId:form.taxCodeId||null,categoryCode:form.categoryCode||null,sourceDocumentNo:form.sourceDocumentNo||null,graReference:form.graReference||null}),onSuccess:async()=>{toast.success('Received withholding certificate recorded');setOpen(false);setForm({...EMPTY,certificateDate:today(),eventDate:today()});await qc.invalidateQueries({queryKey:['tax','ghana','withholding']});},onError:e=>toast.error(e?.message||'Unable to record certificate')});
 return <GhanaComplianceShell title="Withholding Certificates" subtitle="Track certificates issued by AptBooks and register WHT/WHVAT certificates received from customers as tax credits." actions={<div className="flex gap-2"><Button variant="outline" onClick={()=>listQ.refetch()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button><PermissionGate any={[PERMISSIONS.taxManage]} fallback={null}><Button onClick={()=>setOpen(true)}><Plus className="mr-2 h-4 w-4"/>Record received certificate</Button></PermissionGate></div>}>
  <GhanaWithholdingNav/>
  <ContentCard title="Filters"><div className="grid gap-4 sm:grid-cols-2"><Select label="Regime" value={filters.regime} onChange={e=>setFilters(s=>({...s,regime:e.target.value}))} options={[{value:'',label:'All regimes'},{value:'income_wht',label:'Income WHT'},{value:'vat_withholding',label:'VAT Withholding (WHVAT)'}]}/><Select label="Partner" value={filters.partnerId} onChange={e=>setFilters(s=>({...s,partnerId:e.target.value}))} options={[{value:'',label:'All partners'},...partners.map(p=>({value:p.id,label:`${p.code?`${p.code} — `:''}${p.name}`}))]}/></div></ContentCard>
  <ContentCard title={`Certificates (${(listQ.data??[]).length})`}><Table rows={listQ.data??[]} columns={[
    {header:'Certificate',render:r=><div><div className="font-semibold">{r.certificate_no}</div><div className="text-xs text-slate-500">{r.certificate_date}</div></div>},
    {header:'Partner',render:r=>r.partner_name||'—'},
    {header:'Role',render:r=><Badge tone={r.certificate_role==='received'?'info':'success'}>{r.certificate_role}</Badge>},
    {header:'Regime',render:r=>r.regime==='vat_withholding'?'WHVAT':'Income WHT'},
    {header:'Taxable basis',className:'text-right',render:r=>formatMoney(r.taxable_basis,'GHS')},
    {header:'Withheld',className:'text-right',render:r=><span className="font-semibold">{formatMoney(r.withheld_amount,'GHS')}</span>},
    {header:'Source',render:r=><div><div>{r.source_document_no||'—'}</div><div className="text-xs text-slate-500">{r.event_date||''}</div></div>},
    {header:'Status',render:r=><Badge tone={r.status==='issued'?'success':'neutral'}>{r.status}</Badge>},
  ]}/></ContentCard>
  <Modal open={open} title="Record received withholding certificate" onClose={()=>setOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button loading={create.isPending} disabled={!form.partnerId||!form.certificateNo.trim()||!form.certificateDate||!form.taxableBasis||!form.withheldAmount||!form.taxRate} onClick={()=>create.mutate()}>Save certificate</Button></div>}>
   <div className="grid gap-4 sm:grid-cols-2"><Select label="Regime" value={form.regime} onChange={e=>setForm(s=>({...s,regime:e.target.value,taxCodeId:''}))} options={[{value:'income_wht',label:'Income WHT'},{value:'vat_withholding',label:'VAT Withholding (WHVAT)'}]}/><Select label="Partner" value={form.partnerId} onChange={e=>setForm(s=>({...s,partnerId:e.target.value}))} options={[{value:'',label:'Select partner…'},...partners.map(p=>({value:p.id,label:`${p.code?`${p.code} — `:''}${p.name}`}))]}/><Input label="Certificate number" value={form.certificateNo} onChange={e=>setForm(s=>({...s,certificateNo:e.target.value}))}/><Input label="Certificate date" type="date" value={form.certificateDate} onChange={e=>setForm(s=>({...s,certificateDate:e.target.value,eventDate:e.target.value}))}/><Input label="Taxable basis" type="number" min="0" step="0.01" value={form.taxableBasis} onChange={e=>setForm(s=>({...s,taxableBasis:e.target.value}))}/><Input label="Withheld amount" type="number" min="0" step="0.01" value={form.withheldAmount} onChange={e=>setForm(s=>({...s,withheldAmount:e.target.value}))}/><Input label="Tax rate (%)" type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={e=>setForm(s=>({...s,taxRate:e.target.value}))}/><Select label="Withholding tax code" value={form.taxCodeId} onChange={e=>{const id=e.target.value;const row=rateOptions.find(x=>x.id===id);setForm(s=>({...s,taxCodeId:id,categoryCode:row?.reporting_group||'',taxRate:row?.rate||s.taxRate}));}} options={[{value:'',label:'Use statutory/default code'},...rateOptions.map(r=>({value:r.id,label:`${r.code} — ${r.name} (${Number(r.rate).toFixed(2)}%)`}))]}/><Input label="Source document number" value={form.sourceDocumentNo} onChange={e=>setForm(s=>({...s,sourceDocumentNo:e.target.value}))}/><Input label="GRA reference" value={form.graReference} onChange={e=>setForm(s=>({...s,graReference:e.target.value}))}/></div>
  </Modal>
 </GhanaComplianceShell>;
}
