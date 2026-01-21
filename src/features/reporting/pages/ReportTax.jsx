import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Percent, Search } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeReportingApi } from '../api/reporting.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
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

export default function ReportTax() {
  const { http } = useApi();
  const api = useMemo(() => makeReportingApi(http), [http]);

  const [tab, setTab] = useState('summary');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [templateCode, setTemplateCode] = useState('');
  const [taxType, setTaxType] = useState('');

  const summaryQs = useMemo(() => ({ from: from || undefined, to: to || undefined }), [from, to]);
  const returnQs = useMemo(
    () => ({ from: from || undefined, to: to || undefined, templateCode: templateCode || undefined }),
    [from, to, templateCode]
  );
  const returnsQs = useMemo(() => ({ taxType: taxType || undefined, from: from || undefined, to: to || undefined }), [taxType, from, to]);

  const summaryQ = useQuery({ queryKey: qk.reportTaxVatSummary(summaryQs), queryFn: () => api.tax.vatSummary(summaryQs), enabled: false });
  const vatReturnQ = useQuery({ queryKey: qk.reportTaxVatReturn(returnQs), queryFn: () => api.tax.vatReturn(returnQs), enabled: false });
  const returnsQ = useQuery({ queryKey: qk.reportTaxReturns(returnsQs), queryFn: () => api.tax.returns(returnsQs), enabled: false });

  const active = tab === 'summary' ? summaryQ : tab === 'return' ? vatReturnQ : returnsQ;
  const rows = rowsFrom(active.data);
  const columns = useMemo(() => {
    const keys = rows[0] ? Object.keys(rows[0]) : ['field', 'value'];
    return keys.slice(0, 10).map((k) => ({ header: k, render: (r) => <span className="text-sm text-slate-800">{String(r[k] ?? '')}</span> }));
  }, [rows]);

  const run = () => {
    if (tab === 'summary') return summaryQ.refetch();
    if (tab === 'return') return vatReturnQ.refetch();
    return returnsQ.refetch();
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Tax Reports" subtitle="VAT/GST reporting endpoints under /reporting/tax." icon={Percent} />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'summary', label: 'VAT Summary' },
          { value: 'return', label: 'VAT Return' },
          { value: 'returns', label: 'Returns List' }
        ]}
      />

      <ReportShell
        filters={
          <>
            <Input label="From" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="YYYY-MM-DD" />
            <Input label="To" value={to} onChange={(e) => setTo(e.target.value)} placeholder="YYYY-MM-DD" />
            {tab === 'return' ? (
              <Input label="Template" value={templateCode} onChange={(e) => setTemplateCode(e.target.value)} placeholder="templateCode" />
            ) : null}
            {tab === 'returns' ? (
              <Input label="Tax type" value={taxType} onChange={(e) => setTaxType(e.target.value)} placeholder="VAT|GST|…" />
            ) : null}
          </>
        }
        right={
          <Button leftIcon={Search} loading={active.isLoading} onClick={run}>
            Run
          </Button>
        }
        footer={<JsonPanel title="Raw response" value={active.data ?? {}} />}
      >
        {Array.isArray(rows) && rows.length > 0 ? (
          <DataTable columns={columns} rows={rows} loading={active.isLoading} />
        ) : (
          <JsonPanel title="Result" value={active.data ?? {}} />
        )}
      </ReportShell>
    </div>
  );
}
