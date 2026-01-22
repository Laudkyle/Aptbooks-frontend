import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Warehouse, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { IdempotencyKeyField } from '../../../shared/components/forms/IdempotencyKeyField.jsx';

export default function Warehouses() {
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);
  const qc = useQueryClient();

  const [q, setQ] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'warehouses'],
    queryFn: () => api.listWarehouses()
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];
  const filtered = rows.filter((r) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return String(r.code ?? '').toLowerCase().includes(needle) || String(r.name ?? '').toLowerCase().includes(needle);
  });

  const columns = useMemo(
    () => [
      {
        header: 'Warehouse',
        render: (r) => (
          <div className="flex flex-col">
            <div className="font-medium text-brand-deep">{r.name ?? '—'}</div>
            <div className="text-xs text-slate-500">{r.code ?? '—'}</div>
          </div>
        )
      },
      { header: 'Address', render: (r) => <span className="text-sm text-slate-700">{r.address ?? '—'}</span> }
    ],
    []
  );

  const [open, setOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [form, setForm] = useState({ code: '', name: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  function openCreate() {
    setErr(null);
    setIdempotencyKey('');
    setForm({ code: '', name: '', address: '' });
    setOpen(true);
  }

  async function create() {
    setErr(null);
    setSaving(true);
    try {
      await http.post(
        '/modules/inventory/warehouses',
        { code: form.code, name: form.name, address: form.address === '' ? null : form.address },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['inventory', 'warehouses'] });
    } catch (e) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Warehouses"
        subtitle="Maintain warehouse master data used by receipts, issues, transfers and stock counts."
        icon={Warehouse}
        actions={
          <Button leftIcon={Plus} variant="primary" onClick={openCreate}>
            New warehouse
          </Button>
        }
      />

      <ContentCard>
        <FilterBar
          left={
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by code or name…" label="Search" />
              <div className="hidden md:block" />
              <div className="hidden md:block" />
            </div>
          }
          right={<div className="text-xs text-slate-500">{error ? <span className="text-red-600">{String(error?.message ?? 'Failed')}</span> : null}</div>}
        />

        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={filtered}
            isLoading={isLoading}
            emptyTitle="No warehouses yet"
            emptyDescription="Create a warehouse to start recording stock movements."
          />
        </div>
      </ContentCard>

      <Modal
        open={open}
        title="New warehouse"
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
            <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. WH-01" />
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main warehouse" />
          </div>
          <Textarea label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="optional" />
        </div>
      </Modal>
    </div>
  );
}
