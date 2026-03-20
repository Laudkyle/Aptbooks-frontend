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

export default function AccountingJobsPage() {
  const { http } = useApi();
  const api = useMemo(() => makeAutomationApi(http), [http]);
  const toast = useToast();
  const [jobCode, setJobCode] = useState('');
  const jobsQ = useQuery({ queryKey:['automation.accountingJobs'], queryFn:()=>api.listAccountingJobs() });
  const runsQ = useQuery({ queryKey:['automation.accountingJobRuns', jobCode], queryFn:()=>api.listAccountingJobRuns(jobCode ? { jobCode } : {}), staleTime: 5_000 });
  const runNow = useMutation({ mutationFn:(code)=>api.runAccountingJob(code), onSuccess:()=>{ toast.success('Job run started'); jobsQ.refetch(); runsQ.refetch(); }, onError:(e)=> toast.error(e?.response?.data?.error || e.message) });
  const jobs = rowsOf(jobsQ.data);
  const runs = rowsOf(runsQ.data);
  return (<>
    <PageHeader title="Accounting Jobs" subtitle="Work with scheduled accounting jobs built on the backend scheduler." />
    <div className="grid gap-4 xl:grid-cols-5">
      <ContentCard className="xl:col-span-3" title="Configured jobs">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="py-2">Code</th><th>Name</th><th>Status</th><th>Schedule</th><th></th></tr></thead><tbody>{jobs.map((j)=><tr key={j.code || j.id} className="border-t"><td className="py-2 font-medium">{j.code}</td><td>{j.name}</td><td><Badge variant={(j.is_enabled ?? j.isEnabled) ? 'success' : 'warning'}>{(j.is_enabled ?? j.isEnabled) ? 'enabled' : 'disabled'}</Badge></td><td>{j.cron_expression ?? j.cronExpression ?? j.schedule ?? '—'}</td><td className="text-right space-x-2"><Button size="sm" variant="secondary" onClick={()=>setJobCode(j.code)}>Runs</Button><Button size="sm" onClick={()=>runNow.mutate(j.code)}>Run now</Button></td></tr>)}{!jobs.length && <tr><td className="py-3 text-slate-500" colSpan={5}>No accounting jobs configured.</td></tr>}</tbody></table></div>
      </ContentCard>
      <ContentCard className="xl:col-span-2" title={`Recent runs${jobCode ? `: ${jobCode}` : ''}`} actions={<Button variant="secondary" onClick={()=>runsQ.refetch()}>Refresh</Button>}>
        <div className="space-y-3">{runs.map((r)=><div key={r.id} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-3"><div className="font-medium">{r.job_code ?? r.jobCode ?? jobCode || 'Run'}</div><Badge variant={r.status === 'success' ? 'success' : r.status === 'failed' ? 'danger' : 'warning'}>{r.status ?? 'pending'}</Badge></div><div className="mt-2 text-xs text-slate-500">{String(r.created_at ?? r.started_at ?? r.createdAt ?? '').replace('T',' ').slice(0,19) || '—'}</div></div>)}{!runs.length && <div className="text-sm text-slate-500">No runs available.</div>}</div>
      </ContentCard>
    </div>
  </>);
}
