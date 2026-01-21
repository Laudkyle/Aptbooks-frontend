import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Banknote, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeVendorPaymentsApi } from '../api/vendorPayments.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';

export default function VendorPaymentList() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeVendorPaymentsApi(http), [http]);

  const [vendorId, setVendorId] = useState('');

  const qs = useMemo(() => (vendorId ? { vendorId } : {}), [vendorId]);

  const { data, isLoading, error } = useQuery({
    queryKey: qk.vendorPayments(qs),
    queryFn: () => api.list(qs)
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];

  const columns = useMemo(
    () => [
      {
        header: 'Receipt',
        render: (r) => (
          <div className="flex flex-col">
            <Link to={ROUTES.vendorPaymentDetail(r.id)} className="font-medium text-brand-deep hover:underline">
              {r.receiptNumber ?? r.code ?? r.id}
            </Link>
            <div className="text-xs text-slate-500">{r.memo ?? ''}</div>
          </div>
        )
      },
      { header: 'Vendor', render: (r) => <span className="text-sm text-slate-700">{r.customerName ?? r.vendorId ?? '—'}</span> },
      { header: 'Date', render: (r) => <span className="text-sm text-slate-700">{r.receiptDate ?? '—'}</span> },
      { header: 'Amount', render: (r) => <span className="text-sm text-slate-900">{r.amountTotal ?? r.amount ?? '—'}</span> },
      {
        header: 'Status',
        render: (r) => <Badge tone={(r.status ?? 'draft') === 'posted' ? 'success' : 'muted'}>{r.status ?? 'draft'}</Badge>
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vendor payments"
        subtitle="Capture collections, allocate to invoices, and post to the ledger."
        icon={Banknote}
        actions={
          <Button leftIcon={Plus} onClick={() => navigate(ROUTES.vendorPaymentNew)}>
            New receipt
          </Button>
        }
      />

      <ContentCard>
        <FilterBar
          left={<Input label="Vendor ID" value={vendorId} onChange={(e) => setVendorId(e.target.value)} placeholder="uuid…" />}
          right={error ? <div className="text-xs text-red-600">{String(error?.message ?? 'Failed')}</div> : null}
        />
        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={rows}
            isLoading={isLoading}
            empty={{ title: 'No receipts', description: 'Create a receipt to record cash collections and allocations.' }}
          />
        </div>
      </ContentCard>
    </div>
  );
}
