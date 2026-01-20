import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeUtilitiesApi } from '../api/utilities.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Table, THead, TBody, TH, TD } from '../../../shared/components/ui/Table.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export default function ClientLogs() {
  const { http } = useApi();
  const api = useMemo(() => makeUtilitiesApi(http), [http]);
  const toast = useToast();

  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [correlationId, setCorrelationId] = useState('');
  const [level, setLevel] = useState('');

  const q = useQuery({
    queryKey: ['clientLogs', limit, offset, correlationId, level],
    queryFn: () => api.clientLogsQuery({ limit, offset, correlationId: correlationId || undefined, level: level || undefined }),
    staleTime: 5_000
  });

  const rows = q.data?.data ?? [];

  const [message, setMessage] = useState('');
  const [context, setContext] = useState('{}');

  const ingest = useMutation({
    mutationFn: async () => {
      const payload = {
        level: level || 'info',
        message,
        correlationId: correlationId || undefined,
        context: context ? JSON.parse(context) : undefined
      };
      return api.clientLogsIngest(payload);
    },
    onSuccess: () => {
      toast.success('Log ingested.');
      setMessage('');
    },
    onError: (e) => toast.error(e.message ?? 'Ingest failed')
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Client Logs" subtitle="/utilities/client-logs" />

      <ContentCard title="Query" actions={<Button variant="secondary" onClick={() => q.refetch()}>Refresh</Button>}>
        <div className="flex flex-wrap items-end gap-2">
          <Input label="Limit" type="number" min={1} value={limit} onChange={(e) => setLimit(Number(e.target.value) || 100)} className="w-28" />
          <Input label="Offset" type="number" min={0} value={offset} onChange={(e) => setOffset(Number(e.target.value) || 0)} className="w-28" />
          <Input label="Correlation ID" value={correlationId} onChange={(e) => setCorrelationId(e.target.value)} className="w-72" />
          <Input label="Level" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="info|warn|error" className="w-48" />
        </div>
      </ContentCard>

      <ContentCard title="Results">
        {q.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : q.isError ? (
          <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load logs.'}</div>
        ) : (
          <Table>
            <THead>
              <tr><TH>Time</TH><TH>Level</TH><TH>Message</TH><TH>Correlation</TH></tr>
            </THead>
            <TBody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <TD>{r.created_at ?? r.createdAt ?? '—'}</TD>
                  <TD><Badge variant={r.level === 'error' ? 'danger' : r.level === 'warn' ? 'warning' : 'info'}>{r.level ?? 'info'}</Badge></TD>
                  <TD className="max-w-[28rem] truncate">{r.message}</TD>
                  <TD className="font-mono text-xs">{r.correlation_id ?? r.correlationId ?? '—'}</TD>
                </tr>
              ))}
              {rows.length === 0 ? <tr><TD colSpan={4} className="text-slate-500">No rows.</TD></tr> : null}
            </TBody>
          </Table>
        )}
      </ContentCard>

      <ContentCard title="Ingest" actions={<Button onClick={() => ingest.mutate()} disabled={ingest.isLoading || !message}>Send</Button>}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input label="Message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Required" />
          <Input label="Level (optional)" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="info|warn|error" />
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Context JSON (optional)</span>
            <textarea
              className="h-40 w-full rounded-md border border-slate-200 bg-white p-3 text-xs font-mono focus:border-brand-light focus:ring-2 focus:ring-brand-light"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </label>
          <div className="md:col-span-2 text-xs text-slate-600">Idempotency-Key header is enforced; client sends one automatically.</div>
        </div>
      </ContentCard>

      <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">Raw response</summary>
        <pre className="mt-2 max-h-96 overflow-auto text-xs">{JSON.stringify(q.data, null, 2)}</pre>
      </details>
    </div>
  );
}
