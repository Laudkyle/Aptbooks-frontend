import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, FilePlus2, Plus, Trash2, DollarSign, Calendar, User, FileText } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInvoicesApi } from '../api/invoices.api.js';
import { makePartnersApi } from '../../../features/business/api/partners.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { formatDate } from '../../../shared/utils/formatDate.js';
// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const { http } = useApi();
  const invoicesApi = useMemo(() => makeInvoicesApi(http), [http]);
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const toast = useToast();

  const [idempotencyKey] = useState(() => generateUUID());
  const [payload, setPayload] = useState({
    customerId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    memo: '',
    lines: [
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        revenueAccountId: ''
      }
    ]
  });

  // Load partners (customers)
  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: () => partnersApi.list()
  });

  // Load chart of accounts
  const coaQuery = useQuery({
    queryKey: ['coa'],
    queryFn: () => coaApi.list()
  });

  const partnersAccounts = Array.isArray(partnersQuery.data) ? partnersQuery.data : partnersQuery.data?.data ?? [];
  const accounts = Array.isArray(coaQuery.data) ? coaQuery.data : coaQuery.data?.data ?? [];
  // Filter revenue accounts only
  const revenueAccounts = accounts.filter(acc => 
    acc.account_type_code?.toLowerCase().includes('revenue') || 
    acc.accountType?.toLowerCase().includes('revenue') ||
    acc.category?.toLowerCase().includes('revenue')
  );

    const partners = partnersAccounts.filter(acc => 
    acc.type?.toLowerCase().includes('customer')  );

  const create = useMutation({
    mutationFn: () => invoicesApi.create(payload, { idempotencyKey }),
    onSuccess: (res) => {
      toast.success('Invoice created successfully');
      const id = res?.id ?? res?.data?.id;
      if (id) navigate(ROUTES.invoiceDetail(id));
      else navigate(ROUTES.invoices);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to create invoice')
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
          revenueAccountId: ''
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

  const selectedPartner = partners.find(p => p.id === payload.customerId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FilePlus2 className="h-7 w-7 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-900">Create New Invoice</h1>
              </div>
              <p className="text-sm text-gray-600">
                Fill in the details below to create a new invoice
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
                {create.isPending ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Sidebar - Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Invoice Summary</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Customer</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">
                      {selectedPartner ? (
                        <div>
                          <div>{selectedPartner.name || selectedPartner.businessName || 'Unknown'}</div>
                          {selectedPartner.email && (
                            <div className="text-xs text-gray-500 mt-0.5">{selectedPartner.email}</div>
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
                    <div className="text-xs text-gray-500">Invoice Date</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">
                      {formatDate(payload.invoiceDate) || <span className="text-gray-400">Not set</span>}
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
                      {partners.map((partner) => (
                        <option key={partner.id} value={partner.id}>
                          {partner.name || partner.businessName || partner.id}
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
                    Invoice Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={payload.invoiceDate}
                    onChange={(e) => updateField('invoiceDate', e.target.value)}
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
                  <p className="text-xs text-gray-500 mt-1">Must be on or after invoice date</p>
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
                          placeholder="Product or service description"
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
                          Revenue Account <span className="text-red-500">*</span>
                        </label>
                        {coaQuery.isLoading ? (
                          <div className="text-xs text-gray-500 py-2">Loading accounts...</div>
                        ) : (
                          <select
                            value={line.revenueAccountId}
                            onChange={(e) => updateLine(index, 'revenueAccountId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                          >
                            <option value="">Select revenue account</option>
                            {revenueAccounts.map((account) => (
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