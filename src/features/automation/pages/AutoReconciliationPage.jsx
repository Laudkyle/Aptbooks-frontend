import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAutomationApi } from '../api/automation.api.js';
import { makeBankingApi } from '../../banking/api/banking.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { toOptions, NONE_OPTION } from '../../../shared/utils/options.js';

function rowsOf(d){ return Array.isArray(d?.items) ? d.items : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []; }

export default function AutoReconciliationPage() {
  const { http } = useApi();
  const api = useMemo(() => makeAutomationApi(http), [http]);
  const bankingApi = useMemo(() => makeBankingApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code:'', name:'', bankAccountId:'', minScore:'0.90' });
  const profilesQ = useQuery({ queryKey:['automation.autoReconciliation.profiles'], queryFn:()=>api.listAutoReconciliationProfiles() });
  const runsQ = useQuery({ queryKey:['automation.autoReconciliation.runs'], queryFn:()=>api.listAutoReconciliationRuns(), staleTime: 5_000 });
  const accountsQ = useQuery({ queryKey:['banking.accounts'], queryFn:()=>bankingApi.listAccounts(), staleTime: 60_000 });
  const create = useMutation({ mutationFn:(payload)=>api.createAutoReconciliationProfile(payload), onSuccess:()=>{ toast.success('Profile created'); setOpen(false); setForm({ code:'', name:'', bankAccountId:'', minScore:'0.90' }); qc.invalidateQueries({ queryKey:['automation.autoReconciliation.profiles'] }); }, onError:(e)=>toast.error(e?.response?.data?.error || e.message) });
  const run = useMutation({ mutationFn:(payload)=>api.runAutoReconciliation(payload), onSuccess:()=>{ toast.success('Auto reconciliation run started'); qc.invalidateQueries({ queryKey:['automation.autoReconciliation.runs'] }); }, onError:(e)=>toast.error(e?.response?.data?.error || e.message) });

  const profiles = rowsOf(profilesQ.data);
  const runs = rowsOf(runsQ.data);
  const accountOptions = useMemo(() => [NONE_OPTION, ...toOptions(rowsOf(accountsQ.data), { valueKey: 'id', label: (a) => `${a.code ?? ''} ${a.name ?? ''}`.trim() || a.id })], [accountsQ.data]);

  const columns = [
    { header: 'Code', render: (p) => <span className="font-medium text-slate-900">{p.code}</span> },
    { header: 'Name', render: (p) => p.name ?? '—' },
    { header: 'Bank account', render: (p) => p.bank_account_code ?? p.bankAccountCode ?? p.bank_account_id ?? p.bankAccountId ?? 'All accounts' },
    { header: 'Threshold', render: (p) => p.min_score ?? p.minScore ?? '—' },
    { header: 'Actions', render: (p) => <div className="flex justify-end"><Button size="sm" onClick={()=>run.mutate({ profileId: p.id })}>Run</Button></div> }
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Auto Reconciliation" subtitle="Run matching suggestions against bank activity using configurable confidence thresholds." actions={<div className="flex gap-2"><Button variant="outline" onClick={()=>run.mutate({})}>Run all</Button><Button leftIcon={Plus} onClick={()=>setOpen(true)}>New profile</Button></div>} />
      <div className="grid gap-4 xl:grid-cols-2">
        <ContentCard title="Profiles"><DataTable columns={columns} rows={profiles} isLoading={profilesQ.isLoading} empty={{ title: 'No profiles configured', description: 'Create a profile to scope and score reconciliation suggestions.' }} /></ContentCard>
        <ContentCard title="Recent runs" actions={<Button variant="outline" leftIcon={RefreshCw} onClick={()=>runsQ.refetch()}>Refresh</Button>}>
          <div className="space-y-3">{runs.map((r)=><div key={r.id} className="rounded-2xl border border-border-subtle p-4"><div className="flex items-center justify-between"><div className="font-medium text-slate-900">{r.profile_code ?? r.profileCode ?? 'Run'}</div><Badge tone={r.status === 'success' ? 'success' : r.status === 'failed' ? 'danger' : 'warning'}>{r.status ?? 'pending'}</Badge></div><div className="mt-2 text-sm text-slate-600">Suggestions: {r.suggestion_count ?? r.suggestionCount ?? 0}</div></div>)}{!runs.length && <div className="rounded-2xl border border-dashed border-border-subtle p-8 text-center text-sm text-slate-500">No auto-reconciliation runs yet.</div>}</div>
        </ContentCard>
      </div>
      <Modal open={open} title="Create auto reconciliation profile" onClose={()=>setOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button><Button loading={create.isPending} onClick={()=>create.mutate({ ...form, minScore: Number(form.minScore || 0.9), bankAccountId: form.bankAccountId || null })}>Create profile</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Code" value={form.code} onChange={(e)=>setForm((s)=>({...s, code:e.target.value}))} />
          <Input label="Name" value={form.name} onChange={(e)=>setForm((s)=>({...s, name:e.target.value}))} />
          <Select label="Bank account" value={form.bankAccountId} onChange={(e)=>setForm((s)=>({...s, bankAccountId:e.target.value}))} options={accountOptions} />
          <Input label="Minimum score" type="number" step="0.01" min="0" max="1" value={form.minScore} onChange={(e)=>setForm((s)=>({...s, minScore:e.target.value}))} />
        </div>
      </Modal>
    </div>
  );
}
