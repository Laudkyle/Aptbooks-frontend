import React, { useMemo, useState } from 'react'; 
import { useQuery } from '@tanstack/react-query'; 
import { FileText, Search } from 'lucide-react'; 

import { useApi } from '../../../shared/hooks/useApi.js'; 
import { qk } from '../../../shared/query/keys.js'; 
import { makeReportingApi } from '../api/reporting.api.js'; 
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx'; 
import { Input } from '../../../shared/components/ui/Input.jsx'; 
import { Button } from '../../../shared/components/ui/Button.jsx'; 
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx'; 
import { ReportShell } from './_ReportShell.jsx'; 

export default function ReportApVendorStatement() {
  const { http } = useApi(); 
  const api = useMemo(() => makeReportingApi(http), [http]); 

  const [vendorId, setVendorId] = useState(''); 
  const [from, setFrom] = useState(''); 
  const [to, setTo] = useState(''); 

  const qs = useMemo(() => ({ vendorId: vendorId || undefined, from: from || undefined, to: to || undefined }), [vendorId, from, to]); 

  const { data, isLoading, refetch } = useQuery({
    queryKey: qk.reportApVendorStatement(qs),
    queryFn: () => api.ap.vendorStatement(qs),
    enabled: false
  }); 

  return (
    <div className="space-y-4">
      <PageHeader title="Vendor Statement" subtitle="AP statement view. Backend response is service-defined." icon={FileText} />

      <ReportShell
        filters={
          <>
            <Input label="Vendor id" value={vendorId} onChange={(e) => setVendorId(e.target.value)} placeholder="number id" />
            <Input label="From" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="YYYY-MM-DD" />
            <Input label="To" value={to} onChange={(e) => setTo(e.target.value)} placeholder="YYYY-MM-DD" />
          </>
        }
        right={
          <Button leftIcon={Search} loading={isLoading} onClick={() => refetch()}>
            Run
          </Button>
        }
      >
        <JsonPanel title="Statement" value={data ?? {}} />
      </ReportShell>
    </div>
  ); 
}
