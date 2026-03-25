import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeBankingApi } from '../api/banking.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { CurrencySelect } from '../../../shared/components/forms/CurrencySelect.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../app/constants/routes.js';

function rowsOf(d){ return Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : []; }
function money(v){ return Number(v||0).toLocaleString(); }

export default function PaymentRunsPage() {
  const { http } = useApi();
  const api = useMemo(() => makeBankingApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ bankAccountId:'', executionDate:'', currencyCode:'', memo:'' });
  const bankQ = useQuery({ queryKey:['banking.accounts'], queryFn: ()=> api.listAccounts() });
  const q = useQuery({ queryKey:['treasury.paymentRuns'], queryFn: ()=> api.listPaymentRuns() });
  const create = useMutation({ mutationFn:(payload)=>api.createPaymentRun(payload), onSuccess:()=>{ toast.success('Payment run created'); setOpen(false); setForm({ bankAccountId:'', executionDate:'', currencyCode:'', memo:'' }); qc.invalidateQueries({queryKey:['treasury.paymentRuns']}); }, onError:(e)=> toast.error(e?.response?.data?.error || e.message) });
  const action = useMutation({ mutationFn: async ({ fn, id }) => api[fn](id), onSuccess:()=>{ qc.invalidateQueries({queryKey:['treasury.paymentRuns']}); toast.success('Action completed'); }, onError:(e)=> toast.error(e?.response?.data?.error || e.message) });
  const accounts = rowsOf(bankQ.data);
  const runs = rowsOf(q.data);
  return (<>
    <PageHeader title="Payment Runs" subtitle="Bundle and control outgoing payments." actions={<Button onClick={()=>setOpen(true)}>New payment run</Button>} />
    <ContentCard>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-gray-500"><th className="py-2">Code</th><th>Bank</th><th>Execution date</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Lines</th><th></th></tr></thead><tbody>{runs.map((r)=><tr key={r.id} className="border-t"><td className="py-2"><Link className="text-blue-600 hover:underline" to={ROUTES.paymentRunDetail(r.id)}>{r.code}</Link></td><td>{r.bank_account_code} · {r.bank_account_name}</td><td>{String(r.execution_date || '').slice(0,10)}</td><td>{r.status}</td><td className="text-right">{money(r.total_amount)}</td><td className="text-right">{r.line_count ?? 0}</td><td className="text-right space-x-2">{r.status==='draft' && <Button size="sm" onClick={()=>action.mutate({fn:'submitPaymentRun', id:r.id})}>Submit</Button>}{['draft','submitted'].includes(r.status) && <Button size="sm" variant="secondary" onClick={()=>action.mutate({fn:'approvePaymentRun', id:r.id})}>Approve</Button>}{r.status==='approved' && <Button size="sm" onClick={()=>action.mutate({fn:'executePaymentRun', id:r.id})}>Execute</Button>}</td></tr>)}{!runs.length && <tr><td className="py-3 text-gray-500" colSpan={7}>No payment runs yet.</td></tr>}</tbody></table></div>
    </ContentCard>
    <Modal open={open} title="Create payment run" onClose={()=>setOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button><Button disabled={create.isLoading} onClick={()=>create.mutate(form)}>{create.isLoading?'Creating...':'Create'}</Button></div>}>
      <div className="grid md:grid-cols-2 gap-4">
        <Select label="Bank account" value={form.bankAccountId} onChange={(e)=>setForm(s=>({...s, bankAccountId:e.target.value}))} options={[{value:'', label:'Select bank account'}, ...accounts.map(a=>({value:a.id, label:`${a.code} ${a.name}`}))]} />
        <Input label="Execution date" type="date" value={form.executionDate} onChange={(e)=>setForm(s=>({...s, executionDate:e.target.value}))} />
        <CurrencySelect label="Currency (optional)" value={form.currencyCode} onChange={(e)=>setForm(s=>({...s, currencyCode:e.target.value}))} allowEmpty />
        <Textarea label="Memo" value={form.memo} onChange={(e)=>setForm(s=>({...s, memo:e.target.value}))} className="md:col-span-2" />
      </div>
    </Modal>
  </>);
}
