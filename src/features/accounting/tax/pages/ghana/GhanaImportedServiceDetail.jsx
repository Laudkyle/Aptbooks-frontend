import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Pencil, RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '../../../../../app/constants/routes.js';
import { PERMISSIONS } from '../../../../../app/constants/permissions.js';
import { PermissionGate } from '../../../../../app/routes/route-guards.jsx';
import { useApi } from '../../../../../shared/hooks/useApi.js';
import { qk } from '../../../../../shared/query/keys.js';
import { formatMoney } from '../../../../../shared/utils/formatMoney.js';
import { ContentCard } from '../../../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../../../shared/components/ui/Modal.jsx';
import { Textarea } from '../../../../../shared/components/ui/Textarea.jsx';
import { Badge } from '../../../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../../shared/components/ui/Toast.jsx';
import { makePartnersApi } from '../../../../business/api/partners.api.js';
import { makeGhanaComplianceApi } from '../../api/ghanaCompliance.api.js';
import { GhanaComplianceShell } from '../../components/GhanaComplianceShell.jsx';
import { GhanaVatNav } from '../../components/GhanaVatNav.jsx';
import { ImportedServiceForm } from '../../components/ImportedServiceForm.jsx';

function formFrom(row) {
  return {
    supplierId: row.supplier_id || '', documentNo: row.document_no || '', serviceDate: row.service_date || '', taxPeriodStart: row.tax_period_start || '', taxPeriodEnd: row.tax_period_end || '', description: row.description || '', supplierCountryCode: row.supplier_country_code || '', currencyCode: row.currency_code || 'GHS', foreignAmount: row.foreign_amount ?? '', exchangeRate: row.exchange_rate ?? '', taxableAmount: row.taxable_amount ?? '', taxCodeId: row.tax_code_id || '', recoveryBasis: row.recovery_basis || 'direct_taxable', recoverablePercent: row.recoverable_percent == null ? '' : String(Number(row.recoverable_percent) * 100), reference: row.reference || '',
  };
}
function payloadOf(form) {
  const payload={supplierId:form.supplierId||null,documentNo:form.documentNo.trim()||null,serviceDate:form.serviceDate,description:form.description.trim(),supplierCountryCode:form.supplierCountryCode.trim()||null,currencyCode:form.currencyCode.trim()||'GHS',taxableAmount:form.taxableAmount,taxCodeId:form.taxCodeId||null,recoveryBasis:form.recoveryBasis,reference:form.reference.trim()||null};
  if(form.taxPeriodStart)payload.taxPeriodStart=form.taxPeriodStart;if(form.taxPeriodEnd)payload.taxPeriodEnd=form.taxPeriodEnd;if(form.foreignAmount!=='')payload.foreignAmount=form.foreignAmount;if(form.exchangeRate!=='')payload.exchangeRate=form.exchangeRate;if(form.recoveryBasis==='mixed'&&form.recoverablePercent!=='')payload.recoverablePercent=Number(form.recoverablePercent)/100;return payload;
}

