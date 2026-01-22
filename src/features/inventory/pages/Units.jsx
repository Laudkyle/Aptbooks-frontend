import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ruler, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { IdempotencyKeyField } from '../../../shared/components/forms/IdempotencyKeyField.jsx';

export default function Units() {
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [form, setForm] = useState({ code: '', name: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'units'],
    queryFn: () => api.listUnits()
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
      { header: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name ?? '—'}</span> }
    ],
    []
  );

  function openCreate() {
    setErr(null);
    setIdempotencyKey('');
    setForm({ code: '', name: '' });
    setOpen(true);
  }

  async function create() {
    setErr(null);
    setSaving(true);
    try {
      await http.post('/modules/inventory/units', { code: form.code, name: form.name }, { headers: { 'Idempotency-Key': idempotencyKey } });
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['inventory', 'units'] });
    } catch (e) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Units"
        subtitle="Define units of measure for inventory items."
        icon={Ruler}
        actions={
          <Button leftIcon={Plus} variant="primary" onClick={openCreate}>
            New unit
          </Button>
        }
      />

      <ContentCard>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code or name…" />
          <div className="text-xs text-slate-500">{error ? <span className="text-red-600">{String(error?.message ?? 'Failed')}</span> : null}</div>
        </div>

        <div className="mt-3">
          <DataTable columns={columns} rows={filtered} isLoading={isLoading} emptyTitle="No units" emptyDescription="Create at least one unit before creating items." />
        </div>
      </ContentCard>

      <Modal
        open={open}
        title="New unit"
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
            <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. EA" />
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Each" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
