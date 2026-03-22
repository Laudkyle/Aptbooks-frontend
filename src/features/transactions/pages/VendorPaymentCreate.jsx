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
    vendorId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethodId: '',
    cashAccountId: '',
    amountTotal: '',
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
    queryKey: ['bills', { vendorId: formData.vendorId, status: 'issued' }],
    queryFn: () => billsApi.list({ vendorId: formData.vendorId, status: 'issued', limit: 100 }),
    enabled: !!formData.vendorId,
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
    setAllocations([...allocations, { billId: '', amountApplied: '' }]);
  };

  const removeAllocation = (index) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index, field, value) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill amount if bill is selected
    if (field === 'billId' && value) {
      const selectedBill = bills.find(b => b.id === value);
      if (selectedBill && !updated[index].amountApplied) {
        updated[index].amountApplied = String(selectedBill.amount_due || 0);
      }
    }
    
    setAllocations(updated);
  };

  // Update vendor details when vendor changes
  useEffect(() => {
    if (formData.vendorId) {
      const vendor = vendors.find(v => v.id === formData.vendorId);
      setSelectedVendor(vendor);
      // Clear allocations when vendor changes
      setAllocations([]);
    } else {
      setSelectedVendor(null);
    }
  }, [formData.vendorId, vendors]);

  const create = useMutation({
    mutationFn: () => {
      const idempotencyKey = generateUUID(); 
      const payload = {
        vendorId: formData.vendorId,
        paymentDate: formData.paymentDate,
        paymentMethodId: formData.paymentMethodId || null,
        cashAccountId: formData.cashAccountId,
        amountTotal: parseFloat(formData.amountTotal) || 0,
        reference: formData.reference || undefined,
        memo: formData.memo || undefined,
        allocations: allocations
          .filter(a => a.billId && a.amountApplied)
          .map(a => ({
            billId: a.billId,
            amountApplied: parseFloat(a.amountApplied) || 0
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

  const totalAllocated = allocations.reduce((sum, a) => sum + (parseFloat(a.amountApplied) || 0), 0);
  const paymentAmount = parseFloat(formData.amountTotal) || 0;
  const unallocated = paymentAmount - totalAllocated;

  const isValid = 
    formData.vendorId &&
    formData.paymentDate &&
    formData.cashAccountId &&
    paymentAmount > 0 &&
    unallocated >= 0;

  const isLoading = vendorsLoading || accountsLoading || methodsLoading;

  return (
    <div className="min-h-screen ">
      {/* QuickBooks Header */}
      <div className="bg-surface-1 border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate(-1)}
                variant="ghost"
                iconOnly
                aria-label="Go back"
                leftIcon={ArrowLeft}
              />
              <div>
                <h1 className="text-2xl font-semibold text-text-strong">New Vendor Payment</h1>
                <p className="text-sm text-text-muted mt-0.5">
                  Record a payment to a vendor
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={() => create.mutate()}
                disabled={create.isPending || !isValid || isLoading}
                className="bg-green-600 hover:bg-green-700 shadow-sm shadow-green-600/20 ring-1 ring-green-600/20"
                leftIcon={Save}
              >
                {create.isPending ? 'Creating...' : 'Save Payment'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle p-12 text-center">
            <div className="text-sm text-text-muted">Loading payment form...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Payment Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Vendor & Payment Info */}
              <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-border-subtle ">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-text-muted" />
                    <h2 className="text-lg font-semibold text-text-strong">Payment Information</h2>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-body mb-2">
                        Vendor <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={formData.vendorId}
                        onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                        options={vendorOptions}
                      />
                    </div>
                    <Input
                      label="Payment Date"
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
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
                      <label className="block text-sm font-medium text-text-body mb-2">
                        Cash/Bank Account <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={formData.cashAccountId}
                        onChange={(e) => setFormData({ ...formData, cashAccountId: e.target.value })}
                        options={accountOptions}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-body mb-2">
                        Payment Method
                      </label>
                      <Select
                        value={formData.paymentMethodId}
                        onChange={(e) => setFormData({ ...formData, paymentMethodId: e.target.value })}
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
                        value={formData.amountTotal}
                        onChange={(e) => setFormData({ ...formData, amountTotal: e.target.value })}
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
                    <label className="block text-sm font-medium text-text-body mb-2">
                      Memo
                    </label>
                    <textarea
                      value={formData.memo}
                      onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                      rows={3}
                      placeholder="Add notes about this payment..."
                      className="w-full px-3 py-2 border border-border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Bill Allocations */}
              <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-border-subtle  flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-text-muted" />
                    <h2 className="text-lg font-semibold text-text-strong">Apply to Bills</h2>
                  </div>
                  <Button
                    onClick={addAllocation}
                    disabled={!formData.vendorId || billsLoading}
                    variant="outline"
                    leftIcon={Plus}
                    className="border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                  >
                    Add Bill
                  </Button>
                </div>

                <div className="p-6">
                  {!formData.vendorId ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-text-soft mx-auto mb-3" />
                      <p className="text-sm text-text-muted">
                        Select a vendor first to see outstanding bills
                      </p>
                    </div>
                  ) : billsLoading ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-text-muted">Loading bills...</p>
                    </div>
                  ) : allocations.length === 0 ? (
                    <div className="text-center py-12">
                      <DollarSign className="h-16 w-16 text-text-soft mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-text-strong mb-2">No Bills Applied</h3>
                      <p className="text-sm text-text-muted mb-4">
                        {bills.length > 0 
                          ? `${bills.length} outstanding bill${bills.length !== 1 ? 's' : ''} available`
                          : 'No outstanding bills found for this vendor'}
                      </p>
                      {bills.length > 0 && (
                        <Button
                          onClick={addAllocation}
                          className="bg-green-600 hover:bg-green-700 shadow-sm shadow-green-600/20 ring-1 ring-green-600/20"
                          leftIcon={Plus}
                        >
                          Apply to Bill
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allocations.map((allocation, index) => {
                        const selectedBill = bills.find(b => b.id === allocation.billId);
                        return (
                          <div key={index} className="flex gap-3 items-start p-4 border border-border-subtle rounded-lg hover:border-border-subtle transition-colors">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-text-body mb-2">
                                  Bill
                                </label>
                                <Select
                                  value={allocation.billId}
                                  onChange={(e) => updateAllocation(index, 'billId', e.target.value)}
                                  options={billOptions}
                                />
                                {selectedBill && (
                                  <div className="mt-1 text-xs text-text-muted">
                                    Due: ${(selectedBill.amount_due || 0).toFixed(2)} • Date: {selectedBill.bill_date}
                                  </div>
                                )}
                              </div>
                              <Input
                                label="Amount Applied"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={allocation.amountApplied}
                                onChange={(e) => updateAllocation(index, 'amountApplied', e.target.value)}
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

                      <div className="pt-3 border-t border-border-subtle">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-text-body">Total Allocated:</span>
                          <span className="font-semibold text-text-strong">${totalAllocated.toFixed(2)}</span>
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
              <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-border-subtle ">
                  <h3 className="text-sm font-semibold text-text-strong">Payment Summary</h3>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Payment Amount</span>
                    <span className="font-semibold text-text-strong">
                      ${paymentAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Bills Applied</span>
                    <span className="font-semibold text-text-strong">
                      {allocations.filter(a => a.billId).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-3 border-t border-border-subtle">
                    <span className="text-text-muted">Total Allocated</span>
                    <span className="font-semibold text-text-strong">
                      ${totalAllocated.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm pb-3 border-b border-border-subtle">
                    <span className="text-text-muted">Unallocated</span>
                    <span className={`font-semibold ${unallocated < 0 ? 'text-red-600' : unallocated > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                      ${unallocated.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-xs text-text-muted">
                    <div className="flex items-center gap-1">
                      <span>Idempotency Key:</span>
                      <code className="bg-surface-2 px-1 py-0.5 rounded text-[10px]">
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
              <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-border-subtle ">
                  <h3 className="text-sm font-semibold text-text-strong">Required Fields</h3>
                </div>
                <div className="p-6 space-y-2">
                  {[
                    { label: 'Vendor', valid: !!formData.vendorId },
                    { label: 'Payment Date', valid: !!formData.paymentDate },
                    { label: 'Cash Account', valid: !!formData.cashAccountId },
                    { label: 'Payment Amount > 0', valid: paymentAmount > 0 },
                    { label: 'No Over-allocation', valid: unallocated >= 0 }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                        item.valid ? 'bg-green-100 text-green-600' : 'bg-surface-2 text-text-soft'
                      }`}>
                        {item.valid && '✓'}
                      </div>
                      <span className={item.valid ? 'text-text-strong' : 'text-text-muted'}>
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