import React, { useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  AlertCircle,
  User,
  Calendar,
  Inbox,
  FileText,
  RefreshCw
} from 'lucide-react';

import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeApprovalsApi } from '../api/approvals.api.js';
import { makeDocumentTypesApi } from '../api/documentTypes.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { Pagination } from '../../../../shared/components/ui/Pagination.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../../shared/components/ui/Modal.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatSource(s) {
  return String(s || '—')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDateTime(v) {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return String(v);
  }
}

function getRef(row) {
  if (row.source === 'documents') return row.title ?? row.document_id;
  return row.title ?? row.entity_id;
}

function getEntityId(row) {
  return row.source === 'documents' ? row.document_id : row.entity_id;
}

// ─── Status config ────────────────────────────────────────────────────────────

function getStatusConfig(status) {
  const s = (status ?? '').toLowerCase();
  const configs = {
    pending:   { tone: 'warning', icon: Clock,        label: 'Pending'   },
    approved:  { tone: 'success', icon: CheckCircle2, label: 'Approved'  },
    rejected:  { tone: 'error',   icon: XCircle,      label: 'Rejected'  },
    submitted: { tone: 'brand',   icon: FileText,     label: 'Submitted' }
  };
  return configs[s] ?? { tone: 'muted', icon: Clock, label: status || '—' };
}

// ─── Source tones — matched exactly to backend source strings ─────────────────
// Backend emits: documents | journals | writeoffs | stock_counts |
//                leave_requests | budget_versions | forecast_versions

