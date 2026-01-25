import React, { useMemo, useState } from 'react'; 
import { useQuery } from '@tanstack/react-query'; 
import { LayoutDashboard, Plus } from 'lucide-react'; 

import { useApi } from '../../../shared/hooks/useApi.js'; 
import { makePlanningApi } from '../api/planning.api.js'; 
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx'; 
import { DataTable } from '../../../shared/components/data/DataTable.jsx'; 
import { Button } from '../../../shared/components/ui/Button.jsx'; 
import { Modal } from '../../../shared/components/ui/Modal.jsx'; 
import { Input } from '../../../shared/components/ui/Input.jsx'; 
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx'; 

function arr(v) {
  if (!v) return []; 
  if (Array.isArray(v)) return v; 
  if (Array.isArray(v.data)) return v.data; 
  return []; 
}

export default function Dashboards() {
  const { http } = useApi(); 
  const api = useMemo(() => makePlanningApi(http), [http]); 
  const [open, setOpen] = useState(false); 
  const [form, setForm] = useState({ name: '', description: '', layoutJson: '{}' }); 

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reporting', 'dashboards'],
    queryFn: () => api.dashboards.list({ includeArchived: false, limit: 200, offset: 0 })
  }); 

  const rows = arr(data); 
  const columns = useMemo(
    () => [
      { header: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
      { header: 'Description', render: (r) => <span className="text-sm text-slate-700">{r.description ?? ''}</span> },
      { header: 'Status', render: (r) => <span className="text-xs text-slate-600">{r.status ?? ''}</span> }
    ],
    []
  ); 

  async function create() {
    let layoutJson = {}; 
    try {
      layoutJson = form.layoutJson ? JSON.parse(form.layoutJson) : {}; 
    } catch {
      layoutJson = {}; 
    }
    await api.dashboards.create({
      name: form.name,
      description: form.description || null,
      layoutJson
    }); 
    setOpen(false); 
    setForm({ name: '', description: '', layoutJson: '{}' }); 
    refetch(); 
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboards"
        subtitle="Create dashboard layouts and widgets for KPI and planning monitoring."
        icon={LayoutDashboard}
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button leftIcon={Plus} onClick={() => setOpen(true)}>
              New dashboard
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <DataTable
          columns={columns}
          rows={rows}
          loading={isLoading}
          empty={{ title: 'No dashboards', description: 'Create a dashboard to organize KPI and planning views.' }}
        />
        <div className="mt-4">
          <JsonPanel title="Raw response" value={data ?? {}} />
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New dashboard">
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          <Input label="Description" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
          <div>
            <div className="text-sm font-medium text-slate-900">layoutJson</div>
            <textarea
              value={form.layoutJson}
              onChange={(e) => setForm((s) => ({ ...s, layoutJson: e.target.value }))}
              className="mt-1 min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
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
