import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeDisputesApi } from '../api/disputes.api.js';
import { useArEntityOptions } from '../hooks/useArEntityOptions.js';
import { ArEntitySelectFields } from '../components/ArEntitySelectFields.jsx';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { NONE_OPTION } from '../../../shared/utils/options.js';

const DISPUTE_STATUS_OPTIONS = [
  NONE_OPTION,
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'voided', label: 'Voided' }
];

export default function Disputes() {
  const { http } = useApi();
  const api = useMemo(() => makeDisputesApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [disputeForm, setDisputeForm] = useState({ customerId: '', entityValue: '', reasonCode: '', notes: '' });
  const [reasonForm, setReasonForm] = useState({ code: '', description: '', is_active: true });

  const qs = useMemo(() => (status ? { status } : {}), [status]);
  const { customerOptions, entityOptions, getEntityByValue } = useArEntityOptions({ action: 'dispute', customerId: disputeForm.customerId });
  const selectedEntity = useMemo(() => getEntityByValue(disputeForm.entityValue), [getEntityByValue, disputeForm.entityValue]);

  const { data: disputesData } = useQuery({ queryKey: qk.disputes(qs), queryFn: () => api.list(qs) });
  const disputes = Array.isArray(disputesData) ? disputesData : disputesData?.data ?? [];

  const { data: reasonsData } = useQuery({ queryKey: qk.disputeReasonCodes, queryFn: () => api.listReasonCodes() });
  const reasons = Array.isArray(reasonsData) ? reasonsData : reasonsData?.data ?? [];
  const reasonOptions = useMemo(() => [NONE_OPTION, ...reasons.map((r) => ({ value: r.code, label: `${r.code}${r.description ? ` · ${r.description}` : ''}` }))], [reasons]);

  const createDispute = useMutation({
    mutationFn: (body) => api.create(body),
    onSuccess: () => {
      toast.success('Dispute created');
      qc.invalidateQueries({ queryKey: qk.disputes(qs) });
      setModal(null);
      setDisputeForm({ customerId: '', entityValue: '', reasonCode: '', notes: '' });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  });

  const createReason = useMutation({
    mutationFn: (body) => api.createReasonCode(body),
    onSuccess: () => {
      toast.success('Reason code created');
      qc.invalidateQueries({ queryKey: qk.disputeReasonCodes });
      setModal(null);
      setReasonForm({ code: '', description: '', is_active: true });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  });

  const columns = useMemo(
    () => [
      { header: 'ID', render: (r) => <span className="text-sm font-semibold text-slate-900">#{r.id}</span> },
      { header: 'Entity', render: (r) => <span className="text-sm text-slate-700">{r.entity_type}:{String(r.entity_id)}</span> },
      { header: 'Partner', render: (r) => <span className="text-sm text-slate-700">{r.partner_name ?? r.partner_id ?? '—'}</span> },
      { header: 'Reason', render: (r) => <span className="text-sm text-slate-700">{r.reason_code ?? '—'}</span> },
      { header: 'Status', render: (r) => <Badge tone={(r.status ?? 'open') === 'open' ? 'brand' : 'muted'}>{r.status ?? 'open'}</Badge> }
    ],
    []
  );

  const submitDispute = () => {
    if (!selectedEntity) return toast.error('Select a source document');
    createDispute.mutate({
      entity_type: selectedEntity.type,
      entity_id: selectedEntity.id,
      partner_id: selectedEntity.partnerId || disputeForm.customerId || undefined,
      reason_code: disputeForm.reasonCode || undefined,
      notes: disputeForm.notes.trim() || null
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Disputes" subtitle="Log and manage AR disputes with auditable actions." icon={AlertTriangle} />

      <Tabs
        tabs={[
          {
            key: 'disputes',
            label: 'Disputes',
            content: (
              <ContentCard>
                <FilterBar
                  left={<Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={DISPUTE_STATUS_OPTIONS} />}
                  right={<Button leftIcon={Plus} onClick={() => { setDisputeForm({ customerId: '', entityValue: '', reasonCode: '', notes: '' }); setModal('newDispute'); }}>New dispute</Button>}
                />
                <div className="mt-3">
                  <DataTable columns={columns} rows={disputes} empty={{ title: 'No disputes', description: 'Create a dispute to pause collections while it is investigated.' }} />
                </div>
              </ContentCard>
            )
          },
          {
            key: 'reasons',
            label: 'Reason codes',
            content: (
              <ContentCard>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Reason codes</div>
                    <div className="mt-1 text-xs text-slate-500">Used when creating a dispute.</div>
                  </div>
                  <Button leftIcon={Plus} onClick={() => { setReasonForm({ code: '', description: '', is_active: true }); setModal('newReason'); }}>New code</Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {reasons.length ? reasons.map((r) => (
                    <div key={r.code} className="rounded-2xl border border-border-subtle bg-white/70 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{r.code}</div>
                          <div className="mt-1 text-xs text-slate-500">{r.description ?? '—'}</div>
                        </div>
                        <Badge tone={r.is_active ? 'success' : 'muted'}>{r.is_active ? 'active' : 'inactive'}</Badge>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button variant="outline" size="sm" leftIcon={Trash2} onClick={() => api.deleteReasonCode(r.code).then(() => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: qk.disputeReasonCodes }); }).catch((e) => toast.error(e?.message ?? 'Failed'))}>Delete</Button>
                      </div>
                    </div>
                  )) : <div className="rounded-2xl border border-dashed border-border-subtle bg-white/60 p-8 text-center text-sm text-slate-600 md:col-span-2 lg:col-span-3">No reason codes.</div>}
                </div>
              </ContentCard>
            )
          }
        ]}
      />

      <Modal
        open={modal === 'newDispute'}
        onClose={() => setModal(null)}
        title="New dispute"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={createDispute.isPending} onClick={submitDispute} disabled={!disputeForm.entityValue}>Create dispute</Button></div>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ArEntitySelectFields
            customerId={disputeForm.customerId}
            entityValue={disputeForm.entityValue}
            customerOptions={customerOptions}
            entityOptions={entityOptions}
            onCustomerChange={(customerId) => setDisputeForm((state) => ({ ...state, customerId, entityValue: '' }))}
            onEntityChange={(entityValue) => {
              const record = getEntityByValue(entityValue);
              setDisputeForm((state) => ({ ...state, entityValue, customerId: record?.partnerId || state.customerId }));
            }}
          />
          <Select label="Reason code" value={disputeForm.reasonCode} onChange={(e) => setDisputeForm((s) => ({ ...s, reasonCode: e.target.value }))} options={reasonOptions} />
          <Input label="Entity type" value={selectedEntity?.type ?? '—'} disabled />
          <div className="md:col-span-2"><Textarea label="Notes" value={disputeForm.notes} onChange={(e) => setDisputeForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Describe the issue, customer claim, or billing disagreement." /></div>
        </div>
      </Modal>

      <Modal
        open={modal === 'newReason'}
        onClose={() => setModal(null)}
        title="New reason code"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={createReason.isPending} onClick={() => createReason.mutate({ ...reasonForm, code: reasonForm.code.trim(), description: reasonForm.description.trim() || null })} disabled={!reasonForm.code.trim()}>Create code</Button></div>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Code" value={reasonForm.code} onChange={(e) => setReasonForm((s) => ({ ...s, code: e.target.value }))} placeholder="PRICE_ERROR" />
          <Select label="Status" value={String(reasonForm.is_active)} onChange={(e) => setReasonForm((s) => ({ ...s, is_active: e.target.value === 'true' }))} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
          <div className="md:col-span-2"><Textarea label="Description" value={reasonForm.description} onChange={(e) => setReasonForm((s) => ({ ...s, description: e.target.value }))} rows={3} /></div>
        </div>
      </Modal>
    </div>
  );
}
