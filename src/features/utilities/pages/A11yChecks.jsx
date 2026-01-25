import React, { useMemo } from 'react'; 
import { useQuery } from '@tanstack/react-query'; 
import { useApi } from '../../../shared/hooks/useApi.js'; 
import { makeUtilitiesApi } from '../api/utilities.api.js'; 
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx'; 
import { Table, THead, TBody, TH, TD } from '../../../shared/components/ui/Table.jsx'; 
import { Badge } from '../../../shared/components/ui/Badge.jsx'; 

export default function A11yChecks() {
  const { http } = useApi(); 
  const api = useMemo(() => makeUtilitiesApi(http), [http]); 
  const q = useQuery({ queryKey: ['a11yStatus'], queryFn: api.a11yStatus, staleTime: 60_000 }); 
  const data = q.data?.data ?? q.data; 
  const checks = data?.checks ?? []; 

  return (
    <div className="space-y-4">
      <PageHeader title="Accessibility" subtitle="/utilities/a11y/status" />
      <ContentCard title="Status">
        {q.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : q.isError ? (
          <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load a11y status.'}</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-slate-700">Standard: <span className="font-medium text-slate-900">{data?.standard ?? '—'}</span></div>
            <div className="text-sm text-slate-700">Last run: <span className="font-mono text-xs">{String(data?.last_run_at ?? 'null')}</span></div>
            <Table>
              <THead>
                <tr><TH>Key</TH><TH>Description</TH><TH>Status</TH></tr>
              </THead>
              <TBody>
                {checks.map((c) => (
                  <tr key={c.key}>
                    <TD className="font-mono text-xs">{c.key}</TD>
                    <TD>{c.description ?? '—'}</TD>
                    <TD><Badge variant={c.status === 'pass' ? 'success' : 'warning'}>{c.status}</Badge></TD>
                  </tr>
                ))}
                {checks.length === 0 ? <tr><TD colSpan={3} className="text-slate-500">No checks.</TD></tr> : null}
              </TBody>
            </Table>
          </div>
        )}
      </ContentCard>
    </div>
  ); 
}
