import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Edit, Plus, Save, Settings2, Trash2, Wallet } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makePaymentConfigApi } from '../api/paymentConfig.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';// Added this import
import { toOptions, NONE_OPTION } from '../../../shared/utils/options.js';// Added this import

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';

export default function PaymentConfig() {
  const { http } = useApi();
  const api = useMemo(() => makePaymentConfigApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);// Added this line
  const qc = useQueryClient();
  const toast = useToast();
  
  const { data: terms, isLoading: termsLoading, isError: termsError } = useQuery({
    queryKey: qk.paymentTerms,
    queryFn: () => api.listPaymentTerms()
  });

  const { data: methods, isLoading: methodsLoading, isError: methodsError } = useQuery({
    queryKey: qk.paymentMethods,
    queryFn: () => api.listPaymentMethods()
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: qk.paymentSettings,
    queryFn: () => api.getPaymentSettings()
  });

  // New query for accounts
  const { data: accountsRaw } = useQuery({
    queryKey: ['coa.accounts.list'],
    queryFn: async () => coaApi.list({ limit: 500 }),
    staleTime: 60_000,
    enabled: !!coaApi // Only run if coaApi is available
  });

  const accountOptions = useMemo(() => {
    const opts = toOptions(accountsRaw, {
      valueKey: 'id',
      label: (a) => `${a.code ?? ''} ${a.name ?? ''}`.trim() || a.id
    });
    return [NONE_OPTION, ...opts];
  }, [accountsRaw]);

  const { data: paymentMethodsRaw } = useQuery({
    queryKey: qk.paymentMethods,
    queryFn: () => api.listPaymentMethods(),
    staleTime: 60_000
  });

  const paymentMethodOptions = useMemo(() => {
    const opts = toOptions(paymentMethodsRaw, {
      valueKey: 'id',
      label: (m) => `${m.name ?? ''} (${m.code ?? ''})`.trim() || m.id
    });
    return [NONE_OPTION, ...opts];
  }, [paymentMethodsRaw]);

  const [termOpen, setTermOpen] = useState(false);
  const [termEditOpen, setTermEditOpen] = useState(false);
  const [methodEditOpen, setMethodEditOpen] = useState(false);
  const [editingTermId, setEditingTermId] = useState(null);
  const [editingMethodId, setEditingMethodId] = useState(null);
  
  const [term, setTerm] = useState({ name: '', net_days: 0, discount_days: null, discount_rate: null, isDefault: false, status: 'active' });
  const [termEdit, setTermEdit] = useState({ name: '', net_days: 0, discount_days: null, discount_rate: null, isDefault: false, status: 'active' });
  const [methodEdit, setMethodEdit] = useState({ name: '', code: '', description: '', status: 'active' });

  const createTerm = useMutation({
    mutationFn: (body) => api.createPaymentTerm(body),
    onSuccess: () => {
      toast.success('Created payment term');
      qc.invalidateQueries({ queryKey: qk.paymentTerms });
      setTermOpen(false);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to create')
  });

  const updateTerm = useMutation({
    mutationFn: ({ id, body }) => api.updatePaymentTerm(id, body),
    onSuccess: () => {
      toast.success('Updated payment term');
      qc.invalidateQueries({ queryKey: qk.paymentTerms });
      setTermEditOpen(false);
      setEditingTermId(null);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to update')
  });

  const deleteTerm = useMutation({
    mutationFn: (id) => api.deletePaymentTerm(id),
    onSuccess: () => {
      toast.success('Deleted payment term');
      qc.invalidateQueries({ queryKey: qk.paymentTerms });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to delete')
  });

  const updateMethod = useMutation({
    mutationFn: ({ id, body }) => api.updatePaymentMethod(id, body),
    onSuccess: () => {
      toast.success('Updated payment method');
      qc.invalidateQueries({ queryKey: qk.paymentMethods });
      setMethodEditOpen(false);
      setEditingMethodId(null);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to update payment method')
  });

  const deleteMethod = useMutation({
    mutationFn: (id) => api.deletePaymentMethod(id),
    onSuccess: () => {
      toast.success('Deleted payment method');
      qc.invalidateQueries({ queryKey: qk.paymentMethods });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to delete payment method')
  });

  const saveSettings = useMutation({
    mutationFn: (body) => api.setPaymentSettings(body),
    onSuccess: () => {
      toast.success('Saved payment settings');
      qc.invalidateQueries({ queryKey: qk.paymentSettings });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to save')
  });

  const [settingsDraft, setSettingsDraft] = useState({});
  React.useEffect(() => {
    if (settings) setSettingsDraft(settings);
  }, [settings]);

 const toIntOrNull = (v) => {
  if (v === null || v === undefined) return null;
  
  // Convert to string for processing
  const s = String(v).trim();
  if (!s) return null;
  
  // UUID pattern (case-insensitive)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(s)) {
    return s.toLowerCase();// Return UUID in lowercase for consistency
  }
  
  // Check if it's a valid integer
  const n = Number(s);
  if (Number.isFinite(n) && Number.isInteger(n)) {
    return n;// Return integer
  }
  
  // Not a valid ID
  return null;
};
  const settingsPayload = (draft) => ({
    arUnappliedAccountId: toIntOrNull(draft?.arUnappliedAccountId),
    arDiscountAccountId: toIntOrNull(draft?.arDiscountAccountId),
    apPrepaymentsAccountId: toIntOrNull(draft?.apPrepaymentsAccountId),
    apDiscountIncomeAccountId: toIntOrNull(draft?.apDiscountIncomeAccountId),
    onlineCashAccountId: toIntOrNull(draft?.onlineCashAccountId),
    onlinePaymentMethodId: toIntOrNull(draft?.onlinePaymentMethodId)
  });

  // Safely extract data rows
  const termsRows = React.useMemo(() => {
    if (!terms) return [];
    if (Array.isArray(terms)) return terms;
    if (terms?.data && Array.isArray(terms.data)) return terms.data;
    return [];
  }, [terms]);

  const methodsRows = React.useMemo(() => {
    if (!methods) return [];
    if (Array.isArray(methods)) return methods;
    if (methods?.data && Array.isArray(methods.data)) return methods.data;
    return [];
  }, [methods]);

  // Loading state for the entire page
  const isLoading = termsLoading || methodsLoading || settingsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Payment configuration"
          subtitle="Manage terms, supported methods, and accounting settings for AR/AP."
          icon={Settings2}
          actions={
            <Button leftIcon={Plus} disabled>
              New term
            </Button>
          }
        />
        <div className="rounded-2xl border border-border-subtle bg-white/70 p-8 text-center">
          <div className="text-sm text-slate-600">Loading payment configuration...</div>
        </div>
      </div>
    );
  }

  // Error states
  if (termsError || methodsError) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Payment configuration"
          subtitle="Manage terms, supported methods, and accounting settings for AR/AP."
          icon={Settings2}
        />
        <div className="rounded-2xl border border-border-subtle bg-white/70 p-8 text-center">
          <div className="text-sm text-red-600">
            {termsError ? 'Failed to load payment terms' : 'Failed to load payment methods'}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              if (termsError) qc.invalidateQueries({ queryKey: qk.paymentTerms });
              if (methodsError) qc.invalidateQueries({ queryKey: qk.paymentMethods });
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payment configuration"
        subtitle="Manage terms, supported methods, and accounting settings for AR/AP."
        icon={Settings2}
        actions={
          <Button leftIcon={Plus} onClick={() => setTermOpen(true)}>
            New term
          </Button>
        }
      />

      <Tabs
        tabs={[
          {
            key: 'terms',
            label: 'Payment terms',
            content: (
              <ContentCard>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {termsRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border-subtle bg-white/60 p-8 text-center text-sm text-slate-600 md:col-span-2 lg:col-span-3">
                      No payment terms configured yet.
                    </div>
                  ) : (
                    termsRows.map((t) => (
                      <div key={t.id ?? t.name} className="rounded-2xl border border-border-subtle bg-white/70 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                            <div className="mt-1 text-xs text-slate-500">Net {t.net_days} days</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {t.isDefault ? <Badge tone="brand">Default</Badge> : null}
                            <Badge tone={(t.status ?? 'active') === 'active' ? 'success' : 'muted'}>{t.status ?? 'active'}</Badge>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <div className="rounded-xl bg-slate-900/5 p-3">
                            <div className="text-slate-500">Discount days</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">{t.discount_days ?? '—'}</div>
                          </div>
                          <div className="rounded-xl bg-slate-900/5 p-3">
                            <div className="text-slate-500">Discount rate</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              {t.discount_rate == null ? '—' : `${Math.round(Number(t.discount_rate) * 100)}%`}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTermId(t.id);
                              setTermEdit({
                                name: t.name ?? '',
                                net_days: t.net_days ?? 0,
                                discount_days: t.discount_days ?? null,
                                discount_rate: t.discount_rate ?? null,
                                isDefault: !!t.isDefault,
                                status: t.status ?? 'active'
                              });
                              setTermEditOpen(true);
                            }}
                            disabled={!t.id}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              if (!t.id) return;
                              const ok = window.confirm(`Delete payment term "${t.name}"? This cannot be undone.`);
                              if (ok) deleteTerm.mutate(t.id);
                            }}
                            disabled={!t.id || deleteTerm.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ContentCard>
            )
          },
          {
            key: 'methods',
            label: 'Payment methods',
            content: (
              <ContentCard>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {methodsRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border-subtle bg-white/60 p-8 text-center text-sm text-slate-600 md:col-span-2 lg:col-span-3">
                      No payment methods returned by backend.
                    </div>
                  ) : (
                    methodsRows.map((m) => (
                      <div key={m.id ?? m.code ?? m.name} className="rounded-2xl border border-border-subtle bg-white/70 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-brand-primary/10 p-2 ring-1 ring-brand-primary/20">
                              <Wallet className="h-5 w-5 text-brand-deep" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{m.name ?? m.code ?? 'Method'}</div>
                              <div className="mt-1 text-xs text-slate-500">{m.code ?? '—'}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone={(m.status ?? 'active') === 'active' ? 'success' : 'muted'}>{m.status ?? 'active'}</Badge>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="text-xs text-slate-500">Description</div>
                          <div className="mt-1 text-sm text-slate-900">{m.description ?? '—'}</div>
                        </div>
                        <div className="mt-4 flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMethodId(m.id);
                              setMethodEdit({
                                name: m.name ?? '',
                                code: m.code ?? '',
                                description: m.description ?? '',
                                status: m.status ?? 'active'
                              });
                              setMethodEditOpen(true);
                            }}
                            disabled={!m.id}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              if (!m.id) return;
                              const ok = window.confirm(`Delete payment method "${m.name || m.code}"? This cannot be undone.`);
                              if (ok) deleteMethod.mutate(m.id);
                            }}
                            disabled={!m.id || deleteMethod.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ContentCard>
            )
          },
          {
            key: 'settings',
            label: 'Payment settings',
            content: (
              <ContentCard>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border-subtle bg-white/70 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-brand-primary/10 p-2 ring-1 ring-brand-primary/20">
                          <CreditCard className="h-5 w-5 text-brand-deep" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Accounting mappings</div>
                          <div className="mt-1 text-xs text-slate-500">
                            These ids are stored as-is by the backend. Treat them as opaque per endpoint.
                          </div>
                        </div>
                      </div>
                      <Button leftIcon={Save} loading={saveSettings.isPending} onClick={() => saveSettings.mutate(settingsPayload(settingsDraft))}>
                        Save
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <Select
                        label="AR unapplied account"
                        value={settingsDraft?.arUnappliedAccountId ?? ''}
                        onChange={(e) => setSettingsDraft((s) => ({ ...s, arUnappliedAccountId: e.target.value || null }))}
                        options={accountOptions}
                      />
                      <Select
                        label="AR discount account"
                        value={settingsDraft?.arDiscountAccountId ?? ''}
                        onChange={(e) => setSettingsDraft((s) => ({ ...s, arDiscountAccountId: e.target.value || null }))}
                        options={accountOptions}
                      />
                      <Select
                        label="AP prepayments account"
                        value={settingsDraft?.apPrepaymentsAccountId ?? ''}
                        onChange={(e) => setSettingsDraft((s) => ({ ...s, apPrepaymentsAccountId: e.target.value || null }))}
                        options={accountOptions}
                      />
                      <Select
                        label="AP discount income account"
                        value={settingsDraft?.apDiscountIncomeAccountId ?? ''}
                        onChange={(e) => setSettingsDraft((s) => ({ ...s, apDiscountIncomeAccountId: e.target.value || null }))}
                        options={accountOptions}
                      />
                      <Select
                        label="Online cash account"
                        value={settingsDraft?.onlineCashAccountId ?? ''}
                        onChange={(e) => setSettingsDraft((s) => ({ ...s, onlineCashAccountId: e.target.value || null }))}
                        options={accountOptions}
                      />
                      <Select
                        label="Online payment method"
                        value={settingsDraft?.onlinePaymentMethodId ?? ''}
                        onChange={(e) => setSettingsDraft((s) => ({ ...s, onlinePaymentMethodId: e.target.value || null }))}
                        options={paymentMethodOptions}
                      />
                    </div>
                  </div>

                  <JsonPanel title="Payment settings (GET)" value={settings ?? {}} hint="This panel is read-only;use the form to save." />
                </div>
              </ContentCard>
            )
          }
        ]}
      />

      <Modal open={termOpen} onClose={() => setTermOpen(false)} title="New payment term">
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Name" value={term.name} onChange={(e) => setTerm((s) => ({ ...s, name: e.target.value }))} />
          <Input
            label="Net days"
            type="number"
            value={term.net_days}
            onChange={(e) => setTerm((s) => ({ ...s, net_days: Number(e.target.value) }))}
          />
          <Input
            label="Discount days"
            type="number"
            value={term.discount_days ?? ''}
            onChange={(e) => setTerm((s) => ({ ...s, discount_days: e.target.value === '' ? null : Number(e.target.value) }))}
          />
          <Input
            label="Discount rate (0..1)"
            value={term.discount_rate ?? ''}
            onChange={(e) => setTerm((s) => ({ ...s, discount_rate: e.target.value === '' ? null : Number(e.target.value) }))}
          />
          <label className="flex items-center gap-2 rounded-xl border border-border-subtle bg-white/70 p-3 text-sm text-slate-700 md:col-span-2">
            <input type="checkbox" checked={term.isDefault} onChange={(e) => setTerm((s) => ({ ...s, isDefault: e.target.checked }))} />
            Default term
          </label>
          <Input
            label="Status"
            value={term.status}
            onChange={(e) => setTerm((s) => ({ ...s, status: e.target.value }))}
            placeholder="active|inactive"
            className="md:col-span-2"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setTermOpen(false)}>
            Cancel
          </Button>
          <Button loading={createTerm.isPending} onClick={() => createTerm.mutate(term)}>
            Create
          </Button>
        </div>
      </Modal>
 
      <Modal
        open={termEditOpen}
        onClose={() => {
          setTermEditOpen(false);
          setEditingTermId(null);
        }}
        title="Edit payment term"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Name" value={termEdit.name} onChange={(e) => setTermEdit((s) => ({ ...s, name: e.target.value }))} />
          <Input
            label="Net days"
            type="number"
            value={termEdit.net_days}
            onChange={(e) => setTermEdit((s) => ({ ...s, net_days: Number(e.target.value || 0) }))}
          />
          <Input
            label="Discount days"
            type="number"
            value={termEdit.discount_days ?? ''}
            onChange={(e) => setTermEdit((s) => ({ ...s, discount_days: e.target.value === '' ? null : Number(e.target.value) }))}
          />
          <Input
            label="Discount rate (0..1)"
            type="number"
            step="0.01"
            value={termEdit.discount_rate ?? ''}
            onChange={(e) => setTermEdit((s) => ({ ...s, discount_rate: e.target.value === '' ? null : Number(e.target.value) }))}
          />
          <label className="flex items-center gap-2 rounded-xl border border-border-subtle bg-white/70 p-3 text-sm text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={termEdit.isDefault}
              onChange={(e) => setTermEdit((s) => ({ ...s, isDefault: e.target.checked }))}
            />
            Default term
          </label>
          <div className="md:col-span-2">
            <div className="text-xs font-medium text-slate-600">Status</div>
            <div className="mt-2">
              <Select
                value={termEdit.status}
                onChange={(e) => setTermEdit((s) => ({ ...s, status: e.target.value }))}
                options={[
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' }
                ]}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setTermEditOpen(false);
              setEditingTermId(null);
            }}
          >
            Cancel
          </Button>
          <Button
            loading={updateTerm.isPending}
            onClick={() =>
              updateTerm.mutate({
                id: editingTermId,
                body: {
                  name: termEdit.name || undefined,
                  net_days: typeof termEdit.net_days === 'number' ? termEdit.net_days : undefined,
                  discount_days: termEdit.discount_days,
                  discount_rate: termEdit.discount_rate,
                  isDefault: termEdit.isDefault,
                  status: termEdit.status || undefined
                }
              })
            }
            disabled={!editingTermId || !termEdit.name.trim()}
          >
            Save
          </Button>
        </div>
      </Modal>

      <Modal
        open={methodEditOpen}
        onClose={() => {
          setMethodEditOpen(false);
          setEditingMethodId(null);
        }}
        title="Edit payment method"
      >
        <div className="grid gap-3">
          <Input 
            label="Name" 
            value={methodEdit.name} 
            onChange={(e) => setMethodEdit((s) => ({ ...s, name: e.target.value }))} 
          />
          <Input 
            label="Code" 
            value={methodEdit.code} 
            onChange={(e) => setMethodEdit((s) => ({ ...s, code: e.target.value }))} 
          />
          <Input 
            label="Description" 
            value={methodEdit.description} 
            onChange={(e) => setMethodEdit((s) => ({ ...s, description: e.target.value }))} 
            multiline
            rows={3}
          />
          <div>
            <div className="text-xs font-medium text-slate-600 mb-2">Status</div>
            <Select
              value={methodEdit.status}
              onChange={(e) => setMethodEdit((s) => ({ ...s, status: e.target.value }))}
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' }
              ]}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setMethodEditOpen(false);
              setEditingMethodId(null);
            }}
          >
            Cancel
          </Button>
          <Button
            loading={updateMethod.isPending}
            onClick={() =>
              updateMethod.mutate({
                id: editingMethodId,
                body: {
                  name: methodEdit.name || undefined,
                  code: methodEdit.code || undefined,
                  description: methodEdit.description || undefined,
                  status: methodEdit.status || undefined
                }
              })
            }
            disabled={!editingMethodId || !methodEdit.name.trim() || !methodEdit.code.trim()}
          >
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}