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

export default function SmartNotificationsPage() {
  const { http } = useApi();
  const api = useMemo(() => makeAutomationApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [rule, setRule] = useState({ code:'', name:'', channel:'in_app', eventType:'approval_pending', thresholdValue:'' });
  const rulesQ = useQuery({ queryKey:['automation.smartNotifications.rules'], queryFn:()=>api.listSmartNotificationRules() });
  const eventsQ = useQuery({ queryKey:['automation.smartNotifications.events'], queryFn:()=>api.listSmartNotificationEvents(), staleTime:5_000 });
  const create = useMutation({ mutationFn:(payload)=>api.createSmartNotificationRule(payload), onSuccess:()=>{ toast.success('Notification rule created'); setOpen(false); setRule({ code:'', name:'', channel:'in_app', eventType:'approval_pending', thresholdValue:'' }); qc.invalidateQueries({ queryKey:['automation.smartNotifications.rules'] }); }, onError:(e)=>toast.error(e?.response?.data?.error || e.message) });
  const run = useMutation({ mutationFn:(payload)=>api.runSmartNotifications(payload), onSuccess:()=>{ toast.success('Notification run triggered'); eventsQ.refetch(); }, onError:(e)=>toast.error(e?.response?.data?.error || e.message) });
  const rules = rowsOf(rulesQ.data);
  const events = rowsOf(eventsQ.data);
  return (<>
    <PageHeader title="Smart Notifications" subtitle="Configure automation-driven alerting and inspect recent automation events." actions={<div className="flex gap-2"><Button variant="secondary" onClick={()=>run.mutate({})}>Run now</Button><Button onClick={()=>setOpen(true)}>New rule</Button></div>} />
    <div className="grid gap-4 xl:grid-cols-2">
      <ContentCard title="Notification rules">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="py-2">Code</th><th>Name</th><th>Channel</th><th>Event</th></tr></thead><tbody>{rules.map((r)=><tr key={r.id || r.code} className="border-t"><td className="py-2 font-medium">{r.code}</td><td>{r.name}</td><td>{r.channel ?? 'in_app'}</td><td>{r.event_type ?? r.eventType ?? '—'}</td></tr>)}{!rules.length && <tr><td className="py-3 text-slate-500" colSpan={4}>No smart notification rules configured.</td></tr>}</tbody></table></div>
      </ContentCard>
      <ContentCard title="Recent events" actions={<Button variant="secondary" onClick={()=>eventsQ.refetch()}>Refresh</Button>}>
        <div className="space-y-3">{events.map((e)=><div key={e.id || `${e.created_at}-${e.code}`} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-3"><div className="font-medium">{e.title ?? e.code ?? e.event_type ?? 'Event'}</div><Badge variant={e.status === 'sent' ? 'success' : e.status === 'failed' ? 'danger' : 'warning'}>{e.status ?? 'queued'}</Badge></div><div className="mt-2 text-sm text-slate-600">{e.message ?? e.summary ?? '—'}</div></div>)}{!events.length && <div className="text-sm text-slate-500">No notification events yet.</div>}</div>
      </ContentCard>
    </div>
    <Modal open={open} title="Create smart notification rule" onClose={()=>setOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={()=>create.mutate(rule)}>Create</Button></div>}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Code" value={rule.code} onChange={(e)=>setRule((s)=>({...s, code:e.target.value}))} />
        <Input label="Name" value={rule.name} onChange={(e)=>setRule((s)=>({...s, name:e.target.value}))} />
        <Select label="Channel" value={rule.channel} onChange={(e)=>setRule((s)=>({...s, channel:e.target.value}))} options={[{value:'in_app',label:'In app'},{value:'email',label:'Email'}]} />
        <Select label="Event type" value={rule.eventType} onChange={(e)=>setRule((s)=>({...s, eventType:e.target.value}))} options={[{value:'approval_pending',label:'Approval pending'},{value:'cash_forecast_risk',label:'Cash forecast risk'},{value:'reconciliation_exception',label:'Reconciliation exception'}]} />
        <Input label="Threshold value (optional)" value={rule.thresholdValue} onChange={(e)=>setRule((s)=>({...s, thresholdValue:e.target.value}))} />
      </div>
    </Modal>
  </>);
}
