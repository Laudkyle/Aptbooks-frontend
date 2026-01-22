import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sliders, Plus, Archive } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAssetsApi } from '../api/assets.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { IdempotencyKeyField } from '../../../shared/components/forms/IdempotencyKeyField.jsx';

export default function AssetCategories() {
  const { http } = useApi();
  const api = useMemo(() => makeAssetsApi(http), [http]);
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [form, setForm] = useState({
    code: '',
    name: '',
    assetAccountId: '',
    accumDeprAccountId: '',
    deprExpenseAccountId: '',
    disposalGainAccountId: '',
    disposalLossAccountId: '',
    status: 'active'
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', 'categories'],
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
    setIdempotencyKey('');
    setForm({
      code: '',
      name: '',
      assetAccountId: '',
      accumDeprAccountId: '',
      deprExpenseAccountId: '',
      disposalGainAccountId: '',
      disposalLossAccountId: '',
      status: 'active'
    });
    setErr(null);
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setIdempotencyKey('');
    setForm({
      code: row.code ?? '',
      name: row.name ?? '',
      assetAccountId: row.asset_account_id ?? row.assetAccountId ?? '',
      accumDeprAccountId: row.accum_depr_account_id ?? row.accumDeprAccountId ?? '',
      deprExpenseAccountId: row.depr_expense_account_id ?? row.deprExpenseAccountId ?? '',
      disposalGainAccountId: row.disposal_gain_account_id ?? row.disposalGainAccountId ?? '',
      disposalLossAccountId: row.disposal_loss_account_id ?? row.disposalLossAccountId ?? '',
      status: row.status ?? 'active'
    });
    setErr(null);
    setModalOpen(true);
  }

  async function save() {
    setErr(null);
    setSaving(true);
    try {
      if (!editing) {
        await http.post(
          '/modules/assets/categories',
          {
            code: form.code,
            name: form.name,
            assetAccountId: form.assetAccountId,
            accumDeprAccountId: form.accumDeprAccountId,
            deprExpenseAccountId: form.deprExpenseAccountId,
            disposalGainAccountId: form.disposalGainAccountId,
            disposalLossAccountId: form.disposalLossAccountId
          },
          { headers: { 'Idempotency-Key': idempotencyKey } }
        );
      } else {
        await api.updateCategory(editing.id, {
          code: form.code,
          name: form.name,
          assetAccountId: form.assetAccountId || undefined,
          accumDeprAccountId: form.accumDeprAccountId || undefined,
          deprExpenseAccountId: form.deprExpenseAccountId || undefined,
          disposalGainAccountId: form.disposalGainAccountId || undefined,
          disposalLossAccountId: form.disposalLossAccountId || undefined,
          status: form.status || undefined
        });
      }
      setModalOpen(false);
      await qc.invalidateQueries({ queryKey: ['assets', 'categories'] });
    } catch (e) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!editing) return;
    setErr(null);
    setSaving(true);
    try {
      await api.archiveCategory(editing.id);
      setModalOpen(false);
      await qc.invalidateQueries({ queryKey: ['assets', 'categories'] });
    } catch (e) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Archive failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Asset Categories"
        subtitle="Define fixed-asset classes and their posting accounts."
        icon={Sliders}
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
            emptyDescription="Create at least one asset category before registering fixed assets."
          />
        </div>
      </ContentCard>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit category' : 'New category'}
        onClose={() => setModalOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">{err ? <span className="text-red-600">{err}</span> : null}</div>
            <div className="flex items-center gap-2">
              {editing ? (
                <Button variant="outline" leftIcon={Archive} onClick={archive} disabled={saving}>
                  Archive
                </Button>
              ) : null}
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
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
          {!editing ? (
            <IdempotencyKeyField value={idempotencyKey} onChange={setIdempotencyKey} hint="Required by backend for category creation." />
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. VEH" />
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Vehicles" />
            <Input label="Asset account ID" value={form.assetAccountId} onChange={(e) => setForm({ ...form, assetAccountId: e.target.value })} placeholder="uuid" />
            <Input label="Accum. depreciation account ID" value={form.accumDeprAccountId} onChange={(e) => setForm({ ...form, accumDeprAccountId: e.target.value })} placeholder="uuid" />
            <Input label="Depreciation expense account ID" value={form.deprExpenseAccountId} onChange={(e) => setForm({ ...form, deprExpenseAccountId: e.target.value })} placeholder="uuid" />
            <Input label="Disposal gain account ID" value={form.disposalGainAccountId} onChange={(e) => setForm({ ...form, disposalGainAccountId: e.target.value })} placeholder="uuid" />
            <Input label="Disposal loss account ID" value={form.disposalLossAccountId} onChange={(e) => setForm({ ...form, disposalLossAccountId: e.target.value })} placeholder="uuid" />
            <Input label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} placeholder="active|inactive" />
          </div>
          <div className="text-xs text-slate-500">All account IDs must be UUIDs per backend validators.</div>
        </div>
      </Modal>
    </div>
  );
}
