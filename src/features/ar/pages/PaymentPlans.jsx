import React, { useMemo, useState } from 'react'; 
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'; 
import { Landmark, Plus, XCircle } from 'lucide-react'; 

import { useApi } from '../../../shared/hooks/useApi.js'; 
import { qk } from '../../../shared/query/keys.js'; 
import { makePaymentPlansApi } from '../api/paymentPlans.api.js'; 

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx'; 
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx'; 
import { DataTable } from '../../../shared/components/data/DataTable.jsx'; 
import { Button } from '../../../shared/components/ui/Button.jsx'; 
import { Input } from '../../../shared/components/ui/Input.jsx'; 
import { Badge } from '../../../shared/components/ui/Badge.jsx'; 
import { Modal } from '../../../shared/components/ui/Modal.jsx'; 
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx'; 
import { useToast } from '../../../shared/components/ui/Toast.jsx'; 

export default function PaymentPlans() {
  const { http } = useApi(); 
  const api = useMemo(() => makePaymentPlansApi(http), [http]); 
  const qc = useQueryClient(); 
const toast = useToast(); 

  const [status, setStatus] = useState(''); 
  const qs = useMemo(() => (status ? { status } : {}), [status]); 

  const { data: listData, isLoading } = useQuery({ queryKey: qk.paymentPlans(qs), queryFn: () => api.list(qs) }); 
  const rows = Array.isArray(listData) ? listData : listData?.data ?? []; 

  const [modal, setModal] = useState(null); 
  const [draft, setDraft] = useState({
    entity_type: 'invoice',
    entity_id: '0',
    partner_id: 0,
    total_amount: 0,
    start_date: '',
    frequency: 'monthly',
    installment_count: 6
  }); 

  const createPlan = useMutation({
    mutationFn: (body) => api.create(body),
    onSuccess: () => {
      toast.success('Payment plan created'); 
      qc.invalidateQueries({ queryKey: qk.paymentPlans(qs) }); 
      setModal(null); 
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
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  }); 

  const [selectedId, setSelectedId] = useState(null); 
  const { data: detail } = useQuery({
    queryKey: qk.paymentPlan(selectedId),
    queryFn: () => api.get(selectedId),
    enabled: !!selectedId
  }); 

  const columns = useMemo(
    () => [
      {
        header: 'Plan',
        render: (r) => (
          <button
            className="text-left"
            onClick={() => {
              setSelectedId(r.id); 
              setModal('detail'); 
            }}
          >
            <div className="text-sm font-semibold text-slate-900">#{r.id}</div>
            <div className="mt-0.5 text-xs text-slate-500">{r.entity_type}:{String(r.entity_id)} • partner {r.partner_id}</div>
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
            <Button
              size="sm"
              variant="outline"
              leftIcon={XCircle}
              disabled={(r.status ?? 'active') !== 'active'}
              loading={cancelPlan.isPending}
              onClick={() => cancelPlan.mutate(r.id)}
            >
              Cancel
            </Button>
          </div>
        )
      }
    ],
    [cancelPlan]
  ); 

  return (
    <div className="space-y-4">
      <PageHeader title="Payment Plans" subtitle="Structured installment schedules for AR/AP recovery." icon={Landmark} />

      <ContentCard>
        <FilterBar
          left={<Input label="Status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="active|cancelled|…" />}
          right={
            <Button
              leftIcon={Plus}
              onClick={() => {
                setDraft({
                  entity_type: 'invoice',
                  entity_id: '0',
                  partner_id: 0,
                  total_amount: 0,
                  start_date: '',
                  frequency: 'monthly',
                  installment_count: 6
                }); 
                setModal('new'); 
              }}
            >
              New plan
            </Button>
          }
        />

        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={rows}
            loading={isLoading}
            empty={{ title: 'No payment plans', description: 'Create a plan to track installment recovery.' }}
          />
        </div>
      </ContentCard>

      <Modal open={modal === 'new'} onClose={() => setModal(null)} title="Create payment plan">
        <JsonPanel title="Payment plan payload" value={draft} submitLabel="Create" onSubmit={(json) => createPlan.mutate(json)} />
      </Modal>

      <Modal open={modal === 'detail'} onClose={() => setModal(null)} title={`Plan #${selectedId ?? ''}`}>
        <div className="space-y-4">
          <JsonPanel title="Plan detail" value={detail ?? {}} />
          <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
            <div className="text-sm font-semibold text-slate-900">Mark installment paid</div>
            <div className="mt-1 text-xs text-slate-500">Uses POST /modules/ar/payment-plans/:id/installments/:installmentId/mark-paid</div>
            <div className="mt-3">
              <JsonPanel
                title="Payload"
                value={{ installmentId: 1, settlement_ref: null }}
                submitLabel="Mark paid"
                onSubmit={(json) => {
                  const { installmentId, ...body } = json ?? {}; 
                  if (!selectedId || !installmentId) return toast.error('installmentId required'); 
                  markPaid.mutate({ id: selectedId, installmentId, body }); 
                }}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  ); 
}