const SOURCE_TONES = {
  documents:         'brand',
  journals:          'success',
  writeoffs:         'warning',
  stock_counts:      'muted',
  leave_requests:    'muted',
  budget_versions:   'brand',
  forecast_versions: 'success'
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ApprovalQueue() {
  const { http } = useApi();
  const api         = useMemo(() => makeApprovalsApi(http),    [http]);
  const docTypesApi = useMemo(() => makeDocumentTypesApi(http), [http]);
  const qc          = useQueryClient();
  const toast = useToast()
  // Filters
  const [limit,          setLimit]          = useState(50);
  const [offset,         setOffset]         = useState(0);
  const [state,          setState]          = useState('');
  const [documentTypeId, setDocumentTypeId] = useState('');
  const [sourceFilter,   setSourceFilter]   = useState('');

  // Modals
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget,  setRejectTarget]  = useState(null);
  const [rejectReason,  setRejectReason]  = useState('');

  // ── Document types — only meaningful for the 'documents' source ───────────
  // The backend only applies documentTypeId filtering in the documents CTE,
  // so we disable and clear the filter when another source is selected.
  const docTypeFilterEnabled = sourceFilter === '' || sourceFilter === 'documents';

  const docTypesQuery = useQuery({
    queryKey: ['documentTypes'],
    queryFn:  () => docTypesApi.list(),
    staleTime: 60_000,
    enabled:   docTypeFilterEnabled
  });

  const documentTypes = useMemo(() => {
    const d = docTypesQuery.data;
    if (Array.isArray(d))       return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  }, [docTypesQuery.data]);

  // ── Inbox data ────────────────────────────────────────────────────────────

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['approvalsInbox', limit, offset, state, documentTypeId],
    queryFn: () =>
      api.inbox({
        limit,
        offset,
        state:          state          || undefined,
        documentTypeId: documentTypeId || undefined
      }),
    staleTime: 10_000,
    retry: 2
  });

  const allRows = useMemo(() => data?.data ?? [], [data]);
  const paging  = useMemo(() => data?.paging ?? { limit, offset }, [data, limit, offset]);

  // Client-side source filter (the inbox already filters by org; source is post-filter)
  const rows = useMemo(
    () => sourceFilter
      ? allRows.filter((r) => String(r.source) === sourceFilter)
      : allRows,
    [allRows, sourceFilter]
  );

  // Dynamically build source options from live data
  const availableSources = useMemo(
    () => [...new Set(allRows.map((r) => String(r.source)).filter(Boolean))].sort(),
    [allRows]
  );

  // ── Mutations ─────────────────────────────────────────────────────────────

  const approveMutation = useMutation({
    mutationFn: (row) => api.approve(row),
    onSuccess: () => {
      toast.success('Request approved successfully');
      setApproveTarget(null);
      qc.invalidateQueries({ queryKey: ['approvalsInbox'] });
    },
    onError: (err) => toast.error(err?.message ?? 'Failed to approve request')
  });

  const rejectMutation = useMutation({
    mutationFn: ({ row, reason }) => api.reject(row, reason),
    onSuccess: () => {
      toast.success('Request rejected');
      setRejectTarget(null);
      setRejectReason('');
      qc.invalidateQueries({ queryKey: ['approvalsInbox'] });
    },
    onError: (err) => toast.error(err?.message ?? 'Failed to reject request')
  });

  const isBusy = approveMutation.isPending || rejectMutation.isPending;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleApproveClick    = useCallback((row) => setApproveTarget(row), []);
  const handleRejectClick     = useCallback((row) => { setRejectTarget(row); setRejectReason(''); }, []);
  const handleConfirmApprove  = useCallback(() => { if (approveTarget) approveMutation.mutate(approveTarget); }, [approveTarget, approveMutation]);
  const handleConfirmReject   = useCallback(() => { if (rejectTarget) rejectMutation.mutate({ row: rejectTarget, reason: rejectReason || undefined }); }, [rejectTarget, rejectReason, rejectMutation]);
  const handleRefresh         = useCallback(() => refetch(), [refetch]);

  const handleSourceChange = useCallback((e) => {
    const val = e.target.value;
    setSourceFilter(val);
    // document type filter doesn't apply outside the documents source
    if (val !== 'documents') setDocumentTypeId('');
    setOffset(0);
  }, []);

  const handleStateChange    = useCallback((e) => { setState(e.target.value);          setOffset(0); }, []);
  const handleDocTypeChange  = useCallback((e) => { setDocumentTypeId(e.target.value); setOffset(0); }, []);
  const handleLimitChange    = useCallback((e) => { setLimit(Number(e.target.value) || 50); setOffset(0); }, []);

  const handleClearFilters = useCallback(() => {
    setSourceFilter(''); setState(''); setDocumentTypeId(''); setOffset(0);
  }, []);

  const hasActiveFilters = !!(sourceFilter || state || documentTypeId);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals Inbox"
        subtitle="Unified queue of approval requests across documents, journals, write-offs, budgets, and more."
        icon={Inbox}
        actions={
          <Button variant="outline" leftIcon={RefreshCw} onClick={handleRefresh}>
            Refresh
          </Button>
        }
      />

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <ContentCard>
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-900">Filters</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Source</label>
            <select
              value={sourceFilter}
              onChange={handleSourceChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            >
              <option value="">All Sources</option>
              {availableSources.map((s) => (
                <option key={s} value={s}>{formatSource(s)}</option>
              ))}
            </select>
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
            <select
              value={state}
              onChange={handleStateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            >
              <option value="">All States</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>

          {/* Document Type — grayed out + cleared when non-documents source selected */}
          <div className={!docTypeFilterEnabled ? 'opacity-40 pointer-events-none select-none' : ''}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Document Type
              {!docTypeFilterEnabled && (
                <span className="ml-1.5 text-xs font-normal text-slate-400">(documents only)</span>
              )}
            </label>
            {docTypesQuery.isLoading && docTypeFilterEnabled ? (
              <div className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-400 bg-white">
                Loading types...
              </div>
            ) : (
              <select
                value={documentTypeId}
                onChange={handleDocTypeChange}
                disabled={!docTypeFilterEnabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
              >
                <option value="">All Document Types</option>
                {documentTypes.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name ?? dt.code ?? dt.id}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Page size */}
          <div>
            <Input
              label="Results per Page"
              type="number"
              min={1}
              max={200}
              value={limit}
              onChange={handleLimitChange}
            />
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Active filters:</span>
            {sourceFilter && (
              <Badge tone="brand" className="text-xs">
                Source: {formatSource(sourceFilter)}
              </Badge>
            )}
            {state && (
              <Badge tone="muted" className="text-xs">
                State: {formatSource(state)}
              </Badge>
            )}
            {documentTypeId && (
              <Badge tone="muted" className="text-xs">
                Type: {documentTypes.find((dt) => dt.id === documentTypeId)?.name ?? 'Filtered'}
              </Badge>
            )}
            <button
              onClick={handleClearFilters}
              className="ml-1 text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </ContentCard>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <ContentCard>
        <div className="mb-4">
          <div className="text-base font-semibold text-slate-900">Pending Requests</div>
          <div className="mt-1 text-sm text-slate-500">
            {rows.length} {rows.length === 1 ? 'request' : 'requests'} shown
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading approvals...</div>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-sm font-medium text-slate-900">Failed to load inbox</div>
            <div className="text-sm text-slate-500">{error?.message ?? 'An error occurred'}</div>
            <Button variant="outline" onClick={handleRefresh} className="mt-2">Retry</Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <div className="text-sm font-medium text-slate-900">All caught up!</div>
            <div className="text-sm text-slate-500 mt-1">
              {hasActiveFilters ? 'No requests match your filters.' : 'No pending approval requests.'}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <Table>
              <THead>
                <tr>
                  <TH>Source</TH>
                  <TH>Reference</TH>
                  <TH>Status</TH>
                  <TH>Requested By</TH>
                  <TH>Submitted</TH>
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((row, idx) => {
                  const ref        = getRef(row);
                  const entityId   = getEntityId(row);
                  const statusCfg  = getStatusConfig(row.approval_status);
                  const StatusIcon = statusCfg.icon;
                  const sourceTone = SOURCE_TONES[row.source] ?? 'muted';

                  return (
                    <tr
                      key={row.approval_id ?? row.document_id ?? row.entity_id ?? idx}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <TD>
                        <Badge tone={sourceTone} className="whitespace-nowrap">
                          {formatSource(row.source)}
                        </Badge>
                      </TD>

                      <TD>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-900 text-sm">{ref ?? '—'}</span>
                          {entityId && (
                            <span className="font-mono text-[11px] text-slate-500">{entityId}</span>
                          )}
                          {/* Show document type name inline for documents rows */}
                          {row.document_type_name && (
                            <span className="text-xs text-slate-400">{row.document_type_name}</span>
                          )}
                          {row.workflow_state_code && (
                            <span className="text-xs text-slate-400">{row.workflow_state_code}</span>
                          )}
                        </div>
                      </TD>

                      <TD>
                        <Badge tone={statusCfg.tone} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg.label}
                        </Badge>
                      </TD>

                      <TD>
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          {row.requested_by_name ?? '—'}
                        </div>
                      </TD>

                      <TD>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          {formatDateTime(row.submitted_at ?? row.updated_at ?? row.created_at)}
                        </div>
                      </TD>

                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            leftIcon={CheckCircle2}
                            disabled={isBusy}
                            onClick={() => handleApproveClick(row)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={XCircle}
                            disabled={isBusy}
                            onClick={() => handleRejectClick(row)}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Reject
                          </Button>
                        </div>
                      </TD>
                    </tr>
                  );
                })}
              </TBody>
            </Table>
          </div>
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <div className="mt-4">
            <Pagination
              limit={paging.limit ?? limit}
              offset={paging.offset ?? offset}
              total={paging.total ?? null}
              onChange={({ offset: o }) => setOffset(o)}
            />
          </div>
        )}
      </ContentCard>

      {/* ── Approve Modal ─────────────────────────────────────────────── */}
      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title="Approve Request">
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-900">
                <div className="font-medium mb-1">Confirm Approval</div>
                <div className="text-green-700">This action will approve the request and cannot be undone.</div>
              </div>
            </div>
          </div>

          {approveTarget && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Reference</span>
                <span className="font-medium">{getRef(approveTarget)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Source</span>
                <Badge tone={SOURCE_TONES[approveTarget.source] ?? 'muted'}>{formatSource(approveTarget.source)}</Badge>
              </div>
              {approveTarget.document_type_name && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Document Type</span>
                  <span className="font-medium">{approveTarget.document_type_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">Requested By</span>
                <span className="font-medium">{approveTarget.requested_by_name ?? '—'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={approveMutation.isPending}>
            Cancel
          </Button>
          <Button
            leftIcon={CheckCircle2}
            loading={approveMutation.isPending}
            onClick={handleConfirmApprove}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Approve Request
          </Button>
        </div>
      </Modal>

      {/* ── Reject Modal ──────────────────────────────────────────────── */}
      <Modal
        open={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setRejectReason(''); }}
        title="Reject Request"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-900">
                <div className="font-medium mb-1">Confirm Rejection</div>
                <div className="text-red-700">This action will reject the request. You may optionally provide a reason.</div>
              </div>
            </div>
          </div>

          {rejectTarget && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Reference</span>
                <span className="font-medium">{getRef(rejectTarget)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Source</span>
                <Badge tone={SOURCE_TONES[rejectTarget.source] ?? 'muted'}>{formatSource(rejectTarget.source)}</Badge>
              </div>
              {rejectTarget.document_type_name && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Document Type</span>
                  <span className="font-medium">{rejectTarget.document_type_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">Requested By</span>
                <span className="font-medium">{rejectTarget.requested_by_name ?? '—'}</span>
              </div>
            </div>
          )}

          <Input
            label="Reason for Rejection (Optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter a reason..."
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => { setRejectTarget(null); setRejectReason(''); }}
            disabled={rejectMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            leftIcon={XCircle}
            loading={rejectMutation.isPending}
            onClick={handleConfirmReject}
          >
            Reject Request
          </Button>
        </div>
      </Modal>
    </div>
  );
}