import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgeDollarSign, Plus, Save, Trash2 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeWriteoffsApi } from '../api/writeoffs.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { useArEntityOptions } from '../hooks/useArEntityOptions.js';
import { ArEntitySelectFields } from '../components/ArEntitySelectFields.jsx';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { AccountSelect } from '../../../shared/components/forms/AccountSelect.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { NONE_OPTION, toOptions } from '../../../shared/utils/options.js';

const WRITEOFF_STATUS_OPTIONS = [
  NONE_OPTION,
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'posted', label: 'Posted' },
  { value: 'voided', label: 'Voided' }
];

export default function Writeoffs() {
  const { http } = useApi();
  const api = useMemo(() => makeWriteoffsApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [writeoffForm, setWriteoffForm] = useState({ customerId: '', entityValue: '', amount: '', reasonCode: '', notes: '' });
  const { customerOptions, entityOptions, getEntityByValue } = useArEntityOptions({ action: 'writeoff', customerId: writeoffForm.customerId });

  const [status, setStatus] = useState('');
  const qs = useMemo(() => (status ? { status } : {}), [status]);

  const { data: listData } = useQuery({ queryKey: qk.writeoffs(qs), queryFn: () => api.list(qs) });
  const writeoffs = Array.isArray(listData) ? listData : listData?.data ?? [];

  const { data: reasonsData } = useQuery({ queryKey: qk.writeoffReasonCodes, queryFn: () => api.listReasonCodes() });
  const reasons = Array.isArray(reasonsData) ? reasonsData : reasonsData?.data ?? [];
  const reasonOptions = useMemo(() => [NONE_OPTION, ...reasons.map((r) => ({ value: r.code, label: `${r.code}${r.description ? ` · ${r.description}` : ''}` }))], [reasons]);

  const { data: settings } = useQuery({ queryKey: qk.writeoffSettings, queryFn: () => api.getSettings() });
  const { data: coaData } = useQuery({ queryKey: ['ar-writeoff-coa'], queryFn: () => coaApi.list(), staleTime: 60_000 });
  const accounts = Array.isArray(coaData) ? coaData : coaData?.data ?? [];
  const accountOptions = useMemo(() => [NONE_OPTION, ...toOptions(accounts, { valueKey: 'id', label: (a) => `${a.code ?? ''} ${a.name ?? ''}`.trim() || String(a.id) })], [accounts]);

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

  const [reasonForm, setReasonForm] = useState({ code: '', description: '', is_active: true });
  const selectedEntity = useMemo(() => getEntityByValue(writeoffForm.entityValue), [getEntityByValue, writeoffForm.entityValue]);

  const createWriteoff = useMutation({
    mutationFn: (body) => api.create(body),
    onSuccess: () => {
      toast.success('Write-off created');
      qc.invalidateQueries({ queryKey: qk.writeoffs(qs) });
      setModal(null);
      setWriteoffForm({ customerId: '', entityValue: '', amount: '', reasonCode: '', notes: '' });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  });

  const createReason = useMutation({
    mutationFn: (body) => api.createReasonCode(body),
    onSuccess: () => {
      toast.success('Reason code created');
      qc.invalidateQueries({ queryKey: qk.writeoffReasonCodes });
      setModal(null);
      setReasonForm({ code: '', description: '', is_active: true });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  });

  const columns = useMemo(
    () => [
      { header: 'ID', render: (r) => <span className="text-sm font-semibold text-slate-900">#{r.id}</span> },
      { header: 'Entity', render: (r) => <span className="text-sm text-slate-700">{r.entity_type}:{String(r.entity_id)}</span> },
      { header: 'Partner', render: (r) => <span className="text-sm text-slate-700">{r.partner_name ?? r.partner_id ?? '—'}</span> },
      { header: 'Amount', render: (r) => <span className="text-sm text-slate-900">{r.amount}</span> },
      { header: 'Status', render: (r) => <Badge tone={(r.status ?? 'draft') === 'posted' ? 'success' : 'muted'}>{r.status ?? 'draft'}</Badge> }
    ],
    []
  );

  const submitWriteoff = () => {
    if (!selectedEntity) return toast.error('Select a source document');
    createWriteoff.mutate({
      entity_type: selectedEntity.type,
      entity_id: selectedEntity.id,
      partner_id: selectedEntity.partnerId || writeoffForm.customerId || undefined,
      amount: Number(writeoffForm.amount || 0),
      reason_code: writeoffForm.reasonCode || undefined,
      notes: writeoffForm.notes.trim() || null
    });
  };

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
                  left={<Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={WRITEOFF_STATUS_OPTIONS} />}
                  right={<Button leftIcon={Plus} onClick={() => { setWriteoffForm({ customerId: '', entityValue: '', amount: '', reasonCode: '', notes: '' }); setModal('newWriteoff'); }}>New write-off</Button>}
                />
                <div className="mt-3">
                  <DataTable columns={columns} rows={writeoffs} empty={{ title: 'No write-offs', description: 'Create a write-off to adjust AR balances.' }} />
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
                  <Button leftIcon={Plus} onClick={() => { setReasonForm({ code: '', description: '', is_active: true }); setModal('newReason'); }}>New code</Button>
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
                          <Button variant="outline" size="sm" leftIcon={Trash2} onClick={() => api.deleteReasonCode(r.code).then(() => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: qk.writeoffReasonCodes }); }).catch((e) => toast.error(e?.message ?? 'Failed'))}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border-subtle bg-white/60 p-8 text-center text-sm text-slate-600 md:col-span-2 lg:col-span-3">No reason codes.</div>
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
                    <div className="mt-1 text-xs text-slate-500">Select the ledger accounts used when the module posts write-offs.</div>
                  </div>
                  <Button leftIcon={Save} loading={saveSettings.isPending} onClick={() => saveSettings.mutate(settingsDraft)}>
                    Save
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <AccountSelect
                    label="AR bad debt expense account"
                    value={settingsDraft?.ar_bad_debt_expense_account_id ?? ''}
                    onChange={(e) => setSettingsDraft((s) => ({ ...s, ar_bad_debt_expense_account_id: e.target.value || null }))}
                    allowEmpty
                  />
                  <AccountSelect
                    label="AP write-off income account"
                    value={settingsDraft?.ap_writeoff_income_account_id ?? ''}
                    onChange={(e) => setSettingsDraft((s) => ({ ...s, ap_writeoff_income_account_id: e.target.value || null }))}
                    allowEmpty
                  />
                </div>
              </ContentCard>
            )
          }
        ]}
      />

      <Modal
        open={modal === 'newWriteoff'}
        onClose={() => setModal(null)}
        title="New write-off"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={createWriteoff.isPending} onClick={submitWriteoff} disabled={!writeoffForm.entityValue || !writeoffForm.amount}>Create write-off</Button></div>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ArEntitySelectFields
            customerId={writeoffForm.customerId}
            entityValue={writeoffForm.entityValue}
            customerOptions={customerOptions}
            entityOptions={entityOptions}
            onCustomerChange={(customerId) => setWriteoffForm((state) => ({ ...state, customerId, entityValue: '' }))}
            onEntityChange={(entityValue) => { const record = getEntityByValue(entityValue); setWriteoffForm((state) => ({ ...state, entityValue, customerId: record?.partnerId || state.customerId })); }}
          />
          <Input label="Amount" type="number" min="0" step="0.01" value={writeoffForm.amount} onChange={(e) => setWriteoffForm((s) => ({ ...s, amount: e.target.value }))} />
          <Select label="Reason code" value={writeoffForm.reasonCode} onChange={(e) => setWriteoffForm((s) => ({ ...s, reasonCode: e.target.value }))} options={reasonOptions} />
          <div className="md:col-span-2"><Textarea label="Notes" value={writeoffForm.notes} onChange={(e) => setWriteoffForm((s) => ({ ...s, notes: e.target.value }))} rows={4} /></div>
        </div>
      </Modal>

      <Modal
        open={modal === 'newReason'}
        onClose={() => setModal(null)}
        title="New reason code"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={createReason.isPending} onClick={() => createReason.mutate({ ...reasonForm, code: reasonForm.code.trim(), description: reasonForm.description.trim() || null })} disabled={!reasonForm.code.trim()}>Create code</Button></div>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Code" value={reasonForm.code} onChange={(e) => setReasonForm((s) => ({ ...s, code: e.target.value }))} placeholder="BAD_DEBT" />
          <Select label="Status" value={String(reasonForm.is_active)} onChange={(e) => setReasonForm((s) => ({ ...s, is_active: e.target.value === 'true' }))} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
          <div className="md:col-span-2"><Textarea label="Description" value={reasonForm.description} onChange={(e) => setReasonForm((s) => ({ ...s, description: e.target.value }))} rows={3} /></div>
        </div>
      </Modal>
    </div>
  );
}