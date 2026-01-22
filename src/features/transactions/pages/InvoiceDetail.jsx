import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, FileText, Send, ShieldCheck, ShieldX, Trash2 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeInvoicesApi } from '../api/invoices.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeInvoicesApi(http), [http]);
  const qc = useQueryClient();
const toast = useToast();
  const { data, isLoading } = useQuery({
    queryKey: qk.invoice(id),
    queryFn: () => api.get(id)
  });

  const invoice = data?.data ?? data;

  const [idk, setIdk] = useState('');
  const [comment, setComment] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [action, setAction] = useState(null);

  const run = useMutation({
    mutationFn: async () => {
      if (action === 'submit') return api.submitForApproval(id, { idempotencyKey: idk });
      if (action === 'approve') return api.approve(id, { comment }, { idempotencyKey: idk });
      if (action === 'reject') return api.reject(id, { comment }, { idempotencyKey: idk });
      if (action === 'issue') return api.issue(id, { idempotencyKey: idk });
      if (action === 'void') return api.void(id, { reason: voidReason }, { idempotencyKey: idk });
      throw new Error('Unknown action');
    },
    onSuccess: () => {
      toast.success('Action completed');
      qc.invalidateQueries({ queryKey: qk.invoice(id) });
      setAction(null);
      setIdk('');
      setComment('');
      setVoidReason('');
    },
    onError: (e) => toast.error(e?.message ?? 'Failed')
  });

  const status = invoice?.status ?? 'draft';
  const tone = status === 'paid' ? 'success' : status === 'issued' ? 'brand' : status === 'voided' ? 'danger' : 'muted';

  return (
    <div className="space-y-4">
      <PageHeader
        title={invoice?.invoiceNumber ?? invoice?.code ?? (isLoading ? 'Loading invoice…' : 'Invoice')}
        subtitle={`Invoice ID: ${id}`}
        icon={FileText}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button variant="outline" leftIcon={Send} onClick={() => setAction('submit')}>
              Submit
            </Button>
            <Button variant="outline" leftIcon={ShieldCheck} onClick={() => setAction('approve')}>
              Approve
            </Button>
            <Button variant="outline" leftIcon={ShieldX} onClick={() => setAction('reject')}>
              Reject
            </Button>
            <Button leftIcon={CheckCircle2} onClick={() => setAction('issue')}>
              Issue
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
              <div className="mt-1 text-xs text-slate-500">Dates, customer reference and memo.</div>
            </div>
            <Badge tone={tone}>{status}</Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
              <div className="text-xs text-slate-500">Customer</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{invoice?.customerName ?? invoice?.customerId ?? '—'}</div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
              <div className="text-xs text-slate-500">Dates</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {invoice?.invoiceDate ?? '—'} → {invoice?.dueDate ?? '—'}
              </div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4 md:col-span-2">
              <div className="text-xs text-slate-500">Memo</div>
              <div className="mt-1 text-sm text-slate-700">{invoice?.memo ?? <span className="text-slate-400">—</span>}</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-sm font-semibold text-slate-900">Lines</div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-border-subtle">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/5 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Unit price</th>
                    <th className="px-4 py-3">Revenue account</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-white/70">
                  {(invoice?.lines ?? []).map((l, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3">{l.description}</td>
                      <td className="px-4 py-3">{l.quantity ?? 1}</td>
                      <td className="px-4 py-3">{l.unitPrice ?? '—'}</td>
                      <td className="px-4 py-3">{l.revenueAccountId ?? '—'}</td>
                    </tr>
                  ))}
                  {!(invoice?.lines ?? []).length ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-slate-600" colSpan={4}>
                        No lines returned by backend.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </ContentCard>

        <ContentCard>
          <div className="text-sm font-semibold text-slate-900">Raw JSON</div>
          <div className="mt-3">
            <JsonPanel title="Invoice (GET)" value={invoice ?? {}} />
          </div>
        </ContentCard>
      </div>

      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={
          action === 'submit'
            ? 'Submit for approval'
            : action === 'approve'
              ? 'Approve'
              : action === 'reject'
                ? 'Reject'
                : action === 'issue'
                  ? 'Issue invoice'
                  : action === 'void'
                    ? 'Void invoice'
                    : 'Action'
        }
      >
        <div className="space-y-3">
          <Input label="Idempotency-Key (required)" value={idk} onChange={(e) => setIdk(e.target.value)} placeholder="uuid…" />
          {action === 'approve' || action === 'reject' ? (
            <Textarea label="Comment (optional)" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} />
          ) : null}
          {action === 'void' ? (
            <Textarea label="Reason (required)" rows={4} value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
          ) : null}
          <div className="rounded-2xl border border-border-subtle bg-white/70 p-4 text-xs text-slate-600">
            This workflow is enforced by backend permissions. Idempotency-Key is required for submit/approve/reject/issue/void.
          </div>
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
