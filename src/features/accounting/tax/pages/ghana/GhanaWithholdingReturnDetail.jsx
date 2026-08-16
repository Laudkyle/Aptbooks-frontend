import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileCheck2, RefreshCw } from 'lucide-react';

import { ROUTES } from '../../../../../app/constants/routes.js';
import { PERMISSIONS } from '../../../../../app/constants/permissions.js';
import { PermissionGate } from '../../../../../app/routes/route-guards.jsx';
import { useApi } from '../../../../../shared/hooks/useApi.js';
import { qk } from '../../../../../shared/query/keys.js';
import { formatMoney } from '../../../../../shared/utils/formatMoney.js';
import { ContentCard } from '../../../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../../../shared/components/ui/Button.jsx';
import { Input } from '../../../../../shared/components/ui/Input.jsx';
import { Modal } from '../../../../../shared/components/ui/Modal.jsx';
import { Badge } from '../../../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../../shared/components/ui/Toast.jsx';
import { makePartnersApi } from '../../../../business/api/partners.api.js';
import { makeGhanaComplianceApi } from '../../api/ghanaCompliance.api.js';
import { GhanaComplianceShell } from '../../components/GhanaComplianceShell.jsx';
import { GhanaWithholdingNav } from '../../components/GhanaWithholdingNav.jsx';

export default function GhanaWithholdingReturnDetail(){
 const {id}=useParams(); const nav=useNavigate(); const {http}=useApi(); const api=useMemo(()=>makeGhanaComplianceApi(http),[http]); const partnersApi=useMemo(()=>makePartnersApi(http),[http]); const qc=useQueryClient(); const toast=useToast(); const [fileOpen,setFileOpen]=useState(false); const [graReference,setGraReference]=useState('');
 const detailQ=useQuery({queryKey:qk.ghanaWithholdingReturn(id),queryFn:()=>api.getGhanaWithholdingReturn(id)});
 const partnersQ=useQuery({queryKey:qk.partners({}),queryFn:()=>partnersApi.list({}),staleTime:60000});
 const partnerMap=useMemo(()=>new Map((partnersQ.data??[]).map(p=>[p.id,p])),[partnersQ.data]);
 const finalize=useMutation({mutationFn:()=>api.finalizeGhanaWithholdingReturn(id),onSuccess:async()=>{toast.success('Withholding return finalized');await qc.invalidateQueries({queryKey:['tax','ghana','withholding','returns']});},onError:e=>toast.error(e?.message||'Unable to finalize return')});
 const filed=useMutation({mutationFn:()=>api.markGhanaWithholdingReturnFiled(id,graReference.trim()),onSuccess:async()=>{toast.success('Withholding return marked filed');setFileOpen(false);setGraReference('');await qc.invalidateQueries({queryKey:['tax','ghana','withholding','returns']});},onError:e=>toast.error(e?.message||'Unable to mark return filed')});
 const row=detailQ.data; const lines=row?.lines??[]; const missing=lines.filter(l=>!String(l.partner_tax_identifier||'').trim());
 return <GhanaComplianceShell title={row?`${row.form_code} Withholding Return`:'Withholding Return'} subtitle={row?`${row.period_start} to ${row.period_end} · Version ${row.version_no}`:'Review statutory withholding return lines.'} actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>nav(ROUTES.accountingTaxGhanaWithholdingReturns)}><ArrowLeft className="mr-2 h-4 w-4"/>Returns</Button><Button variant="outline" onClick={()=>detailQ.refetch()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button>{row?.status==='draft'?<PermissionGate any={[PERMISSIONS.taxApprove]} fallback={null}><Button loading={finalize.isPending} disabled={missing.length>0} onClick={()=>finalize.mutate()}><CheckCircle2 className="mr-2 h-4 w-4"/>Finalize</Button></PermissionGate>:null}{row?.status==='finalized'?<PermissionGate any={[PERMISSIONS.taxManage]} fallback={null}><Button onClick={()=>setFileOpen(true)}><FileCheck2 className="mr-2 h-4 w-4"/>Mark filed</Button></PermissionGate>:null}</div>}>
  <GhanaWithholdingNav/>
  {row?<><div className="grid gap-4 md:grid-cols-4"><div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">Status</p><div className="mt-2"><Badge tone={row.status==='filed'?'success':row.status==='finalized'?'info':'warning'}>{row.status}</Badge></div></div><div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">Taxable basis</p><p className="mt-2 text-xl font-semibold">{formatMoney(row.total_taxable_basis,'GHS')}</p></div><div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">Withheld</p><p className="mt-2 text-xl font-semibold">{formatMoney(row.total_withheld,'GHS')}</p></div><div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">Due date</p><p className="mt-2 text-xl font-semibold">{row.due_date||'—'}</p></div></div>
  {missing.length>0?<div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>{missing.length} return line{missing.length===1?'':'s'} cannot be finalized</strong> because the withholdee has no TIN/GUIN. Update the relevant Partner Tax Profile first.</div>:null}
  <ContentCard title={`Return schedule (${lines.length})`}><Table rows={lines} columns={[
    {header:'Date / document',render:l=><div><div className="font-medium">{l.event_date}</div><div className="text-xs text-slate-500">{l.source_document_no||'—'}</div></div>},
    {header:'Withholdee',render:l=>{const p=partnerMap.get(l.partner_id);return <div><div className="font-medium">{p?.name||'Unknown partner'}</div><div className={l.partner_tax_identifier?'text-xs text-slate-500':'text-xs font-medium text-amber-700'}>{l.partner_tax_identifier||'TIN/GUIN missing'}</div></div>;}},
    {header:'Category',render:l=>l.category_code||'—'},
    {header:'Taxable basis',className:'text-right',render:l=>formatMoney(l.taxable_basis,'GHS')},
    {header:'Rate',className:'text-right',render:l=>`${Number(l.tax_rate||0).toFixed(2)}%`},
    {header:'Withheld',className:'text-right',render:l=><span className="font-semibold">{formatMoney(l.withheld_amount,'GHS')}</span>},
    {header:'Certificate',render:l=>l.certificate_no||'—'},
  ]}/></ContentCard></>:<div className="py-12 text-center text-sm text-slate-500">Loading return…</div>}
  <Modal open={fileOpen} title="Mark withholding return filed" onClose={()=>setFileOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setFileOpen(false)}>Cancel</Button><Button loading={filed.isPending} disabled={!graReference.trim()} onClick={()=>filed.mutate()}>Mark filed</Button></div>}><Input label="GRA filing reference" value={graReference} onChange={e=>setGraReference(e.target.value)} placeholder="Enter the official filing reference"/></Modal>
 </GhanaComplianceShell>;
}
