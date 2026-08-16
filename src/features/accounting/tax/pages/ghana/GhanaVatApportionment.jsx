import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, ExternalLink, Plus, RefreshCw } from 'lucide-react';
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
import { Modal } from '../../../../../shared/components/ui/Modal.jsx';
import { Badge } from '../../../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../../shared/components/ui/Toast.jsx';
import { makeGhanaComplianceApi } from '../../api/ghanaCompliance.api.js';
import { GhanaComplianceShell } from '../../components/GhanaComplianceShell.jsx';
import { GhanaVatNav } from '../../components/GhanaVatNav.jsx';

function monthRange() {
  const now = new Date(); const y=now.getFullYear(); const m=now.getMonth();
  const fmt=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return { periodStart: fmt(new Date(y,m,1)), periodEnd: fmt(new Date(y,m+1,0)) };
}

function pct(value) {
  if (value == null || value === '') return '—';
  return `${(Number(value) * 100).toFixed(2)}%`;
}

function statusTone(status) {
  if (status === 'posted') return 'success';
  if (status === 'voided') return 'danger';
  return 'info';
}

export default function GhanaVatApportionment() {
  const { http } = useApi();
  const api = useMemo(() => makeGhanaComplianceApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const nav = useNavigate();
  const initial = useMemo(monthRange, []);
  const [filters, setFilters] = useState({ fromDate: initial.periodStart, toDate: initial.periodEnd, status: '' });
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcForm, setCalcForm] = useState({ ...initial, method: 'ghana_act1151_turnover', taxableSupplies: '', exemptSupplies: '', approvedRecoveryPercent: '' });
  const [postRow, setPostRow] = useState(null);
  const [postMemo, setPostMemo] = useState('');
  const [voidRow, setVoidRow] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  const queryParams = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([,v])=>v!=='')), [filters]);
  const listQuery = useQuery({ queryKey: qk.ghanaVatApportionments(queryParams), queryFn: () => api.listVatApportionments(queryParams) });

  const calculateMutation = useMutation({
    mutationFn: () => {
      const payload = { periodStart: calcForm.periodStart, periodEnd: calcForm.periodEnd, method: calcForm.method };
      if (calcForm.taxableSupplies !== '') payload.taxableSupplies = calcForm.taxableSupplies;
      if (calcForm.exemptSupplies !== '') payload.exemptSupplies = calcForm.exemptSupplies;
      if (calcForm.method === 'manual_approved') payload.approvedRecoveryRatio = Number(calcForm.approvedRecoveryPercent) / 100;
      return api.calculateVatApportionment(payload);
    },
    onSuccess: async () => { toast.success('Input VAT apportionment calculated'); setCalcOpen(false); await qc.invalidateQueries({ queryKey: ['tax','ghana','vat','apportionments'] }); },
    onError: (e) => toast.error(e?.message || 'Unable to calculate input VAT apportionment'),
  });

  const postMutation = useMutation({
    mutationFn: () => api.postVatApportionment(postRow.id, postMemo.trim() ? { memo: postMemo.trim() } : {}),
    onSuccess: async () => { toast.success('Input VAT apportionment posted'); setPostRow(null); setPostMemo(''); await qc.invalidateQueries({ queryKey: ['tax','ghana','vat'] }); },
    onError: (e) => toast.error(e?.message || 'Unable to post input VAT apportionment'),
  });

  const voidMutation = useMutation({
    mutationFn: () => api.voidVatApportionment(voidRow.id, voidReason.trim()),
    onSuccess: async () => { toast.success('Input VAT apportionment voided'); setVoidRow(null); setVoidReason(''); await qc.invalidateQueries({ queryKey: ['tax','ghana','vat'] }); },
    onError: (e) => toast.error(e?.message || 'Unable to void input VAT apportionment'),
  });

  const rows = listQuery.data ?? [];

  return (
    <GhanaComplianceShell title="Input VAT Apportionment" subtitle="Calculate recoverable mixed-use input tax for organizations making both taxable and exempt supplies." actions={<div className="flex gap-2"><Button variant="outline" onClick={()=>listQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button><PermissionGate any={[PERMISSIONS.taxManage]} fallback={null}><Button onClick={()=>setCalcOpen(true)}><Plus className="mr-2 h-4 w-4"/>Calculate period</Button></PermissionGate></div>}>
      <GhanaVatNav />
      <ContentCard title="Filters"><div className="grid gap-4 sm:grid-cols-3"><Input label="From" type="date" value={filters.fromDate} onChange={(e)=>setFilters((s)=>({...s,fromDate:e.target.value}))}/><Input label="To" type="date" value={filters.toDate} onChange={(e)=>setFilters((s)=>({...s,toDate:e.target.value}))}/><Select label="Status" value={filters.status} onChange={(e)=>setFilters((s)=>({...s,status:e.target.value}))} options={[{value:'',label:'All statuses'},{value:'calculated',label:'Calculated'},{value:'posted',label:'Posted'},{value:'voided',label:'Voided'}]}/></div></ContentCard>
      <ContentCard title={`Apportionment periods (${rows.length})`}>
        {listQuery.isLoading ? <div className="py-10 text-center text-sm text-slate-500">Loading apportionments…</div> : rows.length === 0 ? <div className="py-10 text-center text-sm text-slate-500">No input VAT apportionments match this period.</div> : <Table rows={rows} columns={[
          {header:'Period',render:(r)=><div><div className="font-semibold">{r.period_start} → {r.period_end}</div><div className="text-xs text-slate-500">{String(r.method).replaceAll('_',' ')}</div></div>},
          {header:'Supplies',render:(r)=><div className="text-sm"><div>Taxable {formatMoney(r.taxable_supplies,'GHS')}</div><div className="text-slate-500">Exempt {formatMoney(r.exempt_supplies,'GHS')}</div></div>},
          {header:'Recovery ratio',render:(r)=><div><div className="font-semibold">{pct(r.allowed_recovery_ratio)}</div><div className="text-xs text-slate-500">Raw {pct(r.raw_recovery_ratio)} · {String(r.threshold_applied).replaceAll('_',' ')}</div></div>},
          {header:'Mixed input',className:'text-right',render:(r)=>formatMoney(r.mixed_input_tax,'GHS')},
          {header:'Recoverable',className:'text-right',render:(r)=><div><div className="font-semibold text-emerald-700">{formatMoney(r.total_recoverable_input_tax,'GHS')}</div><div className="text-xs text-slate-500">Adjustment {formatMoney(r.adjustment_amount,'GHS')}</div></div>},
          {header:'Status',render:(r)=><Badge tone={statusTone(r.status)}>{r.status}</Badge>},
          {header:'Actions',render:(r)=><div className="flex flex-wrap gap-1"><PermissionGate any={[PERMISSIONS.taxManage]} fallback={null}>{r.status==='calculated'?<Button variant="ghost" size="sm" onClick={()=>{setPostRow(r);setPostMemo('');}}>Post</Button>:null}{r.status==='posted'?<Button variant="ghost" size="sm" onClick={()=>{setVoidRow(r);setVoidReason('');}}>Void</Button>:null}</PermissionGate>{r.journal_entry_id?<Button variant="ghost" size="sm" onClick={()=>nav(ROUTES.accountingJournalDetail(r.journal_entry_id))}><ExternalLink className="h-4 w-4"/></Button>:null}</div>},
        ]}/>} 
      </ContentCard>

      <Modal open={calcOpen} title="Calculate input VAT apportionment" onClose={()=>setCalcOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setCalcOpen(false)}>Cancel</Button><Button loading={calculateMutation.isPending} onClick={()=>calculateMutation.mutate()} disabled={!calcForm.periodStart||!calcForm.periodEnd||(calcForm.method==='manual_approved'&&calcForm.approvedRecoveryPercent==='')}><Calculator className="mr-2 h-4 w-4"/>Calculate</Button></div>}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2"><Input label="Period start" type="date" value={calcForm.periodStart} onChange={(e)=>setCalcForm((s)=>({...s,periodStart:e.target.value}))}/><Input label="Period end" type="date" value={calcForm.periodEnd} onChange={(e)=>setCalcForm((s)=>({...s,periodEnd:e.target.value}))}/></div>
          <Select label="Method" value={calcForm.method} onChange={(e)=>setCalcForm((s)=>({...s,method:e.target.value}))} options={[{value:'ghana_act1151_turnover',label:'Ghana turnover apportionment'},{value:'manual_approved',label:'Approved manual recovery ratio'}]}/>
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Leave taxable and exempt supplies blank to use the canonical tax ledger for the selected period. Enter values only when an approved workpaper requires an override.</div>
          <div className="grid gap-4 sm:grid-cols-2"><Input label="Taxable supplies override" type="number" min="0" step="0.01" value={calcForm.taxableSupplies} onChange={(e)=>setCalcForm((s)=>({...s,taxableSupplies:e.target.value}))}/><Input label="Exempt supplies override" type="number" min="0" step="0.01" value={calcForm.exemptSupplies} onChange={(e)=>setCalcForm((s)=>({...s,exemptSupplies:e.target.value}))}/></div>
          {calcForm.method==='manual_approved'?<Input label="Approved recovery percentage" type="number" min="0" max="100" step="0.01" value={calcForm.approvedRecoveryPercent} onChange={(e)=>setCalcForm((s)=>({...s,approvedRecoveryPercent:e.target.value}))}/>:null}
        </div>
      </Modal>

      <Modal open={Boolean(postRow)} title="Post input VAT apportionment" onClose={()=>setPostRow(null)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setPostRow(null)}>Cancel</Button><Button loading={postMutation.isPending} onClick={()=>postMutation.mutate()}>Post adjustment</Button></div>}><Textarea label="Journal memo (optional)" value={postMemo} onChange={(e)=>setPostMemo(e.target.value)} rows={4}/></Modal>
      <Modal open={Boolean(voidRow)} title="Void input VAT apportionment" onClose={()=>setVoidRow(null)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setVoidRow(null)}>Cancel</Button><Button variant="danger" loading={voidMutation.isPending} disabled={voidReason.trim().length<2} onClick={()=>voidMutation.mutate()}>Void and reverse</Button></div>}><Textarea label="Reason" value={voidReason} onChange={(e)=>setVoidReason(e.target.value)} rows={4}/></Modal>
    </GhanaComplianceShell>
  );
}
