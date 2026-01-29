import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, HandCoins, RefreshCcw, Save, Send, Trash2, Calendar, User, DollarSign } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeCustomerReceiptsApi } from '../api/customerReceipts.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

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

  const receipt = data?.data ?? data;

  const [action, setAction] = useState(null);
  const [rule, setRule] = useState('due_date');
  const [allocations, setAllocations] = useState([]);
  const [reason, setReason] = useState('');

  const run = useMutation({
    mutationFn: async () => {
      if (action === 'auto') return api.autoAllocate(id, { rule });
      if (action === 'reallocate') return api.reallocate(id, { allocations });
      if (action === 'post') return api.post(id);
      if (action === 'void') return api.void(id, { reason });
      throw new Error('Unknown action');
    },
    onSuccess: () => {
      toast.success('Action completed successfully');
      qc.invalidateQueries({ queryKey: qk.customerReceipt(id) });
      setAction(null);
      setReason('');
      setAllocations([]);
    },
    onError: (e) => toast.error(e?.message ?? 'Action failed')
  });

  const status = receipt?.status ?? 'draft';
  const statusColors = {
    posted: 'bg-green-100 text-green-800 border-green-200',
    draft: 'bg-amber-100 text-amber-800 border-amber-200',
    voided: 'bg-red-100 text-red-800 border-red-200'
  };

  const calculateAllocatedTotal = () => {
    if (!receipt?.allocations) return 0;
    return receipt.allocations.reduce((sum, allocation) => {
      return sum + (parseFloat(allocation.amountApplied ?? allocation.amount ?? 0));
    }, 0);
  };

  const allocatedTotal = calculateAllocatedTotal();
  const unallocated = (receipt?.amountTotal ?? 0) - allocatedTotal;

  const addAllocation = () => {
    setAllocations([...allocations, { invoiceId: '', amountApplied: 0 }]);
  };

  const removeAllocation = (index) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index, field, value) => {
    const newAllocations = [...allocations];
    newAllocations[index] = { ...newAllocations[index], [field]: value };
    setAllocations(newAllocations);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <HandCoins className="h-7 w-7 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-900">
                  {receipt?.receiptNumber ?? receipt?.code ?? (isLoading ? 'Loading...' : 'Receipt')}
                </h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusColors[status] || statusColors.draft}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Receipt ID: {id}
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

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Actions:</span>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setAction('auto')}
              className="border-blue-600 text-blue-700 hover:bg-blue-50"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Auto-Allocate
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                setAllocations(receipt?.allocations ?? []);
                setAction('reallocate');
              }}
              className="border-purple-600 text-purple-700 hover:bg-purple-50"
            >
              <Save className="h-4 w-4 mr-2" />
              Reallocate
            </Button>
            <Button 
              size="sm"
              onClick={() => setAction('post')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Post
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setAction('void')}
              className="border-red-600 text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Void
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Receipt Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-5">Receipt Summary</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">Customer</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {receipt?.customerName ?? receipt?.customerId ?? '—'}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">Receipt Date</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {receipt?.receiptDate ?? '—'}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div className="text-xs font-medium text-gray-500 mb-2">Cash Account</div>
                  <div className="text-sm font-semibold text-gray-900 font-mono text-xs">
                    {receipt?.cashAccountId ? `${receipt.cashAccountId.substring(0, 12)}...` : '—'}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">Total Amount</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    ${Number(receipt?.amountTotal ?? 0).toFixed(2)}
                  </div>
                </div>

                {receipt?.memo && (
                  <div className="md:col-span-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <div className="text-xs font-medium text-gray-500 mb-2">Memo</div>
                    <div className="text-sm text-gray-700">{receipt.memo}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Allocations */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">Invoice Allocations</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Invoice ID
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Amount Applied
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {(receipt?.allocations ?? []).map((a, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900 font-mono text-xs">
                          {a.invoiceId ? `${a.invoiceId.substring(0, 12)}...` : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                          ${Number(a.amountApplied ?? a.amount ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {!(receipt?.allocations ?? []).length ? (
                      <tr>
                        <td className="px-6 py-12 text-center text-sm text-gray-500" colSpan={2}>
                          No allocations yet
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                  {(receipt?.allocations ?? []).length > 0 && (
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                          Total Allocated:
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                          ${allocatedTotal.toFixed(2)}
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h3 className="text-base font-semibold text-gray-900">Payment Summary</h3>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-bold text-gray-900">
                    ${Number(receipt?.amountTotal ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Allocated</span>
                  <span className="font-semibold text-blue-700">
                    ${allocatedTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                  <span className="text-gray-600 font-semibold">Unallocated</span>
                  <span className={`font-bold ${unallocated < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${unallocated.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-3 border-t border-gray-200">
                  <span className="text-gray-600">Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[status] || statusColors.draft}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Allocations</span>
                  <span className="font-medium text-gray-900">{(receipt?.allocations ?? []).length}</span>
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
          action === 'auto' ? 'Auto-Allocate Payment' :
          action === 'reallocate' ? 'Reallocate Payment' :
          action === 'post' ? 'Post Receipt' :
          action === 'void' ? 'Void Receipt' : 'Action'
        }
      >
        <div className="space-y-4">
          {action === 'auto' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allocation Rule
                </label>
                <select
                  value={rule}
                  onChange={(e) => setRule(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                >
                  <option value="due_date">By Due Date (oldest first)</option>
                  <option value="fifo">FIFO (First In, First Out)</option>
                </select>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Auto-allocation will automatically apply this payment to open invoices based on the selected rule.
                </p>
              </div>
            </>
          )}

          {action === 'reallocate' && (
            <>
              <div className="space-y-3">
                {allocations.map((allocation, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">Allocation #{index + 1}</span>
                      <button
                        onClick={() => removeAllocation(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-3">
                      <Input
                        label="Invoice ID"
                        value={allocation.invoiceId ?? ''}
                        onChange={(e) => updateAllocation(index, 'invoiceId', e.target.value)}
                        placeholder="UUID"
                        className="font-mono text-xs"
                      />
                      <Input
                        label="Amount Applied"
                        type="number"
                        min="0"
                        step="0.01"
                        value={allocation.amountApplied ?? 0}
                        onChange={(e) => updateAllocation(index, 'amountApplied', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addAllocation}
                className="w-full border-green-600 text-green-700 hover:bg-green-50"
              >
                Add Allocation
              </Button>
            </>
          )}

          {action === 'post' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Posting finalizes the receipt and books it to the general ledger. This action cannot be undone (but the receipt can be voided later if needed).
              </p>
            </div>
          )}

          {action === 'void' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
            onClick={() => setAction(null)}
            className="border-gray-300"
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