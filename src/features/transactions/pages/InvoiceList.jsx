import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeInvoicesApi } from '../api/invoices.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';

export default function InvoiceList() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeInvoicesApi(http), [http]);

  const [status, setStatus] = useState('');
  const [customerId, setCustomerId] = useState('');

  const qs = useMemo(
    () => ({
      status: status || undefined,
      customerId: customerId || undefined
    }),
    [status, customerId]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: qk.invoices(qs),
    queryFn: () => api.list(qs)
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];

  const columns = useMemo(
    () => [
      {
        header: 'Invoice',
        render: (r) => (
          <div className="flex flex-col">
            <Link to={ROUTES.invoiceDetail(r.id)} className="font-medium text-brand-deep hover:underline">
              {r.invoiceNumber ?? r.code ?? r.id}
            </Link>
            <div className="text-xs text-slate-500">{r.memo ?? ''}</div>
          </div>
        )
      },
      { header: 'Customer', render: (r) => <span className="text-sm text-slate-700">{r.customerName ?? r.customerId ?? '—'}</span> },
      { header: 'Invoice date', render: (r) => <span className="text-sm text-slate-700">{r.invoiceDate ?? '—'}</span> },
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
        title="Invoices"
        subtitle="Draft, approve, issue and manage customer invoices."
        icon={FileText}
        actions={
          <Button leftIcon={Plus} onClick={() => navigate(ROUTES.invoiceNew)}>
            New invoice
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
              <Input label="Customer ID" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="uuid…" />
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
            empty={{ title: 'No invoices', description: 'Create a draft invoice and route it through approvals.' }}
          />
        </div>
      </ContentCard>
    </div>
  );
}
