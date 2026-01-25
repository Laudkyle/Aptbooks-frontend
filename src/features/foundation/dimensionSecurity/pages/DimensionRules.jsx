import React, { useMemo, useState } from 'react'; 
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'; 
import { useApi } from '../../../../shared/hooks/useApi.js'; 
import { makeDimensionSecurityApi } from '../api/dimensionSecurity.api.js'; 
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx'; 
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx'; 
import { Button } from '../../../../shared/components/ui/Button.jsx'; 
import { Modal } from '../../../../shared/components/ui/Modal.jsx'; 
import { Input } from '../../../../shared/components/ui/Input.jsx'; 
import { useToast } from '../../../../shared/components/ui/Toast.jsx'; 

export default function DimensionRules() {
  const { http } = useApi(); 
  const api = useMemo(() => makeDimensionSecurityApi(http), [http]); 
  const qc = useQueryClient(); 
  const toast = useToast(); 

  const [limit, setLimit] = useState(100); 
  const [offset, setOffset] = useState(0); 

  const q = useQuery({
    queryKey: ['dimensionRules', limit, offset],
    queryFn: () => api.list({ limit, offset }),
    staleTime: 10_000
  }); 

  const rows = q.data?.data ?? []; 

  const [open, setOpen] = useState(false); 
  const [editing, setEditing] = useState(null); 
  const [form, setForm] = useState({ principalType: 'user', principalId: '', effect: 'allow', ruleJson: '{}', note: '' }); 

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        principalType: form.principalType,
        principalId: form.principalId,
        effect: form.effect,
        ruleJson: form.ruleJson ? JSON.parse(form.ruleJson) : {},
        note: form.note === '' ? null : form.note
      }; 
      if (editing?.id) return api.update(editing.id, body); 
      return api.create(body); 
    },
    onSuccess: () => {
      toast.success('Rule saved.'); 
      setOpen(false); 
      setEditing(null); 
      qc.invalidateQueries({ queryKey: ['dimensionRules'] }); 
    },
    onError: (e) => toast.error(e.message ?? 'Save failed')
  }); 

  const remove = useMutation({
    mutationFn: (id) => api.remove(id),
    onSuccess: () => {
      toast.success('Rule deleted.'); 
      qc.invalidateQueries({ queryKey: ['dimensionRules'] }); 
    },
    onError: (e) => toast.error(e.message ?? 'Delete failed')
  }); 

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dimension Security"
        subtitle="Rules controlling dimension-level access. Backend enforces principalType/effect." 
        actions={
          <div className="flex items-end gap-2">
            <Input label="Limit" type="number" min={1} max={500} value={limit} onChange={(e) => setLimit(Number(e.target.value) || 100)} className="w-28" />
            <Input label="Offset" type="number" min={0} value={offset} onChange={(e) => setOffset(Number(e.target.value) || 0)} className="w-28" />
            <Button onClick={() => {
              setEditing(null); 
              setForm({ principalType: 'user', principalId: '', effect: 'allow', ruleJson: '{}', note: '' }); 
              setOpen(true); 
            }}>New rule</Button>
          </div>
        }
      />

      <ContentCard title="Rules">
        {q.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : q.isError ? (
          <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load rules.'}</div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>ID</TH>
                <TH>Principal</TH>
                <TH>Effect</TH>
                <TH>Note</TH>
                <TH>Actions</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <TD className="font-mono text-xs">{r.id}</TD>
                  <TD>{r.principal_type ?? r.principalType} : {r.principal_id ?? r.principalId}</TD>
                  <TD>{r.effect}</TD>
                  <TD>{r.note ?? '—'}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditing({ id: r.id }); 
                          setForm({
                            principalType: r.principal_type ?? r.principalType ?? 'user',
                            principalId: r.principal_id ?? r.principalId ?? '',
                            effect: r.effect ?? 'allow',
                            ruleJson: JSON.stringify(r.rule_json ?? r.ruleJson ?? {}, null, 2),
                            note: r.note ?? ''
                          }); 
                          setOpen(true); 
                        }}
                      >Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => remove.mutate(r.id)} disabled={remove.isLoading}>Delete</Button>
                    </div>
                  </TD>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr><TD colSpan={5} className="text-slate-500">No rules.</TD></tr>
              ) : null}
            </TBody>
          </Table>
        )}
      </ContentCard>

      <Modal
        open={open}
        title={editing ? 'Edit rule' : 'Create rule'}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isLoading}>Save</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">principalType</span>
            <select
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-light focus:ring-2 focus:ring-brand-light"
              value={form.principalType}
              onChange={(e) => setForm((s) => ({ ...s, principalType: e.target.value }))}
            >
              <option value="user">user</option>
              <option value="role">role</option>
            </select>
          </label>
          <Input label="principalId" value={form.principalId} onChange={(e) => setForm((s) => ({ ...s, principalId: e.target.value }))} placeholder="uuid" />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">effect</span>
            <select
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-light focus:ring-2 focus:ring-brand-light"
              value={form.effect}
              onChange={(e) => setForm((s) => ({ ...s, effect: e.target.value }))}
            >
              <option value="allow">allow</option>
              <option value="deny">deny</option>
            </select>
          </label>
          <Input label="note" value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} />
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">ruleJson</span>
            <textarea
              className="h-48 w-full rounded-md border border-slate-200 bg-white p-3 text-xs font-mono focus:border-brand-light focus:ring-2 focus:ring-brand-light"
              value={form.ruleJson}
              onChange={(e) => setForm((s) => ({ ...s, ruleJson: e.target.value }))}
            />
          </label>
        </div>
      </Modal>

      <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">Raw response</summary>
        <pre className="mt-2 max-h-96 overflow-auto text-xs">{JSON.stringify(q.data, null, 2)}</pre>
      </details>
    </div>
  ); 
}
