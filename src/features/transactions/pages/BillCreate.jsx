import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, FilePlus2, Plus, Trash2, DollarSign, Calendar, User, FileText } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeBillsApi } from '../api/bills.api.js';
import { makePartnersApi } from '../../../features/business/api/partners.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function BillCreate() {
  const navigate = useNavigate();
  const { http } = useApi();
  const billsApi = useMemo(() => makeBillsApi(http), [http]);
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const toast = useToast();

  const [payload, setPayload] = useState({
    vendorId: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    memo: '',
    lines: [
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        expenseAccountId: ''
      }
    ]
  });

  // Load partners (vendors only)
  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: () => partnersApi.list()
  });

  // Load chart of accounts
  const coaQuery = useQuery({
    queryKey: ['coa'],
    queryFn: () => coaApi.list()
  });

  const partners = Array.isArray(partnersQuery.data) ? partnersQuery.data : partnersQuery.data?.data ?? [];
  const accounts = Array.isArray(coaQuery.data) ? coaQuery.data : coaQuery.data?.data ?? [];
  
  // Filter vendors only
  const vendors = partners.filter(p => p.type === 'vendor');
  
  // Filter expense accounts only
  const expenseAccounts = accounts.filter(acc => 
    acc.account_type_code?.toLowerCase().includes('expense')
  );

  const create = useMutation({
    mutationFn: () => {
      // Generate fresh idempotency key for each mutation attempt
      const idempotencyKey = generateUUID();
      console.log('Using idempotency key:', idempotencyKey); // For debugging
      return billsApi.create(payload, { idempotencyKey });
    },
    onSuccess: (res) => {
      toast.success('Bill created successfully');
      const id = res?.id ?? res?.data?.id;
      if (id) navigate(ROUTES.billDetail(id));
      else navigate(ROUTES.bills);
    },
    onError: (e) => {
      toast.error(e?.message ?? 'Failed to create bill');
      console.error('Create bill error:', e); // For debugging
    }
  });

  const addLine = () => {
    setPayload({
      ...payload,
      lines: [
        ...payload.lines,
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          expenseAccountId: ''
        }
      ]
    });
  };

  const removeLine = (index) => {
    setPayload({
      ...payload,
      lines: payload.lines.filter((_, i) => i !== index)
    });
  };

  const updateLine = (index, field, value) => {
    const newLines = [...payload.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setPayload({ ...payload, lines: newLines });
  };

  const updateField = (field, value) => {
    setPayload({ ...payload, [field]: value });
  };

  const calculateTotal = () => {
    return payload.lines.reduce((sum, line) => {
      return sum + (line.quantity * line.unitPrice);
    }, 0);
  };

  const total = calculateTotal();

  const selectedVendor = vendors.find(v => v.id === payload.vendorId);

  const handleSubmit = () => {
    // Validate required fields
    if (!payload.vendorId) {
      toast.error('Please select a vendor');
      return;
    }
    
    if (!payload.billDate) {
      toast.error('Please select a bill date');
      return;
    }
    
    if (!payload.dueDate) {
      toast.error('Please select a due date');
      return;
    }
    
    if (payload.lines.some(line => !line.description.trim())) {
      toast.error('Please fill in all line item descriptions');
      return;
    }
    
    if (payload.lines.some(line => !line.expenseAccountId)) {
      toast.error('Please select an expense account for all line items');
      return;
    }
    
    // Submit with fresh idempotency key
    create.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FilePlus2 className="h-7 w-7 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-900">Create New Bill</h1>
              </div>
              <p className="text-sm text-gray-600">
                Fill in the details below to create a new vendor bill
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
                onClick={handleSubmit}
                disabled={create.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {create.isPending ? 'Creating...' : 'Create Bill'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Sidebar - Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Bill Summary</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Vendor</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">
                      {selectedVendor ? (
                        <div>
                          <div>{selectedVendor.name || selectedVendor.businessName || 'Unknown'}</div>
                          {selectedVendor.email && (
                            <div className="text-xs text-gray-500 mt-0.5">{selectedVendor.email}</div>
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
                    <div className="text-xs text-gray-500">Bill Date</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">
                      {payload.billDate || <span className="text-gray-400">Not set</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Due Date</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">
                      {payload.dueDate || <span className="text-gray-400">Not set</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Line Items</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">
                      {payload.lines.length}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-semibold text-gray-700">Total</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-5">Basic Information</h3>
              
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor <span className="text-red-500">*</span>
                  </label>
                  {partnersQuery.isLoading ? (
                    <div className="text-sm text-gray-500">Loading vendors...</div>
                  ) : (
                    <select
                      value={payload.vendorId}
                      onChange={(e) => updateField('vendorId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                    >
                      <option value="">Select a vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name || vendor.businessName || vendor.id}
                        </option>
                      ))}
                    </select>
                  )}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bill Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={payload.billDate}
                    onChange={(e) => updateField('billDate', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={payload.dueDate}
                    onChange={(e) => updateField('dueDate', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be on or after bill date</p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-gray-900">Line Items</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                  className="border-green-600 text-green-700 hover:bg-green-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line
                </Button>
              </div>

              <div className="space-y-4">
                {payload.lines.map((line, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-gray-700">Item #{index + 1}</span>
                      {payload.lines.length > 1 && (
                        <button
                          onClick={() => removeLine(index)}
                          className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={line.description}
                          onChange={(e) => updateLine(index, 'description', e.target.value)}
                          placeholder="Expense description"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Quantity <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={line.quantity}
                          onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 1)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Unit Price <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="pl-7"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Expense Account <span className="text-red-500">*</span>
                        </label>
                        {coaQuery.isLoading ? (
                          <div className="text-xs text-gray-500 py-2">Loading accounts...</div>
                        ) : (
                          <select
                            value={line.expenseAccountId}
                            onChange={(e) => updateLine(index, 'expenseAccountId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                          >
                            <option value="">Select expense account</option>
                            {expenseAccounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.code ? `${account.code} - ` : ''}{account.name || account.accountName || account.id}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-300 flex justify-between items-center">
                      <span className="text-xs text-gray-600">Line Total</span>
                      <span className="text-sm font-bold text-gray-900">
                        ${(line.quantity * line.unitPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}