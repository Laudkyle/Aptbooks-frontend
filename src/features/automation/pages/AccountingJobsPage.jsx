import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PlayCircle, RefreshCw, Workflow } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAutomationApi } from '../api/automation.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

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
  const columns = [
    { header: 'Code', render: (j) => <span className="font-medium text-slate-900">{j.code}</span> },
    { header: 'Name', render: (j) => j.name ?? '—' },
    { header: 'Status', render: (j) => <Badge tone={(j.is_enabled ?? j.isEnabled) ? 'success' : 'muted'}>{(j.is_enabled ?? j.isEnabled) ? 'enabled' : 'disabled'}</Badge> },
    { header: 'Schedule', render: (j) => j.cron_expression ?? j.cronExpression ?? j.schedule ?? '—' },
    { header: 'Actions', render: (j) => <div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" onClick={()=>setJobCode(j.code)}>Runs</Button><Button size="sm" leftIcon={PlayCircle} onClick={()=>runNow.mutate(j.code)}>Run now</Button></div> }
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Accounting Jobs" subtitle="Operational visibility into scheduled accounting jobs powered by the backend scheduler." icon={Workflow} />
      <div className="grid gap-4 xl:grid-cols-5">
        <ContentCard className="xl:col-span-3" title="Configured jobs">
          <DataTable columns={columns} rows={jobs} isLoading={jobsQ.isLoading} empty={{ title: 'No accounting jobs configured', description: 'Jobs will appear here after they are registered in the scheduler.' }} />
        </ContentCard>
        <ContentCard className="xl:col-span-2" title={`Recent runs${jobCode ? ` · ${jobCode}` : ''}`} actions={<Button variant="outline" leftIcon={RefreshCw} onClick={()=>runsQ.refetch()}>Refresh</Button>}>
          <div className="space-y-3">
            {runs.map((r)=><div key={r.id} className="rounded-2xl border border-border-subtle p-4"><div className="flex items-center justify-between gap-3"><div className="font-medium text-slate-900">{r.job_code ?? r.jobCode ?? jobCode }</div><Badge tone={r.status === 'success' ? 'success' : r.status === 'failed' ? 'danger' : 'warning'}>{r.status ?? 'pending'}</Badge></div><div className="mt-2 text-xs text-slate-500">{String(r.created_at ?? r.started_at ?? r.createdAt ?? '').replace('T',' ').slice(0,19) || '—'}</div></div>)}
            {!runs.length && <div className="rounded-2xl border border-dashed border-border-subtle p-8 text-center text-sm text-slate-500">No job runs available.</div>}
          </div>
        </ContentCard>
      </div>
    </div>
  );
}
