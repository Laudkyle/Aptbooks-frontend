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
import { Modal } from '../../../../../shared/components/ui/Modal.jsx';
import { Badge } from '../../../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../../shared/components/ui/Toast.jsx';
import { makePartnersApi } from '../../../../business/api/partners.api.js';
import { makeGhanaComplianceApi } from '../../api/ghanaCompliance.api.js';
import { GhanaComplianceShell } from '../../components/GhanaComplianceShell.jsx';
import { GhanaVatNav } from '../../components/GhanaVatNav.jsx';
import { ImportedServiceForm } from '../../components/ImportedServiceForm.jsx';

function today() { return new Date().toISOString().slice(0,10); }
function monthRange() { const d=new Date(); const y=d.getFullYear(),m=d.getMonth(); const f=(x)=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; return {fromDate:f(new Date(y,m,1)),toDate:f(new Date(y,m+1,0))}; }
const EMPTY = { supplierId:'', documentNo:'', serviceDate:today(), taxPeriodStart:'', taxPeriodEnd:'', description:'', supplierCountryCode:'', currencyCode:'USD', foreignAmount:'', exchangeRate:'', taxableAmount:'', taxCodeId:'', recoveryBasis:'direct_taxable', recoverablePercent:'', reference:'' };

function payloadOf(form) {
  const payload = {
    supplierId: form.supplierId || null,
    documentNo: form.documentNo.trim() || null,
    serviceDate: form.serviceDate,
    description: form.description.trim(),
    supplierCountryCode: form.supplierCountryCode.trim() || null,
    currencyCode: form.currencyCode.trim() || 'GHS',
    taxableAmount: form.taxableAmount,
    taxCodeId: form.taxCodeId || null,
    recoveryBasis: form.recoveryBasis,
    reference: form.reference.trim() || null,
  };
  if (form.taxPeriodStart) payload.taxPeriodStart = form.taxPeriodStart;
  if (form.taxPeriodEnd) payload.taxPeriodEnd = form.taxPeriodEnd;
  if (form.foreignAmount !== '') payload.foreignAmount = form.foreignAmount;
  if (form.exchangeRate !== '') payload.exchangeRate = form.exchangeRate;
  if (form.recoveryBasis === 'mixed' && form.recoverablePercent !== '') payload.recoverablePercent = Number(form.recoverablePercent) / 100;
  return payload;
}

