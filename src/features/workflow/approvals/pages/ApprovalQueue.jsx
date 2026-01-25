import React, { useMemo, useState } from 'react'; 
import { useQuery } from '@tanstack/react-query'; 
import { useApi } from '../../../../shared/hooks/useApi.js'; 
import { makeApprovalsApi } from '../api/approvals.api.js'; 
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx'; 
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx'; 
import { Pagination } from '../../../../shared/components/ui/Pagination.jsx'; 
import { Input } from '../../../../shared/components/ui/Input.jsx'; 

export default function ApprovalQueue() {
  const { http } = useApi(); 
  const api = useMemo(() => makeApprovalsApi(http), [http]); 

  const [limit, setLimit] = useState(50); 
  const [offset, setOffset] = useState(0); 
  const [state, setState] = useState(''); 
  const [documentTypeId, setDocumentTypeId] = useState(''); 

  const q = useQuery({
    queryKey: ['approvalsInbox', limit, offset, state, documentTypeId],
    queryFn: () => api.inbox({ limit, offset, state: state || undefined, documentTypeId: documentTypeId || undefined }),
    staleTime: 5_000
  }); 

  const rows = q.data?.data ?? []; 
  const paging = q.data?.paging ?? { limit, offset }; 

  return (
    <div className="space-y-4">
      <PageHeader
        title="Approvals Inbox"
        subtitle="Backlog of documents awaiting your action. Payload shape depends on repository rows."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <Input label="State" value={state} onChange={(e) => setState(e.target.value)} placeholder="optional" className="w-48" />
            <Input
              label="Document Type ID"
              value={documentTypeId}
              onChange={(e) => setDocumentTypeId(e.target.value)}
              placeholder="uuid"
              className="w-72"
            />
            <Input
              label="Limit"
              type="number"
              min={1}
              max={200}
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value) || 50); 
                setOffset(0); 
              }}
              className="w-28"
            />
          </div>
        }
      />

      <ContentCard title="Inbox">
        {q.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : q.isError ? (
          <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load inbox.'}</div>
        ) : (
          <div className="space-y-3">
            <Table>
              <THead>
                <tr>
                  <TH>ID</TH>
                  <TH>Document</TH>
                  <TH>State</TH>
                  <TH>Updated</TH>
                  <TH>Raw</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((r, idx) => (
                  <tr key={r.id ?? idx}>
                    <TD className="font-mono text-xs">{r.id ?? '—'}</TD>
                    <TD>{r.document_ref ?? r.entity_ref ?? r.title ?? r.documentId ?? '—'}</TD>
                    <TD>{r.state ?? r.workflow_state ?? '—'}</TD>
                    <TD>{r.updated_at ?? r.updatedAt ?? '—'}</TD>
                    <TD>
                      <details>
                        <summary className="cursor-pointer text-xs text-brand-primary">view</summary>
                        <pre className="mt-2 max-h-72 overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(r, null, 2)}</pre>
                      </details>
                    </TD>
                  </tr>
                ))}
              </TBody>
            </Table>

            <Pagination
              limit={paging.limit ?? limit}
              offset={paging.offset ?? offset}
              total={paging.total ?? null}
              onChange={({ offset: o }) => setOffset(o)}
            />

            <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-800">Raw response</summary>
              <pre className="mt-2 max-h-96 overflow-auto text-xs text-slate-700">{JSON.stringify(q.data, null, 2)}</pre>
            </details>
          </div>
        )}
      </ContentCard>
    </div>
  ); 
}
