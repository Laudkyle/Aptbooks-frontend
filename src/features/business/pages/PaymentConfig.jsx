import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, Save, Settings2, Wallet } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makePaymentConfigApi } from '../api/paymentConfig.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export default function PaymentConfig() {
  const { http } = useApi();
  const api = useMemo(() => makePaymentConfigApi(http), [http]);
  const qc = useQueryClient();
const toast = useToast();
  const { data: terms, isLoading: termsLoading } = useQuery({
    queryKey: qk.paymentTerms,
    queryFn: () => api.listPaymentTerms()
  });

  const { data: methods } = useQuery({
    queryKey: qk.paymentMethods,
    queryFn: () => api.listPaymentMethods()
  });

  const { data: settings } = useQuery({
    queryKey: qk.paymentSettings,
    queryFn: () => api.getPaymentSettings()
  });

  const [termOpen, setTermOpen] = useState(false);
  const [termEditOpen, setTermEditOpen] = useState(false);
  const [editingTermId, setEditingTermId] = useState(null);
  const [term, setTerm] = useState({ name: '', netDays: 0, discountDays: null, discountRate: null, isDefault: false, status: 'active' });
  const [termEdit, setTermEdit] = useState({ name: '', netDays: 0, discountDays: null, discountRate: null, isDefault: false, status: 'active' });

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
    if (typeof v === 'number') return Number.isFinite(v) ? Math.trunc(v) : null;
    const s = String(v).trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };

  const settingsPayload = (draft) => ({
    arUnappliedAccountId: toIntOrNull(draft?.arUnappliedAccountId),
    arDiscountAccountId: toIntOrNull(draft?.arDiscountAccountId),
    apPrepaymentsAccountId: toIntOrNull(draft?.apPrepaymentsAccountId),
    apDiscountIncomeAccountId: toIntOrNull(draft?.apDiscountIncomeAccountId),
    onlineCashAccountId: toIntOrNull(draft?.onlineCashAccountId),
    onlinePaymentMethodId: toIntOrNull(draft?.onlinePaymentMethodId)
  });

