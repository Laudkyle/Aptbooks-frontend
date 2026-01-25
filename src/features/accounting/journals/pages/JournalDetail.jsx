import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeJournalsApi } from '../api/journals.api.js';
import { makeCoaApi } from './../../chartOfAccounts/api/coa.api.js';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { formatMoney } from '../../../../shared/utils/formatMoney.js';
import { formatDate } from '../../../../shared/utils/formatDate.js';
import { Calendar, Hash, CheckCircle2, XCircle, Clock, ChevronLeft, RefreshCw } from 'lucide-react';

export default function JournalDetail() {
  const { id } = useParams();
  const { http } = useApi();
  const api = useMemo(() => makeJournalsApi(http), [http]);
  const accountsApi = useMemo(() => makeCoaApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const q = useQuery({
    queryKey: ['journal', id],
    queryFn: () => api.detail(id),
    enabled: !!id
  });

  const accountsQ = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
    enabled: !!id
  });

  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [action, setAction] = useState(null);

  const mutate = (mutationFn, successMsg) =>
    useMutation({
      mutationFn,
      onSuccess: () => {
        toast.success(successMsg);
        qc.invalidateQueries({ queryKey: ['journal', id] });
        qc.invalidateQueries({ queryKey: ['journals'] });
      },
      onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Action failed')
    });

  const submit = mutate(() => api.submit(id), 'Submitted.');
  const approve = mutate(() => api.approve(id), 'Approved.');
  const cancel = mutate(() => api.cancel(id), 'Cancelled.');
  const post = mutate(() => api.post(id), 'Posted.');
  const reject = mutate(() => api.reject(id, { reason }), 'Rejected.');
  const voidM = mutate(() => api.void(id, { reason }), 'Voided.');

  function openReason(kind) {
    setAction(kind);
    setReason('');
    setReasonOpen(true);
  }

  function confirmReason() {
    if (action === 'reject') reject.mutate();
    if (action === 'void') voidM.mutate();
    setReasonOpen(false);
  }

  const j = q.data?.journal;
  const lines = q.data?.lines || [];
  
  const accountsMap = React.useMemo(() => {
    if (!accountsQ.data) return {};
    return accountsQ.data.reduce((acc, account) => {
      acc[account.id] = account;
      return acc;
    }, {});
  }, [accountsQ.data]);

  const getAccountName = (accountId) => {
    const account = accountsMap[accountId];
    return account ? `${account.code} - ${account.name}` : 'Loading...';
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: { variant: 'default', label: 'Draft' },
      submitted: { variant: 'warning', label: 'Pending Approval' },
      approved: { variant: 'info', label: 'Approved' },
      rejected: { variant: 'danger', label: 'Rejected' },
      posted: { variant: 'success', label: 'Posted' },
      voided: { variant: 'secondary', label: 'Voided' },
      canceled: { variant: 'secondary', label: 'Canceled' }
    };
    
    const config = variants[status?.toLowerCase()] || { variant: 'default', label: status || 'Unknown' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusActions = () => {
    const status = j?.status?.toLowerCase();
    
    switch(status) {
      case 'draft':
        return (
          <>
            <Button onClick={() => submit.mutate()} disabled={submit.isLoading} size="sm">Submit</Button>
            <Button variant="secondary" onClick={() => openReason('void')} size="sm">Void</Button>
          </>
        );
      case 'submitted':
        return (
          <>
            <Button onClick={() => approve.mutate()} disabled={approve.isLoading} size="sm">Approve</Button>
            <Button variant="secondary" onClick={() => openReason('reject')} size="sm">Reject</Button>
          </>
        );
      case 'approved':
        return (
          <>
            <Button onClick={() => post.mutate()} disabled={post.isLoading} size="sm">Post</Button>
            <Button variant="secondary" onClick={() => cancel.mutate()} disabled={cancel.isLoading} size="sm">Cancel</Button>
          </>
        );
      case 'posted':
        return (
          <Button variant="danger" onClick={() => openReason('void')} size="sm">Void</Button>
        );
      default:
        return null;
    }
  };

  const totals = lines.reduce((acc, line) => {
    const debit = parseFloat(line.debit) || 0;
    const credit = parseFloat(line.credit) || 0;
    return {
      debit: acc.debit + debit,
      credit: acc.credit + credit
    };
  }, { debit: 0, credit: 0 });

  if (q.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600">Loading journal...</div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{q.error?.message ?? 'Failed to load journal.'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="text-slate-600 hover:text-slate-900 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold text-slate-900">
                    Journal Entry #{j?.entry_no}
                  </h1>
                  {j && getStatusBadge(j.status)}
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Created {formatDate(j?.created_at, 'MMM DD, YYYY')}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => q.refetch()} disabled={q.isFetching} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              {getStatusActions()}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Journal Info Card */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Journal Information</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Entry Date</label>
                    <div className="mt-1 flex items-center gap-2 text-slate-900">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {formatDate(j?.entry_date, 'MMM DD, YYYY')}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Entry Number</label>
                    <div className="mt-1 flex items-center gap-2 text-slate-900">
                      <Hash className="w-4 h-4 text-slate-400" />
                      {j?.entry_no}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Currency</label>
                    <div className="mt-1 text-slate-900">GHS (Ghanaian Cedi)</div>
                  </div>
                  {j?.memo && (
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Memo</label>
                      <p className="mt-1 text-slate-900">{j.memo}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Line Items</h2>
                <p className="text-sm text-slate-600">{lines.length} lines • {formatMoney(totals.debit, 'GHS')} total</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Debit
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Credit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {lines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {line.line_no}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900">
                            {getAccountName(line.account_id)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600 max-w-xs truncate" title={line.description}>
                            {line.description || '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-slate-900 font-medium">
                          {parseFloat(line.debit) > 0 ? formatMoney(line.debit, line.currency_code) : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-slate-900 font-medium">
                          {parseFloat(line.credit) > 0 ? formatMoney(line.credit, line.currency_code) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan="3" className="px-6 py-4 text-sm font-semibold text-slate-900">
                        Total
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-right text-slate-900">
                        {formatMoney(totals.debit, 'GHS')}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-right text-slate-900">
                        {formatMoney(totals.credit, 'GHS')}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="px-6 py-2 text-sm font-medium text-slate-700">
                        Balance
                      </td>
                      <td colSpan="2" className="px-6 py-2">
                        <div className={`text-sm font-bold text-right ${Math.abs(totals.debit - totals.credit) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                          {Math.abs(totals.debit - totals.credit) < 0.01 ? '✓ Balanced' : `✗ Unbalanced by ${formatMoney(Math.abs(totals.debit - totals.credit), 'GHS')}`}
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Additional Info Cards */}
            <div className="grid grid-cols-2 gap-6">
              {/* Audit Trail */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900">Audit Trail</h2>
                </div>
                <div className="p-6 space-y-3">
                  {j?.created_by && (
                    <div className="text-sm">
                      <span className="text-slate-600">Created by:</span>{' '}
                      <span className="font-medium text-slate-900">User {j.created_by.substring(0, 8)}...</span>
                      <div className="text-xs text-slate-500">{formatDate(j.created_at, 'MMM DD, YYYY [at] h:mm A')}</div>
                    </div>
                  )}
                  {j?.submitted_by && (
                    <div className="text-sm">
                      <span className="text-slate-600">Submitted by:</span>{' '}
                      <span className="font-medium text-slate-900">User {j.submitted_by.substring(0, 8)}...</span>
                      <div className="text-xs text-slate-500">{formatDate(j.submitted_at, 'MMM DD, YYYY [at] h:mm A')}</div>
                    </div>
                  )}
                  {j?.approved_by && (
                    <div className="text-sm">
                      <span className="text-slate-600">Approved by:</span>{' '}
                      <span className="font-medium text-slate-900">User {j.approved_by.substring(0, 8)}...</span>
                      <div className="text-xs text-slate-500">{formatDate(j.approved_at, 'MMM DD, YYYY [at] h:mm A')}</div>
                    </div>
                  )}
                  {j?.rejected_by && (
                    <div className="text-sm">
                      <span className="text-slate-600">Rejected by:</span>{' '}
                      <span className="font-medium text-slate-900">User {j.rejected_by.substring(0, 8)}...</span>
                      <div className="text-xs text-slate-500">{formatDate(j.rejected_at, 'MMM DD, YYYY [at] h:mm A')}</div>
                      {j.rejection_reason && (
                        <div className="mt-1 text-xs text-red-600 bg-red-50 p-2 rounded">Reason: {j.rejection_reason}</div>
                      )}
                    </div>
                  )}
                  {j?.voided_by && (
                    <div className="text-sm">
                      <span className="text-slate-600">Voided by:</span>{' '}
                      <span className="font-medium text-slate-900">User {j.voided_by.substring(0, 8)}...</span>
                      <div className="text-xs text-slate-500">{formatDate(j.voided_at, 'MMM DD, YYYY [at] h:mm A')}</div>
                      {j.void_reason && (
                        <div className="mt-1 text-xs text-red-600 bg-red-50 p-2 rounded">Reason: {j.void_reason}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Technical Details */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900">Technical Details</h2>
                </div>
                <div className="p-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Journal ID:</span>
                    <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">{id?.substring(0, 12)}...</code>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Organization:</span>
                    <span className="font-medium text-slate-900">{j?.organization_id?.substring(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Period:</span>
                    <span className="font-medium text-slate-900">{j?.period_id?.substring(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Type ID:</span>
                    <span className="font-medium text-slate-900">{j?.journal_entry_type_id?.substring(0, 8)}...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Timeline */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Status Timeline</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${j?.created_at ? 'text-green-600' : 'text-slate-300'}`}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">Created</div>
                    <div className="text-xs text-slate-500">{formatDate(j?.created_at, 'MMM DD, h:mm A')}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${j?.submitted_at ? 'text-green-600' : 'text-slate-300'}`}>
                    {j?.submitted_at ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">Submitted</div>
                    <div className="text-xs text-slate-500">{formatDate(j?.submitted_at, 'MMM DD, h:mm A') || 'Pending'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${j?.approved_at ? 'text-green-600' : j?.rejected_at ? 'text-red-600' : 'text-slate-300'}`}>
                    {j?.approved_at ? <CheckCircle2 className="w-5 h-5" /> : j?.rejected_at ? <XCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">
                      {j?.approved_at ? 'Approved' : j?.rejected_at ? 'Rejected' : 'Approval'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDate(j?.approved_at || j?.rejected_at, 'MMM DD, h:mm A') || 'Pending'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${j?.posted_at ? 'text-green-600' : 'text-slate-300'}`}>
                    {j?.posted_at ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">Posted</div>
                    <div className="text-xs text-slate-500">{formatDate(j?.posted_at, 'MMM DD, h:mm A') || 'Pending'}</div>
                  </div>
                </div>

                {j?.voided_at && (
                  <div className="flex items-start gap-3 pt-2 border-t border-slate-200">
                    <div className="mt-0.5 text-gray-600">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900">Voided</div>
                      <div className="text-xs text-slate-500">{formatDate(j.voided_at, 'MMM DD, h:mm A')}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Additional Actions</h2>
              </div>
              <div className="p-6 space-y-2">
                <Button 
                  variant="secondary" 
                  className="w-full justify-center"
                  onClick={() => openReason('reject')}
                  size="sm"
                >
                  Reject Entry
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full justify-center"
                  onClick={() => cancel.mutate()} 
                  disabled={cancel.isLoading}
                  size="sm"
                >
                  Cancel Entry
                </Button>
                <Button 
                  variant="danger" 
                  className="w-full justify-center"
                  onClick={() => openReason('void')}
                  size="sm"
                >
                  Void Entry
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reason Modal */}
      <Modal
        open={reasonOpen}
        title={action === 'reject' ? 'Reject Journal Entry' : 'Void Journal Entry'}
        onClose={() => setReasonOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReasonOpen(false)}>Cancel</Button>
            <Button 
              onClick={confirmReason} 
              disabled={!reason || reason.length < 1}
              variant={action === 'void' ? 'danger' : 'default'}
            >
              {action === 'reject' ? 'Reject Entry' : 'Void Entry'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {action === 'reject' 
              ? 'Please provide a reason for rejecting this journal entry. The creator will be notified.'
              : 'Voiding this journal entry will mark it as invalid and cannot be undone. Please provide a reason.'}
          </p>
          <Input 
            label="Reason" 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
            placeholder="Enter reason (1-300 characters)"
            multiline
            rows={3}
          />
          <div className="text-xs text-slate-500">
            {reason.length}/300 characters
          </div>
        </div>
      </Modal>
    </div>
  );
}