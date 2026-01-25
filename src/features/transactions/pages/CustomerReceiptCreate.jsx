import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, HandCoins } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeCustomerReceiptsApi } from '../api/customerReceipts.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export default function CustomerReceiptCreate() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeCustomerReceiptsApi(http), [http]);
const toast = useToast();
  const [payload, setPayload] = useState({
    customerId: '',
    receiptDate: '',
    paymentMethodId: null,
    cashAccountId: '',
    amountTotal: 0,
    memo: null,
    allocations: []
  });

  const create = useMutation({
    mutationFn: () => api.create(payload),
    onSuccess: (res) => {
      toast.success('Receipt created');
      const id = res?.id ?? res?.data?.id;
      if (id) navigate(ROUTES.customerReceiptDetail(id));
      else navigate(ROUTES.customerReceipts);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to create')
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="New customer receipt"
        subtitle="Create a draft receipt with optional allocations to invoices."
        icon={HandCoins}
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
          <div className="text-sm font-semibold text-slate-900">Workflow</div>
          <div className="mt-2 text-xs text-slate-500">
            After creation you can auto-allocate, manually reallocate, then post. Void is available after posting.
          </div>
          <div className="mt-4 rounded-2xl border border-border-subtle bg-white/70 p-4 text-xs text-slate-600">
            Note: allocations defaults to [] if omitted. Keep amounts &gt;0 per allocation.
          </div>
        </ContentCard>

        <div className="lg:col-span-2">
          <JsonPanel
            title="Receipt payload"
            value={payload}
            hint="Dates are YYYY-MM-DD. cashAccountId is required. amountTotal >= 0."
            submitLabel="Apply JSON"
            onSubmit={(json) => setPayload(json)}
          />
        </div>
      </div>
    </div>
  );
}
