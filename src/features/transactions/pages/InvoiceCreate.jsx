import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, FilePlus2 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInvoicesApi } from '../api/invoices.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { toast } from '../../../shared/components/ui/Toast.jsx';

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeInvoicesApi(http), [http]);

  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [payload, setPayload] = useState({
    customerId: '',
    invoiceDate: '',
    dueDate: '',
    memo: '',
    lines: [
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        revenueAccountId: ''
      }
    ]
  });

  const create = useMutation({
    mutationFn: () => api.create(payload, { idempotencyKey }),
    onSuccess: (res) => {
      toast.success('Invoice created');
      const id = res?.id ?? res?.data?.id;
      if (id) navigate(ROUTES.invoiceDetail(id));
      else navigate(ROUTES.invoices);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to create')
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="New invoice"
        subtitle="Create a draft invoice. Requires Idempotency-Key header."
        icon={FilePlus2}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button loading={create.isPending} onClick={() => create.mutate()}>
              Create
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <ContentCard className="lg:col-span-1">
          <div className="text-sm font-semibold text-slate-900">Idempotency</div>
          <div className="mt-1 text-xs text-slate-500">Backend enforces Idempotency-Key for invoice creation.</div>
          <div className="mt-3">
            <Input value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)} placeholder="uuid…" label="Idempotency-Key" />
          </div>
          <div className="mt-4 rounded-2xl border border-border-subtle bg-white/70 p-4 text-xs text-slate-600">
            Tip: generate a UUID client-side per submit attempt and persist it for retries.
          </div>
        </ContentCard>

        <div className="lg:col-span-2 space-y-4">
          <JsonPanel
            title="Invoice payload"
            value={payload}
            hint="Fields are validated by backend. Dates are YYYY-MM-DD. dueDate must be >= invoiceDate."
            submitLabel="Apply JSON"
            onSubmit={(json) => setPayload(json)}
          />
          <ContentCard>
            <div className="text-sm font-semibold text-slate-900">Quick visual preview</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
                <div className="text-xs text-slate-500">Customer ID</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{payload.customerId || '—'}</div>
              </div>
              <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
                <div className="text-xs text-slate-500">Dates</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {payload.invoiceDate || '—'} → {payload.dueDate || '—'}
                </div>
              </div>
            </div>
          </ContentCard>
        </div>
      </div>
    </div>
  );
}
