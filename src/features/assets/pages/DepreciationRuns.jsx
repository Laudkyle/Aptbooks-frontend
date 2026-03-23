import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calculator } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAssetsApi } from '../api/assets.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';

export default function DepreciationRuns() {
  const { http } = useApi();
  const api = useMemo(() => makeAssetsApi(http), [http]);

  const [q, setQ] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', 'depreciation', 'schedules'],
    queryFn: () => api.listSchedules()
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];
  const filtered = rows.filter((r) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return String(r.assetId ?? r.asset_id ?? '').toLowerCase().includes(needle) || String(r.componentCode ?? r.component_code ?? '').toLowerCase().includes(needle);
  });

  const columns = useMemo(
    () => [
      { header: 'Asset', render: (r) => <span className="font-medium text-brand-deep">{r.assetId ?? r.asset_id ?? '—'}</span> },
      { header: 'Method', render: (r) => <span className="text-sm text-slate-700">{r.method ?? 'straight_line'}</span> },
      { header: 'Useful Life (months)', render: (r) => <span className="text-sm text-slate-700">{r.usefulLifeMonths ?? r.useful_life_months ?? '—'}</span> },
      { header: 'Status', render: (r) => <span className="text-xs text-slate-500">{r.status ?? 'active'}</span> }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Depreciation"
        subtitle="Maintain depreciation schedules and run period-end depreciation."
        icon={Calculator}
      />

      <ContentCard>
        <FilterBar
          left={
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={q} onChange={(e) => setQ(e.target.value)} label="Search" placeholder="Search by assetId / component…" />
              <div className="hidden md:block" />
              <div className="hidden md:block" />
            </div>
          }
          right={<div className="text-xs text-slate-500">{error ? <span className="text-red-600">{String(error?.message ?? 'Failed to load')}</span> : null}</div>}
        />

        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={filtered}
            isLoading={isLoading}
            empty={{
              title: 'No schedules found',
              description: 'Create depreciation schedules for fixed assets to enable automated period-end runs.'
            }}
          />
        </div>
      </ContentCard>
    </div>
  );
}
