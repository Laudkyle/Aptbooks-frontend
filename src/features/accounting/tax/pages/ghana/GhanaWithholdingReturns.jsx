import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, ExternalLink } from 'lucide-react';
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
import { makeGhanaComplianceApi } from '../../api/ghanaCompliance.api.js';
import { GhanaComplianceShell } from '../../components/GhanaComplianceShell.jsx';
import { GhanaWithholdingNav } from '../../components/GhanaWithholdingNav.jsx';

function currentMonth(){const n=new Date();const y=n.getFullYear(),m=n.getMonth();const f=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return {periodStart:f(new Date(y,m,1)),periodEnd:f(new Date(y,m+1,0))};}
export default function GhanaWithholdingReturns(){
 const {http}=useApi();const api=useMemo(()=>makeGhanaComplianceApi(http),[http]);const nav=useNavigate();const qc=useQueryClient();const toast=useToast();
 const [regime,setRegime]=useState('');const [open,setOpen]=useState(false);const [form,setForm]=useState(()=>({regime:'income_wht',...currentMonth(),amendsReturnId:''}));
 const listQ=useQuery({queryKey:qk.ghanaWithholdingReturns(regime?{regime}:{}),queryFn:()=>api.listGhanaWithholdingReturns(regime?{regime}:{})});
 const allReturns=listQ.data??[];
 const create=useMutation({mutationFn:()=>api.prepareGhanaWithholdingReturn({regime:form.regime,periodStart:form.periodStart,periodEnd:form.periodEnd,amendsReturnId:form.amendsReturnId||null}),onSuccess:async row=>{toast.success(`${row.form_code} return prepared`);setOpen(false);await qc.invalidateQueries({queryKey:['tax','ghana','withholding','returns']});nav(ROUTES.accountingTaxGhanaWithholdingReturnDetail(row.id));},onError:e=>toast.error(e?.message||'Unable to prepare return')});
 return <GhanaComplianceShell title="Withholding Returns" subtitle="Prepare and freeze Ghana DT110 income-withholding and WHVAT returns from canonical withholding events." actions={<div className="flex gap-2"><Button variant="outline" onClick={()=>listQ.refetch()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button><PermissionGate any={[PERMISSIONS.taxManage]} fallback={null}><Button onClick={()=>setOpen(true)}><Plus className="mr-2 h-4 w-4"/>Prepare return</Button></PermissionGate></div>}>
  <GhanaWithholdingNav/>
  <ContentCard title="Filter"><Select label="Regime" value={regime} onChange={e=>setRegime(e.target.value)} options={[{value:'',label:'All returns'},{value:'income_wht',label:'DT110 — Income Withholding Tax'},{value:'vat_withholding',label:'WHVAT — VAT Withholding'}]}/></ContentCard>
  <ContentCard title={`Returns (${allReturns.length})`}><Table rows={allReturns} columns={[
    {header:'Return',render:r=><div><div className="font-semibold">{r.form_code} · v{r.version_no}</div><div className="text-xs text-slate-500">{r.period_start} → {r.period_end}</div></div>},
    {header:'Due',render:r=>r.due_date||'—'},
    {header:'Taxable basis',className:'text-right',render:r=>formatMoney(r.total_taxable_basis,'GHS')},
    {header:'Withheld',className:'text-right',render:r=><span className="font-semibold">{formatMoney(r.total_withheld,'GHS')}</span>},
    {header:'Status',render:r=><Badge tone={r.status==='filed'?'success':r.status==='finalized'?'info':'warning'}>{r.status}</Badge>},
    {header:'GRA reference',render:r=>r.gra_reference||'—'},
    {header:'',render:r=><Button variant="ghost" size="sm" onClick={()=>nav(ROUTES.accountingTaxGhanaWithholdingReturnDetail(r.id))}><ExternalLink className="h-4 w-4"/></Button>},
  ]}/></ContentCard>
  <Modal open={open} title="Prepare Ghana withholding return" onClose={()=>setOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button loading={create.isPending} disabled={!form.periodStart||!form.periodEnd} onClick={()=>create.mutate()}>Prepare return</Button></div>}>
    <div className="space-y-4"><Select label="Return type" value={form.regime} onChange={e=>setForm(s=>({...s,regime:e.target.value,amendsReturnId:''}))} options={[{value:'income_wht',label:'DT110 — Income Withholding Tax'},{value:'vat_withholding',label:'WHVAT — VAT Withholding'}]}/><div className="grid gap-4 sm:grid-cols-2"><Input label="Period start" type="date" value={form.periodStart} onChange={e=>setForm(s=>({...s,periodStart:e.target.value}))}/><Input label="Period end" type="date" value={form.periodEnd} onChange={e=>setForm(s=>({...s,periodEnd:e.target.value}))}/></div><Select label="Amends previous return" value={form.amendsReturnId} onChange={e=>setForm(s=>({...s,amendsReturnId:e.target.value}))} options={[{value:'',label:'No — original return'},...allReturns.filter(r=>r.regime===form.regime).map(r=>({value:r.id,label:`${r.form_code} ${r.period_start} → ${r.period_end} · v${r.version_no} · ${r.status}`}))]}/></div>
  </Modal>
 </GhanaComplianceShell>;
}
