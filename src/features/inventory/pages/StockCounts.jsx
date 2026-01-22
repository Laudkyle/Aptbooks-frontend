import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus } from 'lucide-react';

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
import { IdempotencyKeyField } from '../../../shared/components/forms/IdempotencyKeyField.jsx';

export default function StockCounts() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);
  const qc = useQueryClient();

  const [q, setQ] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'stockCounts'],
    queryFn: () => api.listStockCounts()
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];
  const filtered = rows.filter((r) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return String(r.reference ?? '').toLowerCase().includes(needle) || String(r.status ?? '').toLowerCase().includes(needle);
  });

  const columns = useMemo(
    () => [
      { header: 'Reference', render: (r) => <span className="font-medium text-slate-900">{r.reference ?? `SC-${r.id}`}</span> },
      { header: 'Warehouse', render: (r) => <span className="text-sm text-slate-700">{r.warehouse_name ?? r.warehouseName ?? r.warehouseId ?? '—'}</span> },
      { header: 'Count date', render: (r) => <span className="text-sm text-slate-700">{r.count_date ?? r.countDate ?? '—'}</span> },
      { header: 'Status', render: (r) => <Badge tone={(r.status ?? 'draft') === 'posted' ? 'success' : (r.status ?? 'draft') === 'approved' ? 'warning' : 'muted'}>{r.status ?? 'draft'}</Badge> }
    ],
    []
  );

  // Create modal
  const [open, setOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [form, setForm] = useState({ warehouseId: '', countDate: '', reference: '', memo: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  function openCreate() {
    setErr(null);
    setIdempotencyKey('');
    setForm({ warehouseId: '', countDate: '', reference: '', memo: '' });
    setOpen(true);
  }

  async function create() {
    setErr(null);
    setSaving(true);
    try {
      const res = await http.post(
        '/modules/inventory/stock-counts',
        {
          warehouseId: form.warehouseId,
          countDate: form.countDate,
          reference: form.reference === '' ? null : form.reference,
          memo: form.memo === '' ? null : form.memo
        },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );

      const created = res?.data ?? res;
      const id = created?.id ?? created?.data?.id;
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['inventory', 'stockCounts'] });
      if (id) navigate(ROUTES.inventoryStockCountDetail(id));
    } catch (e) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock Counts"
        subtitle="Create count sheets, record counted quantities, and post inventory adjustments."
        icon={ClipboardList}
        actions={
          <Button leftIcon={Plus} variant="primary" onClick={openCreate}>
            New stock count
          </Button>
        }
      />

      <ContentCard>
        <FilterBar
          left={<Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference or status…" />}
          right={<div className="text-xs text-slate-500">{error ? <span className="text-red-600">{String(error?.message ?? 'Failed')}</span> : null}</div>}
        />

        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={filtered}
            isLoading={isLoading}
            onRowClick={(r) => navigate(ROUTES.inventoryStockCountDetail(r.id))}
            emptyTitle="No stock counts"
            emptyDescription="Create a stock count to reconcile physical vs system quantities."
          />
        </div>
      </ContentCard>

      <Modal
        open={open}
        title="New stock count"
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
            <Input label="Warehouse ID" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })} placeholder="uuid" />
            <Input label="Count date" value={form.countDate} onChange={(e) => setForm({ ...form, countDate: e.target.value })} placeholder="date string" />
            <Input label="Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="optional" />
            <Input label="Memo" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="optional" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
