import React, { useMemo, useState } from 'react'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 
import { BadgeDollarSign, Plus, Save, Trash2 } from 'lucide-react'; 

import { useApi } from '../../../shared/hooks/useApi.js'; 
import { qk } from '../../../shared/query/keys.js'; 
import { makeWriteoffsApi } from '../api/writeoffs.api.js'; 

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx'; 
import { Tabs } from '../../../shared/components/ui/Tabs.jsx'; 
import { Button } from '../../../shared/components/ui/Button.jsx'; 
import { Input } from '../../../shared/components/ui/Input.jsx'; 
import { Badge } from '../../../shared/components/ui/Badge.jsx'; 
import { DataTable } from '../../../shared/components/data/DataTable.jsx'; 
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx'; 
import { Modal } from '../../../shared/components/ui/Modal.jsx'; 
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx'; 
import { useToast } from '../../../shared/components/ui/Toast.jsx'; 

export default function Writeoffs() {
  const { http } = useApi(); 
  const api = useMemo(() => makeWriteoffsApi(http), [http]); 
  const qc = useQueryClient(); 
const toast = useToast(); 
  const [status, setStatus] = useState(''); 
  const qs = useMemo(() => (status ? { status } : {}), [status]); 

  const { data: listData } = useQuery({ queryKey: qk.writeoffs(qs), queryFn: () => api.list(qs) }); 
  const writeoffs = Array.isArray(listData) ? listData : listData?.data ?? []; 

  const { data: reasonsData } = useQuery({ queryKey: qk.writeoffReasonCodes, queryFn: () => api.listReasonCodes() }); 
  const reasons = Array.isArray(reasonsData) ? reasonsData : reasonsData?.data ?? []; 

  const { data: settings } = useQuery({ queryKey: qk.writeoffSettings, queryFn: () => api.getSettings() }); 

  const [settingsDraft, setSettingsDraft] = useState({}); 
  React.useEffect(() => {
    if (settings) setSettingsDraft(settings); 
  }, [settings]); 

  const saveSettings = useMutation({
    mutationFn: (body) => api.setSettings(body),
    onSuccess: () => {
      toast.success('Settings saved'); 
      qc.invalidateQueries({ queryKey: qk.writeoffSettings }); 
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  }); 

  const [modal, setModal] = useState(null); 
  const [draft, setDraft] = useState({}); 

  const createWriteoff = useMutation({
    mutationFn: (body) => api.create(body),
    onSuccess: () => {
      toast.success('Write-off created'); 
      qc.invalidateQueries({ queryKey: qk.writeoffs(qs) }); 
      setModal(null); 
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  }); 

  const createReason = useMutation({
    mutationFn: (body) => api.createReasonCode(body),
    onSuccess: () => {
      toast.success('Reason code created'); 
      qc.invalidateQueries({ queryKey: qk.writeoffReasonCodes }); 
      setModal(null); 
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  }); 

  const columns = useMemo(
    () => [
      { header: 'ID', render: (r) => <span className="text-sm font-semibold text-slate-900">#{r.id}</span> },
      { header: 'Entity', render: (r) => <span className="text-sm text-slate-700">{r.entity_type}:{String(r.entity_id)}</span> },
      { header: 'Partner', render: (r) => <span className="text-sm text-slate-700">{r.partner_id}</span> },
      { header: 'Amount', render: (r) => <span className="text-sm text-slate-900">{r.amount}</span> },
      { header: 'Status', render: (r) => <Badge tone={(r.status ?? 'draft') === 'posted' ? 'success' : 'muted'}>{r.status ?? 'draft'}</Badge> }
    ],
    []
  ); 

  return (
    <div className="space-y-4">
      <PageHeader title="Write-offs" subtitle="Bad debt and write-off operations with settings and reason codes." icon={BadgeDollarSign} />

      <Tabs
        tabs={[
          {
            key: 'writeoffs',
            label: 'Write-offs',
            content: (
              <ContentCard>
                <FilterBar
                  left={<Input label="Status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="draft|submitted|approved|posted|…" />}
                  right={
                    <Button
                      leftIcon={Plus}
                      onClick={() => {
                        setDraft({ entity_type: '', entity_id: '', partner_id: 0, amount: 0, reason_code: '', notes: null }); 
                        setModal('newWriteoff'); 
                      }}
                    >
                      New write-off
                    </Button>
                  }
                />
                <div className="mt-3">
                  <DataTable columns={columns} rows={writeoffs} empty={{ title: 'No write-offs', description: 'Create a write-off to adjust AR/AP balances.' }} />
                </div>
              </ContentCard>
            )
          },
          {
            key: 'reasons',
            label: 'Reason codes',
            content: (
              <ContentCard>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Reason codes</div>
                    <div className="mt-1 text-xs text-slate-500">Used when creating write-offs.</div>
                  </div>
                  <Button
                    leftIcon={Plus}
                    onClick={() => {
                      setDraft({ code: '', description: null, is_active: true }); 
                      setModal('newReason'); 
                    }}
                  >
                    New code
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {reasons.length ? (
                    reasons.map((r) => (
                      <div key={r.code} className="rounded-2xl border border-border-subtle bg-white/70 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{r.code}</div>
                            <div className="mt-1 text-xs text-slate-500">{r.description ?? '—'}</div>
                          </div>
                          <Badge tone={r.is_active ? 'success' : 'muted'}>{r.is_active ? 'active' : 'inactive'}</Badge>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={Trash2}
                            onClick={() => api.deleteReasonCode(r.code).then(() => { toast.success('Deleted');  qc.invalidateQueries({ queryKey: qk.writeoffReasonCodes });  }).catch((e) => toast.error(e?.message ?? 'Failed'))}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border-subtle bg-white/60 p-8 text-center text-sm text-slate-600 md:col-span-2 lg:col-span-3">
                      No reason codes.
                    </div>
                  )}
                </div>
              </ContentCard>
            )
          },
          {
            key: 'settings',
            label: 'Settings',
            content: (
              <ContentCard>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Write-off settings</div>
                    <div className="mt-1 text-xs text-slate-500">These ids are stored as-is by backend.</div>
                  </div>
                  <Button leftIcon={Save} loading={saveSettings.isPending} onClick={() => saveSettings.mutate(settingsDraft)}>
                    Save
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Input
                    label="AR bad debt expense account id"
                    value={settingsDraft?.ar_bad_debt_expense_account_id ?? ''}
                    onChange={(e) => setSettingsDraft((s) => ({ ...s, ar_bad_debt_expense_account_id: e.target.value || null }))}
                  />
                  <Input
                    label="AP writeoff income account id"
                    value={settingsDraft?.ap_writeoff_income_account_id ?? ''}
                    onChange={(e) => setSettingsDraft((s) => ({ ...s, ap_writeoff_income_account_id: e.target.value || null }))}
                  />
                </div>

                <div className="mt-5">
                  <JsonPanel title="Settings (GET)" value={settings ?? {}} />
                </div>
              </ContentCard>
            )
          }
        ]}
      />

      <Modal open={modal === 'newWriteoff'} onClose={() => setModal(null)} title="New write-off">
        <JsonPanel title="Write-off payload" value={draft} submitLabel="Create" onSubmit={(json) => createWriteoff.mutate(json)} />
      </Modal>

      <Modal open={modal === 'newReason'} onClose={() => setModal(null)} title="New reason code">
        <JsonPanel title="Reason code payload" value={draft} submitLabel="Create" onSubmit={(json) => createReason.mutate(json)} />
      </Modal>
    </div>
  ); 
}
