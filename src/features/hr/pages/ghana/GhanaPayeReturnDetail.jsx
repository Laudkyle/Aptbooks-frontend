import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { Button, ContentCard, Input, SimpleTable, StatusBadge } from '../_hrShared.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { downloadBlob, filenameFromContentDisposition } from '../../../../shared/utils/fileDownload.js';
import { GhanaPayrollShell, dateText, money, useGhanaPayrollApi } from './_ghanaPayrollUi.jsx';
import { usePermissions } from '../../../../shared/hooks/usePermissions.js';
import { PERMISSIONS } from '../../../../app/constants/permissions.js';

export default function GhanaPayeReturnDetail() {
  const { id } = useParams(); const api=useGhanaPayrollApi(); const { can } = usePermissions(); const canFile = can(PERMISSIONS.hrPayrollGhanaFile); const toast=useToast(); const qc=useQueryClient(); const [graReference,setGraReference]=useState('');
  const query=useQuery({queryKey:['hr','payroll','ghana','return',id],queryFn:()=>api.getReturn(id)});
  const invalidate=()=>{qc.invalidateQueries({queryKey:['hr','payroll','ghana','return',id]});qc.invalidateQueries({queryKey:['hr','payroll','ghana','returns']});};
  const finalize=useMutation({mutationFn:()=>api.finalizeReturn(id),onSuccess:()=>{toast.success('PAYE return finalized.');invalidate();},onError:(e)=>toast.error(e?.message??'Could not finalize return.')});
  const filed=useMutation({mutationFn:()=>api.markReturnFiled(id,graReference||null),onSuccess:()=>{toast.success('PAYE return marked filed.');invalidate();},onError:(e)=>toast.error(e?.message??'Could not mark return filed.')});
  const exportCsv=async()=>{try{const res=await api.exportReturnCsv(id);downloadBlob(res.data,filenameFromContentDisposition(res.headers?.['content-disposition'])||`${query.data?.schedule_code||'PAYE-schedule'}.csv`);}catch(e){toast.error(e?.message??'Could not download schedule.');}};
  const r=query.data; const missing=(r?.lines??[]).filter((line)=>!line.employee_tax_id&&!line.ghana_card_pin);
  return <GhanaPayrollShell title={r?`${r.form_code} · ${dateText(r.period_start)} to ${dateText(r.period_end)}`:'PAYE Return'} subtitle="Review the frozen employee schedule, validate tax identifiers, finalize and record GRA filing evidence." actions={r?<Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4"/>Download {r.schedule_code}</Button>:null}>
    {r&&<><div className="grid gap-4 md:grid-cols-4"><ContentCard><div className="text-xs uppercase text-slate-500">Status</div><div className="mt-2"><StatusBadge value={r.status}/></div></ContentCard><ContentCard><div className="text-xs uppercase text-slate-500">Total PAYE</div><div className="mt-2 text-2xl font-bold">{money(r.total_paye)}</div></ContentCard><ContentCard><div className="text-xs uppercase text-slate-500">Employees</div><div className="mt-2 text-2xl font-bold">{r.lines?.length??0}</div></ContentCard><ContentCard><div className="text-xs uppercase text-slate-500">Missing TIN/Ghana Card</div><div className={`mt-2 text-2xl font-bold ${missing.length?'text-red-600':'text-emerald-600'}`}>{missing.length}</div></ContentCard></div>
    <ContentCard title="Employee schedule"><SimpleTable rows={r.lines??[]} columns={[{key:'employee_no',label:'Employee No'},{key:'employee_name',label:'Employee'},{key:'employee_tax_id',label:'TIN',render:(x)=>x.employee_tax_id||'—'},{key:'ghana_card_pin',label:'Ghana Card',render:(x)=>x.ghana_card_pin||'—'},{key:'gross_pay',label:'Gross pay',render:(x)=>money(x.gross_pay)},{key:'chargeable_income',label:'Chargeable income',render:(x)=>money(x.chargeable_income)},{key:'total_paye',label:'PAYE',render:(x)=>money(x.total_paye)}]} /></ContentCard>
    <ContentCard title="Return actions">{canFile && r.status==='draft'?<div className="flex items-center gap-3"><Button onClick={()=>finalize.mutate()} loading={finalize.isPending} disabled={missing.length>0}>Finalize return</Button>{missing.length>0?<span className="text-sm text-red-600">Complete employee TIN/Ghana Card details first.</span>:null}</div>:null}{canFile && r.status==='finalized'?<div className="flex max-w-xl gap-3"><Input label="GRA filing reference" value={graReference} onChange={(e)=>setGraReference(e.target.value)}/><div className="flex items-end"><Button onClick={()=>filed.mutate()} loading={filed.isPending}>Mark filed</Button></div></div>:null}{r.status==='filed'?<div className="text-sm text-slate-700">Filed with GRA reference <strong>{r.gra_reference||'—'}</strong>.</div>:null}</ContentCard></>}
  </GhanaPayrollShell>;
}
