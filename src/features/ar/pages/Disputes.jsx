import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, ShieldCheck, Trash2 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeDisputesApi } from '../api/disputes.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export default function Disputes() {
  const { http } = useApi();
  const api = useMemo(() => makeDisputesApi(http), [http]);
  const qc = useQueryClient();
const toast = useToast();

  const [status, setStatus] = useState('');
  const qs = useMemo(() => (status ? { status } : {}), [status]);

  const { data: disputesData } = useQuery({ queryKey: qk.disputes(qs), queryFn: () => api.list(qs) });
  const disputes = Array.isArray(disputesData) ? disputesData : disputesData?.data ?? [];

  const { data: reasonsData } = useQuery({ queryKey: qk.disputeReasonCodes, queryFn: () => api.listReasonCodes() });
  const reasons = Array.isArray(reasonsData) ? reasonsData : reasonsData?.data ?? [];

  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState({});

  const createDispute = useMutation({
    mutationFn: (body) => api.create(body),
    onSuccess: () => {
      toast.success('Dispute created');
      qc.invalidateQueries({ queryKey: qk.disputes(qs) });
      setModal(null);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  });

  const createReason = useMutation({
    mutationFn: (body) => api.createReasonCode(body),
    onSuccess: () => {
      toast.success('Reason code created');
      qc.invalidateQueries({ queryKey: qk.disputeReasonCodes });
      setModal(null);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  });

  const columns = useMemo(
    () => [
      { header: 'ID', render: (r) => <span className="text-sm font-semibold text-slate-900">#{r.id}</span> },
      { header: 'Entity', render: (r) => <span className="text-sm text-slate-700">{r.entity_type}:{String(r.entity_id)}</span> },
      { header: 'Partner', render: (r) => <span className="text-sm text-slate-700">{r.partner_id}</span> },
      { header: 'Reason', render: (r) => <span className="text-sm text-slate-700">{r.reason_code ?? '—'}</span> },
      { header: 'Status', render: (r) => <Badge tone={(r.status ?? 'open') === 'open' ? 'brand' : 'muted'}>{r.status ?? 'open'}</Badge> }
    ],
    []
  );

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
                  left={<Input label="Status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="open|resolved|…" />}
                  right={
                    <Button
                      leftIcon={Plus}
                      onClick={() => {
                        setDraft({ entity_type: '', entity_id: '', partner_id: 0, reason_code: '', notes: null });
                        setModal('newDispute');
                      }}
                    >
                      New dispute
                    </Button>
                  }
                />
                <div className="mt-3">
                  <DataTable
                    columns={columns}
                    rows={disputes}
                    empty={{ title: 'No disputes', description: 'Create a dispute to pause collections while it is investigated.' }}
                  />
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
                  <Button
                    leftIcon={Plus}
                    onClick={() => {
                      setDraft({ code: '', description: null, is_active: true });
                      setModal('newReason');
                    }}
                  >
                    New code
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {reasons.length ? (
                    reasons.map((r) => (
                      <div key={r.code} className="rounded-2xl border border-border-subtle bg-white/70 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{r.code}</div>
                            <div className="mt-1 text-xs text-slate-500">{r.description ?? '—'}</div>
                          </div>
                          <Badge tone={r.is_active ? 'success' : 'muted'}>{r.is_active ? 'active' : 'inactive'}</Badge>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={Trash2}
                            onClick={() => api.deleteReasonCode(r.code).then(() => { toast.success('Deleted');qc.invalidateQueries({ queryKey: qk.disputeReasonCodes });}).catch((e) => toast.error(e?.message ?? 'Failed'))}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border-subtle bg-white/60 p-8 text-center text-sm text-slate-600 md:col-span-2 lg:col-span-3">
                      No reason codes.
                    </div>
                  )}
                </div>
              </ContentCard>
            )
          }
        ]}
      />

      <Modal open={modal === 'newDispute'} onClose={() => setModal(null)} title="New dispute">
        <JsonPanel title="Dispute payload" value={draft} submitLabel="Create" onSubmit={(json) => createDispute.mutate(json)} />
      </Modal>

      <Modal open={modal === 'newReason'} onClose={() => setModal(null)} title="New reason code">
        <JsonPanel title="Reason code payload" value={draft} submitLabel="Create" onSubmit={(json) => createReason.mutate(json)} />
      </Modal>
    </div>
  );
}
