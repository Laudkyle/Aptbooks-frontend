import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Ruler, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';

export default function Units() {
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);
  const [q, setQ] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'units'],
    queryFn: () => api.listUnits()
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];
  const filtered = rows.filter((r) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return String(r.code ?? '').toLowerCase().includes(needle) || String(r.name ?? '').toLowerCase().includes(needle);
  });

  const columns = useMemo(
    () => [
      { header: 'Unit', render: (r) => <div className="font-medium text-brand-deep">{r.name ?? '—'}</div> },
      { header: 'Code', render: (r) => <span className="text-sm text-slate-700">{r.code ?? '—'}</span> }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Units"
        subtitle="Units of measure used for items and transactions."
        icon={Ruler}
        actions={
          <Button leftIcon={Plus} variant="primary">
            New unit
          </Button>
        }
      />

      <ContentCard>
        <FilterBar
          left={
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code or name…" label="Search" />
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
            empty={{ title: 'No units found', description: 'Create units of measure to standardize item quantities.' }}
          />
        </div>
      </ContentCard>
    </div>
  );
}
