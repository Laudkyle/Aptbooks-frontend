import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeReconciliationApi } from '../api/reconciliation.api.js';
import { makePeriodsApi } from '../../periods/api/periods.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../../shared/components/data/FilterBar.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';

export default function Reconciliation() {
  const { http } = useApi();
  const api = useMemo(() => makeReconciliationApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  const periodsQ = useQuery({ queryKey: ['periods'], queryFn: periodsApi.list, staleTime: 10_000 });
  const [periodId, setPeriodId] = useState('');

  const q = useQuery({
    queryKey: ['reconcile-period', periodId],
    queryFn: () => api.period({ periodId }),
    enabled: !!periodId
  });

  const periodOptions = [{ value: '', label: 'Select period…' }].concat((periodsQ.data ?? []).map((p) => ({ value: p.id, label: p.code })));

  return (
    <div className="space-y-4">
      <PageHeader title="Reconciliation" subtitle="Period-level reconciliation view." />
      <FilterBar>
        <Select value={periodId} onChange={(e) => setPeriodId(e.target.value)} options={periodOptions} />
      </FilterBar>
      <ContentCard title="Result">
        {q.isLoading ? (
          <div className="text-sm text-slate-700">Loading…</div>
        ) : q.isError ? (
          <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load.'}</div>
        ) : !periodId ? (
          <div className="text-sm text-slate-700">Select a period to load reconciliation.</div>
        ) : (
          <pre className="max-h-[70vh] overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-800">{JSON.stringify(q.data, null, 2)}</pre>
        )}
      </ContentCard>
    </div>
  );
}
