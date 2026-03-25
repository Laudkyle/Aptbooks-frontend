import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, DollarSign, Calendar, User, FileText, FilePlus2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { AccountSelect } from '../../../shared/components/forms/AccountSelect.jsx';
import { CurrencySelect } from '../../../shared/components/forms/CurrencySelect.jsx';
import { AccountSelect } from '../../../shared/components/forms/AccountSelect.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { makeOpsDocsApi } from '../api/opsDocs.api.js';
import { makePartnersApi } from '../../business/api/partners.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';
import { makeUsersApi } from '../../foundation/users/api/users.api.js';
import { endpoints } from '../../../shared/api/endpoints.js';
import { getPhase1ModuleConfig } from './moduleConfigs.js';
import { makeEmptyForm, sanitizePayload, toCurrency } from './helpers.js';

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function OperationalDocCreate({ moduleKey }) {
  const config = getPhase1ModuleConfig(moduleKey);
  const navigate = useNavigate();
  const toast = useToast();
  const { http } = useApi();
  const api = useMemo(() => makeOpsDocsApi(http, config.endpoints), [http, config]);
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  const usersApi = useMemo(() => makeUsersApi(http), [http]);
  
  const [form, setForm] = useState(() => makeEmptyForm(config));

  // Fetch periods for date-based documents
  const periodsQuery = useQuery({
    queryKey: ['periods', 'open'],
    queryFn: () => periodsApi.list({ status: 'open' }),
    enabled: config.requirePeriod || config.key === 'journal' // Enable for documents that need periods
  });

  const partnersQuery = useQuery({
    queryKey: ['partners', config.partnerRole],
    queryFn: () => config.partnerRole ? partnersApi.list({ type: config.partnerRole }) : Promise.resolve([])
  });
  
  const accountsQuery = useQuery({
    queryKey: ['coa', 'phase1'],
    queryFn: () => coaApi.list({ includeArchived: false })
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'phase1'],
    queryFn: () => usersApi.list(),
    enabled: config.key === 'advances'
  });

  const sourceDocsQuery = useQuery({
    queryKey: ['transactions', 'source-docs', config.key, form.returnType, form.refundType],
    enabled: config.requireSourceDocument,
    queryFn: async () => {
      if (config.key === 'goodsReceipts') {
        const srcApi = makeOpsDocsApi(http, getPhase1ModuleConfig('purchaseOrders').endpoints);
        return srcApi.list({ limit: 200, offset: 0 });
      }
      if (config.key === 'returns') {
        const sourceKey = form.returnType === 'purchase_return' ? 'purchaseOrders' : 'salesOrders';
        const srcApi = makeOpsDocsApi(http, getPhase1ModuleConfig(sourceKey).endpoints);
        return srcApi.list({ limit: 200, offset: 0 });
      }
      if (config.key === 'refunds') {
        const sourceKey = form.refundType === 'vendor_refund' ? 'vendorPayments' : 'customerReceipts';
        const endpointsMap = form.refundType === 'vendor_refund' ? endpoints.modules.transactions.vendorPayments : endpoints.modules.transactions.customerReceipts;
        const srcApi = makeOpsDocsApi(http, endpointsMap);
        return srcApi.list({ limit: 200, offset: 0 });
      }
      return [];
    }
  });

  const accounts = Array.isArray(accountsQuery.data) ? accountsQuery.data : accountsQuery.data?.data ?? [];
  const partners = Array.isArray(partnersQuery.data) ? partnersQuery.data : partnersQuery.data?.data ?? [];
  const periods = Array.isArray(periodsQuery.data) ? periodsQuery.data : periodsQuery.data?.data ?? [];
  const users = Array.isArray(usersQuery.data) ? usersQuery.data : usersQuery.data?.data ?? [];
  const sourceDocs = Array.isArray(sourceDocsQuery.data) ? sourceDocsQuery.data : sourceDocsQuery.data?.data ?? [];
  
  // Filter partners by role if specified
  const filteredPartners = config.partnerRole 
    ? partners.filter(p => p.type === config.partnerRole)
    : partners;
  
  // Filter accounts based on lineMode
  const filteredAccounts = config.lineMode === 'expense' 
    ? accounts.filter(acc => acc.account_type_code?.toLowerCase().includes('expense'))
    : accounts;

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  
  const addLine = () => setForm((prev) => ({ 
    ...prev, 
    lines: [...(prev.lines || []), { 
      description: '', 
      quantity: 1, 
      unitPrice: 0, 
      lineTotal: 0, 
      accountId: '' 
    }] 
  }));
  
  const updateLine = (idx, key, value) => setForm((prev) => {
    const lines = [...(prev.lines || [])];
    lines[idx] = { ...lines[idx], [key]: value };
    if (key === 'quantity' || key === 'unitPrice') {
      const qty = Number(lines[idx].quantity || 0);
      const price = Number(lines[idx].unitPrice || 0);
      lines[idx].lineTotal = Number((qty * price).toFixed(2));
    }
    return { ...prev, lines };
  });
  
  const removeLine = (idx) => setForm((prev) => ({ 
    ...prev, 
    lines: (prev.lines || []).filter((_, i) => i !== idx) 
  }));

  const linesTotal = useMemo(() => 
    (form.lines || []).reduce((sum, line) => sum + Number(line.lineTotal || 0), 0), 
    [form.lines]
  );

  const create = useMutation({
    mutationFn: () => {
      // Generate fresh idempotency key for each mutation attempt
      const idempotencyKey = generateUUID();
      console.log('Using idempotency key:', idempotencyKey);
      return api.create(sanitizePayload(config, form), { idempotencyKey });
    },
    onSuccess: (created) => {
      toast.success(`${config.singular} created successfully.`);
      const id = created?.id ?? created?.data?.id;
      if (id) navigate(config.routeDetail(id));
      else navigate(config.routeList);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || `Failed to create ${config.singular.toLowerCase()}.`);
      console.error(`Create ${config.singular} error:`, err);
    }
  });

  const partnerOptions = filteredPartners.map((p) => ({ 
    value: p.id, 
    label: p.name || p.businessName || p.id 
  }));
  
  const accountOptions = filteredAccounts.map((a) => ({ 
    value: a.id, 
    label: a.code ? `${a.code} - ${a.name || a.accountName}` : (a.name || a.accountName || a.id)
  }));

  const periodOptions = periods.map((p) => ({ value: p.id, label: p.name || p.code || p.id }));
  const userOptions = users.map((u) => ({ value: u.id, label: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email || u.id }));
  const sourceDocumentOptions = sourceDocs.map((d) => ({ value: d.id, label: [d.code || d.reference, d.memo || d.description].filter(Boolean).join(' — ') || d.id }));

  const selectedPartner = filteredPartners.find(p => p.id === form.partnerId);
  const selectedPeriod = periods.find(p => p.id === form.periodId);

  const handleSubmit = () => {
    // Validate required fields
    if (config.partnerRole && !form.partnerId) {
      toast.error(`Please select a ${config.partnerRole}`);
      return;
    }
    
    // Validate period for documents that need it
    if ((config.requirePeriod || config.key === 'journal') && !form.periodId) {
      toast.error('Please select an accounting period');
      return;
    }
    
    if (!form.date) {
      toast.error('Please select a date');
      return;
    }
    
    if (config.requireDueDate && !form.dueDate) {
      toast.error('Please select a due date');
      return;
    }
    
    if (config.lineMode !== 'none') {
      if ((form.lines || []).some(line => !line.description?.trim())) {
        toast.error('Please fill in all line item descriptions');
        return;
      }
      
      if ((form.lines || []).some(line => !line.accountId)) {
        toast.error('Please select an account for all line items');
        return;
      }
    }
    
    // Submit with fresh idempotency key
    create.mutate();
  };

  const Icon = config.icon || FilePlus2;

  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Icon className="h-7 w-7 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-900">Create New {config.singular}</h1>
              </div>
              <p className="text-sm text-gray-600">
                Fill in the details below to create a new {config.singular.toLowerCase()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                onClick={() => navigate(config.routeList)}
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
                {create.isPending ? 'Creating...' : `Create ${config.singular}`}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Sidebar - Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{config.singular} Summary</h3>
              
              <div className="space-y-3">
                {/* Period selection in summary if needed */}
                {(config.requirePeriod || config.key === 'journal') && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">Accounting Period</div>
                      <div className="text-sm font-medium text-gray-900 mt-0.5">
                        {selectedPeriod ? (
                          <div>
                            <div>{selectedPeriod.name || selectedPeriod.code}</div>
                            {selectedPeriod.startDate && selectedPeriod.endDate && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {new Date(selectedPeriod.startDate).toLocaleDateString()} - {new Date(selectedPeriod.endDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Not selected</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {config.partnerRole && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 capitalize">{config.partnerRole}</div>
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
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Date</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">
                      {form.date || <span className="text-gray-400">Not set</span>}
                    </div>
                  </div>
                </div>

                {config.requireDueDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">Due Date</div>
                      <div className="text-sm font-medium text-gray-900 mt-0.5">
                        {form.dueDate || <span className="text-gray-400">Not set</span>}
                      </div>
                    </div>
                  </div>
                )}

                {config.lineMode !== 'none' && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">Line Items</div>
                      <div className="text-sm font-medium text-gray-900 mt-0.5">
                        {(form.lines || []).length}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-semibold text-gray-700">Total</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {toCurrency(linesTotal || form.amountTotal || 0, form.currencyCode || 'GHS')}
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
                {/* Period Selection - Added from JournalCreate */}
                {(config.requirePeriod || config.key === 'journal') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Accounting Period <span className="text-red-500">*</span>
                    </label>
                    {periodsQuery.isLoading ? (
                      <div className="text-sm text-gray-500">Loading periods...</div>
                    ) : (
                      <Select
                        value={form.periodId}
                        onChange={(e) => updateField('periodId', e.target.value)}
                        options={[
                          { value: '', label: 'Select accounting period...' },
                          ...periodOptions
                        ]}
                      />
                    )}
                    {periods.length === 0 && !periodsQuery.isLoading && (
                      <p className="text-xs text-amber-600 mt-1">No open periods available. Please open a period first.</p>
                    )}
                  </div>
                )}

                {config.partnerRole && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                      {config.partnerRole} <span className="text-red-500">*</span>
                    </label>
                    {partnersQuery.isLoading ? (
                      <div className="text-sm text-gray-500">Loading {config.partnerRole}s...</div>
                    ) : (
                      <Select
                        value={form.partnerId}
                        onChange={(e) => updateField('partnerId', e.target.value)}
                        options={[
                          { value: '', label: `Select a ${config.partnerRole}...` },
                          ...partnerOptions
                        ]}
                      />
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference
                  </label>
                  <Input
                    value={form.reference}
                    onChange={(e) => updateField('reference', e.target.value)}
                    placeholder="External reference (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => updateField('date', e.target.value)}
                  />
                </div>

                {config.requireDueDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date {config.requireDueDate && <span className="text-red-500">*</span>}
                    </label>
                    <Input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => updateField('dueDate', e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Must be on or after date</p>
                  </div>
                )}

                {config.key === 'advances' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee ID <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={form.employeeId}
                      onChange={(e) => updateField('employeeId', e.target.value)}
                      options={[{ value: '', label: 'Select employee...' }, ...userOptions]}
                    />
                  </div>
                )}

                {config.requireCashAccount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cash / Bank Account <span className="text-red-500">*</span>
                    </label>
                    {accountsQuery.isLoading ? (
                      <div className="text-sm text-gray-500">Loading accounts...</div>
                    ) : (
                      <Select
                        value={form.cashAccountId}
                        onChange={(e) => updateField('cashAccountId', e.target.value)}
                        options={[
                          { value: '', label: 'Select cash/bank account...' },
                          ...accountOptions
                        ]}
                      />
                    )}
                  </div>
                )}

                {config.requirePrimaryAccount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Account <span className="text-red-500">*</span>
                    </label>
                    {accountsQuery.isLoading ? (
                      <div className="text-sm text-gray-500">Loading accounts...</div>
                    ) : (
                      <Select
                        value={form.primaryAccountId}
                        onChange={(e) => updateField('primaryAccountId', e.target.value)}
                        options={[
                          { value: '', label: 'Select primary account...' },
                          ...accountOptions
                        ]}
                      />
                    )}
                  </div>
                )}

                {config.requireSourceDocument && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Source Document ID
                    </label>
                    <Select
                      value={form.sourceDocumentId}
                      onChange={(e) => updateField('sourceDocumentId', e.target.value)}
                      options={[{ value: '', label: 'Select source document...' }, ...sourceDocumentOptions]}
                    />
                  </div>
                )}

                <div>
                  <CurrencySelect
                    label="Currency"
                    value={form.currencyCode}
                    onChange={(e) => updateField('currencyCode', e.target.value)}
                    allowEmpty
                  />
                </div>

                {(config.extraFields || []).map((field) => (
                  field.type === 'select' ? (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                      </label>
                      <Select
                        value={form[field.key]}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        options={field.options || []}
                      />
                    </div>
                  ) : null
                ))}

                {config.requireAmountTotal && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount Total <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.amountTotal}
                      onChange={(e) => updateField('amountTotal', e.target.value)}
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Memo
                  </label>
                  <Textarea
                    rows={3}
                    value={form.memo}
                    onChange={(e) => updateField('memo', e.target.value)}
                    placeholder="Optional memo or note"
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            {config.lineMode !== 'none' && (
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
                  {(form.lines || []).map((line, index) => (
                    <div key={index} className=" rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-gray-700">Item #{index + 1}</span>
                        {(form.lines || []).length > 1 && (
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
                            placeholder="Item description"
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
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                              {form.currencyCode || '$'}
                            </span>
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
                            Account <span className="text-red-500">*</span>
                          </label>
                          {accountsQuery.isLoading ? (
                            <div className="text-xs text-gray-500 py-2">Loading accounts...</div>
                          ) : (
                            <AccountSelect
                              value={line.accountId}
                              onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                              allowEmpty
                            />
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-300 flex justify-between items-center">
                        <span className="text-xs text-gray-600">Line Total</span>
                        <span className="text-sm font-bold text-gray-900">
                          {toCurrency(line.quantity * line.unitPrice, form.currencyCode || 'GHS')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-gray-900">
                      {toCurrency(linesTotal, form.currencyCode || 'GHS')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}