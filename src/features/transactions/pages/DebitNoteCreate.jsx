import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, FileMinus2 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeDebitNotesApi } from '../api/debitNotes.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export default function DebitNoteCreate() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeDebitNotesApi(http), [http]);
  const toast = useToast();

  const [payload, setPayload] = useState({
    vendorId: '',
    debitNoteDate: '',
    memo: null,
    lines: [
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        expenseAccountId: '',
        taxCodeId: null,
        taxAmount: 0
      }
    ]
  });

  const create = useMutation({
    mutationFn: () => api.create(payload),
    onSuccess: (res) => {
      toast.success('Debit note created');
      const id = res?.id ?? res?.data?.id;
      if (id) navigate(ROUTES.debitNoteDetail(id));
      else navigate(ROUTES.debitNotes);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to create')
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="New debit note"
        subtitle="Create a draft debit note."
        icon={FileMinus2}
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
          <div className="text-sm font-semibold text-slate-900">Next steps</div>
          <div className="mt-2 text-xs text-slate-500">Issue the note, then apply it to an invoice.</div>
        </ContentCard>

        <div className="lg:col-span-2">
          <JsonPanel
            title="Debit note payload"
            value={payload}
            hint="debitNoteDate is YYYY-MM-DD. expenseAccountId is required per line."
            submitLabel="Apply JSON"
            onSubmit={(json) => setPayload(json)}
          />
        </div>
      </div>
    </div>
  );
}
