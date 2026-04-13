import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Landmark } from 'lucide-react';

import { useApi } from '../../../../shared/hooks/useApi.js';
import { qk } from '../../../../shared/query/keys.js';
import { makeTaxApi } from '../api/tax.api.js';
import { ROUTES } from '../../../../app/constants/routes.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Textarea } from '../../../../shared/components/ui/Textarea.jsx';
import { DataTable } from '../../../../shared/components/data/DataTable.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';

function money(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
}

export default function WithholdingRemittanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeTaxApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [voidReason, setVoidReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({ queryKey: qk.withholdingRemittance(id), queryFn: () => api.getWithholdingRemittance(id) });
  const remittance = data?.data ?? data ?? {};
  const lines = remittance.lines || data?.lines || [];
  const status = String(remittance.status || 'draft').toLowerCase();
  const refresh = () => { qc.invalidateQueries({ queryKey: qk.withholdingRemittance(id) }); qc.invalidateQueries({ queryKey: qk.withholdingRemittances({}) }); qc.invalidateQueries({ queryKey: qk.withholdingDashboard({}) }); };

  const submitMutation = useMutation({ mutationFn: () => api.submitWithholdingRemittance(id), onSuccess: () => { toast.success('Remittance submitted for approval.'); refresh(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed to submit remittance') });
  const approveMutation = useMutation({ mutationFn: () => api.approveWithholdingRemittance(id, {}), onSuccess: () => { toast.success('Remittance approved.'); refresh(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed to approve remittance') });
  const rejectMutation = useMutation({ mutationFn: () => api.rejectWithholdingRemittance(id, { reason: rejectReason || 'Rejected' }), onSuccess: () => { toast.success('Remittance rejected.'); refresh(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed to reject remittance') });
  const postMutation = useMutation({ mutationFn: () => api.postWithholdingRemittance(id, { settlementAccountId: remittance.settlement_account_id || remittance.settlementAccountId, remittanceDate: remittance.remittance_date || remittance.remittanceDate, reference: remittance.reference || null, memo: remittance.memo || null }), onSuccess: () => { toast.success('Remittance posted.'); refresh(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed to post remittance') });
  const voidMutation = useMutation({ mutationFn: () => api.voidWithholdingRemittance(id, { reason: voidReason || null }), onSuccess: () => { toast.success('Remittance voided.'); refresh(); }, onError: (e) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed to void remittance') });

  const columns = [
    { header: 'Source document', accessorKey: 'source_document_no', render: (row) => row.source_document_no || '—' },
    { header: 'Partner', accessorKey: 'partner_id', render: (row) => row.partner_name || row.partner_id || '—' },
    { header: 'Tax code', accessorKey: 'tax_code_id', render: (row) => row.tax_code || row.tax_code_id || '—' },
    { header: 'Applied amount', accessorKey: 'applied_amount', render: (row) => money(row.applied_amount, remittance.currency_code || 'USD') },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title={remittance.remittance_no || 'Withholding remittance'} subtitle="Approval, posting, and audit trail for vendor-side withholding remittance." icon={Landmark} actions={<Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.accountingTaxWithholding)}>Back to workspace</Button>} />
      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <ContentCard title="Remittance summary" actions={<Badge tone={status === 'posted' ? 'success' : status === 'voided' || status === 'rejected' ? 'danger' : status === 'approved' ? 'success' : status === 'submitted' ? 'warning' : 'muted'}>{status}</Badge>}>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div><div className="text-xs text-text-muted">Authority</div><div className="font-semibold text-text-strong">{remittance.authority_name || remittance.authority_partner_name || remittance.authority_partner_id || '—'}</div></div>
            <div><div className="text-xs text-text-muted">Jurisdiction</div><div className="font-semibold text-text-strong">{remittance.jurisdiction_code || remittance.jurisdiction_id || '—'}</div></div>
            <div><div className="text-xs text-text-muted">Period</div><div className="font-semibold text-text-strong">{[remittance.period_start, remittance.period_end].filter(Boolean).join(' → ') || '—'}</div></div>
            <div><div className="text-xs text-text-muted">Remittance date</div><div className="font-semibold text-text-strong">{remittance.remittance_date || '—'}</div></div>
            <div><div className="text-xs text-text-muted">Settlement account</div><div className="font-semibold text-text-strong">{remittance.settlement_account_name || remittance.settlement_account_id || '—'}</div></div>
            <div><div className="text-xs text-text-muted">Total amount</div><div className="font-semibold text-text-strong">{money(remittance.total_amount, remittance.currency_code || 'USD')}</div></div>
          </div>
          {remittance.memo ? <div className="mt-4 rounded-2xl border border-border-subtle p-4 text-sm text-text-body">{remittance.memo}</div> : null}
          {remittance.rejection_reason ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Rejected reason: {remittance.rejection_reason}</div> : null}
        </ContentCard>
        <ContentCard title="Actions">
          <div className="space-y-3">
            <div className="rounded-2xl border border-border-subtle bg-slate-50 p-4 text-sm text-text-body">Approval can be enforced before posting. Once posted, the withholding payable is cleared against the selected settlement account.</div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!['draft','rejected'].includes(status)} loading={submitMutation.isPending} onClick={() => submitMutation.mutate()}>Submit</Button>
              <Button variant="outline" disabled={status !== 'submitted'} loading={approveMutation.isPending} onClick={() => approveMutation.mutate()}>Approve</Button>
              <Button variant="outline" disabled={status !== 'submitted'} loading={postMutation.isPending} onClick={() => postMutation.mutate()}>Post</Button>
            </div>
            <Textarea label="Reject reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
            <Button variant="danger" disabled={status !== 'submitted'} loading={rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>Reject</Button>
            <Textarea label="Void reason" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} rows={3} />
            <Button variant="danger" disabled={status !== 'posted'} loading={voidMutation.isPending} onClick={() => voidMutation.mutate()}>Void posted remittance</Button>
          </div>
        </ContentCard>
      </div>
      <ContentCard title="Remittance lines"><DataTable columns={columns} rows={lines} isLoading={isLoading} emptyTitle="No remittance lines" emptyDescription="This remittance draft does not have any source items yet." /></ContentCard>
    </div>
  );
}
