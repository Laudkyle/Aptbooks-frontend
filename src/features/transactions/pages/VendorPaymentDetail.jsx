import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  HandCoins, 
  Send, 
  Trash2,
  Calendar,
  Building2,
  DollarSign,
  Wallet,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeVendorPaymentsApi } from '../api/vendorPayments.api.js';
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

export default function VendorPaymentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeVendorPaymentsApi(http), [http]);
  const toast = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: qk.vendorPayment(id),
    queryFn: () => api.get(id)
  });

  // Extract payment from nested structure
  const paymentData = data?.data ?? data;
  const payment = paymentData?.vendorPayment || paymentData;
  const allocations = paymentData?.allocations || payment?.allocations || [];

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
      qc.invalidateQueries({ queryKey: qk.vendorPayment(id) });
      setAction(null);
      setComment('');
      setReason('');
    },
    onError: (e) => toast.error(e?.message ?? 'Action failed')
  });

  const workflowState = normalizeTransactionWorkflow({ type: 'vendorPayment', entity: payment, payload: paymentData });
  const status = workflowState.businessStatus;
  const availableActions = resolveTransactionActions({ type: 'vendorPayment', state: workflowState });
  const statusColors = {
    posted: 'bg-green-100 text-green-800 border-green-200',
    draft: 'bg-amber-100 text-amber-800 border-amber-200',
    voided: 'bg-red-100 text-red-800 border-red-200'
  };

  const calculateAllocatedTotal = () => {
    if (!allocations || !Array.isArray(allocations)) return 0;
    return allocations.reduce((sum, allocation) => {
      return sum + (parseFloat(allocation.amount_applied ?? 0));
    }, 0);
  };

  const allocatedTotal = calculateAllocatedTotal();
  const paymentTotal = parseFloat(payment?.amount_total ?? 0);
  const unallocated = paymentTotal - allocatedTotal;
  
  // Currency formatting
  const currencyCode = payment?.currency_code || 'GHS';
  
  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  };

  // Format vendor address
  const formatVendorAddress = () => {
    if (!payment) return null;
    
    const addressParts = [
      payment.vendor_address_line1,
      payment.vendor_address_line2,
      payment.vendor_address_city,
      payment.vendor_address_region,
      payment.vendor_address_postal_code,
      payment.vendor_address_country
    ].filter(Boolean);
    
    return addressParts.join(', ');
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
                  {payment?.payment_no ?? (isLoading ? 'Loading...' : 'Payment')}
                </h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusColors[status] || statusColors.draft}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-text-muted">
                Payment ID: {id}
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
        <TransactionWorkflowActionBar actions={availableActions} onAction={setAction} documentType="payment_out" documentId={id} />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Summary */}
            <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle p-6">
              <h3 className="text-base font-semibold text-text-strong mb-5">Payment Summary</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className=" rounded-lg border border-border-subtle p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-text-soft" />
                    <span className="text-xs font-medium text-text-muted">Vendor</span>
                  </div>
                  <div className="text-sm font-semibold text-text-strong">
                    {payment?.vendor_name ?? '—'}
                    {payment?.vendor_code && (
                      <span className="text-xs text-text-muted ml-2">({payment.vendor_code})</span>
                    )}
                  </div>
                  {payment?.vendor_address_label && (
                    <div className="text-xs text-text-muted mt-1">{payment.vendor_address_label}</div>
                  )}
                </div>

                <div className=" rounded-lg border border-border-subtle p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-text-soft" />
                    <span className="text-xs font-medium text-text-muted">Payment Date</span>
                  </div>
                  <div className="text-sm font-semibold text-text-strong">
                    {formatDate(payment?.payment_date) ?? '—'}
                  </div>
                </div>

                <div className=" rounded-lg border border-border-subtle p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-4 w-4 text-text-soft" />
                    <span className="text-xs font-medium text-text-muted">Cash Account</span>
                  </div>
                  <div className="text-sm font-semibold text-text-strong font-mono ">
                    {payment?.cash_account_name ? `${payment.cash_account_name.substring(0, 12)}...` : '—'}
                  </div>
                </div>

                <div className=" rounded-lg border border-border-subtle p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-text-soft" />
                    <span className="text-xs font-medium text-text-muted">Total Amount</span>
                  </div>
                  <div className="text-sm font-semibold text-text-strong">
                    {formatCurrency(payment?.amount_total ?? 0)}
                  </div>
                </div>

                {/* Payment Method */}
                {payment?.payment_method_name && (
                  <div className=" rounded-lg border border-border-subtle p-4">
                    <div className="text-xs font-medium text-text-muted mb-2">Payment Method</div>
                    <div className="text-sm font-semibold text-text-strong font-mono text-xs">
                      {payment.payment_method_name}
                    </div>
                  </div>
                )}

                {/* Currency and FX Rate */}
                <div className=" rounded-lg border border-border-subtle p-4">
                  <div className="text-xs font-medium text-text-muted mb-2">Currency</div>
                  <div className="text-sm font-semibold text-text-strong">
                    {currencyCode}
                    {payment?.fx_rate && parseFloat(payment.fx_rate) !== 1 && (
                      <span className="text-xs text-text-muted ml-2">(FX: {parseFloat(payment.fx_rate).toFixed(6)})</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor Contact Information */}
            {(payment?.vendor_email || payment?.vendor_phone || payment?.vendor_address_line1) && (
              <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle p-6">
                <h3 className="text-base font-semibold text-text-strong mb-4">Vendor Contact Information</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {payment?.vendor_email && (
                    <div className=" rounded-lg border border-border-subtle p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-text-soft" />
                        <span className="text-xs font-medium text-text-muted">Email</span>
                      </div>
                      <div className="text-sm text-text-strong break-all">
                        {payment.vendor_email}
                      </div>
                    </div>
                  )}

                  {payment?.vendor_phone && (
                    <div className=" rounded-lg border border-border-subtle p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="h-4 w-4 text-text-soft" />
                        <span className="text-xs font-medium text-text-muted">Phone</span>
                      </div>
                      <div className="text-sm text-text-strong">
                        {payment.vendor_phone}
                      </div>
                    </div>
                  )}

                  {payment?.vendor_address_line1 && (
                    <div className="md:col-span-2  rounded-lg border border-border-subtle p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-text-soft" />
                        <span className="text-xs font-medium text-text-muted">Address</span>
                      </div>
                      <div className="text-sm text-text-strong space-y-1">
                        {payment.vendor_address_line1 && <div>{payment.vendor_address_line1}</div>}
                        {payment.vendor_address_line2 && <div>{payment.vendor_address_line2}</div>}
                        <div className="flex flex-wrap gap-2">
                          {payment.vendor_address_city && <span>{payment.vendor_address_city}</span>}
                          {payment.vendor_address_region && <span>{payment.vendor_address_region}</span>}
                          {payment.vendor_address_postal_code && <span>{payment.vendor_address_postal_code}</span>}
                          {payment.vendor_address_country && <span>{payment.vendor_address_country}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Allocations */}
            <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle overflow-hidden">
              <div className="px-6 py-4  border-b border-border-subtle">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-text-strong">Invoice Allocations</h3>
                  <span className="text-sm text-text-muted">
                    {allocations.length} allocation{allocations.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              {allocations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className=" border-b border-border-subtle">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-text-body uppercase tracking-wider">
                          Bill ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-text-body uppercase tracking-wider">
                          Bill Number
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-text-body uppercase tracking-wider">
                          Amount Applied
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-surface-1 divide-y divide-border-subtle">
                      {allocations.map((allocation, idx) => (
                        <tr key={idx} className="hover:bg-surface-2">
                          <td className="px-6 py-4 text-sm text-text-strong font-mono text-xs">
                            {allocation.bill_id ? `${allocation.bill_id.substring(0, 12)}...` : '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-text-strong">
                            {allocation.bill_number ?? '—'}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-text-strong text-right">
                            {formatCurrency(allocation.amount_applied ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
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
                  </table>
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <DollarSign className="h-12 w-12 text-text-soft mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-text-strong mb-2">No Allocations Yet</h4>
                  <p className="text-sm text-text-muted mb-4">
                    This payment hasn't been applied to any bills yet.
                  </p>
                  <p className="text-xs text-text-muted">Allocate this payment from the payables workspace after posting if needed.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Payment Summary */}
            <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h3 className="text-base font-semibold text-text-strong">Payment Summary</h3>
              </div>

              <div className="space-y-3 pt-4 border-t border-border-subtle">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Currency</span>
                  <span className="font-medium text-text-strong">{currencyCode}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Total Amount</span>
                  <span className="font-bold text-text-strong">
                    {formatCurrency(payment?.amount_total ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Discount Total</span>
                  <span className="font-semibold text-text-body">
                    {formatCurrency(payment?.discount_total ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Settlement Total</span>
                  <span className="font-semibold text-text-body">
                    {formatCurrency(payment?.settlement_total ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-border-subtle">
                  <span className="text-text-muted">Allocated</span>
                  <span className="font-semibold text-blue-700">
                    {formatCurrency(allocatedTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Unallocated</span>
                  <span className={`font-semibold ${unallocated < 0 ? 'text-red-600' : unallocated > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
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
              </div>
            </div>

            {/* Timeline / Audit Info */}
            <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle p-6">
              <h3 className="text-base font-semibold text-text-strong mb-4">Timeline</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium text-text-muted mb-1">Created</div>
                  <div className="text-sm text-text-strong">
                    {formatDate(payment?.created_at, { includeTime: true })}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs font-medium text-text-muted mb-1">Last Updated</div>
                  <div className="text-sm text-text-strong">
                    {formatDate(payment?.updated_at, { includeTime: true })}
                  </div>
                </div>
                
                {payment?.posted_at && (
                  <div>
                    <div className="text-xs font-medium text-text-muted mb-1">Posted</div>
                    <div className="text-sm text-text-strong">
                      {formatDate(payment.posted_at, { includeTime: true })}
                    </div>
                  </div>
                )}
                
                {payment?.voided_at && (
                  <div>
                    <div className="text-xs font-medium text-text-muted mb-1">Voided</div>
                    <div className="text-sm text-text-strong">
                      {formatDate(payment.voided_at, { includeTime: true })}
                    </div>
                    {payment.void_reason && (
                      <div className="text-sm text-text-body mt-1 italic">"{payment.void_reason}"</div>
                    )}
                  </div>
                )}
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
          action === 'approve' ? 'Approve Payment' :
          action === 'reject' ? 'Reject Payment' :
          action === 'post' ? 'Post Payment' :
          action === 'void' ? 'Void Payment' : 'Action'
        }
      >
        <div className="space-y-4">
          {(action === 'submit' || action === 'approve' || action === 'reject') && (
            <div>
              {action === 'submit' ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">This will send the payment into the approval workflow.</p>
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
                    placeholder={action === 'reject' ? 'Explain why this payment is being rejected...' : 'Add an approval comment...'}
                  />
                </>
              )}
            </div>
          )}

          {action === 'post' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Posting finalizes the payment and books it to the general ledger. This action cannot be undone (but the payment can be voided later if needed).
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-800">Payment Amount:</span>
                  <span className="font-semibold text-blue-900">{formatCurrency(paymentTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-800">Allocated Amount:</span>
                  <span className="font-semibold text-blue-900">{formatCurrency(allocatedTotal)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
                  <span className="text-blue-800 font-semibold">Unallocated Amount:</span>
                  <span className={`font-bold ${unallocated < 0 ? 'text-red-600' : 'text-blue-900'}`}>
                    {formatCurrency(unallocated)}
                  </span>
                </div>
              </div>
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
                placeholder="Explain why this payment is being voided (minimum 2 characters)..."
              />
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Voiding this payment will reverse all accounting entries. This action cannot be undone.
                </p>
              </div>
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