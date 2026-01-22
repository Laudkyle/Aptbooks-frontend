import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, PlayCircle, Plus } from 'lucide-react';

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

export default function SavedReports() {
  const { http } = useApi();
  const api = useMemo(() => makePlanningApi(http), [http]);
  const [open, setOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', folder: '', kind: 'sql', querySql: '', templateKey: '' });
  const [runForm, setRunForm] = useState({ versionId: '', maxRows: 500 });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reporting', 'reports', 'list'],
    queryFn: () => api.savedReports.list({ includeArchived: 'false', limit: 100, offset: 0 })
  });
  const rows = rowsFrom(data);

  const columns = useMemo(() => {
    return [
      {
        header: 'Name',
        render: (r) => (
          <div className="space-y-0.5">
            <div className="text-sm font-medium text-slate-900">{r.name || '(unnamed)'}</div>
            <div className="text-xs text-slate-600">{r.folder || 'No folder'}</div>
          </div>
        )
      },
      { header: 'Kind', render: (r) => <span className="text-sm text-slate-700">{r.kind || 'sql'}</span> },
      { header: 'Status', render: (r) => <span className="text-sm text-slate-700">{r.status || r.is_archived ? 'archived' : 'active'}</span> },
      {
        header: '',
        render: (r) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={PlayCircle}
              onClick={() => {
                setSelected(r);
                setRunOpen(true);
              }}
            >
              Run
            </Button>
          </div>
        )
      }
    ];
  }, []);

  async function create() {
    const body = {
      name: form.name,
      description: form.description || null,
      folder: form.folder || null,
      kind: form.kind,
      querySql: form.kind === 'sql' ? form.querySql : undefined,
      templateKey: form.kind === 'management' ? form.templateKey : undefined,
      parameters: {}
    };
    await api.savedReports.create(body);
    setOpen(false);
    setForm({ name: '', description: '', folder: '', kind: 'sql', querySql: '', templateKey: '' });
    refetch();
  }

  async function run() {
    if (!selected?.id) return;
    const payload = {
      versionId: runForm.versionId || null,
      scheduleId: null,
      parameters: [],
      maxRows: Number(runForm.maxRows || 500)
    };
    const res = await api.savedReports.run(selected.id, payload);
    setSelected((s) => ({ ...s, _lastRun: res }));
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Saved Reports"
        subtitle="Catalog, share, schedule, and run saved report definitions."
        icon={FileText}
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button leftIcon={Plus} onClick={() => setOpen(true)}>
              New report
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <DataTable
          columns={columns}
          rows={rows}
          loading={isLoading}
          empty={{ title: 'No saved reports', description: 'Create a report definition and run it on demand.' }}
        />

        <div className="mt-4">
          <JsonPanel title="Raw response" value={data ?? {}} />
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create report">
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          <Input label="Folder" value={form.folder} onChange={(e) => setForm((s) => ({ ...s, folder: e.target.value }))} placeholder="Optional" />
          <Select
            label="Kind"
            value={form.kind}
            onChange={(e) => setForm((s) => ({ ...s, kind: e.target.value }))}
            options={[
              { label: 'SQL', value: 'sql' },
              { label: 'Management template', value: 'management' }
            ]}
          />
          {form.kind === 'sql' ? (
            <div>
              <div className="mb-1 text-sm font-medium text-slate-800">Query SQL</div>
              <textarea
                className="h-40 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 outline-none focus:ring-2 focus:ring-[var(--color-brand-light)]"
                value={form.querySql}
                onChange={(e) => setForm((s) => ({ ...s, querySql: e.target.value }))}
                placeholder="SELECT ..."
              />
            </div>
          ) : (
            <Input label="Template key" value={form.templateKey} onChange={(e) => setForm((s) => ({ ...s, templateKey: e.target.value }))} placeholder="e.g., departmental-pnl" />
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={!form.name || (form.kind === 'sql' && !form.querySql)}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={runOpen} onClose={() => setRunOpen(false)} title="Run report">
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-medium text-slate-900">{selected?.name}</div>
            <div className="text-xs text-slate-600">{selected?.id}</div>
          </div>
          <Input label="Version ID" value={runForm.versionId} onChange={(e) => setRunForm((s) => ({ ...s, versionId: e.target.value }))} placeholder="Optional" />
          <Input
            label="Max rows"
            value={String(runForm.maxRows)}
            onChange={(e) => setRunForm((s) => ({ ...s, maxRows: e.target.value }))}
            placeholder="500"
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRunOpen(false)}>
              Close
            </Button>
            <Button leftIcon={PlayCircle} onClick={run}>
              Run
            </Button>
          </div>

          {selected?._lastRun ? (
            <div className="pt-2">
              <JsonPanel title="Last run response" value={selected._lastRun} />
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
