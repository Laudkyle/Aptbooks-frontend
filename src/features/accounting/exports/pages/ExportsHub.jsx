import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeExportsApi } from '../api/exports.api.js';
import { makePeriodsApi } from '../../periods/api/periods.api.js';
import { makeCoaApi } from '../../chartOfAccounts/api/coa.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../../shared/components/data/FilterBar.jsx';
import { ExportButton } from '../../../../shared/components/data/ExportButton.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { downloadBlob, filenameFromContentDisposition } from '../../../../shared/utils/fileDownload.js';

export default function ExportsHub() {
  const { http } = useApi();
  const api = useMemo(() => makeExportsApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const toast = useToast();

  const periodsQ = useQuery({ queryKey: ['periods'], queryFn: periodsApi.list, staleTime: 10_000 });
  const accountsQ = useQuery({ queryKey: ['coa', 'active'], queryFn: () => coaApi.list({ includeArchived: 'false' }), staleTime: 10_000 });

  const [periodId, setPeriodId] = useState('');
  const [format, setFormat] = useState('json');
  const [accountId, setAccountId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const periodOptions = [{ value: '', label: 'Select period…' }].concat((periodsQ.data ?? []).map((p) => ({ value: p.id, label: p.code })));
  const accountOptions = [{ value: '', label: 'Select account…' }].concat((accountsQ.data ?? []).map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` })));

  const exporter = (fn, qs, defaultName) =>
    useMutation({
      mutationFn: () => fn(qs),
      onSuccess: ({ blob, headers }) => {
        const name = filenameFromContentDisposition(headers?.['content-disposition']) || defaultName;
        downloadBlob(blob, name);
        toast.success('Export generated.');
      },
      onError: (e) => toast.error(e.message ?? 'Export failed')
    });

  const tb = exporter(api.trialBalance, { periodId: periodId || undefined, format }, 'trial-balance.' + format);
  const gl = exporter(api.generalLedger, { periodId: periodId || undefined, format }, 'general-ledger.' + format);
  const aa = exporter(api.accountActivity, { accountId, fromDate, toDate, format }, 'account-activity.' + format);

  return (
    <div className="space-y-4">
      <PageHeader title="Exports" subtitle="Download trial balance, general ledger, and account activity." />

      <FilterBar>
        <Select value={periodId} onChange={(e) => setPeriodId(e.target.value)} options={periodOptions} />
        <Select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          options={[
            { value: 'json', label: 'JSON' },
            { value: 'csv', label: 'CSV' },
            { value: 'xlsx', label: 'XLSX' }
          ]}
        />
      </FilterBar>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ContentCard title="Trial Balance">
          <div className="text-sm text-slate-600">Exports /core/accounting/exports/trial-balance</div>
          <div className="mt-3">
            <ExportButton onClick={() => tb.mutate()} disabled={!periodId || tb.isLoading}>
              Export trial balance
            </ExportButton>
          </div>
        </ContentCard>

        <ContentCard title="General Ledger">
          <div className="text-sm text-slate-600">Exports /core/accounting/exports/general-ledger</div>
          <div className="mt-3">
            <ExportButton onClick={() => gl.mutate()} disabled={!periodId || gl.isLoading}>
              Export general ledger
            </ExportButton>
          </div>
        </ContentCard>
      </div>

      <ContentCard title="Account Activity Export">
        <FilterBar
          right={
            <ExportButton onClick={() => aa.mutate()} disabled={!accountId || !fromDate || !toDate || aa.isLoading}>
              Export account activity
            </ExportButton>
          }
        >
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} options={accountOptions} />
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </FilterBar>
        <div className="mt-3 text-xs text-slate-600">
          Backend expects accountId, fromDate, toDate. Format defaults to json if omitted.
        </div>
      </ContentCard>
    </div>
  );
}
