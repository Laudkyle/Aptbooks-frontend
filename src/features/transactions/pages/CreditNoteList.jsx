import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileMinus2, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeCreditNotesApi } from '../api/creditNotes.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';

export default function CreditNoteList() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeCreditNotesApi(http), [http]);

  const [customerId, setCustomerId] = useState('');
  const qs = useMemo(() => (customerId ? { customerId } : {}), [customerId]);

  const { data, isLoading, error } = useQuery({
    queryKey: qk.creditNotes(qs),
    queryFn: () => api.list(qs)
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];

  const columns = useMemo(
    () => [
      {
        header: 'Credit note',
        render: (r) => (
          <div className="flex flex-col">
            <Link to={ROUTES.creditNoteDetail(r.id)} className="font-medium text-brand-deep hover:underline">
              {r.creditNoteNumber ?? r.code ?? r.id}
            </Link>
            <div className="text-xs text-slate-500">{r.memo ?? ''}</div>
          </div>
        )
      },
      { header: 'Customer', render: (r) => <span className="text-sm text-slate-700">{r.customerName ?? r.customerId ?? '—'}</span> },
      { header: 'Date', render: (r) => <span className="text-sm text-slate-700">{r.creditNoteDate ?? '—'}</span> },
      {
        header: 'Status',
        render: (r) => <Badge tone={(r.status ?? 'draft') === 'issued' ? 'brand' : 'muted'}>{r.status ?? 'draft'}</Badge>
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Credit notes"
        subtitle="AR adjustments and credit application to invoices."
        icon={FileMinus2}
        actions={
          <Button leftIcon={Plus} onClick={() => navigate(ROUTES.creditNoteNew)}>
            New credit note
          </Button>
        }
      />

      <ContentCard>
        <FilterBar
          left={<Input label="Customer ID" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="uuid…" />}
          right={error ? <div className="text-xs text-red-600">{String(error?.message ?? 'Failed')}</div> : null}
        />
        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={rows}
            isLoading={isLoading}
            empty={{ title: 'No credit notes', description: 'Create a credit note and apply it to an invoice.' }}
          />
        </div>
      </ContentCard>
    </div>
  );
}
