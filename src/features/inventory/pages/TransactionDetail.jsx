import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, CheckCircle2, Upload, Undo2, Trash2 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { IdempotencyKeyField } from '../../../shared/components/forms/IdempotencyKeyField.jsx';

export default function TransactionDetail() {
  const { id } = useParams();
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'transactions', id],
    queryFn: () => api.getTransaction(id),
    enabled: !!id
  });

  const txn = data?.transaction ?? data?.data?.transaction ?? data;
  const lines = data?.lines ?? data?.data?.lines ?? txn?.lines ?? [];

  const status = txn?.status ?? 'draft';
  const statusTone = status === 'posted' ? 'success' : status === 'approved' ? 'warning' : 'muted';

  const columns = [
    { header: 'Item', render: (r) => <span className="font-mono text-xs text-slate-700">{r.item_id ?? r.itemId ?? '—'}</span> },
    { header: 'Quantity', render: (r) => <span className="text-sm text-slate-700">{r.quantity ?? '—'}</span> },
    { header: 'Unit cost', render: (r) => <span className="text-sm text-slate-700">{r.unit_cost ?? r.unitCost ?? '—'}</span> },
    { header: 'Direction', render: (r) => <span className="text-sm text-slate-700">{r.direction ?? '—'}</span> }
  ];

  const [action, setAction] = useState(null); // approve|post|void|reverse
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState(null);

  function openAction(kind) {
    setErrMsg(null);
    setIdempotencyKey('');
    setReason('');
    setAction(kind);
  }

  async function runAction() {
    if (!action) return;
    setSaving(true);
    setErrMsg(null);
    try {
      const headers = { 'Idempotency-Key': idempotencyKey };

      if (action === 'approve') await http.post(`/modules/inventory/transactions/${id}/approve`, {}, { headers });
      if (action === 'post') await http.post(`/modules/inventory/transactions/${id}/post`, {}, { headers });
      if (action === 'reverse') await http.post(`/modules/inventory/transactions/${id}/reverse`, {}, { headers });
      if (action === 'void') await http.post(`/modules/inventory/transactions/${id}/void`, { reason: reason === '' ? null : reason }, { headers });

      setAction(null);
      await qc.invalidateQueries({ queryKey: ['inventory', 'transactions', id] });
      await qc.invalidateQueries({ queryKey: ['inventory', 'transactions'] });
    } catch (e) {
      setErrMsg(e?.response?.data?.message ?? e?.message ?? 'Action failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={txn?.reference ? `Inventory Txn: ${txn.reference}` : 'Inventory Transaction'}
        subtitle="Approve and post workflows require Idempotency-Key headers."
        icon={ArrowLeftRight}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone}>{status}</Badge>
            <Button variant="outline" leftIcon={CheckCircle2} onClick={() => openAction('approve')}>
              Approve
            </Button>
            <Button variant="outline" leftIcon={Upload} onClick={() => openAction('post')}>
              Post
            </Button>
            <Button variant="outline" leftIcon={Undo2} onClick={() => openAction('reverse')}>
              Reverse
            </Button>
            <Button variant="outline" leftIcon={Trash2} onClick={() => openAction('void')}>
              Void
            </Button>
          </div>
        }
      />

      <ContentCard>
        {error ? <div className="text-sm text-red-600">{String(error?.message ?? 'Failed')}</div> : null}
        {isLoading ? <div className="text-sm text-slate-600">Loading…</div> : null}

        {!isLoading && txn ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Info label="Type" value={txn.txn_type ?? txn.txnType} />
            <Info label="Date" value={txn.txn_date ?? txn.txnDate} />
            <Info label="Period" value={txn.period_id ?? txn.periodId} />
            <Info label="Reference" value={txn.reference} />
            <Info label="Source warehouse" value={txn.source_warehouse_id ?? txn.sourceWarehouseId ?? '—'} />
            <Info label="Destination warehouse" value={txn.dest_warehouse_id ?? txn.destWarehouseId ?? '—'} />
          </div>
        ) : null}
      </ContentCard>

      <ContentCard title="Lines">
        <DataTable columns={columns} rows={lines} isLoading={false} emptyTitle="No lines" emptyDescription="This transaction has no lines." />
      </ContentCard>

      <Modal
        open={!!action}
        title={action ? `Confirm: ${action}` : 'Confirm'}
        onClose={() => setAction(null)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">{errMsg ? <span className="text-red-600">{errMsg}</span> : null}</div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setAction(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={runAction} disabled={saving}>
                {saving ? 'Submitting…' : 'Submit'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <IdempotencyKeyField value={idempotencyKey} onChange={setIdempotencyKey} />
          {action === 'void' ? <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="optional" /> : null}
          <div className="text-xs text-slate-500">Backend requires Idempotency-Key for approve/post/void/reverse routes.</div>
        </div>
      </Modal>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{value ?? '—'}</div>
    </div>
  );
}
