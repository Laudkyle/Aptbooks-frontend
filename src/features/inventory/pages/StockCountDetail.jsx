import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, CheckCircle2, Upload, Plus } from 'lucide-react';

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

export default function StockCountDetail() {
  const { id } = useParams();
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'stockCounts', id],
    queryFn: () => api.getStockCount(id),
    enabled: !!id
  });

  const sc = data?.stockCount ?? data?.data?.stockCount ?? data;
  const lines = data?.lines ?? data?.data?.lines ?? sc?.lines ?? [];

  const status = sc?.status ?? 'draft';
  const tone = status === 'posted' ? 'success' : status === 'approved' ? 'warning' : 'muted';

  const columns = [
    { header: 'Item', render: (r) => <span className="font-mono text-xs text-slate-700">{r.item_id ?? r.itemId ?? '—'}</span> },
    { header: 'Counted qty', render: (r) => <span className="text-sm text-slate-700">{r.counted_qty ?? r.countedQty ?? '—'}</span> },
    { header: 'Unit cost', render: (r) => <span className="text-sm text-slate-700">{r.unit_cost ?? r.unitCost ?? '—'}</span> }
  ];

  const [modal, setModal] = useState(null); // lines|submit|approve|post
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [linesJson, setLinesJson] = useState(JSON.stringify([{ itemId: '', countedQty: 0, unitCost: null }], null, 2));
  const [postBody, setPostBody] = useState({ periodId: '', txnDate: '', reference: '', memo: '' });
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState(null);

  function open(kind) {
    setErrMsg(null);
    setIdempotencyKey('');
    setModal(kind);
  }

  async function upsertLines() {
    setSaving(true);
    setErrMsg(null);
    try {
      const parsed = JSON.parse(linesJson);
      if (!Array.isArray(parsed)) throw new Error('lines must be array');
      await http.post(`/modules/inventory/stock-counts/${id}/lines`, { lines: parsed }, { headers: { 'Idempotency-Key': idempotencyKey } });
      setModal(null);
      await qc.invalidateQueries({ queryKey: ['inventory', 'stockCounts', id] });
    } catch (e) {
      setErrMsg(e?.response?.data?.message ?? e?.message ?? 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setSaving(true);
    setErrMsg(null);
    try {
      await http.post(`/modules/inventory/stock-counts/${id}/submit`, {}, { headers: { 'Idempotency-Key': idempotencyKey } });
      setModal(null);
      await qc.invalidateQueries({ queryKey: ['inventory', 'stockCounts', id] });
      await qc.invalidateQueries({ queryKey: ['inventory', 'stockCounts'] });
    } catch (e) {
      setErrMsg(e?.response?.data?.message ?? e?.message ?? 'Submit failed');
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    setSaving(true);
    setErrMsg(null);
    try {
      await http.post(`/modules/inventory/stock-counts/${id}/approve`, {}, { headers: { 'Idempotency-Key': idempotencyKey } });
      setModal(null);
      await qc.invalidateQueries({ queryKey: ['inventory', 'stockCounts', id] });
      await qc.invalidateQueries({ queryKey: ['inventory', 'stockCounts'] });
    } catch (e) {
      setErrMsg(e?.response?.data?.message ?? e?.message ?? 'Approve failed');
    } finally {
      setSaving(false);
    }
  }

  async function postAdjustments() {
    setSaving(true);
    setErrMsg(null);
    try {
      await http.post(
        `/modules/inventory/stock-counts/${id}/post`,
        {
          periodId: postBody.periodId,
          txnDate: postBody.txnDate,
          reference: postBody.reference === '' ? null : postBody.reference,
          memo: postBody.memo === '' ? null : postBody.memo
        },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );
      setModal(null);
      await qc.invalidateQueries({ queryKey: ['inventory', 'stockCounts', id] });
      await qc.invalidateQueries({ queryKey: ['inventory', 'stockCounts'] });
    } catch (e) {
      setErrMsg(e?.response?.data?.message ?? e?.message ?? 'Post failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={sc?.reference ? `Stock Count: ${sc.reference}` : 'Stock Count'}
        subtitle="Record lines, submit, approve, then post adjustments (idempotent)."
        icon={ClipboardList}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone}>{status}</Badge>
            <Button variant="outline" leftIcon={Plus} onClick={() => open('lines')}>
              Record lines
            </Button>
            <Button variant="outline" leftIcon={CheckCircle2} onClick={() => open('submit')}>
              Submit
            </Button>
            <Button variant="outline" leftIcon={CheckCircle2} onClick={() => open('approve')}>
              Approve
            </Button>
            <Button variant="outline" leftIcon={Upload} onClick={() => open('post')}>
              Post adjustments
            </Button>
          </div>
        }
      />

      <ContentCard>
        {error ? <div className="text-sm text-red-600">{String(error?.message ?? 'Failed')}</div> : null}
        {isLoading ? <div className="text-sm text-slate-600">Loading…</div> : null}

        {!isLoading && sc ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Info label="Warehouse" value={sc.warehouse_name ?? sc.warehouseName ?? sc.warehouseId} />
            <Info label="Count date" value={sc.count_date ?? sc.countDate} />
            <Info label="Reference" value={sc.reference ?? `SC-${sc.id}`} />
            <Info label="Status" value={status} />
          </div>
        ) : null}
      </ContentCard>

      <ContentCard title="Lines">
        <DataTable columns={columns} rows={lines} isLoading={false} emptyTitle="No lines" emptyDescription="Use “Record lines” to add counted quantities." />
      </ContentCard>

      <Modal
        open={!!modal}
        title={
          modal === 'lines'
            ? 'Record / Upsert lines'
            : modal === 'submit'
              ? 'Submit stock count'
              : modal === 'approve'
                ? 'Approve stock count'
                : modal === 'post'
                  ? 'Post adjustments'
                  : 'Action'
        }
        onClose={() => setModal(null)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">{errMsg ? <span className="text-red-600">{errMsg}</span> : null}</div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={modal === 'lines' ? upsertLines : modal === 'submit' ? submit : modal === 'approve' ? approve : postAdjustments}
                disabled={saving}
              >
                {saving ? 'Submitting…' : 'Submit'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <IdempotencyKeyField value={idempotencyKey} onChange={setIdempotencyKey} />

          {modal === 'lines' ? (
            <Textarea
              label="Lines JSON"
              value={linesJson}
              onChange={(e) => setLinesJson(e.target.value)}
              rows={10}
              placeholder='[{"itemId":"uuid","countedQty":10,"unitCost":null}]'
            />
          ) : null}

          {modal === 'post' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Period ID" value={postBody.periodId} onChange={(e) => setPostBody({ ...postBody, periodId: e.target.value })} placeholder="uuid" />
              <Input label="Txn date" value={postBody.txnDate} onChange={(e) => setPostBody({ ...postBody, txnDate: e.target.value })} placeholder="date string" />
              <Input label="Reference" value={postBody.reference} onChange={(e) => setPostBody({ ...postBody, reference: e.target.value })} placeholder="optional" />
              <Input label="Memo" value={postBody.memo} onChange={(e) => setPostBody({ ...postBody, memo: e.target.value })} placeholder="optional" />
            </div>
          ) : null}

          <div className="text-xs text-slate-500">
            Note: Backend currently has naming mismatches for stock-count service methods. If the backend hasn’t been patched, /lines or /post may still error at runtime.
          </div>
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
