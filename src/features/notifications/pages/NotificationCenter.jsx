import React, { useMemo, useState } from 'react'; 
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'; 
import { useApi } from '../../../shared/hooks/useApi.js'; 
import { makeNotificationsApi } from '../api/notifications.api.js'; 
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx'; 
import { Button } from '../../../shared/components/ui/Button.jsx'; 
import { Table, THead, TBody, TH, TD } from '../../../shared/components/ui/Table.jsx'; 
import { Badge } from '../../../shared/components/ui/Badge.jsx'; 
import { Pagination } from '../../../shared/components/ui/Pagination.jsx'; 
import { useToast } from '../../../shared/components/ui/Toast.jsx'; 

function toRows(payload) {
  if (!payload) return { rows: [], paging: null }; 
  if (Array.isArray(payload)) return { rows: payload, paging: null }; 
  if (Array.isArray(payload.data)) return { rows: payload.data, paging: payload.paging ?? null }; 
  if (Array.isArray(payload.notifications)) return { rows: payload.notifications, paging: payload.paging ?? null }; 
  // Unknown service-defined shape;  show raw as a single row
  return { rows: [{ id: 'payload', raw: payload }], paging: null }; 
}

export default function NotificationCenter() {
  const { http } = useApi(); 
  const api = useMemo(() => makeNotificationsApi(http), [http]); 
  const qc = useQueryClient(); 
  const toast = useToast(); 

  const [limit, setLimit] = useState(50); 
  const [offset, setOffset] = useState(0); 
  const [selected, setSelected] = useState(() => new Set()); 

  const listQuery = useQuery({
    queryKey: ['notifications', limit, offset],
    queryFn: () => api.list({ limit, offset }),
    staleTime: 5_000
  }); 

  const { rows, paging } = toRows(listQuery.data); 

  const markOne = useMutation({
    mutationFn: (id) => api.markRead(id),
    onSuccess: () => {
      toast.success('Notification marked as read.'); 
      qc.invalidateQueries({ queryKey: ['notifications'] }); 
    },
    onError: (e) => toast.error(e.message ?? 'Failed to mark read')
  }); 

  const bulk = useMutation({
    mutationFn: (ids) => api.bulkMarkRead(ids),
    onSuccess: () => {
      toast.success('Notifications marked as read.'); 
      setSelected(new Set()); 
      qc.invalidateQueries({ queryKey: ['notifications'] }); 
    },
    onError: (e) => toast.error(e.message ?? 'Failed to bulk mark read')
  }); 

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        subtitle="Service-defined payload;  this UI is resilient to shape changes."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              disabled={selected.size === 0 || bulk.isLoading}
              onClick={() => bulk.mutate(Array.from(selected))}
            >
              Mark selected read
            </Button>
            <Button variant="secondary" onClick={() => qc.invalidateQueries({ queryKey: ['notifications'] })}>
              Refresh
            </Button>
          </div>
        }
      />

      <ContentCard title="Inbox">
        {listQuery.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : listQuery.isError ? (
          <div className="text-sm text-red-700">{listQuery.error?.message ?? 'Failed to load notifications.'}</div>
        ) : (
          <div className="space-y-3">
            <Table>
              <THead>
                <tr>
                  <TH></TH>
                  <TH>ID</TH>
                  <TH>Type</TH>
                  <TH>Title</TH>
                  <TH>Status</TH>
                  <TH>Actions</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((n) => {
                  const id = n.id ?? n.notification_id ?? n.uuid ?? 'unknown'; 
                  const isSelected = selected.has(id); 
                  const status = n.read_at ? 'read' : n.status ?? (n.is_read ? 'read' : 'unread'); 
                  return (
                    <tr key={id}>
                      <TD>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setSelected((prev) => {
                              const next = new Set(prev); 
                              if (e.target.checked) next.add(id); 
                              else next.delete(id); 
                              return next; 
                            }); 
                          }}
                        />
                      </TD>
                      <TD className="font-mono text-xs">{id}</TD>
                      <TD>{n.type ? <Badge variant="info">{n.type}</Badge> : <span className="text-slate-500">—</span>}</TD>
                      <TD>{n.title ?? n.message ?? n.subject ?? '—'}</TD>
                      <TD>
                        <Badge variant={status === 'read' ? 'success' : 'warning'}>{status}</Badge>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={id === 'payload' || markOne.isLoading}
                            onClick={() => markOne.mutate(id)}
                          >
                            Mark read
                          </Button>
                        </div>
                      </TD>
                    </tr>
                  ); 
                })}
              </TBody>
            </Table>

            <Pagination
              limit={paging?.limit ?? limit}
              offset={paging?.offset ?? offset}
              total={paging?.total ?? null}
              onChange={({ limit: l, offset: o }) => {
                if (l !== limit) setLimit(l); 
                setOffset(o); 
              }}
            />

            <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-800">Raw payload</summary>
              <pre className="mt-2 max-h-96 overflow-auto text-xs text-slate-700">
                {JSON.stringify(listQuery.data, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </ContentCard>
    </div>
  ); 
}
