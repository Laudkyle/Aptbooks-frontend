import React, { useMemo, useState } from 'react'; 
import { useQuery } from '@tanstack/react-query'; 
import { Percent, PlayCircle, Plus } from 'lucide-react'; 

import { useApi } from '../../../shared/hooks/useApi.js'; 
import { makePlanningApi } from '../api/planning.api.js'; 
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx'; 
import { Tabs } from '../../../shared/components/ui/Tabs.jsx'; 
import { DataTable } from '../../../shared/components/data/DataTable.jsx'; 
import { Button } from '../../../shared/components/ui/Button.jsx'; 
import { Modal } from '../../../shared/components/ui/Modal.jsx'; 
import { Input } from '../../../shared/components/ui/Input.jsx'; 
import { JsonEditor } from '../../../shared/components/data/JsonEditor.jsx'; 
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx'; 

function rowsFrom(data) {
  if (!data) return []; 
  if (Array.isArray(data)) return data; 
  if (Array.isArray(data.data)) return data.data; 
  if (Array.isArray(data.items)) return data.items; 
  return []; 
}

export default function Allocations() {
  const { http } = useApi(); 
  const api = useMemo(() => makePlanningApi(http), [http]); 

  const [tab, setTab] = useState('bases'); 
  const [open, setOpen] = useState(false); 
  const [preview, setPreview] = useState(null); 
  const [compute, setCompute] = useState(null); 
  const [form, setForm] = useState({ name: '', baseId: '', sourceAccountId: '', targetDimension: 'costcenter', payloadJson: { targets: [] } }); 

  const basesQ = useQuery({ queryKey: ['reporting', 'allocations', 'bases'], queryFn: () => api.allocations.listBases() }); 
  const rulesQ = useQuery({ queryKey: ['reporting', 'allocations', 'rules'], queryFn: () => api.allocations.listRules() }); 

  const bases = rowsFrom(basesQ.data); 
  const rules = rowsFrom(rulesQ.data); 

  const cols = (rows) => {
    const keys = rows[0] ? Object.keys(rows[0]) : []; 
    return keys.slice(0, 7).map((k) => ({ header: k, render: (r) => <span className="text-sm text-slate-800">{String(r[k] ?? '')}</span> })); 
  }; 

  async function createRule() {
    await api.allocations.createRule({
      code: null,
      name: form.name,
      baseId: form.baseId,
      sourceAccountId: form.sourceAccountId,
      targetDimension: form.targetDimension,
      payloadJson: form.payloadJson,
      status: 'active'
    }); 
    setOpen(false); 
    setForm({ name: '', baseId: '', sourceAccountId: '', targetDimension: 'costcenter', payloadJson: { targets: [] } }); 
    rulesQ.refetch(); 
  }

  async function runPreview() {
    const ruleIds = rules.slice(0, 1).map((r) => r.id).filter(Boolean); 
    const periodId = compute?.periodId || preview?.periodId || ''; 
    if (!ruleIds.length || !periodId) return; 
    const out = await api.allocations.preview({ ruleIds, periodId }); 
    setPreview(out); 
  }

  async function runCompute() {
    const ruleIds = rules.slice(0, 1).map((r) => r.id).filter(Boolean); 
    const periodId = compute?.periodId || ''; 
    if (!ruleIds.length || !periodId) return; 
    const out = await api.allocations.compute({ ruleIds, periodId, memo: compute?.memo || null, replace: true }); 
    setCompute(out); 
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Allocations"
        subtitle="Define allocation bases and rules, preview computed allocations, then post to journals."
        icon={Percent}
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { basesQ.refetch();  rulesQ.refetch();  }}>
              Refresh
            </Button>
            <Button leftIcon={Plus} onClick={() => setOpen(true)}>
              New rule
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <Tabs
          value={tab}
          onValueChange={setTab}
          items={[
            { value: 'bases', label: 'Bases' },
            { value: 'rules', label: 'Rules' },
            { value: 'compute', label: 'Compute' }
          ]}
        />

        {tab === 'bases' ? (
          <div className="mt-4">
            <DataTable rows={bases} columns={cols(bases)} loading={basesQ.isLoading} empty={{ title: 'No bases', description: 'Create allocation bases in the backend or via this module.' }} />
            <div className="mt-4"><JsonPanel title="Raw response" value={basesQ.data ?? {}} /></div>
          </div>
        ) : null}

        {tab === 'rules' ? (
          <div className="mt-4">
            <DataTable rows={rules} columns={cols(rules)} loading={rulesQ.isLoading} empty={{ title: 'No rules', description: 'Create allocation rules to generate journals for cost allocations.' }} />
            <div className="mt-4"><JsonPanel title="Raw response" value={rulesQ.data ?? {}} /></div>
          </div>
        ) : null}

        {tab === 'compute' ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-900">Preview</div>
              <div className="mt-3">
                <Input label="Period ID" value={preview?.periodId ?? ''} onChange={(e) => setPreview((s) => ({ ...(s ?? {}), periodId: e.target.value }))} placeholder="uuid" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button leftIcon={PlayCircle} onClick={runPreview} disabled={!rules.length}>
                  Run preview (first rule)
                </Button>
              </div>
              <div className="mt-3"><JsonPanel title="Preview output" value={preview ?? {}} /></div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-900">Compute</div>
              <div className="mt-3 space-y-3">
                <Input label="Period ID" value={compute?.periodId ?? ''} onChange={(e) => setCompute((s) => ({ ...(s ?? {}), periodId: e.target.value }))} placeholder="uuid" />
                <Input label="Memo" value={compute?.memo ?? ''} onChange={(e) => setCompute((s) => ({ ...(s ?? {}), memo: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button leftIcon={PlayCircle} onClick={runCompute} disabled={!rules.length}>
                  Compute (first rule)
                </Button>
              </div>
              <div className="mt-3"><JsonPanel title="Compute output" value={compute ?? {}} /></div>
            </div>
          </div>
        ) : null}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New allocation rule">
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          <Input label="Base ID" value={form.baseId} onChange={(e) => setForm((s) => ({ ...s, baseId: e.target.value }))} placeholder="uuid" />
          <Input label="Source account ID" value={form.sourceAccountId} onChange={(e) => setForm((s) => ({ ...s, sourceAccountId: e.target.value }))} placeholder="uuid" />
          <Input label="Target dimension" value={form.targetDimension} onChange={(e) => setForm((s) => ({ ...s, targetDimension: e.target.value }))} placeholder="e.g., costcenter" />
          <JsonEditor label="payloadJson" value={form.payloadJson} onChange={(v) => setForm((s) => ({ ...s, payloadJson: v }))} height={220} />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createRule} disabled={!form.name || !form.baseId || !form.sourceAccountId || !form.targetDimension}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  ); 
}
