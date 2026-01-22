import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Plus, Calculator } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
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

export default function KPIs() {
  const { http } = useApi();
  const api = useMemo(() => makePlanningApi(http), [http]);

  const [tab, setTab] = useState('definitions');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', kpiType: 'ACCOUNT_BALANCE', accountId: '', status: 'active', category: '' });
  const [compute, setCompute] = useState({ periodId: '', asOfDate: '' });

  const defsQ = useQuery({
    queryKey: ['reporting', 'kpis', 'definitions'],
    queryFn: () => api.kpis.definitions.list({ limit: 100, offset: 0 })
  });

  const valuesQ = useQuery({
    queryKey: ['reporting', 'kpis', 'values', compute.periodId || null],
    queryFn: () => api.kpis.values.list({ periodId: compute.periodId || null, limit: 200, offset: 0 })
  });

  const defRows = rowsFrom(defsQ.data);
  const valRows = rowsFrom(valuesQ.data);

  const columns = useMemo(() => {
    const rows = tab === 'definitions' ? defRows : valRows;
    const keys = rows[0] ? Object.keys(rows[0]) : [];
    const show = keys.filter((k) => !String(k).toLowerCase().includes('json')).slice(0, 7);
    return show.map((k) => ({ header: k, render: (r) => <span className="text-sm text-slate-800">{String(r[k] ?? '')}</span> }));
  }, [tab, defRows, valRows]);

  async function createDefinition() {
    const body = {
      code: form.code,
      name: form.name,
      kpiType: form.kpiType,
      accountId: form.kpiType === 'ACCOUNT_BALANCE' ? form.accountId : null,
      status: form.status,
      expressionJson: form.kpiType === 'EXPRESSION' ? {} : undefined,
      category: form.category || null
    };
    await api.kpis.definitions.create(body);
    setOpen(false);
    setForm({ code: '', name: '', kpiType: 'ACCOUNT_BALANCE', accountId: '', status: 'active', category: '' });
    defsQ.refetch();
  }

  async function computeValues() {
    if (!compute.periodId) return;
    await api.kpis.values.compute({ periodId: compute.periodId, asOfDate: compute.asOfDate || null });
    valuesQ.refetch();
  }

  const rows = tab === 'definitions' ? defRows : valRows;

  return (
    <div className="space-y-4">
      <PageHeader
        title="KPIs"
        subtitle="Define KPIs and compute values per period; manage targets and thresholds in subsequent phases."
        icon={Activity}
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => (tab === 'definitions' ? defsQ.refetch() : valuesQ.refetch())}>
              Refresh
            </Button>
            {tab === 'definitions' ? (
              <Button leftIcon={Plus} onClick={() => setOpen(true)}>
                New definition
              </Button>
            ) : (
              <Button leftIcon={Calculator} onClick={computeValues} disabled={!compute.periodId}>
                Compute
              </Button>
            )}
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <Tabs
            value={tab}
            onValueChange={setTab}
            items={[
              { value: 'definitions', label: 'Definitions' },
              { value: 'values', label: 'Values' }
            ]}
          />
          {tab === 'values' ? (
            <div className="grid w-full gap-3 md:w-auto md:grid-cols-2">
              <Input label="Period ID" value={compute.periodId} onChange={(e) => setCompute((s) => ({ ...s, periodId: e.target.value }))} placeholder="uuid" />
              <Input label="As of date" value={compute.asOfDate} onChange={(e) => setCompute((s) => ({ ...s, asOfDate: e.target.value }))} placeholder="YYYY-MM-DD (optional)" />
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          <DataTable columns={columns} rows={rows} loading={tab === 'definitions' ? defsQ.isLoading : valuesQ.isLoading} />
        </div>

        <div className="mt-4">
          <JsonPanel title="Raw response" value={(tab === 'definitions' ? defsQ.data : valuesQ.data) ?? {}} />
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New KPI definition">
        <div className="space-y-3">
          <Input label="Code" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} placeholder="e.g., GROSS_MARGIN" />
          <Input label="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g., Gross margin" />
          <Select
            label="Type"
            value={form.kpiType}
            onChange={(e) => setForm((s) => ({ ...s, kpiType: e.target.value }))}
            options={[
              { label: 'Account balance', value: 'ACCOUNT_BALANCE' },
              { label: 'Expression', value: 'EXPRESSION' }
            ]}
          />
          {form.kpiType === 'ACCOUNT_BALANCE' ? <Input label="Account ID" value={form.accountId} onChange={(e) => setForm((s) => ({ ...s, accountId: e.target.value }))} placeholder="uuid" /> : null}
          <Input label="Category" value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} placeholder="Optional" />
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
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button leftIcon={Plus} onClick={createDefinition} disabled={!form.code || !form.name}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
