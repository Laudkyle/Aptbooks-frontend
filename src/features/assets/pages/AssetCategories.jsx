import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeAssetsApi } from '../api/assets.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';

export default function AssetCategories() {
  const { http } = useApi();
  const api = useMemo(() => makeAssetsApi(http), [http]);

  const [q, setQ] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: qk.assetCategories ? qk.assetCategories : ['assets', 'categories'],
    queryFn: () => api.listCategories()
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];
  const filtered = rows.filter((r) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return String(r.code ?? '').toLowerCase().includes(needle) || String(r.name ?? '').toLowerCase().includes(needle);
  });

  const columns = useMemo(
    () => [
      {
        header: 'Category',
        render: (r) => (
          <div className="flex flex-col">
            <div className="font-medium text-brand-deep">{r.name ?? '—'}</div>
            <div className="text-xs text-slate-500">{r.code ?? '—'}</div>
          </div>
        )
      },
      {
        header: 'Status',
        render: (r) => <Badge tone={(r.status ?? 'active') === 'active' ? 'success' : 'muted'}>{r.status ?? 'active'}</Badge>
      },
      {
        header: 'Accounts',
        render: (r) => (
          <div className="text-xs text-slate-600">
            <div>Asset: {r.asset_account_id ?? r.assetAccountId ?? '—'}</div>
            <div>Depr exp: {r.depr_expense_account_id ?? r.deprExpenseAccountId ?? '—'}</div>
          </div>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Asset Categories"
        subtitle="Maintain category master data and default accounts for capitalisation, depreciation and disposal."
        icon={Layers}
        actions={
          <Button leftIcon={Plus} variant="primary">
            New category
          </Button>
        }
      />

      <ContentCard>
        <FilterBar
          left={
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by code or name…" label="Search" />
              <div className="hidden md:block" />
              <div className="hidden md:block" />
            </div>
          }
          right={
            <div className="text-xs text-slate-500">
              {error ? <span className="text-red-600">{String(error?.message ?? 'Failed to load')}</span> : null}
            </div>
          }
        />

        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={filtered}
            isLoading={isLoading}
            empty={{
              title: 'No categories found',
              description: 'Create categories to standardize accounts for assets and depreciation.'
            }}
          />
        </div>
      </ContentCard>
    </div>
  );
}
