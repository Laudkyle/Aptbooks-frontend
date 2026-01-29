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
import { ROUTES } from '../../../app/constants/routes.js';

import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export default function CustomerReceiptCreate() {
  const navigate = useNavigate();
  const { http } = useApi();
  const receiptsApi = useMemo(() => makeCustomerReceiptsApi(http), [http]);
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);
  const invoicesApi = useMemo(() => makeInvoicesApi(http), [http]);
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
    queryKey: ['invoices'],
    queryFn: () => invoicesApi.list()
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
  
  // Filter customers only
  const customers = partners.filter(p => p.type === 'customer');
  
  // Filter invoices for selected customer
  const customerInvoices = payload.customerId 
    ? invoices.filter(inv => inv.customerId === payload.customerId || inv.customer_id === payload.customerId)
    : invoices;
  
  // Filter cash/bank accounts
  const cashAccounts = accounts.filter(acc => 
    acc.category_name?.toLowerCase().includes('cash') ||
    acc.category_name?.toLowerCase().includes('bank')
  );
console.log('Cash Accounts:', accounts);
  const create = useMutation({
    mutationFn: () => receiptsApi.create(payload),
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
          amount: 0
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
    setPayload({ ...payload, allocations: newAllocations });
  };

  const updateField = (field, value) => {
    setPayload({ ...payload, [field]: value });
  };

  const calculateAllocatedTotal = () => {
    return payload.allocations.reduce((sum, allocation) => {
      return sum + (parseFloat(allocation.amount) || 0);
    }, 0);
  };

  const allocatedTotal = calculateAllocatedTotal();
  const unallocated = payload.amountTotal - allocatedTotal;

  const selectedCustomer = customers.find(c => c.id === payload.customerId);

  return (
    <div className="min-h-screen bg-gray-50">
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
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-sm text-gray-600">No allocations yet. Click "Add Allocation" to assign this payment to invoices.</p>
                </div>
              )}

              {payload.allocations.length > 0 && (
                <div className="space-y-4">
                  {payload.allocations.map((allocation, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
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
                                  {invoice.invoiceNumber || invoice.code || invoice.id}
                                  {invoice.amountTotal || invoice.amount ? ` - $${Number(invoice.amountTotal || invoice.amount).toFixed(2)}` : ''}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Amount <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={allocation.amount}
                              onChange={(e) => updateAllocation(index, 'amount', parseFloat(e.target.value) || 0)}
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