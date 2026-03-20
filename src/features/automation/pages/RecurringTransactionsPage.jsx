import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAutomationApi } from '../api/automation.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../app/constants/routes.js';

function rowsOf(d){ return Array.isArray(d?.items) ? d.items : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []; }

export default function RecurringTransactionsPage() {
  const { http } = useApi();
  const api = useMemo(() => makeAutomationApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code:'', name:'', sourceType:'journal', frequency:'monthly', startDate:'', memo:'' });

  const q = useQuery({ queryKey:['automation.recurringTransactions'], queryFn: () => api.listRecurringTransactions() });
  const create = useMutation({ mutationFn:(payload)=>api.createRecurringTransaction(payload), onSuccess:()=>{ toast.success('Recurring transaction created'); setOpen(false); setForm({ code:'', name:'', sourceType:'journal', frequency:'monthly', startDate:'', memo:'' }); qc.invalidateQueries({ queryKey:['automation.recurringTransactions'] }); }, onError:(e)=> toast.error(e?.response?.data?.error || e.message) });
  const runNow = useMutation({ mutationFn:(id)=>api.runRecurringTransaction(id), onSuccess:()=>{ toast.success('Recurring transaction run triggered'); qc.invalidateQueries({ queryKey:['automation.recurringTransactions'] }); }, onError:(e)=> toast.error(e?.response?.data?.error || e.message) });
  const toggle = useMutation({ mutationFn:({id,isEnabled})=>api.toggleRecurringTransaction(id, { isEnabled }), onSuccess:()=>{ toast.success('Recurring transaction updated'); qc.invalidateQueries({ queryKey:['automation.recurringTransactions'] }); }, onError:(e)=> toast.error(e?.response?.data?.error || e.message) });
  const rows = rowsOf(q.data);

  return (<>
    <PageHeader title="Recurring Transactions" subtitle="Manage recurring accounting automations." actions={<Button onClick={()=>setOpen(true)}>New recurring transaction</Button>} />
    <ContentCard>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="py-2">Code</th><th>Name</th><th>Source</th><th>Frequency</th><th>Next run</th><th>Status</th><th></th></tr></thead><tbody>{rows.map((r)=><tr key={r.id || r.code} className="border-t"><td className="py-2 font-medium">{r.code}</td><td>{r.name}</td><td>{r.source_type ?? r.sourceType ?? '—'}</td><td>{r.frequency ?? '—'}</td><td>{String(r.next_run_at ?? r.nextRunAt ?? '').slice(0,19).replace('T',' ') || '—'}</td><td><Badge variant={(r.is_enabled ?? r.isEnabled) ? 'success' : 'warning'}>{(r.is_enabled ?? r.isEnabled) ? 'enabled' : 'disabled'}</Badge></td><td className="text-right space-x-2"><Button size="sm" variant="secondary" onClick={()=>runNow.mutate(r.id)}>Run now</Button><Button size="sm" onClick={()=>toggle.mutate({ id:r.id, isEnabled: !(r.is_enabled ?? r.isEnabled) })}>{(r.is_enabled ?? r.isEnabled) ? 'Disable' : 'Enable'}</Button></td></tr>)}{!rows.length && <tr><td className="py-3 text-slate-500" colSpan={7}>No recurring transactions yet.</td></tr>}</tbody></table></div>
    </ContentCard>
    <Modal open={open} title="Create recurring transaction" onClose={()=>setOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button><Button disabled={create.isLoading} onClick={()=>create.mutate(form)}>{create.isLoading ? 'Creating...' : 'Create'}</Button></div>}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Code" value={form.code} onChange={(e)=>setForm((s)=>({...s, code:e.target.value}))} />
        <Input label="Name" value={form.name} onChange={(e)=>setForm((s)=>({...s, name:e.target.value}))} />
        <Select label="Source type" value={form.sourceType} onChange={(e)=>setForm((s)=>({...s, sourceType:e.target.value}))} options={[{value:'journal',label:'Journal'},{value:'invoice',label:'Invoice'},{value:'bill',label:'Bill'},{value:'expense',label:'Expense'}]} />
        <Select label="Frequency" value={form.frequency} onChange={(e)=>setForm((s)=>({...s, frequency:e.target.value}))} options={[{value:'daily',label:'Daily'},{value:'weekly',label:'Weekly'},{value:'monthly',label:'Monthly'},{value:'quarterly',label:'Quarterly'}]} />
        <Input label="Start date" type="date" value={form.startDate} onChange={(e)=>setForm((s)=>({...s, startDate:e.target.value}))} />
        <Textarea className="md:col-span-2" label="Memo" value={form.memo} onChange={(e)=>setForm((s)=>({...s, memo:e.target.value}))} />
      </div>
    </Modal>
  </>);
}
