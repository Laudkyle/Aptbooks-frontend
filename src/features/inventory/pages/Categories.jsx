import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus, Trash2 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { IdempotencyKeyField } from '../../../shared/components/forms/IdempotencyKeyField.jsx';

export default function Categories() {
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [form, setForm] = useState({
    code: '',
    name: '',
    inventoryAccountId: '',
    cogsAccountId: '',
    adjustmentAccountId: '',
    clearingAccountId: ''
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'categories'],
    queryFn: () => api.listCategories()
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];
  const filtered = rows.filter((r) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return String(r.code ?? '').toLowerCase().includes(needle) || String(r.name ?? '').toLowerCase().includes(needle);
  });

  const columns = useMemo(
    () => [
      { header: 'Code', render: (r) => <span className="font-mono text-xs text-slate-700">{r.code ?? '—'}</span> },
      { header: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name ?? '—'}</span> },
      { header: 'Status', render: (r) => <Badge tone={(r.status ?? 'active') === 'active' ? 'success' : 'muted'}>{r.status ?? 'active'}</Badge> }
    ],
    []
  );

  function openCreate() {
    setEditing(null);
    setErr(null);
    setIdempotencyKey('');
    setForm({ code: '', name: '', inventoryAccountId: '', cogsAccountId: '', adjustmentAccountId: '', clearingAccountId: '' });
    setOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setErr(null);
    setIdempotencyKey('');
    setForm({
      code: row.code ?? '',
      name: row.name ?? '',
      inventoryAccountId: row.inventory_account_id ?? row.inventoryAccountId ?? '',
      cogsAccountId: row.cogs_account_id ?? row.cogsAccountId ?? '',
      adjustmentAccountId: row.adjustment_account_id ?? row.adjustmentAccountId ?? '',
      clearingAccountId: row.clearing_account_id ?? row.clearingAccountId ?? ''
    });
    setOpen(true);
  }

  async function save() {
    setErr(null);
    setSaving(true);
    try {
      if (!editing) {
        await http.post(
          '/modules/inventory/categories',
          {
            code: form.code,
            name: form.name,
            inventoryAccountId: form.inventoryAccountId,
            cogsAccountId: form.cogsAccountId,
            adjustmentAccountId: form.adjustmentAccountId,
            clearingAccountId: form.clearingAccountId
          },
          { headers: { 'Idempotency-Key': idempotencyKey } }
        );
      } else {
        await http.put(`/modules/inventory/categories/${editing.id}`, { ...form });
      }
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['inventory', 'categories'] });
    } catch (e) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editing) return;
    setErr(null);
    setSaving(true);
    try {
      await http.delete(`/modules/inventory/categories/${editing.id}`);
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['inventory', 'categories'] });
    } catch (e) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Delete failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Item Categories"
        subtitle="Inventory category accounts are required by backend service validation."
        icon={Layers}
        actions={
          <Button leftIcon={Plus} variant="primary" onClick={openCreate}>
            New category
          </Button>
        }
      />

      <ContentCard>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code or name…" />
          <div className="text-xs text-slate-500">{error ? <span className="text-red-600">{String(error?.message ?? 'Failed')}</span> : null}</div>
        </div>

        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={filtered}
            isLoading={isLoading}
            onRowClick={openEdit}
            emptyTitle="No categories"
            emptyDescription="Create an inventory category to define inventory/COGS/adjustment/clearing accounts."
          />
        </div>
      </ContentCard>

      <Modal
        open={open}
        title={editing ? 'Edit category' : 'New category'}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">{err ? <span className="text-red-600">{err}</span> : null}</div>
            <div className="flex items-center gap-2">
              {editing ? (
                <Button variant="outline" leftIcon={Trash2} onClick={remove} disabled={saving}>
                  Delete
                </Button>
              ) : null}
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          {!editing ? <IdempotencyKeyField value={idempotencyKey} onChange={setIdempotencyKey} /> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input
              label="Inventory account ID"
              value={form.inventoryAccountId}
              onChange={(e) => setForm({ ...form, inventoryAccountId: e.target.value })}
              placeholder="uuid"
            />
            <Input label="COGS account ID" value={form.cogsAccountId} onChange={(e) => setForm({ ...form, cogsAccountId: e.target.value })} placeholder="uuid" />
            <Input
              label="Adjustment account ID"
              value={form.adjustmentAccountId}
              onChange={(e) => setForm({ ...form, adjustmentAccountId: e.target.value })}
              placeholder="uuid"
            />
            <Input
              label="Clearing account ID"
              value={form.clearingAccountId}
              onChange={(e) => setForm({ ...form, clearingAccountId: e.target.value })}
              placeholder="uuid"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
