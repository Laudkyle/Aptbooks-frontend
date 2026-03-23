import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Landmark, Plus, XCircle } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makePaymentPlansApi } from '../api/paymentPlans.api.js';
import { useArEntityOptions } from '../hooks/useArEntityOptions.js';
import { ArEntitySelectFields } from '../components/ArEntitySelectFields.jsx';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { NONE_OPTION } from '../../../shared/utils/options.js';

const PLAN_STATUS_OPTIONS = [
  NONE_OPTION,
  { value: 'active', label: 'Active' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' }
];

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' }
];

export default function PaymentPlans() {
  const { http } = useApi();
  const api = useMemo(() => makePaymentPlansApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState({ customerId: '', entityValue: '', totalAmount: '', startDate: '', frequency: 'monthly', installmentCount: '6' });
  const [markPaidForm, setMarkPaidForm] = useState({ installmentId: '', settlementRef: '' });

  const qs = useMemo(() => (status ? { status } : {}), [status]);
  const { customerOptions, entityOptions, getEntityByValue } = useArEntityOptions({ action: 'payment_plan', customerId: draft.customerId });
  const selectedEntity = useMemo(() => getEntityByValue(draft.entityValue), [getEntityByValue, draft.entityValue]);

  const { data: listData, isLoading } = useQuery({ queryKey: qk.paymentPlans(qs), queryFn: () => api.list(qs) });
  const rows = Array.isArray(listData) ? listData : listData?.data ?? [];
  const { data: detail } = useQuery({ queryKey: qk.paymentPlan(selectedId), queryFn: () => api.get(selectedId), enabled: !!selectedId });

  const createPlan = useMutation({
    mutationFn: (body) => api.create(body),
    onSuccess: () => {
      toast.success('Payment plan created');
      qc.invalidateQueries({ queryKey: qk.paymentPlans(qs) });
      setModal(null);
      setDraft({ customerId: '', entityValue: '', totalAmount: '', startDate: '', frequency: 'monthly', installmentCount: '6' });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  });

  const cancelPlan = useMutation({
    mutationFn: (id) => api.cancel(id),
    onSuccess: () => {
      toast.success('Plan cancelled');
      qc.invalidateQueries({ queryKey: qk.paymentPlans(qs) });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  });

  const markPaid = useMutation({
    mutationFn: ({ id, installmentId, body }) => api.markInstallmentPaid(id, installmentId, body),
    onSuccess: (_, vars) => {
      toast.success('Installment marked paid');
      qc.invalidateQueries({ queryKey: qk.paymentPlan(vars.id) });
      setMarkPaidForm({ installmentId: '', settlementRef: '' });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  });

  const columns = useMemo(
    () => [
      {
        header: 'Plan',
        render: (r) => (
          <button className="text-left" onClick={() => { setSelectedId(r.id); setModal('detail'); }}>
            <div className="text-sm font-semibold text-slate-900">#{r.id}</div>
            <div className="mt-0.5 text-xs text-slate-500">{r.entity_type}:{String(r.entity_id)} • partner {r.partner_name ?? r.partner_id}</div>
          </button>
        )
      },
      { header: 'Total', render: (r) => <span className="text-sm text-slate-900">{r.total_amount}</span> },
      { header: 'Start', render: (r) => <span className="text-sm text-slate-700">{r.start_date}</span> },
      { header: 'Frequency', render: (r) => <span className="text-sm text-slate-700">{r.frequency}</span> },
      { header: 'Status', render: (r) => <Badge tone={(r.status ?? 'active') === 'active' ? 'success' : 'muted'}>{r.status ?? 'active'}</Badge> },
      {
        header: '',
        render: (r) => (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" leftIcon={XCircle} disabled={(r.status ?? 'active') !== 'active'} loading={cancelPlan.isPending} onClick={() => cancelPlan.mutate(r.id)}>Cancel</Button>
          </div>
        )
      }
    ],
    [cancelPlan]
  );

  const submitCreate = () => {
    if (!selectedEntity) return toast.error('Select a source document');
    createPlan.mutate({
      entity_type: selectedEntity.type,
      entity_id: selectedEntity.id,
      partner_id: selectedEntity.partnerId || draft.customerId || undefined,
      total_amount: Number(draft.totalAmount || 0),
      start_date: draft.startDate,
      frequency: draft.frequency,
      installment_count: Number(draft.installmentCount || 0)
    });
  };

  const installments = Array.isArray(detail?.installments) ? detail.installments : Array.isArray(detail?.data?.installments) ? detail.data.installments : [];

  return (
    <div className="space-y-4">
      <PageHeader title="Payment Plans" subtitle="Structured installment schedules for AR/AP recovery." icon={Landmark} />

      <ContentCard>
        <FilterBar
          left={<Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={PLAN_STATUS_OPTIONS} />}
          right={<Button leftIcon={Plus} onClick={() => { setDraft({ customerId: '', entityValue: '', totalAmount: '', startDate: '', frequency: 'monthly', installmentCount: '6' }); setModal('new'); }}>New plan</Button>}
        />

        <div className="mt-3">
          <DataTable columns={columns} rows={rows} loading={isLoading} empty={{ title: 'No payment plans', description: 'Create a plan to track installment recovery.' }} />
        </div>
      </ContentCard>

      <Modal
        open={modal === 'new'}
        onClose={() => setModal(null)}
        title="Create payment plan"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={createPlan.isPending} onClick={submitCreate} disabled={!draft.entityValue || !draft.startDate || !draft.totalAmount || !draft.installmentCount}>Create plan</Button></div>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ArEntitySelectFields
            customerId={draft.customerId}
            entityValue={draft.entityValue}
            customerOptions={customerOptions}
            entityOptions={entityOptions}
            onCustomerChange={(customerId) => setDraft((state) => ({ ...state, customerId, entityValue: '' }))}
            onEntityChange={(entityValue) => {
              const record = getEntityByValue(entityValue);
              setDraft((state) => ({ ...state, entityValue, customerId: record?.partnerId || state.customerId }));
            }}
          />
          <Input label="Total amount" type="number" min="0" step="0.01" value={draft.totalAmount} onChange={(e) => setDraft((s) => ({ ...s, totalAmount: e.target.value }))} />
          <Input label="Start date" type="date" value={draft.startDate} onChange={(e) => setDraft((s) => ({ ...s, startDate: e.target.value }))} />
          <Select label="Frequency" value={draft.frequency} onChange={(e) => setDraft((s) => ({ ...s, frequency: e.target.value }))} options={FREQUENCY_OPTIONS} />
          <Input label="Installment count" type="number" min="1" step="1" value={draft.installmentCount} onChange={(e) => setDraft((s) => ({ ...s, installmentCount: e.target.value }))} />
        </div>
      </Modal>

      <Modal open={modal === 'detail'} onClose={() => setModal(null)} title={`Plan #${selectedId ?? ''}`}>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ContentCard title="Entity"><div className="text-sm text-slate-700">{detail?.entity_type}:{detail?.entity_id}</div></ContentCard>
            <ContentCard title="Partner"><div className="text-sm text-slate-700">{detail?.partner_name ?? detail?.partner_id ?? '—'}</div></ContentCard>
            <ContentCard title="Total"><div className="text-sm text-slate-700">{detail?.total_amount ?? '—'}</div></ContentCard>
            <ContentCard title="Status"><Badge tone={(detail?.status ?? 'active') === 'active' ? 'success' : 'muted'}>{detail?.status ?? 'active'}</Badge></ContentCard>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">Installments</div>
            <div className="space-y-2">
              {installments.length ? installments.map((inst) => (
                <div key={inst.id ?? `${inst.installment_no}-${inst.due_date}`} className="flex items-center justify-between rounded-xl border border-border-subtle px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">Installment {inst.installment_no ?? inst.sequence ?? inst.id}</div>
                    <div className="text-xs text-slate-500">Due {inst.due_date ?? '—'} · Amount {inst.amount ?? '—'}</div>
                  </div>
                  <Badge tone={(inst.status ?? '').toLowerCase() === 'paid' ? 'success' : 'muted'}>{inst.status ?? 'pending'}</Badge>
                </div>
              )) : <div className="text-sm text-slate-500">No installments returned by backend.</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
            <div className="text-sm font-semibold text-slate-900">Mark installment paid</div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Input label="Installment ID" value={markPaidForm.installmentId} onChange={(e) => setMarkPaidForm((s) => ({ ...s, installmentId: e.target.value }))} placeholder="Exact installment id from backend" />
              <Input label="Settlement reference" value={markPaidForm.settlementRef} onChange={(e) => setMarkPaidForm((s) => ({ ...s, settlementRef: e.target.value }))} placeholder="Bank ref / receipt ref" />
            </div>
            <div className="mt-4 flex justify-end">
              <Button loading={markPaid.isPending} onClick={() => {
                if (!selectedId || !markPaidForm.installmentId) return toast.error('Installment ID is required');
                markPaid.mutate({ id: selectedId, installmentId: markPaidForm.installmentId, body: { settlement_ref: markPaidForm.settlementRef.trim() || null } });
              }}>Mark paid</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
