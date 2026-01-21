import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, HandCoins } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeVendorPaymentsApi } from '../api/vendorPayments.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { toast } from '../../../shared/components/ui/Toast.jsx';

export default function VendorPaymentCreate() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeVendorPaymentsApi(http), [http]);

  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [payload, setPayload] = useState({
    vendorId: '',
    paymentDate: '',
    paymentMethodId: null,
    cashAccountId: '',
    amountTotal: 0,
    allocations: []
  });

  const create = useMutation({
    mutationFn: () => api.create(payload, { idempotencyKey }),
    onSuccess: (res) => {
      toast.success('Vendor payment created');
      const id = res?.id ?? res?.data?.id;
      if (id) navigate(ROUTES.vendorPaymentDetail(id));
      else navigate(ROUTES.vendorPayments);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to create')
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="New vendor payment"
        subtitle="Create a draft vendor payment. Requires Idempotency-Key header."
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
          <div className="text-sm font-semibold text-slate-900">Idempotency</div>
          <div className="mt-1 text-xs text-slate-500">Backend enforces Idempotency-Key for vendor payment create and workflow.</div>
          <div className="mt-3">
            <Input value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)} placeholder="uuid…" label="Idempotency-Key" />
          </div>
        </ContentCard>

        <div className="lg:col-span-2">
          <JsonPanel
            title="Vendor payment payload"
            value={payload}
            hint="Dates are YYYY-MM-DD. cashAccountId is required. allocations: [{ billId, amountApplied }]."
            submitLabel="Apply JSON"
            onSubmit={(json) => setPayload(json)}
          />
        </div>
      </div>
    </div>
  );
}
