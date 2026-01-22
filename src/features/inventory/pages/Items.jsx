import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { IdempotencyKeyField } from '../../../shared/components/forms/IdempotencyKeyField.jsx';

export default function Items() {
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);
  const qc = useQueryClient();

  const [q, setQ] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'items'],
    queryFn: () => api.listItems()
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];
  const filtered = rows.filter((r) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return String(r.sku ?? '').toLowerCase().includes(needle) || String(r.name ?? '').toLowerCase().includes(needle);
  });

  const columns = useMemo(
    () => [
      { header: 'SKU', render: (r) => <span className="font-mono text-xs text-slate-700">{r.sku ?? '—'}</span> },
      { header: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name ?? '—'}</span> },
      { header: 'Category', render: (r) => <span className="text-sm text-slate-700">{r.category_name ?? r.categoryName ?? r.categoryId ?? '—'}</span> },
      { header: 'Unit', render: (r) => <span className="text-sm text-slate-700">{r.unit_name ?? r.unitName ?? r.unitId ?? '—'}</span> }
    ],
    []
  );

  // Create modal
  const [open, setOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [form, setForm] = useState({ categoryId: '', unitId: '', sku: '', name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  function openCreate() {
    setErr(null);
    setIdempotencyKey('');
    setForm({ categoryId: '', unitId: '', sku: '', name: '', description: '' });
    setOpen(true);
  }

  async function create() {
    setErr(null);
    setSaving(true);
    try {
      await http.post(
        '/modules/inventory/items',
        {
          categoryId: form.categoryId,
          unitId: form.unitId,
          sku: form.sku,
          name: form.name,
          description: form.description === '' ? null : form.description
        },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['inventory', 'items'] });
    } catch (e) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Items"
        subtitle="Maintain your inventory item master data."
        icon={BookOpen}
        actions={
          <Button leftIcon={Plus} variant="primary" onClick={openCreate}>
            New item
          </Button>
        }
      />

      <ContentCard>
        <FilterBar
          left={<Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SKU or name…" />}
          right={<div className="text-xs text-slate-500">{error ? <span className="text-red-600">{String(error?.message ?? 'Failed')}</span> : null}</div>}
        />

        <div className="mt-3">
          <DataTable columns={columns} rows={filtered} isLoading={isLoading} emptyTitle="No items" emptyDescription="Create an item to start stock transactions." />
        </div>
      </ContentCard>

      <Modal
        open={open}
        title="New inventory item"
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
            <Input label="Category ID" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} placeholder="uuid" />
            <Input label="Unit ID" value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} placeholder="uuid" />
            <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="required" />
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="required" />
          </div>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="optional" />
          <div className="text-xs text-slate-500">Backend service enforces: categoryId, unitId, sku, name.</div>
        </div>
      </Modal>
    </div>
  );
}
