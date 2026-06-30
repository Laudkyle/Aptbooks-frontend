import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Plus, ReceiptText, RotateCcw, XCircle } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { makeCommerceApi } from '../api/commerce.api.js';
import { Badge, Field, Panel, SimpleTable, dateish, money, rowsOf } from './_commerceUi.jsx';

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15';
const btnClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-deep disabled:opacity-50';
const softBtn = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const dangerBtn = 'inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50';

function compact(body) { return Object.fromEntries(Object.entries(body).filter(([, v]) => v !== '' && v !== null && v !== undefined)); }

export default function CommerceReturns() {
  const { http } = useApi();
  const api = useMemo(() => makeCommerceApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('returns');
  const [returnForm, setReturnForm] = useState({ saleId: '', reason: '', disposition: 'restock' });
  const [refundForm, setRefundForm] = useState({ saleId: '', amount: '', method: 'original_payment', reason: '' });

  const returnsQ = useQuery({ queryKey: ['commerce.returns'], queryFn: () => api.returns.list() });
  const refundsQ = useQuery({ queryKey: ['commerce.refunds'], queryFn: () => api.refunds.list() });
  const returns = rowsOf(returnsQ.data);
  const refunds = rowsOf(refundsQ.data);

  const createReturn = useMutation({ mutationFn: () => api.returns.create(compact(returnForm)), onSuccess: () => { setReturnForm({ saleId: '', reason: '', disposition: 'restock' }); qc.invalidateQueries({ queryKey: ['commerce.returns'] }); toast.success?.('Return request created.'); }, onError: (e) => toast.error?.(e?.message || 'Return could not be created.') });
  const createRefund = useMutation({ mutationFn: () => api.refunds.create(compact(refundForm)), onSuccess: () => { setRefundForm({ saleId: '', amount: '', method: 'original_payment', reason: '' }); qc.invalidateQueries({ queryKey: ['commerce.refunds'] }); toast.success?.('Refund request created.'); }, onError: (e) => toast.error?.(e?.message || 'Refund could not be created.') });
  const returnAction = useMutation({ mutationFn: ({ type, id }) => type === 'approve' ? api.returns.approve(id, {}) : type === 'reject' ? api.returns.reject(id, {}) : api.returns.receive(id, {}), onSuccess: () => { qc.invalidateQueries({ queryKey: ['commerce.returns'] }); toast.success?.('Return updated.'); }, onError: (e) => toast.error?.(e?.message || 'Return action failed.') });
  const refundAction = useMutation({ mutationFn: ({ type, id }) => type === 'approve' ? api.refunds.approve(id, {}) : api.refunds.post(id, {}), onSuccess: () => { qc.invalidateQueries({ queryKey: ['commerce.refunds'] }); toast.success?.('Refund updated.'); }, onError: (e) => toast.error?.(e?.message || 'Refund action failed.') });

  return (
    <div className="space-y-6">
      <PageHeader icon={RotateCcw} title="Returns and refunds" subtitle="Manage after-sale returns, refund approvals, receiving and store-credit workflows." />
      <div className="flex gap-2"><button className={tab === 'returns' ? btnClass : softBtn} onClick={() => setTab('returns')}>Returns</button><button className={tab === 'refunds' ? btnClass : softBtn} onClick={() => setTab('refunds')}>Refunds</button></div>
      {tab === 'returns' ? (
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.4fr]">
          <Panel title="New return" subtitle="Reference the original sale and choose restocking disposition." actions={<button className={btnClass} onClick={() => createReturn.mutate()}><Plus className="h-4 w-4" /> Create</button>}>
            <div className="space-y-3"><Field label="Sale ID"><input className={inputClass} value={returnForm.saleId} onChange={(e) => setReturnForm((f) => ({ ...f, saleId: e.target.value }))} /></Field><Field label="Disposition"><select className={inputClass} value={returnForm.disposition} onChange={(e) => setReturnForm((f) => ({ ...f, disposition: e.target.value }))}><option value="restock">Restock</option><option value="damaged">Damaged</option><option value="discard">Discard</option><option value="supplier_return">Supplier return</option></select></Field><Field label="Reason"><textarea className={inputClass} value={returnForm.reason} onChange={(e) => setReturnForm((f) => ({ ...f, reason: e.target.value }))} /></Field></div>
          </Panel>
          <Panel title="Return queue"><SimpleTable rows={returns} columns={[{ key: 'returnNo', label: 'Return', render: (r) => r.returnNo || r.id }, { key: 'saleId', label: 'Sale' }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }, { key: 'createdAt', label: 'Created', render: (r) => dateish(r.createdAt) }, { key: 'actions', label: 'Actions', render: (r) => <div className="flex flex-wrap gap-2">{['draft', 'submitted', 'pending'].includes(String(r.status)) ? <><button className={softBtn} onClick={() => returnAction.mutate({ type: 'approve', id: r.id })}><CheckCircle2 className="h-4 w-4" /> Approve</button><button className={dangerBtn} onClick={() => returnAction.mutate({ type: 'reject', id: r.id })}><XCircle className="h-4 w-4" /> Reject</button></> : null}{String(r.status) === 'approved' ? <button className={btnClass} onClick={() => returnAction.mutate({ type: 'receive', id: r.id })}>Receive</button> : null}</div> }]} /></Panel>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.4fr]">
          <Panel title="New refund" subtitle="Refunds require approval before posting." actions={<button className={btnClass} onClick={() => createRefund.mutate()}><Plus className="h-4 w-4" /> Create</button>}>
            <div className="space-y-3"><Field label="Sale ID"><input className={inputClass} value={refundForm.saleId} onChange={(e) => setRefundForm((f) => ({ ...f, saleId: e.target.value }))} /></Field><Field label="Amount"><input className={inputClass} value={refundForm.amount} onChange={(e) => setRefundForm((f) => ({ ...f, amount: e.target.value }))} /></Field><Field label="Method"><select className={inputClass} value={refundForm.method} onChange={(e) => setRefundForm((f) => ({ ...f, method: e.target.value }))}><option value="original_payment">Original payment</option><option value="cash">Cash</option><option value="momo">Mobile money</option><option value="store_credit">Store credit</option></select></Field><Field label="Reason"><textarea className={inputClass} value={refundForm.reason} onChange={(e) => setRefundForm((f) => ({ ...f, reason: e.target.value }))} /></Field></div>
          </Panel>
          <Panel title="Refund queue"><SimpleTable rows={refunds} columns={[{ key: 'refundNo', label: 'Refund', render: (r) => r.refundNo || r.id }, { key: 'saleId', label: 'Sale' }, { key: 'amount', label: 'Amount', render: (r) => money(r.amount || r.refundAmount) }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }, { key: 'actions', label: 'Actions', render: (r) => <div className="flex flex-wrap gap-2">{['draft', 'submitted', 'pending'].includes(String(r.status)) ? <button className={softBtn} onClick={() => refundAction.mutate({ type: 'approve', id: r.id })}><CheckCircle2 className="h-4 w-4" /> Approve</button> : null}{String(r.status) === 'approved' ? <button className={btnClass} onClick={() => refundAction.mutate({ type: 'post', id: r.id })}><ReceiptText className="h-4 w-4" /> Post</button> : null}</div> }]} /></Panel>
        </div>
      )}
    </div>
  );
}
