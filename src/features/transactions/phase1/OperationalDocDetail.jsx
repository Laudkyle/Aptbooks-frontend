import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { TransactionWorkflowActionBar } from '../components/TransactionWorkflowActionBar.jsx';
import { normalizeTransactionWorkflow } from '../workflow/normalizeTransactionWorkflow.js';
import { makeOpsDocsApi } from '../api/opsDocs.api.js';
import { getPhase1ModuleConfig } from './moduleConfigs.js';
import { getPhase1Actions, getStatusBadgeClass, toCurrency } from './helpers.js';
import { formatDate } from '../../../shared/utils/formatDate.js';

export default function OperationalDocDetail({ moduleKey }) {
  const config = getPhase1ModuleConfig(moduleKey);
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { http } = useApi();
  const api = useMemo(() => makeOpsDocsApi(http, config.endpoints), [http, config]);
  const [action, setAction] = useState(null);
  const [comment, setComment] = useState('');
  const [voidReason, setVoidReason] = useState('');

  const query = useQuery({ queryKey: qk[config.detailQueryKey] ? qk[config.detailQueryKey](id) : ['phase1', moduleKey, id], queryFn: () => api.get(id) });
  const detail = query.data;
  const header = detail?.header ?? {};
  const lines = detail?.lines ?? [];

  const state = normalizeTransactionWorkflow({ entity: header, payload: detail, type: config.type });
  const availableActions = getPhase1Actions(config, state);
console.log({ state, availableActions });
  const run = useMutation({
    mutationFn: async ({ key }) => {
      if (key === 'submit') return api.submitForApproval(id);
      if (key === 'approve') return api.approve(id, { comment });
      if (key === 'reject') return api.reject(id, { comment });
      if (key === 'issue' || key === 'post') return api.finalize(id);
      if (key === 'void') return api.void(id, { reason: voidReason });
      throw new Error('Unsupported action');
    },
    onSuccess: (res, vars) => {
      toast.success(`${config.singular} ${vars.key} action completed.`);
      setAction(null); setComment(''); setVoidReason('');
      qc.invalidateQueries({ queryKey: qk[config.listQueryKey] ? qk[config.listQueryKey]() : ['phase1', moduleKey] });
      qc.invalidateQueries({ queryKey: qk[config.detailQueryKey] ? qk[config.detailQueryKey](id) : ['phase1', moduleKey, id] });
      if (res?.posting?.status === 'failed') toast.error(res.posting.message || 'Posting failed after approval.');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Action failed.')
  });

  const total = Number(header.amount_total ?? lines.reduce((sum, line) => sum + Number(line.line_total ?? 0), 0));
  const currency = header.currency_code || 'GHS';

  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <button onClick={() => navigate(config.routeList)} className="mb-3 inline-flex items-center text-sm text-text-muted hover:text-text-strong">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to {config.title}
            </button>
            <h1 className="text-2xl font-bold text-text-strong">{config.singular} {header.document_no ?? ''}</h1>
            <p className="text-sm text-text-muted">View document details, workflow state, and posting outcome.</p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(header.status)}`}>{header.status ?? 'draft'}</span>
        </div>

        <TransactionWorkflowActionBar actions={availableActions} onAction={setAction} documentType={config.type} documentId={id} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-sm p-6 grid gap-4 md:grid-cols-2">
              <div><div className="text-xs font-medium text-text-muted mb-1">Document No</div><div className="text-sm font-semibold text-text-strong">{header.document_no ?? '—'}</div></div>
              <div><div className="text-xs font-medium text-text-muted mb-1">Date</div><div className="text-sm font-semibold text-text-strong">{formatDate(header.document_date) ?? '—'}</div></div>
              <div><div className="text-xs font-medium text-text-muted mb-1">Due Date</div><div className="text-sm font-semibold text-text-strong">{formatDate(header.due_date) ?? '—'}</div></div>
              <div><div className="text-xs font-medium text-text-muted mb-1">Partner</div><div className="text-sm font-semibold text-text-strong">{header.partner_name ?? '—'}</div></div>
              <div><div className="text-xs font-medium text-text-muted mb-1">Reference</div><div className="text-sm font-semibold text-text-strong">{header.reference ?? '—'}</div></div>
              <div><div className="text-xs font-medium text-text-muted mb-1">Workflow</div><div className="text-sm font-semibold text-text-strong">{header.workflow_status ?? 'none'}</div></div>
              {header.memo ? <div className="md:col-span-2"><div className="text-xs font-medium text-text-muted mb-1">Memo</div><div className="text-sm text-text-body">{header.memo}</div></div> : null}
              {header.journal_entry_id ? <div><div className="text-xs font-medium text-text-muted mb-1">Journal Entry</div><div className="text-sm font-semibold text-text-strong break-all">{header.journal_entry_id}</div></div> : null}
              {header.period_id ? <div><div className="text-xs font-medium text-text-muted mb-1">Period</div><div className="text-sm font-semibold text-text-strong break-all">{header.period_id}</div></div> : null}
            </div>

            <div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border-subtle "><h2 className="text-base font-semibold text-text-strong">Lines</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className=" border-b border-border-subtle">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-body uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-body uppercase">Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-body uppercase">Unit Price</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-body uppercase">Account</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-text-body uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {lines.length ? lines.map((line) => (
                      <tr key={line.id ?? line.line_no}>
                        <td className="px-6 py-4 text-sm text-text-strong">{line.description}</td>
                        <td className="px-6 py-4 text-sm text-text-body">{line.quantity ?? 1}</td>
                        <td className="px-6 py-4 text-sm text-text-body">{toCurrency(line.unit_price ?? 0, currency)}</td>
                        <td className="px-6 py-4 text-xs text-text-muted font-mono">{line.account_id ?? '—'}</td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-text-strong">{toCurrency(line.line_total ?? 0, currency)}</td>
                      </tr>
                    )) : <tr><td className="px-6 py-10 text-sm text-text-muted text-center" colSpan={5}>No lines on this document.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-surface-1 rounded-2xl border border-border-subtle shadow-sm p-6 h-fit">
            <div className="text-sm text-text-muted mb-1">Total Amount</div>
            <div className="text-3xl font-bold text-text-strong mb-6">{toCurrency(total, currency)}</div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-text-muted">Currency</span><span className="font-medium text-text-strong">{currency}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Line Count</span><span className="font-medium text-text-strong">{lines.length}</span></div>
              {header.counterparty_partner_id ? <div className="flex justify-between gap-4"><span className="text-text-muted">Partner ID</span><span className="font-medium text-text-strong break-all text-right">{header.counterparty_partner_id}</span></div> : null}
              {header.cash_account_id ? <div className="flex justify-between gap-4"><span className="text-text-muted">Cash Account</span><span className="font-medium text-text-strong break-all text-right">{header.cash_account_id}</span></div> : null}
              {header.primary_account_id ? <div className="flex justify-between gap-4"><span className="text-text-muted">Primary Account</span><span className="font-medium text-text-strong break-all text-right">{header.primary_account_id}</span></div> : null}
            </div>
          </div>
        </div>
      </div>

      <Modal open={!!action} onClose={() => setAction(null)} title={`${config.singular} Action`} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setAction(null)}>Cancel</Button><Button onClick={() => run.mutate({ key: action })} loading={run.isPending}>Confirm</Button></div>}>
        <div className="space-y-4">
          {(action === 'approve' || action === 'reject') ? <Textarea label="Comment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment" /> : null}
          {action === 'void' ? <Textarea label="Void Reason" rows={4} value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Reason is required" /> : null}
          <div className="text-sm text-text-muted">This action will be applied to the document and may update workflow and posting state.</div>
        </div>
      </Modal>
    </div>
  );
}
