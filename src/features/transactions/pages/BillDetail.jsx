import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Calendar, User, DollarSign } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeBillsApi } from '../api/bills.api.js';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { TransactionWorkflowActionBar } from '../components/TransactionWorkflowActionBar.jsx';
import { normalizeTransactionWorkflow } from '../workflow/normalizeTransactionWorkflow.js';
import { resolveTransactionActions } from '../workflow/resolveTransactionActions.js';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { formatDate } from '../../../shared/utils/formatDate.js';
import { computeDocumentSummary } from '../../../shared/tax/frontendTax.js';
import { buildTaxDetailModel } from '../utils/taxDetail.js';

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeBillsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: qk.bill(id),
    queryFn: () => api.get(id)
  });

  const bill = data?.data ?? data;

  const einvoiceQ = useQuery({ queryKey: ['bill', id, 'einvoicePreview'], queryFn: () => api.getEinvoicePreview(id), enabled: !!id });
  const filingStatusQ = useQuery({ queryKey: ['bill', id, 'filingStatus'], queryFn: () => api.getFilingStatus(id), enabled: !!id });

  const [comment, setComment] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [action, setAction] = useState(null);

  const run = useMutation({
    mutationFn: async () => {
      // Generate a unique idempotency key for each action
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
      qc.invalidateQueries({ queryKey: qk.bill(id) });
      setAction(null);
      setComment('');
      setVoidReason('');
    },
    onError: (e) => toast.error(e?.message ?? 'Action failed')
  });

  const record = bill?.bill ?? bill;
  const workflowState = normalizeTransactionWorkflow({ type: 'bill', entity: record, payload: bill });
  const status = workflowState.businessStatus;
  const availableActions = resolveTransactionActions({ type: 'bill', state: workflowState });
  
  const statusColors = {
    paid: 'bg-green-100 text-green-800 border-green-200',
    issued: 'bg-blue-100 text-blue-800 border-blue-200',
    voided: 'bg-red-100 text-red-800 border-red-200',
    draft: 'bg-amber-100 text-amber-800 border-amber-200',
    pending: 'bg-purple-100 text-purple-800 border-purple-200'
  };

  const calculateTotal = () => {
    if (!bill?.lines) return 0;
    return bill.lines.reduce((sum, line) => {
      return sum + ((line.quantity ?? 1) * (line.unitPrice ?? line.unit_price ?? 0));
    }, 0);
  };

  const total = calculateTotal();
  const taxSnapshot = (bill?.taxSummary ?? bill?.tax_summary ?? computeDocumentSummary({ lines: bill?.lines ?? [], taxCodes: [], pricingMode: bill?.bill?.pricingMode ?? 'exclusive' }));
  const taxDetail = useMemo(() => buildTaxDetailModel({ header: record ?? {}, payload: bill, lines: bill?.lines ?? [], pricingMode: record?.pricingMode ?? record?.pricing_mode ?? 'exclusive' }), [record, bill]);
  const currency = bill?.bill?.currency_code || bill?.currency_code || 'USD';
  
  // Helper function to format currency amounts
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-7 w-7 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-900">
                  {bill?.bill?.billNumber ?? bill?.bill?.code ?? (isLoading ? 'Loading...' : 'Bill')}
                </h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusColors[status] || statusColors.draft}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Bill ID: {id}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => navigate(-1)}
                className="border-gray-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons - Using the shared component */}
        <TransactionWorkflowActionBar actions={availableActions} onAction={setAction} documentType="bill" documentId={id} />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bill Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-5">Bill Summary</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className=" rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">Vendor</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {bill?.bill?.vendor_name ?? bill?.bill?.vendor_id ?? '—'}
                  </div>
                </div>

                <div className=" rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">Dates</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatDate(bill?.bill?.billDate) || formatDate(bill?.bill?.bill_date)} → {formatDate(bill?.bill?.dueDate) || formatDate(bill?.bill?.due_date)}
                  </div>
                </div>

                {bill?.bill?.memo && (
                  <div className="md:col-span-2  rounded-lg border border-gray-200 p-4">
                    <div className="text-xs font-medium text-gray-500 mb-2">Memo</div>
                    <div className="text-sm text-gray-700">{bill.bill.memo}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4  border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">Line Items</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className=" border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Expense Account
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Tax
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Tax Amount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {taxDetail.lines.map((l, idx) => {
                      return (
                        <tr key={idx} className="hover:">
                          <td className="px-6 py-4 text-sm text-gray-900">{l.description}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{l.quantity ?? 1}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {formatCurrency(l.unitPrice ?? l.unit_price ?? 0)}
                          </td>
                          <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                            {(l.expenseAccountId ?? l.expense_account_id) ? `${(l.expenseAccountId ?? l.expense_account_id).substring(0, 8)}...` : '—'}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-700">
                            {l._tax.taxCode ? `${l._tax.taxCode}${l._tax.taxRate ? ` (${l._tax.taxRate}%)` : ''}` : (l._tax.taxRate ? `${l._tax.taxRate}%` : '—')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">
                            {formatCurrency(l._tax.taxAmount ?? 0)}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                            {formatCurrency(l._tax.total ?? 0)}
                          </td>
                        </tr>
                      );
                    })}
                    {!taxDetail.lines.length ? (
                      <tr>
                        <td className="px-6 py-12 text-center text-sm text-gray-500" colSpan={7}>
                          No line items
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                  {taxDetail.lines.length > 0 && (
                    <tfoot className=" border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                          Total:
                        </td>
                        <td className="px-6 py-4 text-right text-lg font-bold text-gray-900">
                          {formatCurrency(taxSnapshot?.grandTotal ?? taxSnapshot?.grand_total ?? total)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h3 className="text-base font-semibold text-gray-900">Bill Total</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-6">{formatCurrency(taxSnapshot?.grandTotal ?? taxSnapshot?.grand_total ?? total)}</div>
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm"><span className="text-gray-600">Status</span><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[status] || statusColors.draft}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Currency</span><span className="font-medium text-gray-900">{currency}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Line Items</span><span className="font-medium text-gray-900">{(bill?.lines ?? []).length}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Tax summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-medium text-gray-900">{Number(taxSnapshot?.subtotal ?? total ?? 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Tax</span><span className="font-medium text-gray-900">{Number(taxSnapshot?.taxTotal ?? taxSnapshot?.tax_total ?? 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Withholding</span><span className="font-medium text-gray-900">{Number(taxSnapshot?.withholdingTotal ?? taxSnapshot?.withholding_total ?? 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Non-recoverable tax</span><span className="font-medium text-gray-900">{Number(taxSnapshot?.nonRecoverableTaxTotal ?? taxSnapshot?.non_recoverable_tax_total ?? 0).toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-2"><span className="font-semibold text-gray-900">Gross total</span><span className="font-semibold text-gray-900">{Number(taxSnapshot?.grandTotal ?? taxSnapshot?.grand_total ?? total ?? 0).toFixed(2)}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">E-invoicing status</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div>Status: <span className="font-medium text-gray-900">{filingStatusQ.data?.status ?? filingStatusQ.data?.state ?? 'Not available'}</span></div>
                <div>Scheme: <span className="font-medium text-gray-900">{einvoiceQ.data?.scheme ?? einvoiceQ.data?.documentType ?? '—'}</span></div>
              </div>
              <div className="mt-4"><JsonPanel title="E-invoice payload" value={einvoiceQ.data ?? {}} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Modals */}
      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={
          action === 'submit'
            ? 'Submit for Approval'
            : action === 'approve'
              ? 'Approve Bill'
              : action === 'reject'
                ? 'Reject Bill'
                : action === 'issue'
                  ? 'Issue Bill'
                  : action === 'void'
                    ? 'Void Bill'
                    : 'Action'
        }
      >
        <div className="space-y-4">
          {action === 'approve' || action === 'reject' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment {action === 'reject' ? '(recommended)' : '(optional)'}
              </label>
              <Textarea 
                rows={4} 
                value={comment} 
                onChange={(e) => setComment(e.target.value)}
                placeholder={`Add a ${action === 'reject' ? 'reason for rejection' : 'comment'}...`}
              />
            </div>
          ) : null}
          
          {action === 'void' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <Textarea 
                rows={4} 
                value={voidReason} 
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Explain why this bill is being voided..."
              />
            </div>
          ) : null}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This action will be processed with a unique idempotency key to prevent duplicate submissions.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => setAction(null)}
            className="border-gray-300"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => run.mutate()}
            disabled={run.isPending || (action === 'void' && !voidReason.trim())}
            className={action === 'void' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {run.isPending ? 'Processing...' : 'Confirm'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}