import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Plus, RefreshCw } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAutomationApi } from '../api/automation.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

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

  const ruleColumns = [
    { header: 'Code', render: (r) => <span className="font-medium text-text-strong">{r.code}</span> },
    { header: 'Name', render: (r) => r.name ?? '—' },
    { header: 'Channel', render: (r) => r.channel ?? 'in_app' },
    { header: 'Event', render: (r) => r.event_type ?? r.eventType ?? '—' }
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Smart Notifications" subtitle="Configure automation-driven alerting and review delivery events from the latest runs." icon={BellRing} actions={<div className="flex gap-2"><Button variant="outline" onClick={()=>run.mutate({})}>Run now</Button><Button leftIcon={Plus} onClick={()=>setOpen(true)}>New rule</Button></div>} />
      <div className="grid gap-4 xl:grid-cols-2">
        <ContentCard title="Notification rules"><DataTable columns={ruleColumns} rows={rules} isLoading={rulesQ.isLoading} empty={{ title: 'No smart notification rules', description: 'Create a rule to notify users when important accounting events occur.' }} /></ContentCard>
        <ContentCard title="Recent events" actions={<Button variant="outline" leftIcon={RefreshCw} onClick={()=>eventsQ.refetch()}>Refresh</Button>}>
          <div className="space-y-3">{events.map((e)=><div key={e.id || `${e.created_at}-${e.code}`} className="rounded-2xl border border-border-subtle p-4"><div className="flex items-center justify-between gap-3"><div className="font-medium text-text-strong">{e.title ?? e.code ?? e.event_type ?? 'Event'}</div><Badge tone={e.status === 'sent' ? 'success' : e.status === 'failed' ? 'danger' : 'warning'}>{e.status ?? 'queued'}</Badge></div><div className="mt-2 text-sm text-text-muted">{e.message ?? e.summary ?? '—'}</div></div>)}{!events.length && <div className="rounded-2xl border border-dashed border-border-subtle p-8 text-center text-sm text-text-muted">No notification events yet.</div>}</div>
        </ContentCard>
      </div>
      <Modal open={open} title="Create smart notification rule" onClose={()=>setOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button><Button loading={create.isPending} onClick={()=>create.mutate(rule)}>Create rule</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Code" value={rule.code} onChange={(e)=>setRule((s)=>({...s, code:e.target.value}))} />
          <Input label="Name" value={rule.name} onChange={(e)=>setRule((s)=>({...s, name:e.target.value}))} />
          <Select label="Channel" value={rule.channel} onChange={(e)=>setRule((s)=>({...s, channel:e.target.value}))} options={[{value:'in_app',label:'In app'},{value:'email',label:'Email'}]} />
          <Select label="Event type" value={rule.eventType} onChange={(e)=>setRule((s)=>({...s, eventType:e.target.value}))} options={[{value:'approval_pending',label:'Approval pending'},{value:'cash_forecast_risk',label:'Cash forecast risk'},{value:'reconciliation_exception',label:'Reconciliation exception'}]} />
          <Input label="Threshold value" value={rule.thresholdValue} onChange={(e)=>setRule((s)=>({...s, thresholdValue:e.target.value}))} />
        </div>
      </Modal>
    </div>
  );
}
