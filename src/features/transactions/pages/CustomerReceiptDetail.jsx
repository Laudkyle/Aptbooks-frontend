import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, HandCoins, RefreshCcw, Save, Send, Trash2 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeCustomerReceiptsApi } from '../api/customerReceipts.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { toast } from '../../../shared/components/ui/Toast.jsx';

export default function CustomerReceiptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeCustomerReceiptsApi(http), [http]);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: qk.customerReceipt(id),
    queryFn: () => api.get(id)
  });

  const receipt = data?.data ?? data;

  const [action, setAction] = useState(null);
  const [rule, setRule] = useState('due_date');
  const [allocations, setAllocations] = useState({ allocations: [] });
  const [reason, setReason] = useState('');

  const run = useMutation({
    mutationFn: async () => {
      if (action === 'auto') return api.autoAllocate(id, { rule });
      if (action === 'reallocate') return api.reallocate(id, allocations);
      if (action === 'post') return api.post(id);
      if (action === 'void') return api.void(id, { reason });
      throw new Error('Unknown action');
    },
    onSuccess: () => {
      toast.success('Action completed');
      qc.invalidateQueries({ queryKey: qk.customerReceipt(id) });
      setAction(null);
      setReason('');
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  });

  const status = receipt?.status ?? 'draft';

  return (
    <div className="space-y-4">
      <PageHeader
        title={receipt?.receiptNumber ?? receipt?.code ?? (isLoading ? 'Loading receipt…' : 'Receipt')}
        subtitle={`Receipt ID: ${id}`}
        icon={HandCoins}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button variant="outline" leftIcon={RefreshCcw} onClick={() => setAction('auto')}>
              Auto-allocate
            </Button>
            <Button variant="outline" leftIcon={Save} onClick={() => { setAllocations({ allocations: receipt?.allocations ?? [] }); setAction('reallocate'); }}>
              Reallocate
            </Button>
            <Button leftIcon={Send} onClick={() => setAction('post')}>
              Post
            </Button>
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
              <div className="mt-1 text-xs text-slate-500">Customer, cash account, amount and allocations.</div>
            </div>
            <Badge tone={status === 'posted' ? 'success' : 'muted'}>{status}</Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
              <div className="text-xs text-slate-500">Customer</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{receipt?.customerName ?? receipt?.customerId ?? '—'}</div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
              <div className="text-xs text-slate-500">Receipt date</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{receipt?.receiptDate ?? '—'}</div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
              <div className="text-xs text-slate-500">Cash account</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{receipt?.cashAccountId ?? '—'}</div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
              <div className="text-xs text-slate-500">Amount total</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{receipt?.amountTotal ?? '—'}</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-sm font-semibold text-slate-900">Allocations</div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-border-subtle">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/5 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Amount applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-white/70">
                  {(receipt?.allocations ?? []).map((a, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3">{a.invoiceId ?? '—'}</td>
                      <td className="px-4 py-3">{a.amountApplied ?? '—'}</td>
                    </tr>
                  ))}
                  {!(receipt?.allocations ?? []).length ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-slate-600" colSpan={2}>
                        No allocations.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </ContentCard>

        <ContentCard>
          <JsonPanel title="Receipt (GET)" value={receipt ?? {}} />
        </ContentCard>
      </div>

      <Modal open={!!action} onClose={() => setAction(null)} title={action === 'auto' ? 'Auto-allocate' : action === 'reallocate' ? 'Reallocate' : action === 'post' ? 'Post receipt' : action === 'void' ? 'Void receipt' : 'Action'}>
        <div className="space-y-3">
          {action === 'auto' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Rule" value={rule} onChange={(e) => setRule(e.target.value)} placeholder="due_date|fifo" />
              <div className="rounded-2xl border border-border-subtle bg-white/70 p-4 text-xs text-slate-600 md:col-span-2">
                Default rule is due_date.
              </div>
            </div>
          ) : null}

          {action === 'reallocate' ? (
            <JsonPanel
              title="Allocations payload"
              value={allocations}
              hint="Shape: { allocations: [ { invoiceId, amountApplied } ] }"
              submitLabel="Apply JSON"
              onSubmit={(json) => setAllocations(json)}
            />
          ) : null}

          {action === 'void' ? (
            <Input label="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="min 2 chars" />
          ) : null}

          {action === 'post' ? (
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4 text-xs text-slate-600">
              Posting finalises the receipt and books it to the ledger.
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
