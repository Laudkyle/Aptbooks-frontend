import React, { useMemo, useState } from 'react'; 
import { useQuery } from '@tanstack/react-query'; 
import { useApi } from '../../../shared/hooks/useApi.js'; 
import { makeUtilitiesApi } from '../api/utilities.api.js'; 
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx'; 
import { Table, THead, TBody, TH, TD } from '../../../shared/components/ui/Table.jsx'; 
import { Input } from '../../../shared/components/ui/Input.jsx'; 
import { Button } from '../../../shared/components/ui/Button.jsx'; 
import { Modal } from '../../../shared/components/ui/Modal.jsx'; 

export default function ErrorLogs() {
  const { http } = useApi(); 
  const api = useMemo(() => makeUtilitiesApi(http), [http]); 

  const [limit, setLimit] = useState(100); 
  const [status, setStatus] = useState(''); 
  const [method, setMethod] = useState(''); 
  const [path, setPath] = useState(''); 
  const [correlationId, setCorrelationId] = useState(''); 
  const [days, setDays] = useState(14); 

  const listQ = useQuery({
    queryKey: ['errorLogs', limit, status, method, path, correlationId],
    queryFn: () => api.errorsList({ limit, status: status || undefined, method: method || undefined, path: path || undefined, correlationId: correlationId || undefined }),
    staleTime: 5_000
  }); 

  const statsQ = useQuery({
    queryKey: ['errorStats', days],
    queryFn: () => api.errorsStats({ days }),
    staleTime: 30_000
  }); 

  const rows = listQ.data?.data ?? []; 

  const [open, setOpen] = useState(false); 
  const [cid, setCid] = useState(''); 
  const corrQ = useQuery({
    queryKey: ['errorCorrelation', cid],
    queryFn: () => api.errorsCorrelation(cid),
    enabled: !!cid && open,
    staleTime: 5_000
  }); 

  return (
    <div className="space-y-4">
      <PageHeader title="Error Logs" subtitle="/utilities/errors" />

      <ContentCard title="Stats (summary)" actions={<Button variant="secondary" onClick={() => statsQ.refetch()}>Refresh</Button>}>
        {statsQ.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : statsQ.isError ? (
          <div className="text-sm text-red-700">{statsQ.error?.message ?? 'Failed to load stats.'}</div>
        ) : (
          <pre className="max-h-64 overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(statsQ.data, null, 2)}</pre>
        )}
      </ContentCard>

      <ContentCard title="Filters" actions={<Button variant="secondary" onClick={() => listQ.refetch()}>Refresh</Button>}>
        <div className="flex flex-wrap items-end gap-2">
          <Input label="Limit" type="number" min={1} value={limit} onChange={(e) => setLimit(Number(e.target.value) || 100)} className="w-28" />
          <Input label="Status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="e.g. 500" className="w-28" />
          <Input label="Method" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="GET" className="w-28" />
          <Input label="Path" value={path} onChange={(e) => setPath(e.target.value)} placeholder="/core/..." className="w-72" />
          <Input label="Correlation" value={correlationId} onChange={(e) => setCorrelationId(e.target.value)} className="w-72" />
        </div>
      </ContentCard>

      <ContentCard title="Recent errors">
        {listQ.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : listQ.isError ? (
          <div className="text-sm text-red-700">{listQ.error?.message ?? 'Failed to load errors.'}</div>
        ) : (
          <Table>
            <THead>
              <tr><TH>Time</TH><TH>Status</TH><TH>Method</TH><TH>Path</TH><TH>Correlation</TH><TH>Message</TH><TH></TH></tr>
            </THead>
            <TBody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <TD>{r.created_at}</TD>
                  <TD>{r.status}</TD>
                  <TD>{r.method}</TD>
                  <TD className="max-w-[18rem] truncate">{r.path}</TD>
                  <TD className="font-mono text-xs max-w-[12rem] truncate">{r.correlation_id}</TD>
                  <TD className="max-w-[18rem] truncate">{r.message}</TD>
                  <TD>
                    <Button size="sm" variant="secondary" onClick={() => { setCid(r.correlation_id);  setOpen(true);  }}>View</Button>
                  </TD>
                </tr>
              ))}
              {rows.length === 0 ? <tr><TD colSpan={7} className="text-slate-500">No rows.</TD></tr> : null}
            </TBody>
          </Table>
        )}
      </ContentCard>

      <Modal open={open} title={`Correlation: ${cid}`} onClose={() => setOpen(false)} footer={<Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>}>
        {corrQ.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : corrQ.isError ? (
          <div className="text-sm text-red-700">{corrQ.error?.message ?? 'Failed to load correlation.'}</div>
        ) : (
          <pre className="max-h-[28rem] overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(corrQ.data, null, 2)}</pre>
        )}
      </Modal>
    </div>
  ); 
}
