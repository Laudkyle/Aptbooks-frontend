import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Search } from 'lucide-react';

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
  return [];
}

export default function ReportArOpenItems() {
  const { http } = useApi();
  const api = useMemo(() => makeReportingApi(http), [http]);

  const [customerId, setCustomerId] = useState('');
  const qs = useMemo(() => ({ customerId: customerId || undefined }), [customerId]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: qk.reportArOpenItems(qs),
    queryFn: () => api.ar.openItems(qs)
  });

  const rows = rowsFrom(data);
  const columns = useMemo(() => {
    const keys = rows[0] ? Object.keys(rows[0]) : ['id', 'amount'];
    return keys.slice(0, 9).map((k) => ({
      header: k,
      render: (r) => <span className="text-sm text-slate-800">{String(r[k] ?? '')}</span>
    }));
  }, [rows]);

  return (
    <div className="space-y-4">
      <PageHeader title="AR Open Items" subtitle="Outstanding AR items drilldown." icon={LineChart} />

      <ReportShell
        filters={<Input label="Customer id" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="number id" />}
        right={
          <Button variant="outline" leftIcon={Search} onClick={() => refetch()}>
            Run
          </Button>
        }
        footer={<JsonPanel title="Raw response" value={data ?? {}} />}
      >
        <DataTable columns={columns} rows={rows} loading={isLoading} empty={{ title: 'No data', description: 'Provide customerId and run.' }} />
      </ReportShell>
    </div>
  );
}