export default function GhanaImportedServiceDetail() {
  const { id }=useParams(); const {http}=useApi(); const api=useMemo(()=>makeGhanaComplianceApi(http),[http]); const partnersApi=useMemo(()=>makePartnersApi(http),[http]); const qc=useQueryClient(); const toast=useToast(); const nav=useNavigate();
  const [editOpen,setEditOpen]=useState(false); const [form,setForm]=useState(null); const [voidOpen,setVoidOpen]=useState(false); const [voidReason,setVoidReason]=useState('');
  const detailQuery=useQuery({queryKey:qk.ghanaImportedService(id),queryFn:()=>api.getImportedService(id),enabled:Boolean(id)});
  const partnersQuery=useQuery({queryKey:qk.partners({type:'vendor'}),queryFn:()=>partnersApi.list({type:'vendor'}),staleTime:60000});
  const taxCodesQuery=useQuery({queryKey:qk.taxCodes({status:'active'}),queryFn:()=>api.listTaxCodes({status:'active'}),staleTime:60000});
  const supplierOptions=[{value:'',label:'No supplier selected'},...(partnersQuery.data??[]).map((p)=>({value:p.id,label:p.code?`${p.name} — ${p.code}`:p.name}))];
  const taxCodeOptions=[{value:'',label:'Use default Ghana imported-services code'},...(taxCodesQuery.data??[]).filter((c)=>c.code==='GH_IMPORTED_SERVICES_20'||c.tax_scope==='import').map((c)=>({value:c.id,label:`${c.code} — ${c.name}`}))];
  const invalidate=async()=>{await qc.invalidateQueries({queryKey:['tax','ghana','vat','importedServices']});};
  const editMutation=useMutation({mutationFn:()=>api.updateImportedService(id,payloadOf(form)),onSuccess:async()=>{toast.success('Imported service updated');setEditOpen(false);await invalidate();},onError:(e)=>toast.error(e?.message||'Unable to update imported service')});
  const postMutation=useMutation({mutationFn:()=>api.postImportedService(id),onSuccess:async()=>{toast.success('Imported service posted');await invalidate();},onError:(e)=>toast.error(e?.message||'Unable to post imported service')});
  const voidMutation=useMutation({mutationFn:()=>api.voidImportedService(id,voidReason.trim()),onSuccess:async()=>{toast.success('Imported service voided');setVoidOpen(false);setVoidReason('');await invalidate();},onError:(e)=>toast.error(e?.message||'Unable to void imported service')});
  const row=detailQuery.data;

  return <GhanaComplianceShell title="Imported Service Details" subtitle="Review reverse-charge tax, input-tax recovery and the accounting journals created from this imported service." actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>detailQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button>{row?.journal_entry_id?<Button variant="outline" onClick={()=>nav(ROUTES.accountingJournalDetail(row.journal_entry_id))}><ExternalLink className="mr-2 h-4 w-4"/>Open journal</Button>:null}<PermissionGate any={[PERMISSIONS.taxManage]} fallback={null}>{row?.status==='draft'?<><Button variant="outline" onClick={()=>{setForm(formFrom(row));setEditOpen(true);}}><Pencil className="mr-2 h-4 w-4"/>Edit</Button><Button loading={postMutation.isPending} onClick={()=>postMutation.mutate()}>Post</Button></>:null}{row?.status==='posted'?<Button variant="danger" onClick={()=>setVoidOpen(true)}>Void</Button>:null}</PermissionGate></div>}>
    <GhanaVatNav />
    {detailQuery.isLoading?<ContentCard><div className="py-10 text-center text-sm text-slate-500">Loading imported service…</div></ContentCard>:row?<>
      <div className="grid gap-4 lg:grid-cols-3">
        <ContentCard className="lg:col-span-2" title="Service"><div className="grid gap-4 sm:grid-cols-2"><div><div className="text-xs text-slate-500">Supplier</div><div className="mt-1 font-semibold">{row.supplier_name||'Unspecified supplier'}</div></div><div><div className="text-xs text-slate-500">Document</div><div className="mt-1 font-semibold">{row.document_no||row.reference||'—'}</div></div><div><div className="text-xs text-slate-500">Service date</div><div className="mt-1 font-semibold">{row.service_date}</div></div><div><div className="text-xs text-slate-500">Declaration due</div><div className="mt-1 font-semibold">{row.declaration_due_date}</div></div><div className="sm:col-span-2"><div className="text-xs text-slate-500">Description</div><div className="mt-1">{row.description}</div></div></div></ContentCard>
        <ContentCard title="Status"><Badge tone={row.status==='posted'?'success':row.status==='voided'?'danger':'info'} size="md">{row.status}</Badge><div className="mt-4 text-sm text-slate-500">Tax period</div><div className="mt-1 font-semibold">{row.tax_period_start} → {row.tax_period_end}</div><div className="mt-4 text-sm text-slate-500">Tax code</div><div className="mt-1 font-semibold">{row.tax_code} — {row.tax_code_name}</div></ContentCard>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><ContentCard><div className="text-xs uppercase text-slate-500">Taxable amount</div><div className="mt-2 text-2xl font-bold">{formatMoney(row.taxable_amount,'GHS')}</div></ContentCard><ContentCard><div className="text-xs uppercase text-slate-500">Total reverse-charge tax</div><div className="mt-2 text-2xl font-bold">{formatMoney(row.total_tax_amount,'GHS')}</div></ContentCard><ContentCard><div className="text-xs uppercase text-slate-500">Recoverable</div><div className="mt-2 text-2xl font-bold text-emerald-700">{formatMoney(row.recoverable_tax_amount,'GHS')}</div></ContentCard><ContentCard><div className="text-xs uppercase text-slate-500">Non-recoverable</div><div className="mt-2 text-2xl font-bold text-amber-700">{formatMoney(row.nonrecoverable_tax_amount,'GHS')}</div></ContentCard></div>
      <ContentCard title="Tax components"><Table rows={row.tax_details} columns={[{header:'Component',render:(r)=><div><div className="font-semibold">{r.tax_code}</div><div className="text-xs text-slate-500">{r.tax_name}</div></div>},{header:'Rate',className:'text-right',render:(r)=>`${r.tax_rate}%`},{header:'Taxable',className:'text-right',render:(r)=>formatMoney(r.taxable_amount,'GHS')},{header:'Tax',className:'text-right',render:(r)=><span className="font-semibold">{formatMoney(r.tax_amount,'GHS')}</span>},{header:'Recoverable',className:'text-right',render:(r)=>formatMoney(r.recoverable_amount,'GHS')},{header:'Non-recoverable',className:'text-right',render:(r)=>formatMoney(r.nonrecoverable_amount,'GHS')}]} /></ContentCard>
    </>:null}
    <Modal open={editOpen&&Boolean(form)} title="Edit imported service" onClose={()=>setEditOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setEditOpen(false)}>Cancel</Button><Button loading={editMutation.isPending} onClick={()=>editMutation.mutate()}>Save changes</Button></div>}>{form?<ImportedServiceForm form={form} setForm={setForm} supplierOptions={supplierOptions} taxCodeOptions={taxCodeOptions}/>:null}</Modal>
    <Modal open={voidOpen} title="Void imported service" onClose={()=>setVoidOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setVoidOpen(false)}>Cancel</Button><Button variant="danger" disabled={voidReason.trim().length<2} loading={voidMutation.isPending} onClick={()=>voidMutation.mutate()}>Void and reverse</Button></div>}><Textarea label="Reason" value={voidReason} onChange={(e)=>setVoidReason(e.target.value)} rows={4}/></Modal>
  </GhanaComplianceShell>;
}
