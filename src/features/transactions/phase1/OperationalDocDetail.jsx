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
import { buildTaxDetailModel, formatTaxAmount } from '../utils/taxDetail.js';

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

  const query = useQuery({ 
    queryKey: qk[config.detailQueryKey] ? qk[config.detailQueryKey](id) : ['phase1', moduleKey, id], 
    queryFn: () => api.get(id) 
  });
  
  const detail = query.data?.data ?? query.data;
  
  // Extract header, lines, and detail_meta from the response
  const header = detail?.header ?? {};
  const lines = detail?.lines ?? [];
  const detailMeta = detail?.detail_meta ?? {};

  // Get workflow status from detail_meta or header
  const workflowStatus = detailMeta?.workflow?.status || header.status || 'draft';
  const canApprove = detailMeta?.workflow?.can_approve || header.can_approve || false;
  const canPost = detailMeta?.workflow?.can_post || header.can_post || false;

  // Create a normalized entity for workflow state
  const normalizedEntity = {
    ...header,
    status: workflowStatus,
    can_approve: canApprove,
    can_post: canPost,
    workflow_status: detailMeta?.workflow?.workflow_status || header.workflow_status
  };

  const state = normalizeTransactionWorkflow({ 
    entity: normalizedEntity, 
    payload: detail, 
    type: config.type 
  });
  
  const availableActions = getPhase1Actions(config, state);
  console.log({ state, availableActions, header, detailMeta });

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
      setAction(null); 
      setComment(''); 
      setVoidReason('');
      qc.invalidateQueries({ 
        queryKey: qk[config.listQueryKey] ? qk[config.listQueryKey]() : ['phase1', moduleKey] 
      });
      qc.invalidateQueries({ 
        queryKey: qk[config.detailQueryKey] ? qk[config.detailQueryKey](id) : ['phase1', moduleKey, id] 
      });
      if (res?.posting?.status === 'failed') {
        toast.error(res.posting.message || 'Posting failed after approval.');
      }
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Action failed.')
  });

  // Build tax model with proper data structure
  const taxModel = useMemo(() => {
    // Convert lines to the format expected by buildTaxDetailModel
    const formattedLines = lines.map(line => ({
      id: line.id,
      line_no: line.line_no,
      description: line.description,
      quantity: line.quantity,
      unit_price: line.unit_price,
      line_total: line.line_total,
      expense_account_id: line.account_id,
      revenue_account_id: line.account_id,
      tax_code_id: line.tax_code_id,
      tax_amount: line.tax_amount,
      taxable_amount: line.taxable_amount,
      taxes: line.taxes,
      account: line.account,
      account_code: line.account_code,
      account_name: line.account_name,
      tax_code: line.tax_code,
      tax_code_code: line.tax_code_code,
      tax_code_name: line.tax_code_name,
      tax_breakdown: line.tax_breakdown,
      display_amounts: line.display_amounts
    }));

    return buildTaxDetailModel({ 
      header, 
      payload: detail, 
      lines: formattedLines, 
      pricingMode: header.pricing_mode ?? header.pricingMode ?? 'exclusive' 
    });
  }, [detail, header, lines]);

  // Calculate total from various sources
  const total = useMemo(() => {
    if (taxModel?.summary?.grandTotal) {
      return Number(taxModel.summary.grandTotal);
    }
    if (header.amount_total) {
      return Number(header.amount_total);
    }
    if (detailMeta?.totals?.total) {
      return Number(detailMeta.totals.total);
    }
    return lines.reduce((sum, line) => sum + Number(line.line_total ?? 0), 0);
  }, [taxModel, header, detailMeta, lines]);

  const currency = header.currency_code || 'GHS';
  const subtotal = detailMeta?.totals?.subtotal || header.subtotal || 0;
  const taxTotal = detailMeta?.totals?.tax_total || header.tax_total || 0;
  const partnerName = header.partner_name || '—';

  // Get timeline events
  const timeline = detailMeta?.timeline || {};
  const events = timeline.events || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <button 
              onClick={() => navigate(config.routeList)} 
              className="mb-3 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to {config.title}
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {config.singular} {header.document_no ?? ''}
            </h1>
            <p className="text-sm text-gray-600">
              View document details, workflow state, and posting outcome.
            </p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(workflowStatus)}`}>
            {workflowStatus?.charAt(0).toUpperCase() + workflowStatus?.slice(1) || 'Draft'}
          </span>
        </div>

        <TransactionWorkflowActionBar 
          actions={availableActions} 
          onAction={setAction} 
          documentType={config.type} 
          documentId={id} 
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Document Information */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Document No</div>
                <div className="text-sm font-semibold text-gray-900">{header.document_no ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Date</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatDate(header.document_date) ?? '—'}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Due Date</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatDate(header.due_date) ?? '—'}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Partner</div>
                <div className="text-sm font-semibold text-gray-900">{partnerName}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Reference</div>
                <div className="text-sm font-semibold text-gray-900">{header.reference ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Workflow Status</div>
                <div className="text-sm font-semibold text-gray-900">
                  {detailMeta?.workflow?.workflow_status ?? 'none'}
                </div>
              </div>
              {header.memo && (
                <div className="md:col-span-2">
                  <div className="text-xs font-medium text-gray-500 mb-1">Memo</div>
                  <div className="text-sm text-gray-700">{header.memo}</div>
                </div>
              )}
              {header.journal_entry_id && (
                <div className="md:col-span-2">
                  <div className="text-xs font-medium text-gray-500 mb-1">Journal Entry</div>
                  <div className="text-sm font-semibold text-gray-900 break-all">{header.journal_entry_id}</div>
                </div>
              )}
              {header.period_id && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Period</div>
                  <div className="text-sm font-semibold text-gray-900 break-all">{header.period_id}</div>
                </div>
              )}
            </div>

            {/* Timeline */}
            {events.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Timeline</h3>
                <div className="space-y-3">
                  {events.map((event, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">
                        {event.type}
                      </span>
                      <span className="text-gray-500">{formatDate(event.at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Line Items */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-base font-semibold text-gray-900">Line Items</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">#</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Unit Price</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Account</th>
                      {taxModel.hasLineTax && (
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tax Code</th>
                      )}
                      {taxModel.hasLineTax && (
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tax Rate</th>
                      )}
                      {taxModel.hasLineTax && (
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Tax Amt</th>
                      )}
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {taxModel.lines.length ? taxModel.lines.map((line, idx) => (
                      <tr key={line.id ?? line.line_no ?? idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500">{line.line_no ?? idx + 1}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{line.description || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {line.quantity ? parseFloat(line.quantity) : 1}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {toCurrency(line.unit_price ?? line.unitPrice ?? 0, currency)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs">
                            <div className="font-mono text-gray-600">{line.account_code || '—'}</div>
                            <div className="text-gray-500">{line.account_name || '—'}</div>
                          </div>
                        </td>
                        {taxModel.hasLineTax && (
                          <td className="px-6 py-4 text-xs text-gray-700">
                            {line.tax_code_code || line.tax_code?.code || '—'}
                          </td>
                        )}
                        {taxModel.hasLineTax && (
                          <td className="px-6 py-4 text-xs text-gray-700">
                            {line._tax?.taxRate ? `${line._tax.taxRate}%` : '—'}
                          </td>
                        )}
                        {taxModel.hasLineTax && (
                          <td className="px-6 py-4 text-right text-sm text-gray-700">
                            {toCurrency(line._tax?.taxAmount || 0, currency)}
                          </td>
                        )}
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                          {toCurrency(line._tax?.total || line.line_total || 0, currency)}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="px-6 py-10 text-sm text-gray-500 text-center" colSpan={taxModel.hasLineTax ? 9 : 6}>
                          No lines on this document.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 h-fit">
              <div className="text-sm text-gray-500 mb-1">Total Amount</div>
              <div className="text-3xl font-bold text-gray-900 mb-6">{toCurrency(total, currency)}</div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Currency</span>
                  <span className="font-medium text-gray-900">{currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Line Count</span>
                  <span className="font-medium text-gray-900">{detailMeta?.stats?.line_count || lines.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxed Lines</span>
                  <span className="font-medium text-gray-900">{detailMeta?.stats?.taxed_line_count || 0}</span>
                </div>
                {header.counterparty_partner_id && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">Partner ID</span>
                    <span className="font-medium text-gray-900 break-all text-right">{header.counterparty_partner_id}</span>
                  </div>
                )}
                {header.cash_account_id && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">Cash Account</span>
                    <span className="font-medium text-gray-900 break-all text-right">{header.cash_account_id}</span>
                  </div>
                )}
                {header.primary_account_id && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">Primary Account</span>
                    <span className="font-medium text-gray-900 break-all text-right">{header.primary_account_id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tax Summary */}
            {taxModel.hasTax && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 h-fit">
                <div className="text-sm font-semibold text-gray-900 mb-4">Tax Summary</div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pricing Mode</span>
                    <span className="font-medium text-gray-900 capitalize">{taxModel.pricingMode}</span>
                  </div>
                  {taxModel.taxPointDate && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Tax Date</span>
                      <span className="font-medium text-gray-900 text-right">{formatDate(taxModel.taxPointDate)}</span>
                    </div>
                  )}
                  {taxModel.taxJurisdiction && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Jurisdiction</span>
                      <span className="font-medium text-gray-900 text-right">{taxModel.taxJurisdiction}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">
                      {formatTaxAmount((value) => toCurrency(value, currency), taxModel.summary.subtotal || subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium text-gray-900">
                      {formatTaxAmount((value) => toCurrency(value, currency), taxModel.summary.taxTotal || taxTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Withholding</span>
                    <span className="font-medium text-gray-900">
                      {formatTaxAmount((value) => toCurrency(value, currency), taxModel.summary.withholdingTotal || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recoverable tax</span>
                    <span className="font-medium text-gray-900">
                      {formatTaxAmount((value) => toCurrency(value, currency), taxModel.summary.recoverableTaxTotal || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Non-recoverable tax</span>
                    <span className="font-medium text-gray-900">
                      {formatTaxAmount((value) => toCurrency(value, currency), taxModel.summary.nonRecoverableTaxTotal || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-3">
                    <span className="font-semibold text-gray-900">Gross total</span>
                    <span className="font-semibold text-gray-900">
                      {formatTaxAmount((value) => toCurrency(value, currency), taxModel.summary.grandTotal || total)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <Modal 
          open={!!action} 
          onClose={() => setAction(null)} 
          title={`${config.singular} Action`} 
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
              <Button onClick={() => run.mutate({ key: action })} loading={run.isPending}>
                Confirm
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {(action === 'approve' || action === 'reject') && (
              <Textarea 
                label="Comment" 
                rows={4} 
                value={comment} 
                onChange={(e) => setComment(e.target.value)} 
                placeholder="Optional comment" 
              />
            )}
            {action === 'void' && (
              <Textarea 
                label="Void Reason" 
                rows={4} 
                value={voidReason} 
                onChange={(e) => setVoidReason(e.target.value)} 
                placeholder="Reason is required" 
              />
            )}
            <div className="text-sm text-gray-600">
              This action will be applied to the document and may update workflow and posting state.
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}