import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeUtilitiesApi } from '../api/utilities.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Table, THead, TBody, TH, TD } from '../../../shared/components/ui/Table.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export default function ScheduledTasks() {
  const { http } = useApi();
  const api = useMemo(() => makeUtilitiesApi(http), [http]);
  const toast = useToast();

  const q = useQuery({ queryKey: ['scheduledTasks'], queryFn: api.scheduledTasks, staleTime: 10_000 });
  const tasks = q.data ?? [];

  const toggle = useMutation({
    mutationFn: ({ code, status }) => api.scheduledToggle(code, status),
    onSuccess: () => {
      toast.success('Task toggled (note backend boolean parsing caveat).');
      q.refetch();
    },
    onError: (e) => toast.error(e.message ?? 'Toggle failed')
  });

  const runNow = useMutation({
    mutationFn: (code) => api.scheduledRunNow(code),
    onSuccess: () => {
      toast.success('Run triggered.');
      q.refetch();
    },
    onError: (e) => toast.error(e.message ?? 'Run failed')
  });

  const [openRuns, setOpenRuns] = useState(false);
  const [runCode, setRunCode] = useState('');
  const [runsLimit, setRunsLimit] = useState(50);
  const runsQ = useQuery({
    queryKey: ['scheduledRuns', runCode, runsLimit],
    queryFn: () => api.scheduledRuns(runCode, { limit: runsLimit }),
    enabled: !!runCode && openRuns,
    staleTime: 5_000
  });

  const [openRunDetail, setOpenRunDetail] = useState(false);
  const [runId, setRunId] = useState('');
  const detailQ = useQuery({
    queryKey: ['scheduledRunDetail', runCode, runId],
    queryFn: () => api.scheduledRunDetail(runCode, runId),
    enabled: !!runCode && !!runId && openRunDetail,
    staleTime: 5_000
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Scheduled Tasks" subtitle="/utilities/scheduled-tasks" />

      <ContentCard title="Backend caveat">
        <div className="text-sm text-slate-700">
          The toggle endpoint uses <span className="font-mono">Boolean(req.params.status)</span>, so <span className="font-mono">"false"</span> evaluates to <span className="font-mono">true</span>. The UI exposes the endpoint as-is.
        </div>
      </ContentCard>

      <ContentCard title="Tasks" actions={<Button variant="secondary" onClick={() => q.refetch()}>Refresh</Button>}>
        {q.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : q.isError ? (
          <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load tasks.'}</div>
        ) : (
          <Table>
            <THead>
              <tr><TH>Code</TH><TH>Status</TH><TH>Next run</TH><TH>Actions</TH></tr>
            </THead>
            <TBody>
              {tasks.map((t) => (
                <tr key={t.code ?? t.id}>
                  <TD className="font-mono text-xs">{t.code}</TD>
                  <TD><Badge variant={t.is_enabled ? 'success' : 'warning'}>{t.is_enabled ? 'enabled' : 'disabled'}</Badge></TD>
                  <TD>{t.next_run_at ?? '—'}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => toggle.mutate({ code: t.code, status: String(!t.is_enabled) })} disabled={toggle.isLoading}>
                        Toggle
                      </Button>
                      <Button size="sm" onClick={() => runNow.mutate(t.code)} disabled={runNow.isLoading}>
                        Run now
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => { setRunCode(t.code); setOpenRuns(true); }}>
                        Runs
                      </Button>
                    </div>
                  </TD>
                </tr>
              ))}
              {tasks.length === 0 ? <tr><TD colSpan={4} className="text-slate-500">No tasks.</TD></tr> : null}
            </TBody>
          </Table>
        )}
      </ContentCard>

      <Modal
        open={openRuns}
        title={`Runs: ${runCode}`}
        onClose={() => setOpenRuns(false)}
        footer={<Button variant="secondary" onClick={() => setOpenRuns(false)}>Close</Button>}
      >
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <Input label="Limit" type="number" min={1} value={runsLimit} onChange={(e) => setRunsLimit(Number(e.target.value) || 50)} className="w-28" />
          <Button variant="secondary" onClick={() => runsQ.refetch()}>Refresh</Button>
        </div>
        {runsQ.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : runsQ.isError ? (
          <div className="text-sm text-red-700">{runsQ.error?.message ?? 'Failed to load runs.'}</div>
        ) : (
          <Table>
            <THead>
              <tr><TH>ID</TH><TH>Created</TH><TH>Status</TH><TH>Actions</TH></tr>
            </THead>
            <TBody>
              {(runsQ.data ?? []).map((r) => (
                <tr key={r.id}>
                  <TD className="font-mono text-xs">{r.id}</TD>
                  <TD>{r.created_at ?? '—'}</TD>
                  <TD><Badge variant={r.status === 'success' ? 'success' : r.status === 'failed' ? 'danger' : 'warning'}>{r.status}</Badge></TD>
                  <TD>
                    <Button size="sm" variant="secondary" onClick={() => { setRunId(r.id); setOpenRunDetail(true); }}>
                      View
                    </Button>
                  </TD>
                </tr>
              ))}
              {(runsQ.data ?? []).length === 0 ? <tr><TD colSpan={4} className="text-slate-500">No runs.</TD></tr> : null}
            </TBody>
          </Table>
        )}
      </Modal>

      <Modal
        open={openRunDetail}
        title={`Run detail: ${runCode} / ${runId}`}
        onClose={() => setOpenRunDetail(false)}
        footer={<Button variant="secondary" onClick={() => setOpenRunDetail(false)}>Close</Button>}
      >
        {detailQ.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : detailQ.isError ? (
          <div className="text-sm text-red-700">{detailQ.error?.message ?? 'Failed to load run.'}</div>
        ) : (
          <pre className="max-h-[28rem] overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(detailQ.data, null, 2)}</pre>
        )}
      </Modal>
    </div>
  );
}
