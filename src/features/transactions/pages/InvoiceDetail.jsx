import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Calendar, User, DollarSign, FileMinus2 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeInvoicesApi } from '../api/invoices.api.js';
import { makeCreditNotesApi } from '../api/creditNotes.api.js';
import { formatDate } from '../../../shared/utils/formatDate.js';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { TransactionWorkflowActionBar } from '../components/TransactionWorkflowActionBar.jsx';
import { normalizeTransactionWorkflow } from '../workflow/normalizeTransactionWorkflow.js';
import { resolveTransactionActions } from '../workflow/resolveTransactionActions.js';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { ROUTES } from '../../../app/constants/routes.js';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeInvoicesApi(http), [http]);
  const creditNotesApi = useMemo(() => makeCreditNotesApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({ queryKey: qk.invoice(id), queryFn: () => api.get(id) });
  const invoiceData = data?.data ?? data;
  const invoice = invoiceData?.invoice || invoiceData;
  const lines = invoiceData?.lines || [];
  const allocationsSummary = invoiceData?.allocations_summary || {};
  const paid = allocationsSummary?.paid || 0;
  const outstanding = allocationsSummary?.outstanding || invoice?.total || 0;
  const customerId = invoice?.customer_id || invoice?.customerId;

  const creditNotesQ = useQuery({
    queryKey: ['creditNotes', { customerId }],
    queryFn: () => creditNotesApi.list({ customerId, limit: 200 }),
    enabled: !!customerId
  });

  const einvoiceQ = useQuery({ queryKey: ['invoice', id, 'einvoicePreview'], queryFn: () => api.getEinvoicePreview(id), enabled: !!id });
  const filingStatusQ = useQuery({ queryKey: ['invoice', id, 'filingStatus'], queryFn: () => api.getFilingStatus(id), enabled: !!id });

  const [comment, setComment] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [action, setAction] = useState(null);
  const [noteAmounts, setNoteAmounts] = useState({});

  const run = useMutation({
    mutationFn: async () => {
      const idempotencyKey = generateUUID();
      if (action === 'submit') return api.submitForApproval(id, { idempotencyKey });
      if (action === 'approve') return api.approve(id, { comment }, { idempotencyKey });
      if (action === 'reject') return api.reject(id, { comment }, { idempotencyKey });
      if (action === 'issue') return api.issue(id, { idempotencyKey });
      if (action === 'void') return api.void(id, { reason: voidReason }, { idempotencyKey });
      throw new Error('Unknown action');
    },
    onSuccess: () => {
      toast.success('Action completed successfully');
      qc.invalidateQueries({ queryKey: qk.invoice(id) });
      setAction(null);
      setComment('');
      setVoidReason('');
    },
    onError: (e) => toast.error(e?.message ?? 'Action failed')
  });

  const applyCreditNote = useMutation({
    mutationFn: async ({ creditNoteId, amount }) => {
      const idempotencyKey = generateUUID();
      return creditNotesApi.apply(creditNoteId, { invoice_id: id, amount_applied: amount }, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Credit note applied successfully');
      qc.invalidateQueries({ queryKey: qk.invoice(id) });
      qc.invalidateQueries({ queryKey: qk.creditNotes() });
      qc.invalidateQueries({ queryKey: ['creditNotes', { customerId }] });
    },
    onError: (e) => toast.error(e?.response?.data?.error ?? e?.message ?? 'Failed to apply credit note')
  });

  const workflowState = normalizeTransactionWorkflow({ type: 'invoice', entity: invoice, payload: invoiceData });
  const status = workflowState.businessStatus || invoice?.workflow_status || 'draft';
  const availableActions = resolveTransactionActions({ type: 'invoice', state: workflowState });

  const statusColors = {
    paid: 'bg-green-100 text-green-800 border-green-200',
    issued: 'bg-blue-100 text-blue-800 border-blue-200',
    voided: 'bg-red-100 text-red-800 border-red-200',
    draft: 'bg-amber-100 text-amber-800 border-amber-200',
    pending: 'bg-purple-100 text-purple-800 border-purple-200',
    approved: 'bg-green-100 text-green-800 border-green-200'
  };

  const currency = invoice?.currency_code || 'GHS';
  const formatCurrency = (amount) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numAmount || 0);
  };

  const subtotal = invoice?.subtotal ? parseFloat(invoice.subtotal) : 0;
  const taxTotal = invoice?.tax_total ? parseFloat(invoice.tax_total) : 0;
  const total = invoice?.total ? parseFloat(invoice.total) : 0;
  const outstandingAmount = typeof outstanding === 'string' ? parseFloat(outstanding) : outstanding;
  const paidAmount = typeof paid === 'string' ? parseFloat(paid) : paid;

  const creditNotesRaw = Array.isArray(creditNotesQ.data) ? creditNotesQ.data : creditNotesQ.data?.data ?? [];
  const availableCreditNotes = creditNotesRaw.filter((note) => {
    const noteCustomerId = note.customer_id || note.customerId;
    const noteStatus = (note.status || note.workflow_status || '').toLowerCase();
    const remainingRaw = note.balance?.remaining ?? note.remaining_amount ?? note.remaining ?? note.unapplied_amount ?? note.balance_remaining ?? note.total;
    const remaining = typeof remainingRaw === 'string' ? parseFloat(remainingRaw) : Number(remainingRaw || 0);
    return (!customerId || noteCustomerId === customerId) && remaining > 0 && !['draft', 'voided', 'rejected'].includes(noteStatus);
  });

  const canApplyCredits = ['issued', 'approved', 'partial', 'paid'].includes(String(status).toLowerCase()) && outstandingAmount > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-7 w-7 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-900">{invoice?.invoice_no || (isLoading ? 'Loading...' : 'Invoice')}</h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusColors[status] || statusColors.draft}`}>{status?.charAt(0).toUpperCase() + status?.slice(1) || 'Draft'}</span>
              </div>
              <p className="text-sm text-gray-600">Invoice ID: {id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate(-1)} className="border-gray-300"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
            </div>
          </div>
        </div>

        <TransactionWorkflowActionBar actions={availableActions} onAction={setAction} documentType="invoice" documentId={id} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-5">Invoice Summary</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2"><User className="h-4 w-4 text-gray-400" /><span className="text-xs font-medium text-gray-500">Customer ID</span></div>
                  <div className="text-sm font-semibold text-gray-900">{customerId || '—'}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-xs font-medium text-gray-500">Dates</span></div>
                  <div className="text-sm font-semibold text-gray-900">{formatDate(invoice?.invoice_date)} → {formatDate(invoice?.due_date)}</div>
                </div>
                {invoice?.memo && <div className="md:col-span-2 rounded-lg border border-gray-200 p-4"><div className="text-xs font-medium text-gray-500 mb-2">Memo</div><div className="text-sm text-gray-700">{invoice.memo}</div></div>}
                <div className="md:col-span-2 rounded-lg border border-gray-200 p-4">
                  <div className="text-xs font-medium text-gray-500 mb-2">Timeline</div>
                  <div className="space-y-1 text-sm">
                    <div>Created: {formatDate(invoice?.created_at)}</div>
                    {invoice?.submitted_at && <div>Submitted: {formatDate(invoice.submitted_at)}</div>}
                    {invoice?.approved_at && <div>Approved: {formatDate(invoice.approved_at)}</div>}
                    {invoice?.issued_at && <div>Issued: {formatDate(invoice.issued_at)}</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200"><h3 className="text-base font-semibold text-gray-900">Line Items</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit Price</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Revenue Account</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tax Code</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tax Rate</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Tax Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {lines.map((line, idx) => {
                      const quantity = line.quantity ? parseFloat(line.quantity) : 1;
                      const unitPrice = line.unit_price ? parseFloat(line.unit_price) : 0;
                      const lineTotal = line.line_total ? parseFloat(line.line_total) : 0;
                      const taxAmount = line.tax_amount ? parseFloat(line.tax_amount) : 0;
                      const taxRate = line.taxes?.[0]?.tax_rate ? parseFloat(line.taxes[0].tax_rate) : 0;
                      return (
                        <tr key={line.id || idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-500">{line.line_no || idx + 1}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{line.description || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{quantity}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{formatCurrency(unitPrice)}</td>
                          <td className="px-6 py-4"><div className="text-xs"><div className="font-mono text-gray-600">{line.account_code || '—'}</div><div className="text-gray-500">{line.account_name || '—'}</div></div></td>
                          <td className="px-6 py-4 text-xs text-gray-700">{line.tax_code_code || line.tax_code?.code || '—'}</td>
                          <td className="px-6 py-4 text-xs text-gray-700">{taxRate}%</td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">{formatCurrency(taxAmount)}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">{formatCurrency(lineTotal + taxAmount)}</td>
                        </tr>
                      );
                    })}
                    {!lines.length && <tr><td className="px-6 py-12 text-center text-sm text-gray-500" colSpan={9}>No line items</td></tr>}
                  </tbody>
                  {lines.length > 0 && <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr><td colSpan={7} className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Subtotal:</td><td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{formatCurrency(subtotal)}</td><td className="px-6 py-4"></td></tr>
                    <tr><td colSpan={7} className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Tax Total:</td><td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{formatCurrency(taxTotal)}</td><td className="px-6 py-4"></td></tr>
                    <tr className="border-t border-gray-200"><td colSpan={7} className="px-6 py-4 text-right text-base font-bold text-gray-900">Total:</td><td className="px-6 py-4 text-right text-lg font-bold text-gray-900">{formatCurrency(total)}</td><td className="px-6 py-4"></td></tr>
                  </tfoot>}
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4"><DollarSign className="h-5 w-5 text-green-600" /><h3 className="text-base font-semibold text-gray-900">Invoice Total</h3></div>
              <div className="text-3xl font-bold text-gray-900 mb-6">{formatCurrency(total)}</div>
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm"><span className="text-gray-600">Status</span><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[status] || statusColors.draft}`}>{status?.charAt(0).toUpperCase() + status?.slice(1) || 'Draft'}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Currency</span><span className="font-medium text-gray-900">{currency}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Line Items</span><span className="font-medium text-gray-900">{lines.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Paid</span><span className="font-medium text-gray-900">{formatCurrency(paidAmount)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Outstanding</span><span className="font-medium text-gray-900">{formatCurrency(outstandingAmount)}</span></div>
              </div>
              <div className="mt-4 grid gap-2">
                <Button onClick={() => navigate(ROUTES.customerReceiptNew)} className="bg-green-600 hover:bg-green-700">Receive Payment</Button>
                <Button variant="outline" onClick={() => navigate(ROUTES.creditNoteNew)} className="border-gray-300">New Credit Note</Button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4"><FileMinus2 className="h-5 w-5 text-amber-600" /><h3 className="text-base font-semibold text-gray-900">Apply Credit Note</h3></div>
              <p className="text-sm text-gray-600 mb-4">Use issued credit notes to reduce this invoice without creating a cash receipt.</p>
              {!canApplyCredits ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">Credit notes can be applied only when the invoice is issued and still has an outstanding balance.</div>
              ) : creditNotesQ.isLoading ? (
                <div className="text-sm text-gray-500">Loading credit notes...</div>
              ) : availableCreditNotes.length === 0 ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">No available credit notes for this customer.</div>
                  <Button variant="outline" onClick={() => navigate(ROUTES.creditNoteNew)} className="border-gray-300 w-full">Create Credit Note</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableCreditNotes.map((note) => {
                    const remaining = Number(note.balance?.remaining ?? note.remaining_amount ?? note.remaining ?? note.unapplied_amount ?? note.balance_remaining ?? note.total ?? 0);
                    const noteNo = note.credit_note_no || note.code || note.id;
                    const suggested = Math.min(remaining, Math.max(0, outstandingAmount));
                    const amount = noteAmounts[note.id] ?? suggested;
                    return (
                      <div key={note.id} className="rounded-lg border border-gray-200 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{noteNo}</div>
                            <div className="text-xs text-gray-500 mt-1">Remaining: {formatCurrency(remaining)}</div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.creditNoteDetail(note.id))} className="border-gray-300">Open</Button>
                        </div>
                        <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setNoteAmounts((prev) => ({ ...prev, [note.id]: e.target.value }))} />
                        <Button
                          onClick={() => applyCreditNote.mutate({ creditNoteId: note.id, amount: Number(amount) || 0 })}
                          disabled={applyCreditNote.isPending || !(Number(amount) > 0) || Number(amount) > remaining || Number(amount) > outstandingAmount}
                          className="bg-green-600 hover:bg-green-700 w-full"
                        >
                          Apply to Invoice
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Tax Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Tax Total</span><span className="font-medium text-gray-900">{formatCurrency(taxTotal)}</span></div>
                {lines.map((line, idx) => {
                  const taxBreakdown = line.tax_breakdown;
                  if (taxBreakdown?.components?.length && taxBreakdown.components[0]?.tax_amount > 0) {
                    return taxBreakdown.components.map((comp, compIdx) => <div key={`${idx}-${compIdx}`} className="flex justify-between pl-4 text-xs"><span className="text-gray-500">{comp.tax_code_meta?.code || comp.tax_type} ({comp.tax_rate}%)</span><span className="text-gray-600">{formatCurrency(comp.tax_amount)}</span></div>);
                  }
                  return null;
                })}
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2"><span className="font-semibold text-gray-900">Total</span><span className="font-semibold text-gray-900">{formatCurrency(total)}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">E-invoicing Status</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between"><span>Status:</span><span className="font-medium text-gray-900">{filingStatusQ.data?.status ?? filingStatusQ.data?.state ?? 'Not available'}</span></div>
                <div className="flex justify-between"><span>Scheme:</span><span className="font-medium text-gray-900">{einvoiceQ.data?.scheme ?? einvoiceQ.data?.documentType ?? '—'}</span></div>
              </div>
              {einvoiceQ.data && Object.keys(einvoiceQ.data).length > 0 && <div className="mt-4"><JsonPanel title="E-invoice payload" value={einvoiceQ.data} /></div>}
            </div>
          </div>
        </div>
      </div>

      <Modal open={!!action} onClose={() => setAction(null)} title={action === 'submit' ? 'Submit for Approval' : action === 'approve' ? 'Approve Invoice' : action === 'reject' ? 'Reject Invoice' : action === 'issue' ? 'Issue Invoice' : action === 'void' ? 'Void Invoice' : 'Action'}>
        <div className="space-y-4">
          {(action === 'approve' || action === 'reject') && <div><label className="block text-sm font-medium text-gray-700 mb-2">Comment {action === 'reject' ? '(recommended)' : '(optional)'}</label><Textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={`Add a ${action === 'reject' ? 'reason for rejection' : 'comment'}...`} /></div>}
          {action === 'void' && <div><label className="block text-sm font-medium text-gray-700 mb-2">Reason <span className="text-red-500">*</span></label><Textarea rows={4} value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Explain why this invoice is being voided..." /></div>}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-sm text-blue-800"><strong>Note:</strong> This action will be processed with a unique idempotency key to prevent duplicate submissions.</p></div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setAction(null)} className="border-gray-300">Cancel</Button>
          <Button onClick={() => run.mutate()} disabled={run.isPending || (action === 'void' && !voidReason.trim())} className={action === 'void' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}>{run.isPending ? 'Processing...' : 'Confirm'}</Button>
        </div>
      </Modal>
    </div>
  );
}
