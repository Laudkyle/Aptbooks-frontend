import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAssetsApi } from '../api/assets.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { IdempotencyKeyField } from '../../../shared/components/forms/IdempotencyKeyField.jsx';

export default function AssetRegister() {
  const { http } = useApi();
  const api = useMemo(() => makeAssetsApi(http), [http]);
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [form, setForm] = useState({
    categoryId: '',
    code: '',
    name: '',
    acquisitionDate: '',
    cost: '',
    salvageValue: '',
    locationId: '',
    departmentId: '',
    costCenterId: ''
  });
  const [createErr, setCreateErr] = useState(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', 'fixedAssets', { status: status || undefined }],
    queryFn: () => api.listFixedAssets(status ? { status } : undefined)
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];
  const filtered = rows.filter((r) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      String(r.code ?? '').toLowerCase().includes(needle) ||
      String(r.name ?? '').toLowerCase().includes(needle) ||
      String(r.category_name ?? r.categoryName ?? '').toLowerCase().includes(needle)
    );
  });

  const columns = useMemo(
    () => [
      {
        header: 'Asset',
        render: (r) => (
          <div className="flex flex-col">
            <Link to={ROUTES.assetsAssetDetail(r.id)} className="font-medium text-brand-deep hover:underline">
              {r.name ?? '—'}
            </Link>
            <div className="text-xs text-slate-500">{r.code ?? '—'}</div>
          </div>
        )
      },
      { header: 'Category', render: (r) => <span className="text-sm text-slate-700">{r.category_name ?? r.categoryName ?? '—'}</span> },
      { header: 'Acquired', render: (r) => <span className="text-sm text-slate-700">{String(r.acquisition_date ?? r.acquisitionDate ?? '—')}</span> },
      { header: 'Cost', render: (r) => <span className="text-sm font-medium text-slate-900">{r.cost ?? '—'}</span> },
      {
        header: 'Status',
        render: (r) => {
          const s = r.status ?? 'draft';
          const tone = s === 'active' ? 'success' : s === 'disposed' ? 'danger' : s === 'retired' ? 'warning' : 'muted';
          return <Badge tone={tone}>{s}</Badge>;
        }
      }
    ],
    []
  );

  function openCreate() {
    setCreateErr(null);
    setForm({
      categoryId: '',
      code: '',
      name: '',
      acquisitionDate: '',
      cost: '',
      salvageValue: '',
      locationId: '',
      departmentId: '',
      costCenterId: ''
    });
    setIdempotencyKey('');
    setCreateOpen(true);
  }

  async function submitCreate() {
    setCreateErr(null);
    setCreating(true);
    try {
      const payload = {
        categoryId: form.categoryId,
        code: form.code,
        name: form.name,
        acquisitionDate: form.acquisitionDate,
        cost: Number(form.cost),
        salvageValue: form.salvageValue === '' ? undefined : Number(form.salvageValue),
        locationId: form.locationId === '' ? null : form.locationId,
        departmentId: form.departmentId === '' ? null : form.departmentId,
        costCenterId: form.costCenterId === '' ? null : form.costCenterId
      };

      await http.post('/modules/assets/fixed-assets', payload, {
        headers: { 'Idempotency-Key': idempotencyKey }
      });

      setCreateOpen(false);
      await qc.invalidateQueries({ queryKey: ['assets', 'fixedAssets'] });
    } catch (e) {
      setCreateErr(e?.response?.data?.message ?? e?.message ?? 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Asset Register"
        subtitle="Register fixed assets, monitor lifecycle status, and launch depreciation workflows."
        icon={Building2}
        actions={
          <Button leftIcon={Plus} variant="primary" onClick={openCreate}>
            Register asset
          </Button>
        }
      />

      <ContentCard>
        <FilterBar
          left={
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, name, category…" label="Search" />
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: '', label: 'All' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'active', label: 'Active' },
                  { value: 'retired', label: 'Retired' },
                  { value: 'disposed', label: 'Disposed' }
                ]}
              />
              <div className="hidden md:block" />
            </div>
          }
          right={<div className="text-xs text-slate-500">{error ? <span className="text-red-600">{String(error?.message ?? 'Failed to load')}</span> : null}</div>}
        />

        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={filtered}
            isLoading={isLoading}
            emptyTitle="No fixed assets yet"
            emptyDescription="Register assets to begin capitalisation and depreciation management."
          />
        </div>
      </ContentCard>

      <Modal
        open={createOpen}
        title="Register fixed asset (draft)"
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">{createErr ? <span className="text-red-600">{createErr}</span> : null}</div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={submitCreate} disabled={creating}>
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <IdempotencyKeyField value={idempotencyKey} onChange={setIdempotencyKey} hint="Required by backend for fixed asset registration." />
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Category ID" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} placeholder="uuid" />
            <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. FA-0001" />
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Asset name" />
            <Input label="Acquisition date" value={form.acquisitionDate} onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })} placeholder="YYYY-MM-DD" />
            <Input label="Cost" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="0.00" />
            <Input label="Salvage value" value={form.salvageValue} onChange={(e) => setForm({ ...form, salvageValue: e.target.value })} placeholder="0.00 (optional)" />
            <Input label="Location ID" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} placeholder="uuid or blank" />
            <Input label="Department ID" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} placeholder="uuid or blank" />
            <Input label="Cost Center ID" value={form.costCenterId} onChange={(e) => setForm({ ...form, costCenterId: e.target.value })} placeholder="uuid or blank" />
          </div>
          <Textarea label="Notes" value={''} onChange={() => {}} placeholder="(Fixed asset schema has no notes field.)" disabled />
          <div className="text-xs text-slate-500">
            Backend validation: categoryId, code, name, acquisitionDate, cost are required. Optional location/department/cost center may be null.
          </div>
        </div>
      </Modal>
    </div>
  );
}