const termsRows = Array.isArray(terms) ? terms : terms?.data ?? [];
  const methodsRows = Array.isArray(methods) ? methods : methods?.data ?? [];

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
                  {termsLoading ? (
                    <div className="rounded-2xl border border-border-subtle bg-white/70 p-6 text-sm text-slate-600">
                      Loading terms…
                    </div>
                  ) : termsRows.length ? (
                    termsRows.map((t) => (
                      <div key={t.id ?? t.name} className="rounded-2xl border border-border-subtle bg-white/70 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                            <div className="mt-1 text-xs text-slate-500">Net {t.netDays} days</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {t.isDefault ? <Badge tone="brand">Default</Badge> : null}
                            <Badge tone={(t.status ?? 'active') === 'active' ? 'success' : 'muted'}>{t.status ?? 'active'}</Badge>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <div className="rounded-xl bg-slate-900/5 p-3">
                            <div className="text-slate-500">Discount days</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">{t.discountDays ?? '—'}</div>
                          </div>
                          <div className="rounded-xl bg-slate-900/5 p-3">
                            <div className="text-slate-500">Discount rate</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              {t.discountRate == null ? '—' : `${Math.round(Number(t.discountRate) * 100)}%`}
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
                                netDays: t.netDays ?? 0,
                                discountDays: t.discountDays ?? null,
                                discountRate: t.discountRate ?? null,
                                isDefault: !!t.isDefault,
                                status: t.status ?? 'active'
                              });
                              setTermEditOpen(true);
                            }}
                            disabled={!t.id}
                          >
                            Edit
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
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border-subtle bg-white/60 p-8 text-center text-sm text-slate-600 md:col-span-2 lg:col-span-3">
                      No payment terms configured yet.
                    </div>
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
                  {methodsRows.length ? (
                    methodsRows.map((m) => (
                      <div key={m.id ?? m.code ?? m.name} className="rounded-2xl border border-border-subtle bg-white/70 p-5">
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl bg-brand-primary/10 p-2 ring-1 ring-brand-primary/20">
                            <Wallet className="h-5 w-5 text-brand-deep" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{m.name ?? m.code ?? 'Method'}</div>
                            <div className="mt-1 text-xs text-slate-500">{m.description ?? '—'}</div>
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
                                netDays: t.netDays ?? 0,
                                discountDays: t.discountDays ?? null,
                                discountRate: t.discountRate ?? null,
                                isDefault: !!t.isDefault,
                                status: t.status ?? 'active'
                              });
                              setTermEditOpen(true);
                            }}
                            disabled={!t.id}
                          >
                            Edit
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
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border-subtle bg-white/60 p-8 text-center text-sm text-slate-600 md:col-span-2 lg:col-span-3">
                      No payment methods returned by backend.
                    </div>
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
                      <Input
                        label="AR unapplied account id"
                        value={settingsDraft?.arUnappliedAccountId ?? ''}
                        onChange={(e) => setSettingsDraft((s) => ({ ...s, arUnappliedAccountId: e.target.value || null }))}
                      />
                      <Input
                        label="AR discount account id"
                        value={settingsDraft?.arDiscountAccountId ?? ''}
                        onChange={(e) => setSettingsDraft((s) => ({ ...s, arDiscountAccountId: e.target.value || null }))}
                      />
                      <Input
                        label="AP prepayments account id"
                        value={settingsDraft?.apPrepaymentsAccountId ?? ''}
                        onChange={(e) => setSettingsDraft((s) => ({ ...s, apPrepaymentsAccountId: e.target.value || null }))}
                      />
                      <Input
                        label="AP discount income account id"
                        value={settingsDraft?.apDiscountIncomeAccountId ?? ''}
                        onChange={(e) => setSettingsDraft((s) => ({ ...s, apDiscountIncomeAccountId: e.target.value || null }))}
                      />
                      <Input
                        label="Online cash account id"
                        value={settingsDraft?.onlineCashAccountId ?? ''}
                        onChange={(e) => setSettingsDraft((s) => ({ ...s, onlineCashAccountId: e.target.value || null }))}
                      />
                      <Input
                        label="Online payment method id"
                        value={settingsDraft?.onlinePaymentMethodId ?? ''}
                        onChange={(e) => setSettingsDraft((s) => ({ ...s, onlinePaymentMethodId: e.target.value || null }))}
                      />
                    </div>
                  </div>

                  <JsonPanel title="Payment settings (GET)" value={settings ?? {}} hint="This panel is read-only; use the form to save." />
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
            value={term.netDays}
            onChange={(e) => setTerm((s) => ({ ...s, netDays: Number(e.target.value) }))}
          />
          <Input
            label="Discount days"
            type="number"
            value={term.discountDays ?? ''}
            onChange={(e) => setTerm((s) => ({ ...s, discountDays: e.target.value === '' ? null : Number(e.target.value) }))}
          />
          <Input
            label="Discount rate (0..1)"
            value={term.discountRate ?? ''}
            onChange={(e) => setTerm((s) => ({ ...s, discountRate: e.target.value === '' ? null : Number(e.target.value) }))}
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
            value={termEdit.netDays}
            onChange={(e) => setTermEdit((s) => ({ ...s, netDays: Number(e.target.value || 0) }))}
          />
          <Input
            label="Discount days"
            type="number"
            value={termEdit.discountDays ?? ''}
            onChange={(e) => setTermEdit((s) => ({ ...s, discountDays: e.target.value === '' ? null : Number(e.target.value) }))}
          />
          <Input
            label="Discount rate (0..1)"
            type="number"
            step="0.01"
            value={termEdit.discountRate ?? ''}
            onChange={(e) => setTermEdit((s) => ({ ...s, discountRate: e.target.value === '' ? null : Number(e.target.value) }))}
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
                  netDays: typeof termEdit.netDays === 'number' ? termEdit.netDays : undefined,
                  discountDays: termEdit.discountDays,
                  discountRate: termEdit.discountRate,
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

   </div>
  );
}
