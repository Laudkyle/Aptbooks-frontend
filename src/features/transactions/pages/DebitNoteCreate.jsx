import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileMinus2, Plus, Trash2, DollarSign, Calendar, User, FileText, Percent } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeDebitNotesApi } from '../api/debitNotes.api.js';
import { makePartnersApi } from '../../../features/business/api/partners.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { makeTaxApi } from '../../accounting/tax/api/tax.api.js';
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

export default function DebitNoteCreate() {
  const navigate = useNavigate();
  const { http } = useApi();
  const debitNotesApi = useMemo(() => makeDebitNotesApi(http), [http]);
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const taxApi = useMemo(() => makeTaxApi(http), [http]);
  const toast = useToast();

  const [payload, setPayload] = useState({
    vendorId: '',
    debitNoteDate: new Date().toISOString().split('T')[0],
    memo: '',
    lines: [
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        expenseAccountId: '',
        taxCodeId: '',
        taxAmount: 0
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

  // Load tax codes
  const taxCodesQuery = useQuery({
    queryKey: ['tax-codes'],
    queryFn: () => taxApi.listCodes(),
    staleTime: 60000 // 1 minute
  });

  const partners = Array.isArray(partnersQuery.data) ? partnersQuery.data : partnersQuery.data?.data ?? [];
  const accounts = Array.isArray(coaQuery.data) ? coaQuery.data : coaQuery.data?.data ?? [];
  const taxCodesData = taxCodesQuery.data?.data ?? taxCodesQuery.data;
  const taxCodes = Array.isArray(taxCodesData) ? taxCodesData : [];

  // Filter vendors only
  const vendors = partners.filter(p => p.type === 'vendor');
  
  // Filter expense accounts only
  const expenseAccounts = accounts.filter(acc => 
    acc.account_type_code?.toLowerCase().includes('expense') ||
    acc.category_name?.toLowerCase().includes('expense')
  );

  // Filter active tax codes
  const activeTaxCodes = taxCodes.filter(tax => tax.status === 'active' || tax.is_active);

  const create = useMutation({
    mutationFn: () => {
      // Generate fresh idempotency key for each mutation attempt
      const idempotencyKey = generateUUID();
      
      // Format payload for API - convert to snake_case
      const apiPayload = {
        vendorId: payload.vendorId,
        debitNoteDate: payload.debitNoteDate,
        memo: payload.memo || undefined,
        lines: payload.lines.map(line => ({
          description: line.description,
          quantity: parseFloat(line.quantity) || 1,
          unitPrice: parseFloat(line.unitPrice) || 0,
          expenseAccountId: line.expenseAccountId,
          taxCodeId: line.taxCodeId || undefined,
          taxAmount: parseFloat(line.taxAmount) || 0
        }))
      };
      
      return debitNotesApi.create(apiPayload, { idempotencyKey });
    },
    onSuccess: (res) => {
      toast.success('Debit note created successfully');
      const id = res?.id ?? res?.data?.id;
      if (id) navigate(ROUTES.debitNoteDetail(id));
      else navigate(ROUTES.debitNotes);
    },
    onError: (e) => {
      const message = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? 'Failed to create debit note';
      toast.error(message);
      console.error('Create debit note error:', e); // For debugging
    }
  });

  const addLine = useCallback(() => {
    setPayload(prev => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          expenseAccountId: '',
          taxCodeId: '',
          taxAmount: 0
        }
      ]
    }));
  }, []);

  const removeLine = useCallback((index) => {
    if (payload.lines.length === 1) {
      toast.error('At least one line item is required');
      return;
    }
    setPayload(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  }, [payload.lines.length]);

  const updateLine = useCallback((index, field, value) => {
    setPayload(prev => {
      const newLines = [...prev.lines];
      newLines[index] = { ...newLines[index], [field]: value };
      
      // Auto-calculate tax amount if tax code is selected and tax rate exists
      if (field === 'taxCodeId' && value) {
        const selectedTaxCode = activeTaxCodes.find(tax => tax.id === value);
        if (selectedTaxCode && selectedTaxCode.rate) {
          const quantity = parseFloat(newLines[index].quantity) || 1;
          const unitPrice = parseFloat(newLines[index].unitPrice) || 0;
          const subtotal = quantity * unitPrice;
          const taxRate = parseFloat(selectedTaxCode.rate) || 0;
          const taxAmount = subtotal * (taxRate / 100);
          newLines[index].taxAmount = taxAmount.toFixed(2);
        }
      }
      
      // Recalculate tax amount if quantity or unit price changes and tax code is selected
      if ((field === 'quantity' || field === 'unitPrice') && newLines[index].taxCodeId) {
        const selectedTaxCode = activeTaxCodes.find(tax => tax.id === newLines[index].taxCodeId);
        if (selectedTaxCode && selectedTaxCode.rate) {
          const quantity = parseFloat(newLines[index].quantity) || 1;
          const unitPrice = parseFloat(newLines[index].unitPrice) || 0;
          const subtotal = quantity * unitPrice;
          const taxRate = parseFloat(selectedTaxCode.rate) || 0;
          const taxAmount = subtotal * (taxRate / 100);
          newLines[index].taxAmount = taxAmount.toFixed(2);
        }
      }
      
      return { ...prev, lines: newLines };
    });
  }, [activeTaxCodes]);

  const updateField = useCallback((field, value) => {
    setPayload(prev => ({ ...prev, [field]: value }));
  }, []);

  const calculateTotal = useCallback(() => {
    return payload.lines.reduce((sum, line) => {
      const lineTotal = (line.quantity * line.unitPrice) + (parseFloat(line.taxAmount) || 0);
      return sum + lineTotal;
    }, 0);
  }, [payload.lines]);

  const calculateSubtotal = useCallback(() => {
    return payload.lines.reduce((sum, line) => {
      return sum + (line.quantity * line.unitPrice);
    }, 0);
  }, [payload.lines]);

  const calculateTotalTax = useCallback(() => {
    return payload.lines.reduce((sum, line) => {
      return sum + (parseFloat(line.taxAmount) || 0);
    }, 0);
  }, [payload.lines]);

  const total = calculateTotal();
  const subtotal = calculateSubtotal();
  const totalTax = calculateTotalTax();

  const selectedVendor = vendors.find(v => v.id === payload.vendorId);

  const handleSubmit = useCallback(() => {
    // Validate required fields
    if (!payload.vendorId) {
      toast.error('Please select a vendor');
      return;
    }
    
    if (!payload.debitNoteDate) {
      toast.error('Please select a debit note date');
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
    
    if (payload.lines.some(line => line.quantity <= 0)) {
      toast.error('Quantity must be greater than 0 for all line items');
      return;
    }
    
    if (payload.lines.some(line => line.unitPrice < 0)) {
      toast.error('Unit price cannot be negative');
      return;
    }
    
    // Submit with fresh idempotency key
    create.mutate();
  }, [payload, create]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileMinus2 className="h-7 w-7 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-900">Create New Debit Note</h1>
              </div>
              <p className="text-sm text-gray-600">
                Create a vendor credit for AP adjustments and bill applications
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                onClick={handleBack}
                disabled={create.isPending}
                className="border-gray-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={create.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {create.isPending ? 'Creating...' : 'Create Debit Note'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Sidebar - Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Debit Note Summary</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Vendor</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">
                      {selectedVendor ? (
                        <div>
                          <div>{selectedVendor.name || selectedVendor.business_name || 'Unknown'}</div>
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
                    <div className="text-xs text-gray-500">Debit Note Date</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">
                      {payload.debitNoteDate || <span className="text-gray-400">Not set</span>}
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

                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium text-gray-900">
                      ${totalTax.toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-700">Total Credit</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        ${total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Next Steps</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-xs">
                  <div className="mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100 text-blue-600 font-semibold">
                    1
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Create debit note</div>
                    <div className="text-gray-500 mt-0.5">Fill in the form and save as draft</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-xs">
                  <div className="mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100 text-gray-400 font-semibold">
                    2
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Issue the note</div>
                    <div className="text-gray-500 mt-0.5">Make it available for use</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-xs">
                  <div className="mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100 text-gray-400 font-semibold">
                    3
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Apply to bill</div>
                    <div className="text-gray-500 mt-0.5">Reduce vendor bill balance</div>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      required
                    >
                      <option value="">Select a vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name || vendor.business_name || vendor.id}
                          {vendor.code ? ` (${vendor.code})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Debit Note Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={payload.debitNoteDate}
                    onChange={(e) => updateField('debitNoteDate', e.target.value)}
                    required
                  />
                </div>

                <div className="md:col-span-2">
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

            {/* Line Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-gray-900">Line Items</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                  className="border-blue-600 text-blue-700 hover:bg-blue-50"
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
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={line.description}
                          onChange={(e) => updateLine(index, 'description', e.target.value)}
                          placeholder="Credit item description"
                          required
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Expense Account <span className="text-red-500">*</span>
                          </label>
                          {coaQuery.isLoading ? (
                            <div className="text-xs text-gray-500 py-2">Loading accounts...</div>
                          ) : (
                            <select
                              value={line.expenseAccountId}
                              onChange={(e) => updateLine(index, 'expenseAccountId', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                              required
                            >
                              <option value="">Select expense account</option>
                              {expenseAccounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.code ? `${account.code} - ` : ''}{account.name || account.account_name || account.id}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Tax Code (Optional)
                          </label>
                          {taxCodesQuery.isLoading ? (
                            <div className="text-xs text-gray-500 py-2">Loading tax codes...</div>
                          ) : (
                            <div className="relative">
                              <select
                                value={line.taxCodeId}
                                onChange={(e) => updateLine(index, 'taxCodeId', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm pr-10"
                              >
                                <option value="">No tax</option>
                                {activeTaxCodes.map((tax) => {
                                  const taxRate = parseFloat(tax.rate) || 0;
                                  const displayName = tax.name 
                                    ? `${tax.name} (${taxRate}%)`
                                    : tax.code 
                                      ? `${tax.code} (${taxRate}%)`
                                      : tax.id;
                                  return (
                                    <option key={tax.id} value={tax.id}>
                                      {displayName}
                                    </option>
                                  );
                                })}
                              </select>
                              {line.taxCodeId && (
                                <Percent className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Quantity <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 1)}
                            required
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
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Tax Amount
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.taxAmount}
                              onChange={(e) => updateLine(index, 'taxAmount', parseFloat(e.target.value) || 0)}
                              className="pl-7"
                              disabled={line.taxCodeId} // Auto-calculated when tax code is selected
                            />
                          </div>
                          {line.taxCodeId && (
                            <div className="text-xs text-gray-500 mt-1">
                              Auto-calculated based on tax code
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-300 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-600">Line Total</span>
                        {line.taxCodeId && (
                          <span className="text-xs text-gray-500 mt-0.5">
                            Includes tax: ${(parseFloat(line.taxAmount) || 0).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        ${((line.quantity * line.unitPrice) + (parseFloat(line.taxAmount) || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-end">
                  <div className="w-full md:w-80 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Tax</span>
                      <span className="font-medium text-gray-900">${totalTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
                      <span className="text-gray-900">Total Credit</span>
                      <span className="text-gray-900">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}