import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeBankingApi } from '../api/banking.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';

function normalizeRows(data) {
  return Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : data?.rows ?? [];
}

export default function StatementStatusPage() {
  const { http } = useApi();
  const api = useMemo(() => makeBankingApi(http), [http]);

  const [params, setParams] = useState({ from: '', to: '', bankAccountId: '' });
  const accountsQuery = useQuery({ queryKey: ['banking.accounts'], queryFn: async () => api.listAccounts() });

  const statusQuery = useQuery({
    queryKey: ['reporting.banking.statementStatus', params],
    queryFn: async () => api.statementStatus({ from: params.from, to: params.to, bankAccountId: params.bankAccountId || undefined }),
    enabled: !!params.from && !!params.to
  });

  const accounts = normalizeRows(accountsQuery.data);
  const accountOptions = [{ value: '', label: 'All bank accounts' }].concat(
    accounts.map((a) => ({ value: String(a.id), label: `${a.code ?? ''} — ${a.name ?? ''}`.trim() }))
  );

  const payload = statusQuery.data;
  const rows = normalizeRows(payload);

  return (
    <>
      <PageHeader
        title="Statement status"
        subtitle="Reporting widget: which bank accounts are missing statements or have incomplete matching."
        actions={<Button variant="secondary" onClick={() => statusQuery.refetch()} disabled={!params.from || !params.to}>Refresh</Button>}
      />

      <ContentCard title="Parameters" actions={<Badge variant="info">GET /reporting/banking/statement-status</Badge>}>
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="From" placeholder="YYYY-MM-DD" value={params.from} onChange={(e) => setParams((p) => ({ ...p, from: e.target.value }))} />
          <Input label="To" placeholder="YYYY-MM-DD" value={params.to} onChange={(e) => setParams((p) => ({ ...p, to: e.target.value }))} />
          <Select label="Bank account" value={params.bankAccountId} onChange={(e) => setParams((p) => ({ ...p, bankAccountId: e.target.value }))} options={accountOptions} />
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Set a date range to load results. Requires reporting.banking.read permission.
        </div>
      </ContentCard>

      <div className="mt-6" />

      <ContentCard title="Status" actions={<Badge variant="info">Result</Badge>}>
        {!params.from || !params.to ? (
          <div className="text-sm text-slate-600">Provide From and To dates to load the widget.</div>
        ) : statusQuery.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : statusQuery.isError ? (
          <div className="text-sm text-red-700">{statusQuery.error?.message ?? 'Failed to load status.'}</div>
        ) : (
          <Table
            columns={[
              { header: 'Bank account', key: 'bank', render: (r) => <span className="font-mono text-xs">{r.bank_account_id ?? r.bankAccountId ?? '—'}</span> },
              { header: 'Last statement', key: 'last_statement_date', render: (r) => <span className="font-mono text-xs">{r.last_statement_date ?? '—'}</span> },
              { header: 'Missing count', key: 'missing_count', render: (r) => <span className="font-mono text-xs">{r.missing_count ?? r.missingCount ?? '—'}</span> },
              { header: 'Unmatched lines', key: 'unmatched_lines', render: (r) => <span className="font-mono text-xs">{r.unmatched_lines ?? r.unmatchedLines ?? '—'}</span> },
              { header: 'Status', key: 'status', render: (r) => <Badge variant={r.status === 'ok' ? 'success' : 'warning'}>{r.status ?? '—'}</Badge> }
            ]}
            rows={rows}
            keyField="bank_account_id"
          />
        )}
      </ContentCard>
    </>
  );
}
