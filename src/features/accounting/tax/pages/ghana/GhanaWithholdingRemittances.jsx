import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '../../../../../app/constants/routes.js';
import { PERMISSIONS } from '../../../../../app/constants/permissions.js';
import { PermissionGate } from '../../../../../app/routes/route-guards.jsx';
import { useApi } from '../../../../../shared/hooks/useApi.js';
import { qk } from '../../../../../shared/query/keys.js';
import { formatMoney } from '../../../../../shared/utils/formatMoney.js';
import { ContentCard } from '../../../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../../../shared/components/ui/Button.jsx';
import { Input } from '../../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../../../shared/components/ui/Textarea.jsx';
import { AccountSelect } from '../../../../../shared/components/forms/AccountSelect.jsx';
import { Modal } from '../../../../../shared/components/ui/Modal.jsx';
import { Badge } from '../../../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../../shared/components/ui/Toast.jsx';
import { makeGhanaComplianceApi } from '../../api/ghanaCompliance.api.js';
import { GhanaComplianceShell } from '../../components/GhanaComplianceShell.jsx';
import { GhanaWithholdingNav } from '../../components/GhanaWithholdingNav.jsx';

function monthRange(){const n=new Date(),y=n.getFullYear(),m=n.getMonth();const f=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return {periodStart:f(new Date(y,m,1)),periodEnd:f(new Date(y,m+1,0)),remittanceDate:f(n)};}
export default function GhanaWithholdingRemittances(){
 const {http}=useApi();const api=useMemo(()=>makeGhanaComplianceApi(http),[http]);const qc=useQueryClient();const toast=useToast();const nav=useNavigate();
 const [createOpen,setCreateOpen]=useState(false);const [form,setForm]=useState(()=>({regime:'income_wht',...monthRange(),settlementAccountId:'',reference:'',memo:'',eventIds:[]}));const [postRow,setPostRow]=useState(null);const [postForm,setPostForm]=useState({settlementAccountId:'',remittanceDate:''});const [voidRow,setVoidRow]=useState(null);const [reason,setReason]=useState('');
 const remQ=useQuery({queryKey:qk.ghanaWithholdingRemittances({}),queryFn:()=>api.listGhanaWithholdingRemittances({})});
 const eventsQ=useQuery({queryKey:qk.ghanaWithholdingEvents({direction:'payable',status:'open'}),queryFn:()=>api.listWithholdingEvents({direction:'payable',status:'open'})});
 const remittances=(remQ.data??[]).filter(r=>['income_wht','vat_withholding'].includes(r.withholding_regime)); const openEvents=(eventsQ.data??[]).filter(e=>e.regime===form.regime&&Number(e.withheld_amount||0)>0);
 const toggle=id=>setForm(s=>({...s,eventIds:s.eventIds.includes(id)?s.eventIds.filter(x=>x!==id):[...s.eventIds,id]})); const selectedTotal=openEvents.filter(e=>form.eventIds.includes(e.id)).reduce((a,e)=>a+Number(e.withheld_amount||0),0);
 const create=useMutation({mutationFn:()=>api.createGhanaWithholdingRemittance({regime:form.regime,periodStart:form.periodStart,periodEnd:form.periodEnd,remittanceDate:form.remittanceDate,settlementAccountId:form.settlementAccountId||null,reference:form.reference||null,memo:form.memo||null,eventIds:form.eventIds}),onSuccess:async()=>{toast.success('Withholding remittance prepared');setCreateOpen(false);setForm({regime:'income_wht',...monthRange(),settlementAccountId:'',reference:'',memo:'',eventIds:[]});await qc.invalidateQueries({queryKey:['tax','ghana','withholding']});},onError:e=>toast.error(e?.message||'Unable to prepare remittance')});
 const post=useMutation({mutationFn:()=>api.postGhanaWithholdingRemittance(postRow.id,{settlementAccountId:postForm.settlementAccountId||null,remittanceDate:postForm.remittanceDate||null}),onSuccess:async r=>{toast.success('Withholding remittance posted');setPostRow(null);await qc.invalidateQueries({queryKey:['tax','ghana','withholding']});if(r.journalId)nav(ROUTES.accountingJournalDetail(r.journalId));},onError:e=>toast.error(e?.message||'Unable to post remittance')});
 const voidM=useMutation({mutationFn:()=>api.voidGhanaWithholdingRemittance(voidRow.id,reason.trim()),onSuccess:async()=>{toast.success('Withholding remittance voided');setVoidRow(null);setReason('');await qc.invalidateQueries({queryKey:['tax','ghana','withholding']});},onError:e=>toast.error(e?.message||'Unable to void remittance')});
 return <GhanaComplianceShell title="Withholding Remittances" subtitle="Group open WHT/WHVAT liabilities into remittances, post settlement to the configured control account, and preserve the journal trail." actions={<div className="flex gap-2"><Button variant="outline" onClick={()=>{remQ.refetch();eventsQ.refetch();}}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button><PermissionGate any={[PERMISSIONS.taxManage]} fallback={null}><Button onClick={()=>setCreateOpen(true)}><Plus className="mr-2 h-4 w-4"/>Prepare remittance</Button></PermissionGate></div>}>
  <GhanaWithholdingNav/>
  <ContentCard title={`Remittances (${remittances.length})`}><Table rows={remittances} columns={[
   {header:'Remittance',render:r=><div><div className="font-semibold">{r.remittance_no}</div><div className="text-xs text-slate-500">{r.period_start} → {r.period_end}</div></div>},
   {header:'Regime',render:r=>r.withholding_regime==='vat_withholding'?'WHVAT':'Income WHT'},
   {header:'Due',render:r=>r.due_date||'—'},
   {header:'Amount',className:'text-right',render:r=><span className="font-semibold">{formatMoney(r.total_amount,r.currency_code||'GHS')}</span>},
   {header:'Status',render:r=><Badge tone={r.status==='posted'?'success':r.status==='voided'?'danger':'warning'}>{r.status}</Badge>},
   {header:'Reference',render:r=>r.reference||'—'},
   {header:'Actions',render:r=><div className="flex gap-1"><PermissionGate any={[PERMISSIONS.taxManage]} fallback={null}>{['draft','approved'].includes(r.status)?<Button variant="ghost" size="sm" onClick={()=>{setPostRow(r);setPostForm({settlementAccountId:r.settlement_account_id||'',remittanceDate:r.remittance_date||''});}}>Post</Button>:null}{r.status==='posted'?<Button variant="ghost" size="sm" onClick={()=>{setVoidRow(r);setReason('');}}>Void</Button>:null}</PermissionGate>{r.journal_entry_id?<Button variant="ghost" size="sm" onClick={()=>nav(ROUTES.accountingJournalDetail(r.journal_entry_id))}><ExternalLink className="h-4 w-4"/></Button>:null}</div>},
  ]}/></ContentCard>
  <Modal open={createOpen} title="Prepare withholding remittance" onClose={()=>setCreateOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setCreateOpen(false)}>Cancel</Button><Button loading={create.isPending} disabled={form.eventIds.length===0||!form.periodStart||!form.periodEnd||!form.remittanceDate} onClick={()=>create.mutate()}>Prepare {formatMoney(selectedTotal,'GHS')}</Button></div>}>
   <div className="space-y-4"><Select label="Regime" value={form.regime} onChange={e=>setForm(s=>({...s,regime:e.target.value,eventIds:[]}))} options={[{value:'income_wht',label:'Income WHT'},{value:'vat_withholding',label:'VAT Withholding (WHVAT)'}]}/><div className="grid gap-4 sm:grid-cols-3"><Input label="Period start" type="date" value={form.periodStart} onChange={e=>setForm(s=>({...s,periodStart:e.target.value}))}/><Input label="Period end" type="date" value={form.periodEnd} onChange={e=>setForm(s=>({...s,periodEnd:e.target.value}))}/><Input label="Remittance date" type="date" value={form.remittanceDate} onChange={e=>setForm(s=>({...s,remittanceDate:e.target.value}))}/></div><div><label className="mb-2 block text-sm font-medium text-slate-700">Settlement account</label><AccountSelect value={form.settlementAccountId} onChange={e=>setForm(s=>({...s,settlementAccountId:e.target.value}))} allowEmpty/></div><div className="rounded-xl border bg-slate-50 p-3"><p className="mb-3 text-sm font-medium">Select open withholding events</p><div className="max-h-64 space-y-2 overflow-auto">{openEvents.length===0?<p className="text-sm text-slate-500">No open {form.regime==='vat_withholding'?'WHVAT':'income WHT'} events.</p>:openEvents.map(e=><label key={e.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-white p-3 text-sm"><span className="flex items-center gap-3"><input type="checkbox" checked={form.eventIds.includes(e.id)} onChange={()=>toggle(e.id)}/><span><strong>{e.partner_name||'Partner'}</strong><span className="block text-xs text-slate-500">{e.event_date} · {e.source_document_no||e.category_code||'withholding event'}</span></span></span><strong>{formatMoney(e.withheld_amount,'GHS')}</strong></label>)}</div></div><Input label="Reference" value={form.reference} onChange={e=>setForm(s=>({...s,reference:e.target.value}))}/><Textarea label="Memo" value={form.memo} onChange={e=>setForm(s=>({...s,memo:e.target.value}))} rows={3}/></div>
  </Modal>
  <Modal open={Boolean(postRow)} title="Post withholding remittance" onClose={()=>setPostRow(null)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setPostRow(null)}>Cancel</Button><Button loading={post.isPending} disabled={!postForm.settlementAccountId} onClick={()=>post.mutate()}>Post remittance</Button></div>}><div className="space-y-4"><div><label className="mb-2 block text-sm font-medium text-slate-700">Settlement account</label><AccountSelect value={postForm.settlementAccountId} onChange={e=>setPostForm(s=>({...s,settlementAccountId:e.target.value}))}/></div><Input label="Remittance date" type="date" value={postForm.remittanceDate} onChange={e=>setPostForm(s=>({...s,remittanceDate:e.target.value}))}/></div></Modal>
  <Modal open={Boolean(voidRow)} title="Void withholding remittance" onClose={()=>setVoidRow(null)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setVoidRow(null)}>Cancel</Button><Button variant="danger" loading={voidM.isPending} disabled={reason.trim().length<2} onClick={()=>voidM.mutate()}>Void and reverse</Button></div>}><Textarea label="Reason" value={reason} onChange={e=>setReason(e.target.value)} rows={4}/></Modal>
 </GhanaComplianceShell>;
}
