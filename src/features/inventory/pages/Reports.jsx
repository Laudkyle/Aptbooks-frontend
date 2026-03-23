import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';
import { toOptions, NONE_OPTION } from '../../../shared/utils/options.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';

export default function InventoryReports() {
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);

  const { data: warehousesRaw } = useQuery({
    queryKey: ['inventory.warehouses'],
    queryFn: async () => api.listWarehouses(),
    staleTime: 60_000
  });

  const { data: itemsRaw } = useQuery({
    queryKey: ['inventory.items'],
    queryFn: async () => api.listItems(),
    staleTime: 60_000
  });

  const warehouseOptions = useMemo(() => [NONE_OPTION, ...toOptions(warehousesRaw, { valueKey: 'id', label: (w) => `${w.code ?? ''} ${w.name ?? ''}`.trim() || w.id })], [warehousesRaw]);
  const itemOptions = useMemo(() => [NONE_OPTION, ...toOptions(itemsRaw, { valueKey: 'id', label: (i) => `${i.sku ?? ''} ${i.name ?? ''}`.trim() || i.id })], [itemsRaw]);

  const [report, setReport] = useState('valuation');
  const [warehouseId, setWarehouseId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [itemId, setItemId] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'reports', report, { warehouseId, from, to, itemId }],
    queryFn: () =>
      report === 'valuation'
        ? api.valuationReport({ warehouseId: warehouseId || undefined })
        : api.movementsReport({
            warehouseId: warehouseId || undefined,
            from: from || undefined,
            to: to || undefined,
            itemId: itemId || undefined
          }),
    enabled: true
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];

  const columns = useMemo(
    () => [
      { header: 'Row', render: (r) => <span className="text-sm text-slate-700">{r.item_name ?? r.itemId ?? r.warehouse_name ?? r.warehouseId ?? r.id ?? '—'}</span> },
      { header: 'Details', render: (r) => <span className="text-xs text-slate-500">{r.memo ?? r.reference ?? r.txn_type ?? r.txnType ?? ''}</span> },
      { header: 'Amount/Qty', render: (r) => <span className="text-sm text-slate-700">{r.amount ?? r.quantity ?? r.value ?? r.on_hand ?? '—'}</span> }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory Reports"
        subtitle="Valuation and movement reports (filters depend on report type)."
        icon={BarChart3}
      />

      <ContentCard>
        <FilterBar
          left={
            <div className="grid gap-3 md:grid-cols-4">
              <Select
                label="Report"
                value={report}
                onChange={(e) => setReport(e.target.value)}
                options={[
                  { value: 'valuation', label: 'Valuation' },
                  { value: 'movements', label: 'Movements' }
                ]}
              />
              <Select label="Warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} options={warehouseOptions} />
              <Input label="From" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="YYYY-MM-DD (optional)" />
              <Input label="To" value={to} onChange={(e) => setTo(e.target.value)} placeholder="YYYY-MM-DD (optional)" />
              {report === 'movements' ? (
                <Select label="Item" value={itemId} onChange={(e) => setItemId(e.target.value)} options={itemOptions} />
              ) : null}
            </div>
          }
          right={<div className="text-xs text-slate-500">{error ? <span className="text-red-600">{String(error?.message ?? 'Failed')}</span> : null}</div>}
        />

        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={rows}
            isLoading={isLoading}
            empty={{ title: 'No data', description: 'Try different filters or ensure inventory activity exists.' }}
          />
        </div>
      </ContentCard>
    </div>
  );
}
