import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeBankingApi } from '../api/banking.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { AccountSelect } from '../../../shared/components/forms/AccountSelect.jsx';
import { CurrencySelect } from '../../../shared/components/forms/CurrencySelect.jsx';
import { AccountSelect } from '../../../shared/components/forms/AccountSelect.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

function rowsOf(d){ return Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : []; }
function money(v){ return Number(v||0).toLocaleString(); }

export default function PaymentRunDetailPage(){
  const { id } = useParams();
  const { http } = useApi();
  const api = useMemo(()=>makeBankingApi(http), [http]);
  const coaApi = useMemo(()=>makeCoaApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [line, setLine] = useState({ payeeName:'', offsetAccountId:'', description:'', amount:'', currencyCode:'' });
  const runQ = useQuery({ queryKey:['treasury.paymentRun', id], queryFn:()=>api.getPaymentRun(id) });
  const coaQ = useQuery({ queryKey:['coa.list'], queryFn: async ()=> coaApi.list?.() ?? [] });
  const addLine = useMutation({ mutationFn:()=>api.addPaymentRunLines(id, { lines:[{ ...line, amount:Number(line.amount||0) }] }), onSuccess:()=>{ toast.success('Line added'); setLine({ payeeName:'', offsetAccountId:'', description:'', amount:'', currencyCode:'' }); qc.invalidateQueries({queryKey:['treasury.paymentRun', id]}); qc.invalidateQueries({queryKey:['treasury.paymentRuns']}); }, onError:(e)=>toast.error(e?.response?.data?.error || e.message) });
  const act = useMutation({ mutationFn: async (fn) => api[fn](id), onSuccess:()=>{ qc.invalidateQueries({queryKey:['treasury.paymentRun', id]}); qc.invalidateQueries({queryKey:['treasury.paymentRuns']}); toast.success('Action completed'); }, onError:(e)=>toast.error(e?.response?.data?.error || e.message) });
  const run = runQ.data || {}; const lines = rowsOf(run.lines);
  const coaRows = rowsOf(coaQ.data);
  return <>
    <PageHeader title={`Payment Run ${run.code || ''}`} subtitle={run.memo || 'Review lines and execute through treasury workflow.'} actions={<div className="flex gap-2">{run.status==='draft' && <Button onClick={()=>act.mutate('submitPaymentRun')}>Submit</Button>}{['draft','submitted'].includes(run.status) && <Button variant="secondary" onClick={()=>act.mutate('approvePaymentRun')}>Approve</Button>}{run.status==='approved' && <Button onClick={()=>act.mutate('executePaymentRun')}>Execute</Button>}</div>} />
    <div className="grid gap-4 lg:grid-cols-3">
      <ContentCard className="lg:col-span-2"><div className="text-base font-semibold mb-3">Lines</div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-gray-500"><th className="py-2">#</th><th>Payee</th><th>Offset account</th><th>Description</th><th className="text-right">Amount</th></tr></thead><tbody>{lines.map(l=><tr key={l.id} className="border-t"><td className="py-2">{l.line_no}</td><td>{l.payee_name || l.partner_name || '—'}</td><td>{l.offset_account_code || ''} {l.offset_account_name || ''}</td><td>{l.description || '—'}</td><td className="text-right">{money(l.amount)}</td></tr>)}{!lines.length && <tr><td colSpan={5} className="py-3 text-gray-500">No lines added yet.</td></tr>}</tbody></table></div></ContentCard>
      <ContentCard><div className="text-base font-semibold mb-3">Summary</div><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Status</span><strong>{run.status || '—'}</strong></div><div className="flex justify-between"><span>Bank account</span><strong>{run.bank_account_code || '—'}</strong></div><div className="flex justify-between"><span>Execution date</span><strong>{String(run.execution_date || '').slice(0,10) || '—'}</strong></div><div className="flex justify-between"><span>Total amount</span><strong>{money(run.total_amount)}</strong></div><div className="flex justify-between"><span>Journal entry</span><strong>{run.journal_entry_id || '—'}</strong></div></div></ContentCard>
    </div>
    {run.status==='draft' && <ContentCard className="mt-4"><div className="text-base font-semibold mb-3">Add line</div><div className="grid md:grid-cols-2 gap-4"><Input label="Payee name" value={line.payeeName} onChange={(e)=>setLine(s=>({...s,payeeName:e.target.value}))} /><AccountSelect label="Offset account" value={line.offsetAccountId} onChange={(e)=>setLine(s=>({...s,offsetAccountId:e.target.value}))} allowEmpty /><Input label="Amount" type="number" value={line.amount} onChange={(e)=>setLine(s=>({...s,amount:e.target.value}))} /><CurrencySelect label="Currency" value={line.currencyCode} onChange={(e)=>setLine(s=>({...s,currencyCode:e.target.value}))} allowEmpty /><Textarea label="Description" value={line.description} onChange={(e)=>setLine(s=>({...s,description:e.target.value}))} className="md:col-span-2" /></div><div className="mt-4 flex justify-end"><Button disabled={addLine.isLoading} onClick={()=>addLine.mutate()}>{addLine.isLoading?'Adding...':'Add line'}</Button></div></ContentCard>}
  </>;
}
