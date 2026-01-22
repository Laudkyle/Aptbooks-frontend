import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CloudSun, Plus, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makePlanningApi } from '../api/planning.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';

function rowsFrom(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

export default function Forecasts() {
  const { http } = useApi();
  const api = useMemo(() => makePlanningApi(http), [http]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ name: '', currencyCode: 'GHS', status: 'draft' });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reporting', 'forecasts', { status }],
    queryFn: () => api.forecasts.list({ status: status || undefined })
  });

  const rows = rowsFrom(data);
  const columns = useMemo(
    () => [
      { header: 'name', render: (r) => <div className="font-medium text-slate-900">{r.name}</div> },
      { header: 'status', render: (r) => <span className="text-sm text-slate-700">{r.status}</span> },
      { header: '', render: (r) => (
        <Link className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-brand-primary)]" to={`/planning/forecasts/${r.id}`}>
          Open <ChevronRight className="h-4 w-4" />
        </Link>
      ) }
    ],
    []
  );

  async function create() {
    await api.forecasts.create(form);
    setOpen(false);
    setForm({ name: '', currencyCode: 'GHS', status: 'draft' });
    refetch();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Forecasts"
        subtitle="Scenario forecasting with versioning and variance comparisons."
        icon={CloudSun}
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button leftIcon={Plus} onClick={() => setOpen(true)}>
              New forecast
            </Button>
          </div>
        }
      />

      <ContentCard>
        <div className="flex items-end justify-between gap-3">
          <div className="w-full max-w-xs">
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { label: 'All', value: '' },
                { label: 'Draft', value: 'draft' },
                { label: 'Active', value: 'active' },
                { label: 'Archived', value: 'archived' }
              ]}
            />
          </div>
        </div>
        <div className="mt-4">
          <DataTable columns={columns} rows={rows} loading={isLoading} empty={{ title: 'No forecasts', description: 'Create your first forecast scenario.' }} />
        </div>
      </ContentCard>

      <Modal open={open} onClose={() => setOpen(false)} title="New forecast">
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          <Input label="Currency" value={form.currencyCode} onChange={(e) => setForm((s) => ({ ...s, currencyCode: e.target.value }))} />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
            options={[
              { label: 'Draft', value: 'draft' },
              { label: 'Active', value: 'active' },
              { label: 'Archived', value: 'archived' }
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={!form.name}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
