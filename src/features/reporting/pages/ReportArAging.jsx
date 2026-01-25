import React, { useMemo, useState } from 'react'; 
import { useQuery } from '@tanstack/react-query'; 
import { LineChart, Download } from 'lucide-react'; 

import { useApi } from '../../../shared/hooks/useApi.js'; 
import { qk } from '../../../shared/query/keys.js'; 
import { makeReportingApi } from '../api/reporting.api.js'; 
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx'; 
import { DataTable } from '../../../shared/components/data/DataTable.jsx'; 
import { Input } from '../../../shared/components/ui/Input.jsx'; 
import { Button } from '../../../shared/components/ui/Button.jsx'; 
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx'; 
import { ReportShell } from './_ReportShell.jsx'; 

function rowsFrom(data) {
  if (!data) return []; 
  if (Array.isArray(data)) return data; 
  if (Array.isArray(data.data)) return data.data; 
  if (Array.isArray(data.rows)) return data.rows; 
  if (Array.isArray(data.items)) return data.items; 
  return []; 
}

export default function ReportArAging() {
  const { http } = useApi(); 
  const api = useMemo(() => makeReportingApi(http), [http]); 

  const [asOfDate, setAsOfDate] = useState(''); 
  const [bucketSetId, setBucketSetId] = useState(''); 

  const qs = useMemo(
    () => ({
      asOfDate: asOfDate || undefined,
      bucketSetId: bucketSetId || undefined
    }),
    [asOfDate, bucketSetId]
  ); 

  const { data, isLoading, refetch } = useQuery({ queryKey: qk.reportArAging(qs), queryFn: () => api.ar.agedReceivables(qs) }); 
  const rows = rowsFrom(data); 

  const columns = useMemo(() => {
    const keys = rows[0] ? Object.keys(rows[0]) : ['customer', 'total']; 
    return keys.slice(0, 8).map((k) => ({
      header: k,
      render: (r) => <span className="text-sm text-slate-800">{String(r[k] ?? '')}</span>
    })); 
  }, [rows]); 

  return (
    <div className="space-y-4">
      <PageHeader title="AR Aging" subtitle="Aged receivables snapshot by customer." icon={LineChart} />

      <ReportShell
        filters={
          <>
            <Input label="As of date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} placeholder="YYYY-MM-DD" />
            <Input label="Bucket set" value={bucketSetId} onChange={(e) => setBucketSetId(e.target.value)} placeholder="bucketSetId" />
          </>
        }
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" leftIcon={Download} onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        }
        footer={<JsonPanel title="Raw response" value={data ?? {}} />}
      >
        <DataTable
          columns={columns}
          rows={rows}
          loading={isLoading}
          empty={{ title: 'No data', description: 'Adjust filters and refresh.' }}
        />
      </ReportShell>
    </div>
  ); 
}
