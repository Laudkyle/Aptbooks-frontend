import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAutomationApi } from '../api/automation.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../app/constants/routes.js';

function rowsOf(d){ return Array.isArray(d?.items) ? d.items : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []; }

export default function AutoReconciliationPage() {
  const { http } = useApi();
  const api = useMemo(() => makeAutomationApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code:'', name:'', bankAccountId:'', minScore:'0.9' });
  const profilesQ = useQuery({ queryKey:['automation.autoReconciliation.profiles'], queryFn:()=>api.listAutoReconciliationProfiles() });
  const runsQ = useQuery({ queryKey:['automation.autoReconciliation.runs'], queryFn:()=>api.listAutoReconciliationRuns(), staleTime: 5_000 });
  const create = useMutation({ mutationFn:(payload)=>api.createAutoReconciliationProfile(payload), onSuccess:()=>{ toast.success('Profile created'); setOpen(false); setForm({ code:'', name:'', bankAccountId:'', minScore:'0.9' }); qc.invalidateQueries({ queryKey:['automation.autoReconciliation.profiles'] }); }, onError:(e)=>toast.error(e?.response?.data?.error || e.message) });
  const run = useMutation({ mutationFn:(payload)=>api.runAutoReconciliation(payload), onSuccess:()=>{ toast.success('Auto reconciliation run started'); qc.invalidateQueries({ queryKey:['automation.autoReconciliation.runs'] }); }, onError:(e)=>toast.error(e?.response?.data?.error || e.message) });
  const profiles = rowsOf(profilesQ.data);
  const runs = rowsOf(runsQ.data);
  return (<>
    <PageHeader title="Auto Reconciliation" subtitle="Manage reconciliation profiles and trigger suggestion runs." actions={<div className="flex gap-2"><Button variant="secondary" onClick={()=>run.mutate({})}>Run all</Button><Button onClick={()=>setOpen(true)}>New profile</Button></div>} />
    <div className="grid gap-4 xl:grid-cols-2">
      <ContentCard title="Profiles">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="py-2">Code</th><th>Name</th><th>Threshold</th><th></th></tr></thead><tbody>{profiles.map((p)=><tr key={p.id || p.code} className="border-t"><td className="py-2 font-medium">{p.code}</td><td>{p.name}</td><td>{p.min_score ?? p.minScore ?? '—'}</td><td className="text-right"><Button size="sm" onClick={()=>run.mutate({ profileId: p.id })}>Run</Button></td></tr>)}{!profiles.length && <tr><td colSpan={4} className="py-3 text-slate-500">No profiles configured.</td></tr>}</tbody></table></div>
      </ContentCard>
      <ContentCard title="Recent runs" actions={<Button variant="secondary" onClick={()=>runsQ.refetch()}>Refresh</Button>}>
        <div className="space-y-3">{runs.map((r)=><div key={r.id} className="rounded-xl border p-3"><div className="flex items-center justify-between"><div className="font-medium">{r.profile_code ?? r.profileCode ?? 'Run'}</div><Badge variant={r.status === 'success' ? 'success' : r.status === 'failed' ? 'danger' : 'warning'}>{r.status ?? 'pending'}</Badge></div><div className="mt-2 text-sm text-slate-600">Suggestions: {r.suggestion_count ?? r.suggestionCount ?? 0}</div></div>)}{!runs.length && <div className="text-sm text-slate-500">No runs yet.</div>}</div>
      </ContentCard>
    </div>
    <Modal open={open} title="Create auto reconciliation profile" onClose={()=>setOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={()=>create.mutate(form)}>Create</Button></div>}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Code" value={form.code} onChange={(e)=>setForm((s)=>({...s, code:e.target.value}))} />
        <Input label="Name" value={form.name} onChange={(e)=>setForm((s)=>({...s, name:e.target.value}))} />
        <Input label="Bank account ID (optional)" value={form.bankAccountId} onChange={(e)=>setForm((s)=>({...s, bankAccountId:e.target.value}))} />
        <Input label="Minimum score" type="number" step="0.01" value={form.minScore} onChange={(e)=>setForm((s)=>({...s, minScore:e.target.value}))} />
      </div>
    </Modal>
  </>);
}