export default function GhanaImportedServices() {
  const { http } = useApi();
  const api = useMemo(()=>makeGhanaComplianceApi(http),[http]);
  const partnersApi = useMemo(()=>makePartnersApi(http),[http]);
  const qc=useQueryClient(); const toast=useToast(); const nav=useNavigate();
  const initial=useMemo(monthRange,[]);
  const [filters,setFilters]=useState({...initial,status:''});
  const [createOpen,setCreateOpen]=useState(false);
  const [form,setForm]=useState(EMPTY);
  const queryParams=useMemo(()=>Object.fromEntries(Object.entries(filters).filter(([,v])=>v!=='')),[filters]);

  const listQuery=useQuery({queryKey:qk.ghanaImportedServices(queryParams),queryFn:()=>api.listImportedServices(queryParams)});
  const summaryQuery=useQuery({queryKey:qk.ghanaImportedServicesSummary({from:filters.fromDate,to:filters.toDate}),queryFn:()=>api.getImportedServicesSummary({from:filters.fromDate,to:filters.toDate}),enabled:Boolean(filters.fromDate&&filters.toDate)});
  const partnersQuery=useQuery({queryKey:qk.partners({type:'vendor'}),queryFn:()=>partnersApi.list({type:'vendor'}),staleTime:60000});
  const taxCodesQuery=useQuery({queryKey:qk.taxCodes({status:'active'}),queryFn:()=>api.listTaxCodes({status:'active'}),staleTime:60000});

  const supplierOptions=[{value:'',label:'No supplier selected'},...(partnersQuery.data??[]).map((p)=>({value:p.id,label:p.code?`${p.name} — ${p.code}`:p.name}))];
  const importedCodes=(taxCodesQuery.data??[]).filter((code)=>code.code==='GH_IMPORTED_SERVICES_20'||code.tax_scope==='import');
  const taxCodeOptions=[{value:'',label:'Use default Ghana imported-services code'},...importedCodes.map((code)=>({value:code.id,label:`${code.code} — ${code.name}`}))];

  const createMutation=useMutation({mutationFn:()=>api.createImportedService(payloadOf(form)),onSuccess:async(row)=>{toast.success('Imported service saved as draft');setCreateOpen(false);setForm({...EMPTY,serviceDate:today()});await qc.invalidateQueries({queryKey:['tax','ghana','vat','importedServices']});nav(ROUTES.accountingTaxGhanaImportedServiceDetail(row.id));},onError:(e)=>toast.error(e?.message||'Unable to create imported service')});
  const rows=listQuery.data??[]; const summary=summaryQuery.data;

  return <GhanaComplianceShell title="Imported Services" subtitle="Capture Ghana reverse-charge VAT, NHIL and GETFund on services received from foreign suppliers, including recoverability and posting." actions={<div className="flex gap-2"><Button variant="outline" onClick={()=>{listQuery.refetch();summaryQuery.refetch();}}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button><PermissionGate any={[PERMISSIONS.taxManage]} fallback={null}><Button onClick={()=>{setForm({...EMPTY,serviceDate:today()});setCreateOpen(true);}}><Plus className="mr-2 h-4 w-4"/>New imported service</Button></PermissionGate></div>}>
    <GhanaVatNav />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <ContentCard><div className="text-xs uppercase text-slate-500">Posted services</div><div className="mt-2 text-2xl font-bold">{summary?.transactionCount??0}</div></ContentCard>
      <ContentCard><div className="text-xs uppercase text-slate-500">Taxable amount</div><div className="mt-2 text-2xl font-bold">{formatMoney(summary?.taxableAmount||'0.00','GHS')}</div></ContentCard>
      <ContentCard><div className="text-xs uppercase text-slate-500">Output tax due</div><div className="mt-2 text-2xl font-bold">{formatMoney(summary?.outputTaxDue||'0.00','GHS')}</div></ContentCard>
      <ContentCard><div className="text-xs uppercase text-slate-500">Recoverable input</div><div className="mt-2 text-2xl font-bold text-emerald-700">{formatMoney(summary?.recoverableInputTax||'0.00','GHS')}</div></ContentCard>
      <ContentCard><div className="text-xs uppercase text-slate-500">Net tax cost</div><div className="mt-2 text-2xl font-bold text-amber-700">{formatMoney(summary?.netTaxCost||'0.00','GHS')}</div></ContentCard>
    </div>
    <ContentCard title="Filters"><div className="grid gap-4 sm:grid-cols-3"><Input label="From" type="date" value={filters.fromDate} onChange={(e)=>setFilters((s)=>({...s,fromDate:e.target.value}))}/><Input label="To" type="date" value={filters.toDate} onChange={(e)=>setFilters((s)=>({...s,toDate:e.target.value}))}/><Select label="Status" value={filters.status} onChange={(e)=>setFilters((s)=>({...s,status:e.target.value}))} options={[{value:'',label:'All statuses'},{value:'draft',label:'Draft'},{value:'posted',label:'Posted'},{value:'voided',label:'Voided'}]}/></div></ContentCard>
    <ContentCard title={`Imported services (${rows.length})`}>{listQuery.isLoading?<div className="py-10 text-center text-sm text-slate-500">Loading imported services…</div>:rows.length===0?<div className="py-10 text-center text-sm text-slate-500">No imported services match the selected filters.</div>:<Table rows={rows} columns={[
      {header:'Date',render:(r)=><div><div className="font-semibold">{r.service_date}</div><div className="text-xs text-slate-500">Due {r.declaration_due_date}</div></div>},
      {header:'Supplier / document',render:(r)=><div><div className="font-semibold">{r.supplier_name||'Unspecified supplier'}</div><div className="text-xs text-slate-500">{r.document_no||r.reference||'No reference'}</div></div>},
      {header:'Service',render:(r)=><div className="max-w-xs truncate">{r.description}</div>},
      {header:'Taxable',className:'text-right',render:(r)=>formatMoney(r.taxable_amount,'GHS')},
      {header:'Tax',className:'text-right',render:(r)=><div><div className="font-semibold">{formatMoney(r.total_tax_amount,'GHS')}</div><div className="text-xs text-emerald-700">Recoverable {formatMoney(r.recoverable_tax_amount,'GHS')}</div></div>},
      {header:'Recovery',render:(r)=><div><div className="capitalize">{String(r.recovery_basis).replaceAll('_',' ')}</div><div className="text-xs text-slate-500">{(Number(r.recoverable_percent)*100).toFixed(2)}%</div></div>},
      {header:'Status',render:(r)=><Badge tone={r.status==='posted'?'success':r.status==='voided'?'danger':'info'}>{r.status}</Badge>},
      {header:'',render:(r)=><Button variant="ghost" size="sm" onClick={()=>nav(ROUTES.accountingTaxGhanaImportedServiceDetail(r.id))}><ExternalLink className="h-4 w-4"/></Button>},
    ]}/>}</ContentCard>
    <Modal open={createOpen} title="New imported service" onClose={()=>setCreateOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setCreateOpen(false)}>Cancel</Button><Button loading={createMutation.isPending} disabled={!form.serviceDate||form.description.trim().length<2||!form.taxableAmount} onClick={()=>createMutation.mutate()}>Save draft</Button></div>}><ImportedServiceForm form={form} setForm={setForm} supplierOptions={supplierOptions} taxCodeOptions={taxCodeOptions}/></Modal>
  </GhanaComplianceShell>;
}
