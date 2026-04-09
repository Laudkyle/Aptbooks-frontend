import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, HandCoins, Plus, Trash2, DollarSign, Calendar, User, FileText } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeCustomerReceiptsApi } from '../api/customerReceipts.api.js';
import { makePartnersApi } from '../../../features/business/api/partners.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { makePaymentConfigApi } from '../../business/api/paymentConfig.api.js';
import { makeInvoicesApi } from '../api/invoices.api.js';
import { makeCreditNotesApi } from '../api/creditNotes.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { formatDocumentOptionLabel, getDocumentOutstanding, getDocumentSettlementBasis, getDocumentWithholding } from '../utils/documentDisplay.js';

export default function CustomerReceiptCreate() {
  const navigate = useNavigate();
  const { http } = useApi();
  const receiptsApi = useMemo(() => makeCustomerReceiptsApi(http), [http]);
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);
  const invoicesApi = useMemo(() => makeInvoicesApi(http), [http]);
  const creditNotesApi = useMemo(() => makeCreditNotesApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const paymentConfigApi = useMemo(() => makePaymentConfigApi(http), [http]);
  const toast = useToast();

  const [payload, setPayload] = useState({
    customerId: '',
    receiptDate: new Date().toISOString().split('T')[0],
    paymentMethodId: '',
    cashAccountId: '',
    amountTotal: 0,
    memo: '',
    allocations: []
  });

  // Load partners (customers only)
  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: () => partnersApi.list()
  });

  // Load invoices
  const invoicesQuery = useQuery({
    queryKey: ['invoices', payload.customerId],
    queryFn: () => invoicesApi.list({ customerId: payload.customerId, status: 'issued', limit: 200 }),
    enabled: !!payload.customerId
  });

  const creditNotesQuery = useQuery({
    queryKey: ['creditNotes', payload.customerId],
    queryFn: () => creditNotesApi.list({ customerId: payload.customerId, limit: 200 }),
    enabled: !!payload.customerId
  });

  // Load chart of accounts
  const coaQuery = useQuery({
    queryKey: ['coa'],
    queryFn: () => coaApi.list()
  });

  // Load payment methods
  const paymentMethodsQuery = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => paymentConfigApi.listPaymentMethods()
  });

  const partners = Array.isArray(partnersQuery.data) ? partnersQuery.data : partnersQuery.data?.data ?? [];
  const invoices = Array.isArray(invoicesQuery.data) ? invoicesQuery.data : invoicesQuery.data?.data ?? [];
  const accounts = Array.isArray(coaQuery.data) ? coaQuery.data : coaQuery.data?.data ?? [];
  const paymentMethods = Array.isArray(paymentMethodsQuery.data) ? paymentMethodsQuery.data : paymentMethodsQuery.data?.data ?? [];
  const creditNotes = Array.isArray(creditNotesQuery.data) ? creditNotesQuery.data : creditNotesQuery.data?.data ?? [];
  const availableCreditNotes = useMemo(() => creditNotes.filter((note) => {
    const noteCustomerId = note.customer_id || note.customerId;
    const status = (note.status || note.workflow_status || '').toLowerCase();
    const remainingRaw = note.balance?.remaining ?? note.remaining_amount ?? note.remaining ?? note.unapplied_amount ?? note.balance_remaining ?? note.total;
    const remaining = typeof remainingRaw === 'string' ? parseFloat(remainingRaw) : Number(remainingRaw || 0);
    return (!payload.customerId || noteCustomerId === payload.customerId) && remaining > 0 && !['voided', 'draft', 'rejected'].includes(status);
  }), [creditNotes, payload.customerId]);
  
  // Filter customers only
  const customers = partners.filter(p => p.type === 'customer');
  
  // Filter invoices for selected customer
  const customerInvoices = useMemo(() => {
  if (!payload.customerId) return invoices;
  
  return invoices.filter(inv => 
    (inv.customerId === payload.customerId || inv.customer_id === payload.customerId) 
    && inv.status === 'issued'
  );
}, [invoices, payload.customerId]);

  const cashAccounts = accounts.filter((account) =>
    String(account.category_name || account.categoryName || '').toLowerCase().includes('cash') ||
    String(account.category_name || account.categoryName || '').toLowerCase().includes('bank')
  );

  const create = useMutation({
    mutationFn: () => receiptsApi.create({
      ...payload,
      allocations: payload.allocations
        .filter((allocation) => allocation.invoiceId && Number(allocation.amountApplied) > 0)
        .map((allocation) => ({
          invoiceId: allocation.invoiceId,
          amountApplied: Number(allocation.amountApplied) || 0,
        })),
    }),
    onSuccess: (res) => {
      toast.success('Receipt created successfully');
      const id = res?.id ?? res?.data?.id;
      if (id) navigate(ROUTES.customerReceiptDetail(id));
      else navigate(ROUTES.customerReceipts);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to create receipt')
  });

  const addAllocation = () => {
    setPayload({
      ...payload,
      allocations: [
        ...payload.allocations,
        {
          invoiceId: '',
          amountApplied: 0
        }
      ]
    });
  };

  const removeAllocation = (index) => {
    setPayload({
      ...payload,
      allocations: payload.allocations.filter((_, i) => i !== index)
    });
  };

  const updateAllocation = (index, field, value) => {
    const newAllocations = [...payload.allocations];
    newAllocations[index] = { ...newAllocations[index], [field]: value };
    if (field === 'invoiceId' && value) {
      const selectedInvoice = customerInvoices.find((invoice) => invoice.id === value);
      const suggestedAmount = getDocumentOutstanding(selectedInvoice, 'invoice') ?? getDocumentSettlementBasis(selectedInvoice, 'invoice') ?? 0;
      if (selectedInvoice && !newAllocations[index].amountApplied) {
        newAllocations[index].amountApplied = suggestedAmount;
      }
    }
    setPayload({ ...payload, allocations: newAllocations });
  };

  const updateField = (field, value) => {
    setPayload({ ...payload, [field]: value });
  };

  const calculateAllocatedTotal = () => {
    return payload.allocations.reduce((sum, allocation) => {
      return sum + (parseFloat(allocation.amountApplied) || 0);
    }, 0);
  };

  const allocatedTotal = calculateAllocatedTotal();
  const unallocated = payload.amountTotal - allocatedTotal;

  const selectedCustomer = customers.find(c => c.id === payload.customerId);

  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <HandCoins className="h-7 w-7 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-900">Create New Customer Receipt</h1>
              </div>
              <p className="text-sm text-gray-600">
                Record a payment received from a customer
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                onClick={() => navigate(-1)}
                className="border-gray-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={() => create.mutate()}
                disabled={create.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {create.isPending ? 'Creating...' : 'Create Receipt'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Sidebar - Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Receipt Summary</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Customer</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">
                      {selectedCustomer ? (
                        <div>
                          <div>{selectedCustomer.name || selectedCustomer.businessName || 'Unknown'}</div>
                          {selectedCustomer.email && (
                            <div className="text-xs text-gray-500 mt-0.5">{selectedCustomer.email}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Not selected</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Receipt Date</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">
                      {payload.receiptDate || <span className="text-gray-400">Not set</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Allocations</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">
                      {payload.allocations.length}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Total Amount</span>
                    <span className="text-sm font-bold text-gray-900">
                      ${(payload.amountTotal || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Allocated</span>
                    <span className="text-sm font-semibold text-blue-700">
                      ${allocatedTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-semibold text-gray-700">Unallocated</span>
                    </div>
                    <span className={`text-sm font-bold ${unallocated < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${unallocated.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Workflow</h4>
              <p className="text-xs text-blue-800">
                After creation, you can auto-allocate, manually reallocate, then post the receipt to the ledger.
              </p>
            </div>
          </div>

          {/* Main Content - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-5">Receipt Information</h3>
              
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  {partnersQuery.isLoading ? (
                    <div className="text-sm text-gray-500">Loading customers...</div>
                  ) : (
                    <select
                      value={payload.customerId}
                      onChange={(e) => updateField('customerId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                    >
                      <option value="">Select a customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name || customer.businessName || customer.id}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={payload.receiptDate}
                    onChange={(e) => updateField('receiptDate', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cash Account <span className="text-red-500">*</span>
                  </label>
                  {coaQuery.isLoading ? (
                    <div className="text-sm text-gray-500">Loading accounts...</div>
                  ) : (
                    <select
                      value={payload.cashAccountId}
                      onChange={(e) => updateField('cashAccountId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                    >
                      <option value="">Select cash/bank account</option>
                      {cashAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code ? `${account.code} - ` : ''}{account.name || account.accountName || account.id}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">Account where payment was deposited</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  {paymentMethodsQuery.isLoading ? (
                    <div className="text-sm text-gray-500">Loading payment methods...</div>
                  ) : (
                    <select
                      value={payload.paymentMethodId}
                      onChange={(e) => updateField('paymentMethodId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                    >
                      <option value="">Select method (optional)</option>
                      {paymentMethods.map((method) => (
                        <option key={method.id} value={method.id}>
                          {method.name || method.type || method.id}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={payload.amountTotal}
                      onChange={(e) => updateField('amountTotal', parseFloat(e.target.value) || 0)}
                      className="pl-7"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Memo
                  </label>
                  <Input
                    value={payload.memo}
                    onChange={(e) => updateField('memo', e.target.value)}
                    placeholder="Optional note or reference"
                  />
                </div>
              </div>
            </div>


            {/* Credit Notes */}
            {payload.customerId && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Available Credit Notes</h3>
                    <p className="text-xs text-gray-500 mt-1">Credit notes are non-cash settlements. Open one to apply it to the relevant invoice before or after cash allocation.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(ROUTES.creditNoteNew)}
                      className="border-gray-300"
                    >
                      New Credit Note
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(ROUTES.creditNotes)}
                      className="border-gray-300"
                    >
                      View All
                    </Button>
                  </div>
                </div>

                {creditNotesQuery.isLoading ? (
                  <div className="text-sm text-gray-500">Loading credit notes...</div>
                ) : availableCreditNotes.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">No available credit notes for this customer.</div>
                ) : (
                  <div className="space-y-3">
                    {availableCreditNotes.map((note) => {
                      const remaining = Number(note.balance?.remaining ?? note.remaining_amount ?? note.remaining ?? note.unapplied_amount ?? note.balance_remaining ?? note.total ?? 0);
                      const noteNo = note.credit_note_no || note.code || note.id;
                      return (
                        <div key={note.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{noteNo}</div>
                            <div className="text-xs text-gray-500 mt-1">Remaining: ${remaining.toFixed(2)}</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(ROUTES.creditNoteDetail(note.id))}
                            className="border-green-600 text-green-700 hover:bg-green-50"
                          >
                            Open & Apply
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Allocations */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Invoice Allocations</h3>
                  <p className="text-xs text-gray-500 mt-1">Optional: Allocate this payment to specific invoices</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addAllocation}
                  className="border-green-600 text-green-700 hover:bg-green-50"
                  disabled={!payload.customerId}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Allocation
                </Button>
              </div>

              {!payload.customerId && payload.allocations.length === 0 && (
                <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 text-center">
                  <p className="text-sm text-amber-800">Select a customer first to add invoice allocations</p>
                </div>
              )}

              {payload.customerId && payload.allocations.length === 0 && (
                <div className=" rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-sm text-gray-600">No allocations yet. Click "Add Allocation" to assign this payment to invoices.</p>
                </div>
              )}

              {payload.allocations.length > 0 && (
                <div className="space-y-4">
                  {payload.allocations.map((allocation, index) => (
                    <div key={index} className=" rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-gray-700">Allocation #{index + 1}</span>
                        <button
                          onClick={() => removeAllocation(index)}
                          className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Invoice <span className="text-red-500">*</span>
                          </label>
                          {invoicesQuery.isLoading ? (
                            <div className="text-xs text-gray-500 py-2">Loading invoices...</div>
                          ) : (
                            <select
                              value={allocation.invoiceId}
                              onChange={(e) => updateAllocation(index, 'invoiceId', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                            >
                              <option value="">Select invoice</option>
                              {customerInvoices.map((invoice) => (
                                <option key={invoice.id} value={invoice.id}>
                                  {formatDocumentOptionLabel(invoice, 'invoice')}
                                </option>
                              ))}
                            </select>
                          )}
                          {allocation.invoiceId && (() => {
                            const selectedInvoice = customerInvoices.find((invoice) => invoice.id === allocation.invoiceId);
                            if (!selectedInvoice) return null;
                            const gross = Number(selectedInvoice.total ?? 0);
                            const withholding = getDocumentWithholding(selectedInvoice, 'invoice') ?? 0;
                            const settlementBasis = getDocumentSettlementBasis(selectedInvoice, 'invoice') ?? gross;
                            const open = getDocumentOutstanding(selectedInvoice, 'invoice') ?? settlementBasis;
                            return (
                              <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-700 space-y-1">
                                <div className="flex justify-between"><span>Gross invoice</span><span>${gross.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>Withholding</span><span>${withholding.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>Settlement basis</span><span>${settlementBasis.toFixed(2)}</span></div>
                                <div className="flex justify-between font-semibold border-t border-gray-200 pt-1"><span>Open balance</span><span>${open.toFixed(2)}</span></div>
                              </div>
                            );
                          })()}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Cash Received / Applied <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={allocation.amountApplied}
                              onChange={(e) => updateAllocation(index, 'amountApplied', parseFloat(e.target.value) || 0)}
                              className="pl-7"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}