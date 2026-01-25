import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderKanban, Plus, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makePlanningApi } from '../api/planning.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';

function rowsFrom(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

export default function Projects() {
  const { http } = useApi();
  const api = useMemo(() => makePlanningApi(http), [http]);

  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', status: 'active' });

  const qs = useMemo(() => ({ status: status || undefined, limit: 100, offset: 0 }), [status]);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reporting', 'projects', qs],
    queryFn: () => api.projects.list(qs)
  });

  const rows = rowsFrom(data);

  const columns = useMemo(() => {
    return [
      {
        header: 'Project',
        render: (r) => (
          <Link to={`/reporting/projects/${r.id}`} className="group inline-flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900 group-hover:text-[color:var(--color-brand-primary)]">{r.name ?? '—'}</span>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[color:var(--color-brand-primary)]" />
          </Link>
        )
      },
      { header: 'Code', render: (r) => <span className="text-sm text-slate-700">{r.code ?? '—'}</span> },
      { header: 'Status', render: (r) => <span className="text-sm text-slate-700">{r.status ?? '—'}</span> },
      { header: 'Updated', render: (r) => <span className="text-xs text-slate-600">{String(r.updated_at ?? r.updatedAt ?? '')}</span> }
    ];
  }, []);

  async function create() {
    await api.projects.create({ code: form.code || null, name: form.name, status: form.status });
    setOpen(false);
    setForm({ code: '', name: '', status: 'active' });
    refetch();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projects"
        subtitle="Create projects, phases, and tasks for planning and dimension-aware reporting."
        icon={FolderKanban}
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button leftIcon={Plus} onClick={() => setOpen(true)}>
              New project
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xs">
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { label: 'All', value: '' },
                { label: 'Active', value: 'active' },
                { label: 'Closed', value: 'closed' },
                { label: 'Archived', value: 'archived' }
              ]}
            />
          </div>
        </div>
        <div className="mt-4">
          <DataTable
            columns={columns}
            rows={rows}
            loading={isLoading}
            empty={{ title: 'No projects', description: 'Create your first project to begin planning and tracking.' }}
          />
        </div>
        <div className="mt-4">
          <JsonPanel title="Raw response" value={data ?? {}} />
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New project">
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g., Branch rollout" />
          <Input label="Code" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} placeholder="Optional" />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Closed', value: 'closed' },
              { label: 'Archived', value: 'archived' }
            ]}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
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
