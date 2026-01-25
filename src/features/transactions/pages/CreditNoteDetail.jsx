import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileMinus2, Send, Trash2 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeCreditNotesApi } from '../api/creditNotes.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { toast } from '../../../shared/components/ui/Toast.jsx';

export default function CreditNoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeCreditNotesApi(http), [http]);
  const qc = useQueryClient();
    const toast = useToast();
  const { data, isLoading } = useQuery({
    queryKey: qk.creditNote(id),
    queryFn: () => api.get(id)
  });

  const note = data?.data ?? data;

  const [action, setAction] = useState(null);
  const [applyBody, setApplyBody] = useState({ invoiceId: '', amountApplied: 0 });
  const [voidBody, setVoidBody] = useState({ reason: '' });

  const run = useMutation({
    mutationFn: async () => {
      if (action === 'issue') return api.issue(id);
      if (action === 'apply') return api.apply(id, applyBody);
      if (action === 'void') return api.void(id, voidBody);
      throw new Error('Unknown action');
    },
    onSuccess: () => {
      toast.success('Action completed');
      qc.invalidateQueries({ queryKey: qk.creditNote(id) });
      setAction(null);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  });

  const status = note?.status ?? 'draft';

  return (
    <div className="space-y-4">
      <PageHeader
        title={note?.creditNoteNumber ?? note?.code ?? (isLoading ? 'Loading credit note…' : 'Credit note')}
        subtitle={`Credit note ID: ${id}`}
        icon={FileMinus2}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button variant="outline" leftIcon={Send} onClick={() => setAction('issue')}>
              Issue
            </Button>
            <Button onClick={() => setAction('apply')}>Apply</Button>
            <Button variant="danger" leftIcon={Trash2} onClick={() => setAction('void')}>
              Void
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <ContentCard className="lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Summary</div>
              <div className="mt-1 text-xs text-slate-500">Customer and memo.</div>
            </div>
            <Badge tone={status === 'issued' ? 'brand' : status === 'voided' ? 'danger' : 'muted'}>{status}</Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
              <div className="text-xs text-slate-500">Customer</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{note?.customerName ?? note?.customerId ?? '—'}</div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
              <div className="text-xs text-slate-500">Date</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{note?.creditNoteDate ?? '—'}</div>
            </div>
          </div>

          <div className="mt-5">
            <JsonPanel title="Credit note (GET)" value={note ?? {}} />
          </div>
        </ContentCard>

        <ContentCard>
          <div className="text-sm font-semibold text-slate-900">Actions</div>
          <div className="mt-2 text-xs text-slate-500">Issue first, then apply to an invoice.</div>
        </ContentCard>
      </div>

      <Modal open={!!action} onClose={() => setAction(null)} title={action === 'issue' ? 'Issue credit note' : action === 'apply' ? 'Apply to invoice' : action === 'void' ? 'Void credit note' : 'Action'}>
        <div className="space-y-3">
          {action === 'apply' ? (
            <>
              <Input label="Invoice ID" value={applyBody.invoiceId} onChange={(e) => setApplyBody((s) => ({ ...s, invoiceId: e.target.value }))} placeholder="uuid…" />
              <Input
                label="Amount applied"
                value={applyBody.amountApplied}
                onChange={(e) => setApplyBody((s) => ({ ...s, amountApplied: Number(e.target.value) }))}
                type="number"
              />
            </>
          ) : null}
          {action === 'void' ? (
            <Input label="Reason (optional)" value={voidBody.reason ?? ''} onChange={(e) => setVoidBody({ reason: e.target.value })} />
          ) : null}
          {action === 'issue' ? (
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4 text-xs text-slate-600">
              Issuing makes the credit note available for application.
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setAction(null)}>
            Cancel
          </Button>
          <Button loading={run.isPending} onClick={() => run.mutate()}>
            Run
          </Button>
        </div>
      </Modal>
    </div>
  );
}
