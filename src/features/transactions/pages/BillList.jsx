import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeBillsApi } from '../api/bills.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';

export default function BillList() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeBillsApi(http), [http]);

  const [status, setStatus] = useState('');
  const [vendorId, setVendorId] = useState('');

  const qs = useMemo(
    () => ({
      status: status || undefined,
      vendorId: vendorId || undefined
    }),
    [status, vendorId]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: qk.bills(qs),
    queryFn: () => api.list(qs)
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];

  const columns = useMemo(
    () => [
      {
        header: 'Bill',
        render: (r) => (
          <div className="flex flex-col">
            <Link to={ROUTES.billDetail(r.id)} className="font-medium text-brand-deep hover:underline">
              {r.billNumber ?? r.code ?? r.id}
            </Link>
            <div className="text-xs text-slate-500">{r.memo ?? ''}</div>
          </div>
        )
      },
      { header: 'Vendor', render: (r) => <span className="text-sm text-slate-700">{r.customerName ?? r.vendorId ?? '—'}</span> },
      { header: 'Bill date', render: (r) => <span className="text-sm text-slate-700">{r.billDate ?? '—'}</span> },
      { header: 'Due date', render: (r) => <span className="text-sm text-slate-700">{r.dueDate ?? '—'}</span> },
      {
        header: 'Status',
        render: (r) => {
          const s = r.status ?? 'draft';
          const tone = s === 'paid' ? 'success' : s === 'issued' ? 'brand' : s === 'voided' ? 'danger' : 'muted';
          return <Badge tone={tone}>{s}</Badge>;
        }
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bills"
        subtitle="Draft, approve, issue and manage customer bills."
        icon={FileText}
        actions={
          <Button leftIcon={Plus} onClick={() => navigate(ROUTES.billNew)}>
            New bill
          </Button>
        }
      />

      <ContentCard>
        <FilterBar
          left={
            <div className="grid gap-3 md:grid-cols-3">
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: '', label: 'All' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'issued', label: 'Issued' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'voided', label: 'Voided' }
                ]}
              />
              <Input label="Vendor ID" value={vendorId} onChange={(e) => setVendorId(e.target.value)} placeholder="uuid…" />
              <div className="hidden md:block" />
            </div>
          }
          right={error ? <div className="text-xs text-red-600">{String(error?.message ?? 'Failed')}</div> : null}
        />

        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={rows}
            isLoading={isLoading}
            empty={{ title: 'No bills', description: 'Create a draft bill and route it through approvals.' }}
          />
        </div>
      </ContentCard>
    </div>
  );
}
