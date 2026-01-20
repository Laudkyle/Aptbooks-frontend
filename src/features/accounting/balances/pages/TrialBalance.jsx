import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeBalancesApi } from '../api/balances.api.js';
import { makePeriodsApi } from '../../periods/api/periods.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../../shared/components/data/FilterBar.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { formatMoney } from '../../../../shared/utils/formatMoney.js';

export default function TrialBalance() {
  const { http } = useApi();
  const api = useMemo(() => makeBalancesApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  const periodsQ = useQuery({ queryKey: ['periods'], queryFn: periodsApi.list, staleTime: 10_000 });
  const [periodId, setPeriodId] = useState('');

  const tbQ = useQuery({
    queryKey: ['trialBalance', periodId],
    queryFn: () => api.trialBalance({ periodId }),
    enabled: !!periodId
  });

  const periodOptions = [{ value: '', label: 'Select period…' }].concat(
    (periodsQ.data ?? []).map((p) => ({ value: p.id, label: p.code }))
  );

  const rows = tbQ.data?.data ?? tbQ.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Trial Balance" subtitle="View trial balance by period." />

      <FilterBar>
        <Select value={periodId} onChange={(e) => setPeriodId(e.target.value)} options={periodOptions} />
      </FilterBar>

      <ContentCard title="Trial balance">
        {tbQ.isLoading ? (
          <div className="text-sm text-slate-700">Loading…</div>
        ) : tbQ.isError ? (
          <div className="text-sm text-red-700">{tbQ.error?.message ?? 'Failed to load trial balance.'}</div>
        ) : !periodId ? (
          <div className="text-sm text-slate-700">Select a period to load trial balance.</div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <THead>
                <tr>
                  <TH>Code</TH>
                  <TH>Name</TH>
                  <TH className="text-right">Debit</TH>
                  <TH className="text-right">Credit</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((r, idx) => (
                  <tr key={r.accountId ?? r.account_id ?? idx}>
                    <TD>{r.code ?? r.accountCode ?? '—'}</TD>
                    <TD>{r.name ?? r.accountName ?? '—'}</TD>
                    <TD className="text-right">{formatMoney(r.debit ?? r.debitTotal ?? 0)}</TD>
                    <TD className="text-right">{formatMoney(r.credit ?? r.creditTotal ?? 0)}</TD>
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
