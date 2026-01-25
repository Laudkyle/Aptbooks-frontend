import React, { useMemo, useState } from 'react'; 
import { useQuery } from '@tanstack/react-query'; 
import { Layers, Plus } from 'lucide-react'; 

import { useApi } from '../../../shared/hooks/useApi.js'; 
import { qk } from '../../../shared/query/keys.js'; 
import { makePlanningApi } from '../api/planning.api.js'; 
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx'; 
import { Tabs } from '../../../shared/components/ui/Tabs.jsx'; 
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

export default function Centers() {
  const { http } = useApi(); 
  const api = useMemo(() => makePlanningApi(http), [http]); 

  const [type, setType] = useState('cost'); 
  const [status, setStatus] = useState(''); 
  const [open, setOpen] = useState(false); 
  const [form, setForm] = useState({ code: '', name: '', status: 'active', parentId: '', validFrom: '', validTo: '', isBlocked: false, blockedReason: '' }); 

  const params = useMemo(() => ({ status: status || undefined }), [status]); 
  const { data, isLoading, refetch } = useQuery({
    queryKey: qk.reportingCenters ? qk.reportingCenters(type, params) : ['reporting', 'centers', type, params],
    queryFn: () => api.centers.list(type, params)
  }); 

  const rows = rowsFrom(data); 

  const columns = useMemo(() => {
    const keys = rows[0] ? Object.keys(rows[0]) : ['code', 'name', 'status']; 
    const show = keys.filter((k) => !['layoutJson', 'payloadJson', 'positionJson'].includes(k)).slice(0, 7); 
    return show.map((k) => ({
      header: k,
      render: (r) => <span className="text-sm text-slate-800">{String(r[k] ?? '')}</span>
    })); 
  }, [rows]); 

  async function create() {
    const body = {
      code: form.code || null,
      name: form.name,
      status: form.status,
      parentId: form.parentId || null,
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
      isBlocked: !!form.isBlocked,
      blockedReason: form.isBlocked ? form.blockedReason : null
    }; 
    await api.centers.create(type, body); 
    setOpen(false); 
    setForm({ code: '', name: '', status: 'active', parentId: '', validFrom: '', validTo: '', isBlocked: false, blockedReason: '' }); 
    refetch(); 
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Centers"
        subtitle="Manage cost, profit, and investment centers (dimension master data)."
        icon={Layers}
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button leftIcon={Plus} onClick={() => setOpen(true)}>
              New center
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <Tabs
            value={type}
            onValueChange={setType}
            items={[
              { value: 'cost', label: 'Cost centers' },
              { value: 'profit', label: 'Profit centers' },
              { value: 'investment', label: 'Investment centers' }
            ]}
          />
          <div className="w-full max-w-xs">
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { label: 'All', value: '' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
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
            empty={{ title: 'No centers', description: 'Create a center to begin tracking dimension performance.' }}
          />
        </div>

        <div className="mt-4">
          <JsonPanel title="Raw response" value={data ?? {}} />
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New center">
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g., Admin Department" />
          <Input label="Code" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} placeholder="Optional" />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
              { label: 'Archived', value: 'archived' }
            ]}
          />
          <Input label="Parent ID" value={form.parentId} onChange={(e) => setForm((s) => ({ ...s, parentId: e.target.value }))} placeholder="uuid (optional)" />
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Valid from" value={form.validFrom} onChange={(e) => setForm((s) => ({ ...s, validFrom: e.target.value }))} placeholder="YYYY-MM-DD" />
            <Input label="Valid to" value={form.validTo} onChange={(e) => setForm((s) => ({ ...s, validTo: e.target.value }))} placeholder="YYYY-MM-DD" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900">Blocked</div>
                <div className="text-xs text-slate-600">Prevent postings to this center until unblocked.</div>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.isBlocked}
                onChange={(e) => setForm((s) => ({ ...s, isBlocked: e.target.checked }))}
              />
            </div>
            {form.isBlocked ? (
              <div className="mt-3">
                <Input label="Blocked reason" value={form.blockedReason} onChange={(e) => setForm((s) => ({ ...s, blockedReason: e.target.value }))} placeholder="Reason (required when blocked)" />
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={!form.name || (form.isBlocked && !form.blockedReason)}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  ); 
}
