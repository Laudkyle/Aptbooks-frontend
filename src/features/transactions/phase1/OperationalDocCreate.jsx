import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { makeOpsDocsApi } from '../api/opsDocs.api.js';
import { makePartnersApi } from '../../business/api/partners.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { getPhase1ModuleConfig } from './moduleConfigs.js';
import { makeEmptyForm, sanitizePayload, toCurrency } from './helpers.js';

export default function OperationalDocCreate({ moduleKey }) {
  const config = getPhase1ModuleConfig(moduleKey);
  const navigate = useNavigate();
  const toast = useToast();
  const { http } = useApi();
  const api = useMemo(() => makeOpsDocsApi(http, config.endpoints), [http, config]);
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const [form, setForm] = useState(() => makeEmptyForm(config));

  const partnersQuery = useQuery({
    queryKey: ['partners', config.partnerRole],
    queryFn: () => config.partnerRole ? partnersApi.list({ type: config.partnerRole }) : Promise.resolve([])
  });
  const accountsQuery = useQuery({
    queryKey: ['coa', 'phase1'],
    queryFn: () => coaApi.list({ includeArchived: false })
  });

  const accounts = Array.isArray(accountsQuery.data) ? accountsQuery.data : accountsQuery.data?.data ?? [];
  const partners = Array.isArray(partnersQuery.data) ? partnersQuery.data : partnersQuery.data?.data ?? [];

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const addLine = () => setForm((prev) => ({ ...prev, lines: [...(prev.lines || []), { description: '', quantity: 1, unitPrice: 0, lineTotal: 0, accountId: '' }] }));
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
  const removeLine = (idx) => setForm((prev) => ({ ...prev, lines: (prev.lines || []).filter((_, i) => i !== idx) }));

  const linesTotal = useMemo(() => (form.lines || []).reduce((sum, line) => sum + Number(line.lineTotal || 0), 0), [form.lines]);

  const create = useMutation({
    mutationFn: (body) => api.create(body),
    onSuccess: (created) => {
      toast.success(`${config.singular} created successfully.`);
      navigate(config.routeDetail(created.id));
    },
    onError: (err) => toast.error(err?.response?.data?.message || `Failed to create ${config.singular.toLowerCase()}.`)
  });

  const partnerOptions = [{ value: '', label: config.partnerRole ? `Select ${config.partnerRole}` : 'Not required' }, ...partners.map((p) => ({ value: p.id, label: p.name }))];
  const accountOptions = [{ value: '', label: 'Select account' }, ...accounts.map((a) => ({ value: a.id, label: `${a.code ?? ''} ${a.name}`.trim() }))];

  const submit = (e) => {
    e.preventDefault();
    create.mutate(sanitizePayload(config, form));
  };

  const Icon = config.icon;
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <button onClick={() => navigate(config.routeList)} className="mb-3 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to {config.title}
            </button>
            <div className="flex items-center gap-3">
              <Icon className="h-7 w-7 text-gray-700" />
              <h1 className="text-2xl font-bold text-gray-900">New {config.singular}</h1>
            </div>
          </div>
          <Button onClick={submit} loading={create.isPending}>Create {config.singular}</Button>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 grid gap-4 md:grid-cols-2">
            <Input label="Date" type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} required />
            {config.requireDueDate || !config.requireDueDate ? <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => updateField('dueDate', e.target.value)} required={!!config.requireDueDate} /> : null}
            {config.partnerRole ? <Select label={config.partnerRole === 'customer' ? 'Customer' : 'Vendor'} value={form.partnerId} onChange={(e) => updateField('partnerId', e.target.value)} options={partnerOptions} /> : null}
            {config.key === 'advances' ? (
              <Input label="Employee ID" value={form.employeeId} onChange={(e) => updateField('employeeId', e.target.value)} placeholder="Required for staff advances" />
            ) : null}
            {config.requireCashAccount ? <Select label="Cash / Bank Account" value={form.cashAccountId} onChange={(e) => updateField('cashAccountId', e.target.value)} options={accountOptions} /> : null}
            {config.requirePrimaryAccount ? <Select label="Primary Account" value={form.primaryAccountId} onChange={(e) => updateField('primaryAccountId', e.target.value)} options={accountOptions} /> : null}
            {config.requireSourceDocument ? <Input label="Source Document ID" value={form.sourceDocumentId} onChange={(e) => updateField('sourceDocumentId', e.target.value)} placeholder="UUID of source document" /> : null}
            <Input label="Reference" value={form.reference} onChange={(e) => updateField('reference', e.target.value)} placeholder="External reference" />
            <Input label="Currency" value={form.currencyCode} onChange={(e) => updateField('currencyCode', e.target.value.toUpperCase())} placeholder="e.g. GHS" maxLength={3} />
            {(config.extraFields || []).map((field) => field.type === 'select' ? (
              <Select key={field.key} label={field.label} value={form[field.key]} onChange={(e) => updateField(field.key, e.target.value)} options={field.options} />
            ) : null)}
            {config.requireAmountTotal ? <Input label="Amount Total" type="number" step="0.01" value={form.amountTotal} onChange={(e) => updateField('amountTotal', e.target.value)} /> : null}
            <div className="md:col-span-2"><Textarea label="Memo" rows={3} value={form.memo} onChange={(e) => updateField('memo', e.target.value)} placeholder="Optional memo" /></div>
          </div>

          {config.lineMode !== 'none' ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Lines</h2>
                  <p className="text-sm text-gray-500">Provide the line-level breakdown for this document.</p>
                </div>
                <Button type="button" variant="outline" onClick={addLine}><Plus className="h-4 w-4 mr-2" /> Add Line</Button>
              </div>
              <div className="space-y-4">
                {(form.lines || []).map((line, idx) => (
                  <div key={idx} className="grid gap-3 md:grid-cols-12 border border-gray-100 rounded-xl p-4">
                    <div className="md:col-span-4"><Input label="Description" value={line.description} onChange={(e) => updateLine(idx, 'description', e.target.value)} /></div>
                    <div className="md:col-span-1"><Input label="Qty" type="number" step="0.01" value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} /></div>
                    <div className="md:col-span-2"><Input label="Unit Price" type="number" step="0.01" value={line.unitPrice} onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)} /></div>
                    <div className="md:col-span-2"><Input label="Line Total" type="number" step="0.01" value={line.lineTotal} onChange={(e) => updateLine(idx, 'lineTotal', e.target.value)} /></div>
                    <div className="md:col-span-2"><Select label="Account" value={line.accountId} onChange={(e) => updateLine(idx, 'accountId', e.target.value)} options={accountOptions} /></div>
                    <div className="md:col-span-1 flex items-end"><Button type="button" variant="danger" onClick={() => removeLine(idx)}><Trash2 className="h-4 w-4" /></Button></div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-right text-sm font-semibold text-gray-900">Lines Total: {toCurrency(linesTotal, form.currencyCode || 'USD')}</div>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
