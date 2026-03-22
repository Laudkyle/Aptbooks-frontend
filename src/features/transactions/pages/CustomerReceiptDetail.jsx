import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, HandCoins, Send, Trash2, Calendar, User, DollarSign } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeCustomerReceiptsApi } from '../api/customerReceipts.api.js';
import { formatDate } from '../../../shared/utils/formatDate.js';

import { Button } from '../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { TransactionWorkflowActionBar } from '../components/TransactionWorkflowActionBar.jsx';
import { normalizeTransactionWorkflow } from '../workflow/normalizeTransactionWorkflow.js';
import { resolveTransactionActions } from '../workflow/resolveTransactionActions.js';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function CustomerReceiptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeCustomerReceiptsApi(http), [http]);
  const toast = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: qk.customerReceipt(id),
    queryFn: () => api.get(id)
  });

  // Extract data from the nested structure
  const receipt = data?.customerReceipt || data?.data?.customerReceipt || data;
  const allocations = data?.allocations || data?.data?.allocations || [];
  
  const [action, setAction] = useState(null);
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');

  const run = useMutation({
    mutationFn: async () => {
      const idempotencyKey = generateUUID();
      if (action === 'submit') return api.submitForApproval(id, { idempotencyKey });
      if (action === 'approve') return api.approve(id, { comment }, { idempotencyKey });
      if (action === 'reject') return api.reject(id, { comment }, { idempotencyKey });
      if (action === 'post') return api.post(id, { idempotencyKey });
      if (action === 'void') return api.void(id, { reason }, { idempotencyKey });
      throw new Error('Unknown action');
    },
    onSuccess: () => {
      toast.success('Action completed successfully');
      qc.invalidateQueries({ queryKey: qk.customerReceipt(id) });
      setAction(null);
      setComment('');
      setReason('');
    },
    onError: (e) => toast.error(e?.message ?? 'Action failed')
  });

  const workflowState = normalizeTransactionWorkflow({ type: 'customerReceipt', entity: receipt, payload: data?.data ?? data });
  const status = workflowState.businessStatus;
  const availableActions = resolveTransactionActions({ type: 'customerReceipt', state: workflowState });
  const statusColors = {
    posted: 'bg-green-100 text-green-800 border-green-200',
    draft: 'bg-amber-100 text-amber-800 border-amber-200',
    voided: 'bg-red-100 text-red-800 border-red-200'
  };

  const calculateAllocatedTotal = () => {
    if (!allocations || !Array.isArray(allocations)) return 0;
    return allocations.reduce((sum, allocation) => {
      return sum + (parseFloat(allocation.amount_applied ?? allocation.amount ?? 0));
    }, 0);
  };

  const allocatedTotal = calculateAllocatedTotal();
  const unallocated = (parseFloat(receipt?.amount_total ?? 0)) - allocatedTotal;
  
  // Currency formatting
  const currency = receipt?.currency_code || 'USD';
  
  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  };

  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <HandCoins className="h-7 w-7 text-text-body" />
                <h1 className="text-2xl font-bold text-text-strong">
                  {receipt?.receipt_no ?? receipt?.code ?? (isLoading ? 'Loading...' : 'Receipt')}
                </h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusColors[status] || statusColors.draft}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-text-muted">
                Receipt ID: {id}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => navigate(-1)}
                className="border-border-subtle"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <TransactionWorkflowActionBar actions={availableActions} onAction={setAction} documentType="receipt" documentId={id} />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Receipt Summary */}
            <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle p-6">
              <h3 className="text-base font-semibold text-text-strong mb-5">Receipt Summary</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className=" rounded-lg border border-border-subtle p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-text-soft" />
                    <span className="text-xs font-medium text-text-muted">Customer</span>
                  </div>
                  <div className="text-sm font-semibold text-text-strong">
                    {receipt?.customer_name ?? receipt?.customer_id ?? '—'}
                  </div>
                  {receipt?.customer_email && (
                    <div className="text-xs text-text-muted mt-1">{receipt.customer_email}</div>
                  )}
                  {receipt?.customer_phone && (
                    <div className="text-xs text-text-muted mt-0.5">{receipt.customer_phone}</div>
                  )}
                </div>

                <div className=" rounded-lg border border-border-subtle p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-text-soft" />
                    <span className="text-xs font-medium text-text-muted">Receipt Date</span>
                  </div>
                  <div className="text-sm font-semibold text-text-strong">
                    {formatDate(receipt?.receipt_date) ?? '—'}
                  </div>
                </div>

                <div className=" rounded-lg border border-border-subtle p-4">
                  <div className="text-xs font-medium text-text-muted mb-2">Cash Account</div>
                  <div className="text-sm font-semibold text-text-strong font-mono text-xs">
                    {receipt?.cash_account_name ? `${receipt.cash_account_name.substring(0, 12)}...` : '—'}
                  </div>
                </div>

                <div className=" rounded-lg border border-border-subtle p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-text-soft" />
                    <span className="text-xs font-medium text-text-muted">Total Amount</span>
                  </div>
                  <div className="text-sm font-semibold text-text-strong">
                    {formatCurrency(receipt?.amount_total ?? 0)}
                  </div>
                </div>

                {receipt?.memo && (
                  <div className="md:col-span-2  rounded-lg border border-border-subtle p-4">
                    <div className="text-xs font-medium text-text-muted mb-2">Memo</div>
                    <div className="text-sm text-text-body">{receipt.memo}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Allocations */}
            <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle overflow-hidden">
              <div className="px-6 py-4  border-b border-border-subtle">
                <h3 className="text-base font-semibold text-text-strong">Invoice Allocations</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className=" border-b border-border-subtle">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-body uppercase tracking-wider">
                        Invoice ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-body uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-text-body uppercase tracking-wider">
                        Amount Applied
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface-1 divide-y divide-border-subtle">
                    {allocations.map((a, idx) => (
                      <tr key={idx} className="hover:">
                        <td className="px-6 py-4 text-sm text-text-strong font-mono text-xs">
                          {a.invoice_id ? `${a.invoice_id.substring(0, 12)}...` : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-strong">
                          {a.invoice_number ?? '—'}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-text-strong text-right">
                          {formatCurrency(a.amount_applied ?? a.amount ?? 0)}
                        </td>
                      </tr>
                    ))}
                    {!allocations.length ? (
                      <tr>
                        <td className="px-6 py-12 text-center text-sm text-text-muted" colSpan={3}>
                          No allocations yet
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                  {allocations.length > 0 && (
                    <tfoot className=" border-t-2 border-border-subtle">
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-right text-sm font-semibold text-text-strong">
                          Total Allocated:
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-text-strong">
                          {formatCurrency(allocatedTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h3 className="text-base font-semibold text-text-strong">Payment Summary</h3>
              </div>

              <div className="space-y-3 pt-4 border-t border-border-subtle">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Currency</span>
                  <span className="font-medium text-text-strong">{currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Total Amount</span>
                  <span className="font-bold text-text-strong">
                    {formatCurrency(receipt?.amount_total ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Allocated</span>
                  <span className="font-semibold text-blue-700">
                    {formatCurrency(allocatedTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-border-subtle">
                  <span className="text-text-muted font-semibold">Unallocated</span>
                  <span className={`font-bold ${unallocated < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(unallocated)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-3 border-t border-border-subtle">
                  <span className="text-text-muted">Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[status] || statusColors.draft}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Allocations</span>
                  <span className="font-medium text-text-strong">{allocations.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Payment Method</span>
                  <span className="font-medium text-text-strong">
                    {receipt?.payment_method_id ? `${receipt.payment_method_id.substring(0, 8)}...` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Modals */}
      <Modal 
        open={!!action} 
        onClose={() => setAction(null)} 
        title={
          action === 'submit' ? 'Submit for Approval' :
          action === 'approve' ? 'Approve Receipt' :
          action === 'reject' ? 'Reject Receipt' :
          action === 'post' ? 'Post Receipt' :
          action === 'void' ? 'Void Receipt' : 'Action'
        }
      >
        <div className="space-y-4">
          {(action === 'submit' || action === 'approve' || action === 'reject') && (
            <div>
              {action === 'submit' ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">This will send the receipt into the approval workflow.</p>
                </div>
              ) : (
                <>
                  <label className="block text-sm font-medium text-text-body mb-2">
                    Comment {action === 'reject' ? '(recommended)' : '(optional)'}
                  </label>
                  <Textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={action === 'reject' ? 'Explain why this receipt is being rejected...' : 'Add an approval comment...'}
                  />
                </>
              )}
            </div>
          )}

          {action === 'post' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Posting finalizes the receipt and books it to the general ledger. This action cannot be undone (but the receipt can be voided later if needed).
              </p>
              <p className="text-sm text-blue-800 mt-2">
                Allocated Amount: {formatCurrency(allocatedTotal)}<br/>
                Unallocated Amount: {formatCurrency(unallocated)}
              </p>
            </div>
          )}

          {action === 'void' && (
            <div>
              <label className="block text-sm font-medium text-text-body mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this receipt is being voided (minimum 2 characters)..."
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => { setAction(null); setComment(''); setReason(''); }}
            className="border-border-subtle"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => run.mutate()}
            disabled={run.isPending || (action === 'void' && reason.trim().length < 2)}
            className={action === 'void' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {run.isPending ? 'Processing...' : 'Confirm'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}