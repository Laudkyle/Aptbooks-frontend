import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, AlertTriangle } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';

export default function StockCounts() {
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);

  const [warehouseId, setWarehouseId] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'stockCounts', warehouseId],
    queryFn: () => api.listStockCounts({ warehouseId: warehouseId || undefined })
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];

  const columns = useMemo(
    () => [
      { header: 'Reference', render: (r) => <span className="font-medium text-brand-deep">{r.reference ?? r.code ?? '—'}</span> },
      { header: 'Warehouse', render: (r) => <span className="text-sm text-slate-700">{r.warehouse_id ?? r.warehouseId ?? '—'}</span> },
      { header: 'Count date', render: (r) => <span className="text-sm text-slate-700">{r.count_date ?? r.countDate ?? '—'}</span> },
      { header: 'Status', render: (r) => <Badge tone={r.status === 'posted' ? 'success' : 'muted'}>{r.status ?? 'draft'}</Badge> }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock Counts"
        subtitle="Count sheets, approvals and posting of inventory adjustments."
        icon={ClipboardList}
        actions={
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            Backend note: two stock-count endpoints are currently mismatched in service exports.
          </div>
        }
      />

      <ContentCard>
        <FilterBar
          left={<Input label="Warehouse ID" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder="Optional" />}
          right={
            <div className="text-xs text-slate-500">
              {error ? <span className="text-red-600">{String(error?.message ?? 'Failed to load')}</span> : null}
            </div>
          }
        />
        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={rows}
            isLoading={isLoading}
            empty={{
              title: 'No stock counts',
              description: 'Create a stock count to reconcile physical counts with system quantities.'
            }}
          />
        </div>
      </ContentCard>
    </div>
  );
}
