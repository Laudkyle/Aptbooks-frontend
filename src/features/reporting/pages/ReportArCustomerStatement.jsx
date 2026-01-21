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

export default function ReportArCustomerStatement() {
  const { http } = useApi();
  const api = useMemo(() => makeReportingApi(http), [http]);

  const [customerId, setCustomerId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const qs = useMemo(
    () => ({ customerId: customerId || undefined, from: from || undefined, to: to || undefined }),
    [customerId, from, to]
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: qk.reportArCustomerStatement(qs),
    queryFn: () => api.ar.customerStatement(qs),
    enabled: false
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Customer Statement" subtitle="AR statement view. Backend response is service-defined." icon={FileText} />

      <ReportShell
        filters={
          <>
            <Input label="Customer id" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="number id" />
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
