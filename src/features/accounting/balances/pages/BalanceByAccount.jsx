import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeBalancesApi } from '../api/balances.api.js';
import { makeCoaApi } from '../../chartOfAccounts/api/coa.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../../shared/components/data/FilterBar.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';

export default function BalanceByAccount() {
  const { http } = useApi();
  const api = useMemo(() => makeBalancesApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);

  const accountsQ = useQuery({ queryKey: ['coa', 'active'], queryFn: () => coaApi.list({ includeArchived: 'false' }), staleTime: 10_000 });

  const [accountId, setAccountId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const q = useQuery({
    queryKey: ['accountActivity', { accountId, from, to }],
    queryFn: () => api.accountActivity({ accountId, from, to }),
    enabled: !!accountId && !!from && !!to
  });

  const accountOptions = [{ value: '', label: 'Select account…' }].concat(
    (accountsQ.data ?? []).map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))
  );

  const rows = q.data?.data ?? q.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Account Activity" subtitle="Ledger activity for a single account within a date range." />
      <FilterBar>
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} options={accountOptions} />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </FilterBar>

      <ContentCard title="Activity">
        {q.isLoading ? (
          <div className="text-sm text-slate-700">Loading…</div>
        ) : q.isError ? (
          <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load activity.'}</div>
        ) : !accountId || !from || !to ? (
          <div className="text-sm text-slate-700">Select account and date range to load results.</div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <THead>
                <tr>
                  <TH>Date</TH>
                  <TH>Entry</TH>
                  <TH>Description</TH>
                  <TH className="text-right">Debit</TH>
                  <TH className="text-right">Credit</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((r, idx) => (
                  <tr key={r.id ?? idx}>
                    <TD>{r.entryDate ?? r.entry_date ?? r.date ?? '—'}</TD>
                    <TD>{r.entryNo ?? r.entry_no ?? r.journalId ?? '—'}</TD>
                    <TD>{r.description ?? r.memo ?? '—'}</TD>
                    <TD className="text-right">{r.debit ?? '—'}</TD>
                    <TD className="text-right">{r.credit ?? '—'}</TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </ContentCard>
    </div>
  );
}
