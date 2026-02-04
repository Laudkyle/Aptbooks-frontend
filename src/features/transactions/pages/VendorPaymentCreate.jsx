import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, DollarSign, Building2, Save, Search, AlertCircle } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeVendorPaymentsApi } from '../api/vendorPayments.api.js';
import { makePartnersApi } from '../../business/api/partners.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { makePaymentConfigApi } from '../../business/api/paymentConfig.api.js';
import { makeBillsApi } from '../api/bills.api.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function VendorPaymentCreate() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeVendorPaymentsApi(http), [http]);
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const paymentConfigApi = useMemo(() => makePaymentConfigApi(http), [http]);
  const billsApi = useMemo(() => makeBillsApi(http), [http]);
  const toast = useToast();

  // Auto-generate idempotency key on mount
  const [idempotencyKey] = useState(() => generateUUID());
  
  const [formData, setFormData] = useState({
    vendor_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method_id: '',
    cash_account_id: '',
    amount_total: '',
    reference: '',
    memo: ''
  });

  const [allocations, setAllocations] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Fetch vendors
  const { data: vendorsData, isLoading: vendorsLoading } = useQuery({
    queryKey: ['partners', { type: 'vendor' }],
    queryFn: () => partnersApi.list({ type: 'vendor', limit: 500 }),
    staleTime: 60_000
  });

  // Fetch accounts (cash/bank accounts)
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['coa.accounts.list'],
    queryFn: () => coaApi.list({ limit: 500 }),
    staleTime: 60_000
  });

  // Fetch payment methods
  const { data: paymentMethodsData, isLoading: methodsLoading } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => paymentConfigApi.listPaymentMethods(),
    staleTime: 60_000
  });

  // Fetch outstanding bills for selected vendor
  const { data: billsData, isLoading: billsLoading } = useQuery({
    queryKey: ['bills', { vendor_id: formData.vendor_id, status: 'issued' }],
    queryFn: () => billsApi.list({ vendor_id: formData.vendor_id, status: 'issued', limit: 100 }),
    enabled: !!formData.vendor_id,
    staleTime: 30_000
  });

  const vendors = useMemo(() => {
    const data = vendorsData?.data || vendorsData || [];
    return Array.isArray(data) ? data : [];
  }, [vendorsData]);

  const accounts = useMemo(() => {
    const data = accountsData?.data || accountsData || [];
    return Array.isArray(data) ? data : [];
  }, [accountsData]);

  const paymentMethods = useMemo(() => {
    const data = paymentMethodsData?.data || paymentMethodsData || [];
    return Array.isArray(data) ? data : [];
  }, [paymentMethodsData]);

  const bills = useMemo(() => {
    const data = billsData?.data || billsData || [];
    return Array.isArray(data) ? data : [];
  }, [billsData]);

  const vendorOptions = [
    { value: '', label: 'Select vendor...' },
    ...vendors.map(v => ({
      value: v.id,
      label: `${v.code || ''} - ${v.name || 'Unnamed'}`.trim()
    }))
  ];

  const accountOptions = [
    { value: '', label: 'Select account...' },
    ...accounts.
      filter(acc => 
    acc.category_name?.toLowerCase().includes('cash') ||
    acc.category_name?.toLowerCase().includes('bank')
  ).map(a => ({
        value: a.id,
        label: `${a.code || ''} - ${a.name || ''}`.trim()
      }))
  ];

  const methodOptions = [
    { value: '', label: 'Select method...' },
    ...paymentMethods
      .filter(m => m.status === 'active')
      .map(m => ({
        value: m.id,
        label: `${m.name || ''} (${m.code || ''})`.trim()
      }))
  ];

  const billOptions = [
    { value: '', label: 'Select bill...' },
    ...bills.map(b => ({
      value: b.id,
      label: `${b.bill_number || b.id.slice(0, 8)} - $${(b.amount_due || 0).toFixed(2)} due`,
      bill: b
    }))
  ];

  const addAllocation = () => {
    setAllocations([...allocations, { bill_id: '', amount_applied: '' }]);
  };

  const removeAllocation = (index) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index, field, value) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill amount if bill is selected
    if (field === 'bill_id' && value) {
      const selectedBill = bills.find(b => b.id === value);
      if (selectedBill && !updated[index].amount_applied) {
        updated[index].amount_applied = String(selectedBill.amount_due || 0);
      }
    }
    
    setAllocations(updated);
  };

  // Update vendor details when vendor changes
  useEffect(() => {
    if (formData.vendor_id) {
      const vendor = vendors.find(v => v.id === formData.vendor_id);
      setSelectedVendor(vendor);
      // Clear allocations when vendor changes
      setAllocations([]);
    } else {
      setSelectedVendor(null);
    }
  }, [formData.vendor_id, vendors]);

  const create = useMutation({
    mutationFn: () => {
      const payload = {
        vendor_id: formData.vendor_id,
        payment_date: formData.payment_date,
        payment_method_id: formData.payment_method_id || null,
        cash_account_id: formData.cash_account_id,
        amount_total: parseFloat(formData.amount_total) || 0,
        reference: formData.reference || undefined,
        memo: formData.memo || undefined,
        allocations: allocations
          .filter(a => a.bill_id && a.amount_applied)
          .map(a => ({
            bill_id: a.bill_id,
            amount_applied: parseFloat(a.amount_applied) || 0
          }))
      };
      return api.create(payload, { idempotencyKey });
    },
    onSuccess: (res) => {
      toast.success('Vendor payment created successfully');
      const id = res?.id ?? res?.data?.id;
      if (id) navigate(ROUTES.vendorPaymentDetail(id));
      else navigate(ROUTES.vendorPayments);
    },
    onError: (e) => {
      const message = e?.response?.data?.error || e?.message || 'Failed to create vendor payment';
      toast.error(message);
    }
  });

  const totalAllocated = allocations.reduce((sum, a) => sum + (parseFloat(a.amount_applied) || 0), 0);
  const paymentAmount = parseFloat(formData.amount_total) || 0;
  const unallocated = paymentAmount - totalAllocated;

  const isValid = 
    formData.vendor_id &&
    formData.payment_date &&
    formData.cash_account_id &&
    paymentAmount > 0 &&
    unallocated >= 0;

  const isLoading = vendorsLoading || accountsLoading || methodsLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* QuickBooks Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">New Vendor Payment</h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  Record a payment to a vendor
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => create.mutate()}
                disabled={create.isPending || !isValid || isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {create.isPending ? 'Creating...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-sm text-gray-600">Loading payment form...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Payment Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Vendor & Payment Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Payment Information</h2>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vendor <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={formData.vendor_id}
                        onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                        options={vendorOptions}
                      />
                    </div>
                    <Input
                      label="Payment Date"
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                      required
                    />
                  </div>

                  {selectedVendor && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="text-xs text-blue-800">
                        <strong>Vendor:</strong> {selectedVendor.name}
                        {selectedVendor.code && ` (${selectedVendor.code})`}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cash/Bank Account <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={formData.cash_account_id}
                        onChange={(e) => setFormData({ ...formData, cash_account_id: e.target.value })}
                        options={accountOptions}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method
                      </label>
                      <Select
                        value={formData.payment_method_id}
                        onChange={(e) => setFormData({ ...formData, payment_method_id: e.target.value })}
                        options={methodOptions}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Payment Amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount_total}
                        onChange={(e) => setFormData({ ...formData, amount_total: e.target.value })}
                        required
                      />
                      {paymentAmount > 0 && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-md">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-blue-700">Total Payment:</span>
                            <span className="font-semibold text-blue-900">${paymentAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-blue-700">Allocated:</span>
                            <span className="font-semibold text-blue-900">${totalAllocated.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-blue-200">
                            <span className="text-blue-700">Unallocated:</span>
                            <span className={`font-semibold ${unallocated < 0 ? 'text-red-600' : 'text-blue-900'}`}>
                              ${unallocated.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <Input
                      label="Reference / Check #"
                      placeholder="Check number, etc."
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Memo
                    </label>
                    <textarea
                      value={formData.memo}
                      onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                      rows={3}
                      placeholder="Add notes about this payment..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Bill Allocations */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Apply to Bills</h2>
                  </div>
                  <button
                    onClick={addAllocation}
                    disabled={!formData.vendor_id || billsLoading}
                    className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-300 rounded-md hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Bill
                  </button>
                </div>

                <div className="p-6">
                  {!formData.vendor_id ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-600">
                        Select a vendor first to see outstanding bills
                      </p>
                    </div>
                  ) : billsLoading ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-600">Loading bills...</p>
                    </div>
                  ) : allocations.length === 0 ? (
                    <div className="text-center py-12">
                      <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Bills Applied</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {bills.length > 0 
                          ? `${bills.length} outstanding bill${bills.length !== 1 ? 's' : ''} available`
                          : 'No outstanding bills found for this vendor'}
                      </p>
                      {bills.length > 0 && (
                        <button
                          onClick={addAllocation}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Apply to Bill
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allocations.map((allocation, index) => {
                        const selectedBill = bills.find(b => b.id === allocation.bill_id);
                        return (
                          <div key={index} className="flex gap-3 items-start p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Bill
                                </label>
                                <Select
                                  value={allocation.bill_id}
                                  onChange={(e) => updateAllocation(index, 'bill_id', e.target.value)}
                                  options={billOptions}
                                />
                                {selectedBill && (
                                  <div className="mt-1 text-xs text-gray-500">
                                    Due: ${(selectedBill.amount_due || 0).toFixed(2)} • Date: {selectedBill.bill_date}
                                  </div>
                                )}
                              </div>
                              <Input
                                label="Amount Applied"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={allocation.amount_applied}
                                onChange={(e) => updateAllocation(index, 'amount_applied', e.target.value)}
                              />
                            </div>
                            <button
                              onClick={() => removeAllocation(index)}
                              className="mt-7 p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Remove allocation"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}

                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">Total Allocated:</span>
                          <span className="font-semibold text-gray-900">${totalAllocated.toFixed(2)}</span>
                        </div>
                        {unallocated !== 0 && (
                          <div className={`flex items-center justify-between text-sm mt-2 p-2 rounded ${
                            unallocated < 0 ? 'bg-red-50' : 'bg-yellow-50'
                          }`}>
                            <span className={`font-medium ${unallocated < 0 ? 'text-red-700' : 'text-yellow-700'}`}>
                              {unallocated < 0 ? 'Over-allocated:' : 'Unallocated:'}
                            </span>
                            <span className={`font-semibold ${unallocated < 0 ? 'text-red-900' : 'text-yellow-900'}`}>
                              ${Math.abs(unallocated).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Summary */}
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-900">Payment Summary</h3>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Payment Amount</span>
                    <span className="font-semibold text-gray-900">
                      ${paymentAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Bills Applied</span>
                    <span className="font-semibold text-gray-900">
                      {allocations.filter(a => a.bill_id).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-200">
                    <span className="text-gray-600">Total Allocated</span>
                    <span className="font-semibold text-gray-900">
                      ${totalAllocated.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm pb-3 border-b border-gray-200">
                    <span className="text-gray-600">Unallocated</span>
                    <span className={`font-semibold ${unallocated < 0 ? 'text-red-600' : unallocated > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                      ${unallocated.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <span>Idempotency Key:</span>
                      <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px]">
                        {idempotencyKey.slice(0, 8)}...
                      </code>
                    </div>
                  </div>

                  {unallocated < 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                        <p className="text-xs text-red-800">
                          Allocated amount exceeds payment amount. Please adjust.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Validation Status */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-900">Required Fields</h3>
                </div>
                <div className="p-6 space-y-2">
                  {[
                    { label: 'Vendor', valid: !!formData.vendor_id },
                    { label: 'Payment Date', valid: !!formData.payment_date },
                    { label: 'Cash Account', valid: !!formData.cash_account_id },
                    { label: 'Payment Amount > 0', valid: paymentAmount > 0 },
                    { label: 'No Over-allocation', valid: unallocated >= 0 }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                        item.valid ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {item.valid && '✓'}
                      </div>
                      <span className={item.valid ? 'text-gray-900' : 'text-gray-500'}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}