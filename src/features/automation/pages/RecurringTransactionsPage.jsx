import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarSync, PlayCircle, Plus } from 'lucide-react';

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
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

function rowsOf(d){ return Array.isArray(d?.items) ? d.items : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []; }

const SOURCE_TYPE_OPTIONS = [
  { value: 'journal', label: 'Journal' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'bill', label: 'Bill' },
  { value: 'expense', label: 'Expense' }
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' }
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'enabled', label: 'Enabled' },
  { value: 'disabled', label: 'Disabled' }
];

export default function RecurringTransactionsPage() {
  const { http } = useApi();
  const api = useMemo(() => makeAutomationApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ code:'', name:'', sourceType:'journal', frequency:'monthly', startDate:'', memo:'' });

  const q = useQuery({ queryKey:['automation.recurringTransactions'], queryFn: () => api.listRecurringTransactions() });
  const create = useMutation({ mutationFn:(payload)=>api.createRecurringTransaction(payload), onSuccess:()=>{ toast.success('Recurring transaction created'); setOpen(false); setForm({ code:'', name:'', sourceType:'journal', frequency:'monthly', startDate:'', memo:'' }); qc.invalidateQueries({ queryKey:['automation.recurringTransactions'] }); }, onError:(e)=> toast.error(e?.response?.data?.error || e.message) });
  const runNow = useMutation({ mutationFn:(id)=>api.runRecurringTransaction(id), onSuccess:()=>{ toast.success('Recurring transaction run triggered'); qc.invalidateQueries({ queryKey:['automation.recurringTransactions'] }); }, onError:(e)=> toast.error(e?.response?.data?.error || e.message) });
  const toggle = useMutation({ mutationFn:({id,isEnabled})=>api.toggleRecurringTransaction(id, { isEnabled }), onSuccess:()=>{ toast.success('Recurring transaction updated'); qc.invalidateQueries({ queryKey:['automation.recurringTransactions'] }); }, onError:(e)=> toast.error(e?.response?.data?.error || e.message) });

  const rows = rowsOf(q.data);
  const filteredRows = rows.filter((r) => statusFilter ? ((r.is_enabled ?? r.isEnabled) ? 'enabled' : 'disabled') === statusFilter : true);
  const enabledCount = rows.filter((r) => r.is_enabled ?? r.isEnabled).length;

  const columns = [
    { header: 'Code', render: (r) => <span className="font-medium text-text-strong">{r.code}</span> },
    { header: 'Name', render: (r) => r.name ?? '—' },
    { header: 'Source', render: (r) => r.source_type ?? r.sourceType ?? '—' },
    { header: 'Frequency', render: (r) => r.frequency ?? '—' },
    { header: 'Next run', render: (r) => String(r.next_run_at ?? r.nextRunAt ?? '').slice(0, 19).replace('T', ' ') || '—' },
    { header: 'Status', render: (r) => <Badge tone={(r.is_enabled ?? r.isEnabled) ? 'success' : 'muted'}>{(r.is_enabled ?? r.isEnabled) ? 'enabled' : 'disabled'}</Badge> },
    {
      header: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" leftIcon={PlayCircle} onClick={() => runNow.mutate(r.id)} loading={runNow.isPending}>Run now</Button>
          <Button size="sm" onClick={() => toggle.mutate({ id:r.id, isEnabled: !(r.is_enabled ?? r.isEnabled) })}>{(r.is_enabled ?? r.isEnabled) ? 'Disable' : 'Enable'}</Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Recurring Transactions" subtitle="Manage scheduled accounting entries and operational repeats without manual re-entry." icon={CalendarSync} actions={<Button leftIcon={Plus} onClick={()=>setOpen(true)}>New recurring transaction</Button>} />
      <div className="grid gap-4 md:grid-cols-3">
        <ContentCard title="Total schedules"><div className="text-2xl font-semibold text-brand-deep">{rows.length}</div></ContentCard>
        <ContentCard title="Enabled"><div className="text-2xl font-semibold text-brand-deep">{enabledCount}</div></ContentCard>
        <ContentCard title="Due soon"><div className="text-2xl font-semibold text-brand-deep">{rows.filter((r) => !!(r.next_run_at ?? r.nextRunAt)).length}</div></ContentCard>
      </div>
      <ContentCard>
        <FilterBar left={<Select label="Status" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} options={STATUS_FILTER_OPTIONS} />} right={<div className="text-xs text-text-muted">{filteredRows.length} records</div>} />
        <div className="mt-3">
          <DataTable columns={columns} rows={filteredRows} isLoading={q.isLoading} empty={{ title: 'No recurring transactions', description: 'Create a recurring schedule to automate repeat accounting work.' }} />
        </div>
      </ContentCard>
      <Modal open={open} title="Create recurring transaction" onClose={()=>setOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button><Button loading={create.isPending} onClick={()=>create.mutate(form)}>Create transaction</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Code" value={form.code} onChange={(e)=>setForm((s)=>({...s, code:e.target.value}))} />
          <Input label="Name" value={form.name} onChange={(e)=>setForm((s)=>({...s, name:e.target.value}))} />
          <Select label="Source type" value={form.sourceType} onChange={(e)=>setForm((s)=>({...s, sourceType:e.target.value}))} options={SOURCE_TYPE_OPTIONS} />
          <Select label="Frequency" value={form.frequency} onChange={(e)=>setForm((s)=>({...s, frequency:e.target.value}))} options={FREQUENCY_OPTIONS} />
          <Input label="Start date" type="date" value={form.startDate} onChange={(e)=>setForm((s)=>({...s, startDate:e.target.value}))} />
          <Textarea className="md:col-span-2" label="Memo" value={form.memo} onChange={(e)=>setForm((s)=>({...s, memo:e.target.value}))} placeholder="Purpose, posting context, or source reference" />
        </div>
      </Modal>
    </div>
  );
}
