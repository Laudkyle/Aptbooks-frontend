import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAssetsApi } from '../api/assets.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';

export default function AssetRegister() {
  const { http } = useApi();
  const api = useMemo(() => makeAssetsApi(http), [http]);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', 'fixedAssets', { status: status || undefined }],
    queryFn: () => api.listFixedAssets(status ? { status } : undefined)
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];
  const filtered = rows.filter((r) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      String(r.code ?? '').toLowerCase().includes(needle) ||
      String(r.name ?? '').toLowerCase().includes(needle) ||
      String(r.category_name ?? r.categoryName ?? '').toLowerCase().includes(needle)
    );
  });

  const columns = useMemo(
    () => [
      {
        header: 'Asset',
        render: (r) => (
          <div className="flex flex-col">
            <Link to={ROUTES.assetsFixedAssetDetail ? ROUTES.assetsFixedAssetDetail(r.id) : '#'} className="font-medium text-brand-deep hover:underline">
              {r.name ?? '—'}
            </Link>
            <div className="text-xs text-slate-500">{r.code ?? '—'}</div>
          </div>
        )
      },
      { header: 'Category', render: (r) => <span className="text-sm text-slate-700">{r.category_name ?? r.categoryName ?? '—'}</span> },
      { header: 'Acquired', render: (r) => <span className="text-sm text-slate-700">{String(r.acquisition_date ?? r.acquisitionDate ?? '—')}</span> },
      { header: 'Cost', render: (r) => <span className="text-sm font-medium text-slate-900">{r.cost ?? '—'}</span> },
      {
        header: 'Status',
        render: (r) => {
          const s = r.status ?? 'draft';
          const tone = s === 'active' ? 'success' : s === 'disposed' ? 'danger' : s === 'retired' ? 'warning' : 'muted';
          return <Badge tone={tone}>{s}</Badge>;
        }
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Asset Register"
        subtitle="Register fixed assets, monitor lifecycle status, and launch depreciation workflows."
        icon={Building2}
        actions={
          <Button leftIcon={Plus} variant="primary">
            Register asset
          </Button>
        }
      />

      <ContentCard>
        <FilterBar
          left={
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, name, category…" label="Search" />
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: '', label: 'All' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'active', label: 'Active' },
                  { value: 'retired', label: 'Retired' },
                  { value: 'disposed', label: 'Disposed' }
                ]}
              />
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
              title: 'No fixed assets yet',
              description: 'Register assets to begin capitalisation and depreciation management.'
            }}
          />
        </div>
      </ContentCard>
    </div>
  );
}
