import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';

export default function Items() {
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);

  const [q, setQ] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'items'],
    queryFn: () => api.listItems()
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];
  const filtered = rows.filter((r) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return String(r.sku ?? '').toLowerCase().includes(needle) || String(r.name ?? '').toLowerCase().includes(needle);
  });

  const columns = useMemo(
    () => [
      {
        header: 'Item',
        render: (r) => (
          <div className="flex flex-col">
            <div className="font-medium text-brand-deep">{r.name ?? '—'}</div>
            <div className="text-xs text-slate-500">SKU: {r.sku ?? '—'}</div>
          </div>
        )
      },
      { header: 'Category', render: (r) => <span className="text-sm text-slate-700">{r.category_name ?? r.categoryName ?? r.category_id ?? r.categoryId ?? '—'}</span> },
      { header: 'Unit', render: (r) => <span className="text-sm text-slate-700">{r.unit_name ?? r.unitName ?? r.unit_id ?? r.unitId ?? '—'}</span> },
      {
        header: 'Status',
        render: (r) => <Badge tone={(r.status ?? 'active') === 'active' ? 'success' : 'muted'}>{r.status ?? 'active'}</Badge>
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Items"
        subtitle="Maintain item master data used for receipts, issues, transfers, and stock counts."
        icon={Box}
        actions={
          <Button leftIcon={Plus} variant="primary">
            New item
          </Button>
        }
      />

      <ContentCard>
        <FilterBar
          left={
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by SKU or name…" label="Search" />
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
            empty={{ title: 'No items yet', description: 'Create items to begin tracking inventory movements and valuations.' }}
          />
        </div>
      </ContentCard>
    </div>
  );
}
