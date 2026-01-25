import React, { useMemo, useState } from 'react'; 
import { useQuery } from '@tanstack/react-query'; 
import { Plus, PiggyBank, ChevronRight } from 'lucide-react'; 
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

export default function Budgets() {
  const { http } = useApi(); 
  const api = useMemo(() => makePlanningApi(http), [http]); 

  const [open, setOpen] = useState(false); 
  const [form, setForm] = useState({ name: '', fiscalYear: new Date().getFullYear(), currencyCode: 'GHS', status: 'draft' }); 

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reporting', 'budgets'],
    queryFn: () => api.budgets.list()
  }); 

  const rows = rowsFrom(data); 

  const columns = useMemo(
    () => [
      {
        header: 'Budget',
        render: (r) => (
          <Link to={`/planning/budgets/${r.id}`} className="group inline-flex items-center gap-2 text-sm font-medium text-slate-900">
            <span>{r.name ?? r.id}</span>
            <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 transition group-hover:opacity-100" />
          </Link>
        )
      },
      { header: 'Year', render: (r) => <span className="text-sm text-slate-700">{String(r.fiscal_year ?? r.fiscalYear ?? '')}</span> },
      { header: 'Currency', render: (r) => <span className="text-sm text-slate-700">{String(r.currency_code ?? r.currencyCode ?? '')}</span> },
      { header: 'Status', render: (r) => <span className="text-sm text-slate-700">{String(r.status ?? '')}</span> }
    ],
    []
  ); 

  async function create() {
    await api.budgets.create({
      name: form.name,
      fiscalYear: Number(form.fiscalYear),
      currencyCode: form.currencyCode,
      status: form.status
    }); 
    setOpen(false); 
    setForm({ name: '', fiscalYear: new Date().getFullYear(), currencyCode: 'GHS', status: 'draft' }); 
    refetch(); 
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Budgets"
        subtitle="Create budgets, versions, and detailed period lines with dimensions."
        icon={PiggyBank}
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button leftIcon={Plus} onClick={() => setOpen(true)}>
              New budget
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <DataTable
          columns={columns}
          rows={rows}
          loading={isLoading}
          empty={{ title: 'No budgets', description: 'Create your first budget to begin planning.' }}
        />
        <div className="mt-4">
          <JsonPanel title="Raw response" value={data ?? {}} />
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New budget">
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="FY Budget" />
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Fiscal year" type="number" value={form.fiscalYear} onChange={(e) => setForm((s) => ({ ...s, fiscalYear: e.target.value }))} />
            <Input label="Currency" value={form.currencyCode} onChange={(e) => setForm((s) => ({ ...s, currencyCode: e.target.value }))} placeholder="GHS" />
          </div>
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
