import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { IdempotencyKeyField } from '../../../shared/components/forms/IdempotencyKeyField.jsx';

export default function Transactions() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);
  const qc = useQueryClient();

  const [q, setQ] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'transactions'],
    queryFn: () => api.listTransactions()
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];
  const filtered = rows.filter((r) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      String(r.reference ?? '').toLowerCase().includes(needle) ||
      String(r.txn_type ?? r.txnType ?? '').toLowerCase().includes(needle) ||
      String(r.status ?? '').toLowerCase().includes(needle)
    );
  });

  const columns = useMemo(
    () => [
      { header: 'Type', render: (r) => <Badge tone="muted">{r.txn_type ?? r.txnType ?? '—'}</Badge> },
      { header: 'Date', render: (r) => <span className="text-sm text-slate-700">{r.txn_date ?? r.txnDate ?? '—'}</span> },
      { header: 'Reference', render: (r) => <span className="font-medium text-slate-900">{r.reference ?? `IT-${r.id}`}</span> },
      { header: 'Status', render: (r) => <Badge tone={(r.status ?? 'draft') === 'posted' ? 'success' : (r.status ?? 'draft') === 'approved' ? 'warning' : 'muted'}>{r.status ?? 'draft'}</Badge> }
    ],
    []
  );

  // Create modal
  const [open, setOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [form, setForm] = useState({
    periodId: '',
    txnDate: '',
    txnType: 'receipt',
    sourceWarehouseId: '',
    destWarehouseId: '',
    reference: '',
    memo: '',
    linesJson: JSON.stringify([{ itemId: '', quantity: 1, unitCost: 0 }], null, 2)
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  function openCreate() {
    setErr(null);
    setIdempotencyKey('');
    setForm({
      periodId: '',
      txnDate: '',
      txnType: 'receipt',
      sourceWarehouseId: '',
      destWarehouseId: '',
      reference: '',
      memo: '',
      linesJson: JSON.stringify([{ itemId: '', quantity: 1, unitCost: 0 }], null, 2)
    });
    setOpen(true);
  }

  async function create() {
    setErr(null);
    setSaving(true);
    try {
      let lines;
      try {
        lines = JSON.parse(form.linesJson);
        if (!Array.isArray(lines)) throw new Error('lines must be an array');
      } catch (e) {
        throw new Error(`Invalid lines JSON: ${e.message}`);
      }

      const body = {
        periodId: form.periodId,
        txnDate: form.txnDate,
        txnType: form.txnType,
        sourceWarehouseId: form.sourceWarehouseId === '' ? null : form.sourceWarehouseId,
        destWarehouseId: form.destWarehouseId === '' ? null : form.destWarehouseId,
        reference: form.reference === '' ? null : form.reference,
        memo: form.memo === '' ? null : form.memo,
        lines
      };

      const res = await http.post('/modules/inventory/transactions', body, { headers: { 'Idempotency-Key': idempotencyKey } });
      const created = res?.data ?? res;
      const id = created?.id ?? created?.data?.id;
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['inventory', 'transactions'] });
      if (id) navigate(ROUTES.inventoryTransactionDetail(id));
    } catch (e) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory Transactions"
        subtitle="Receipts, issues, transfers and adjustments (draft → approve → post)."
        icon={ArrowLeftRight}
        actions={
          <Button leftIcon={Plus} variant="primary" onClick={openCreate}>
            New transaction
          </Button>
        }
      />

      <ContentCard>
        <FilterBar
          left={<Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference, type, status…" />}
          right={<div className="text-xs text-slate-500">{error ? <span className="text-red-600">{String(error?.message ?? 'Failed')}</span> : null}</div>}
        />

        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={filtered}
            isLoading={isLoading}
            onRowClick={(r) => navigate(ROUTES.inventoryTransactionDetail(r.id))}
            emptyTitle="No inventory transactions"
            emptyDescription="Create a transaction to record stock movement."
          />
        </div>
      </ContentCard>

      <Modal
        open={open}
        title="New inventory transaction"
        onClose={() => setOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">{err ? <span className="text-red-600">{err}</span> : null}</div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={create} disabled={saving}>
                {saving ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <IdempotencyKeyField value={idempotencyKey} onChange={setIdempotencyKey} />
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Period ID" value={form.periodId} onChange={(e) => setForm({ ...form, periodId: e.target.value })} placeholder="uuid" />
            <Input label="Txn date" value={form.txnDate} onChange={(e) => setForm({ ...form, txnDate: e.target.value })} placeholder="date string" />
            <Select
              label="Txn type"
              value={form.txnType}
              onChange={(e) => setForm({ ...form, txnType: e.target.value })}
              options={[
                { value: 'receipt', label: 'Receipt' },
                { value: 'issue', label: 'Issue' },
                { value: 'transfer', label: 'Transfer' },
                { value: 'adjustment', label: 'Adjustment' }
              ]}
            />
            <Input label="Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="optional" />
            <Input
              label="Source warehouse ID"
              value={form.sourceWarehouseId}
              onChange={(e) => setForm({ ...form, sourceWarehouseId: e.target.value })}
              placeholder="required for issue/transfer/adjustment"
            />
            <Input
              label="Destination warehouse ID"
              value={form.destWarehouseId}
              onChange={(e) => setForm({ ...form, destWarehouseId: e.target.value })}
              placeholder="required for receipt/transfer"
            />
          </div>
          <Textarea label="Memo" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="optional" />
          <Textarea
            label="Lines (JSON array)"
            value={form.linesJson}
            onChange={(e) => setForm({ ...form, linesJson: e.target.value })}
            rows={10}
            placeholder='[{"itemId":"uuid","quantity":1,"unitCost":0}]'
          />
          <div className="text-xs text-slate-500">
            Backend rules depend on txnType (e.g., receipt requires destWarehouseId and unitCost on each line; transfer requires sourceWarehouseId and destWarehouseId and they cannot be equal).
          </div>
        </div>
      </Modal>
    </div>
  );
}
