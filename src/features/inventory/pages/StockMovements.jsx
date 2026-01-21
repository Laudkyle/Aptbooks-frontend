import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';

export default function StockMovements() {
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);

  const [periodId, setPeriodId] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'transactions', { periodId: periodId || undefined }],
    queryFn: () => api.listTransactions({ periodId: periodId || undefined })
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];

  const columns = useMemo(
    () => [
      {
        header: 'Transaction',
        render: (r) => (
          <div className="flex flex-col">
            <div className="font-medium text-brand-deep">{r.txnType ?? r.txn_type ?? '—'}</div>
            <div className="text-xs text-slate-500">{r.txnDate ?? r.txn_date ?? '—'}</div>
          </div>
        )
      },
      { header: 'Reference', render: (r) => <span className="text-sm text-slate-700">{r.reference ?? '—'}</span> },
      {
        header: 'Status',
        render: (r) => <Badge tone={(r.status ?? 'draft') === 'posted' ? 'success' : (r.status ?? 'draft') === 'approved' ? 'info' : 'muted'}>{r.status ?? 'draft'}</Badge>
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory Transactions"
        subtitle="Receipts, issues, transfers and adjustments. Approve and post to update stock and GL."
        icon={ArrowLeftRight}
        actions={
          <Button leftIcon={Plus} variant="primary">
            New transaction
          </Button>
        }
      />

      <ContentCard>
        <FilterBar
          left={
            <div className="grid gap-3 md:grid-cols-3">
              <Input label="Period ID" value={periodId} onChange={(e) => setPeriodId(e.target.value)} placeholder="Filter by periodId (optional)" />
              <div className="hidden md:block" />
              <div className="hidden md:block" />
            </div>
          }
          right={<div className="text-xs text-slate-500">{error ? <span className="text-red-600">{String(error?.message ?? 'Failed to load')}</span> : null}</div>}
        />

        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={rows}
            isLoading={isLoading}
            empty={{
              title: 'No transactions yet',
              description: 'Create inventory transactions to record receipts, issues, transfers and adjustments.'
            }}
          />
        </div>
      </ContentCard>
    </div>
  );
}
