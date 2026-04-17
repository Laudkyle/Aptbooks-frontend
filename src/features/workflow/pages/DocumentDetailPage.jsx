import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  Send,
  ArrowLeft,
  Clock,
  AlertCircle,
  User,
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeWorkflowDocumentsApi } from '../approvals/api/workflowDocuments.api.js';
import { Card } from '../../../shared/components/ui/Card.jsx';
import { CardHeader } from '../../../shared/components/ui/Card.jsx';
import { CardTitle } from '../../../shared/components/ui/Card.jsx';
import { CardDescription } from '../../../shared/components/ui/Card.jsx';
import { CardContent } from '../../../shared/components/ui/Card.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Render a date-only string from any ISO date/datetime */
function formatDate(value) {
  if (!value) return '—';
  const iso = String(value).slice(0, 10);
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return value;
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  const n = Number(bytes);
  const kb = n / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

/** Normalise the status field — API uses workflow_state_code */
function getStatus(doc) {
  return doc?.workflow_state_code ?? doc?.status ?? '';
}

const STATUS_LABEL = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const STATUS_COLORS = {
  DRAFT:     'bg-amber-100 text-amber-800 border-amber-200',
  SUBMITTED: 'bg-blue-100  text-blue-800  border-blue-200',
  APPROVED:  'bg-green-100 text-green-800 border-green-200',
  REJECTED:  'bg-red-100   text-red-800   border-red-200',
};

const TIMELINE_EVENTS = [
  { key: 'created_at',   label: 'Created',   Icon: FileText,    color: 'bg-slate-100',  iconColor: 'text-slate-600'  },
  { key: 'submitted_at', label: 'Submitted',  Icon: Send,        color: 'bg-blue-100',   iconColor: 'text-blue-600'   },
  { key: 'approved_at',  label: 'Approved',   Icon: CheckCircle, color: 'bg-green-100',  iconColor: 'text-green-600'  },
  { key: 'rejected_at',  label: 'Rejected',   Icon: XCircle,     color: 'bg-red-100',    iconColor: 'text-red-600'    },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeWorkflowDocumentsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [comment, setComment] = useState('');
  const [modalAction, setModalAction] = useState(null); // 'submit' | 'approve' | 'reject'

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const { data, isLoading, error } = useQuery({
    queryKey: ['document', id],
    queryFn: () => api.getDocument(id),
  });

  // API returns { document, versions, approvals } at the top level
  const raw      = data?.data ?? data ?? {};
  const doc      = raw.document ?? raw;
  const versions = raw.versions  ?? doc.versions  ?? [];
  const approvals= raw.approvals ?? doc.approvals ?? [];
  const status   = getStatus(doc);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['document', id] });

  const uploadMutation = useMutation({
    mutationFn: (file) => api.uploadVersion(id, file, { idempotencyKey: generateUUID() }),
    onSuccess: () => { toast.success('Version uploaded successfully.'); invalidate(); },
    onError:   (e) => toast.error(e?.message ?? 'Failed to upload version.'),
  });

  const actionMutation = useMutation({
    mutationFn: async () => {
      const key = { idempotencyKey: generateUUID() };
      if (modalAction === 'submit')  return api.submit(id,  { comment }, key);
      if (modalAction === 'approve') return api.approve(id, { comment }, key);
      if (modalAction === 'reject')  return api.reject(id,  { comment }, key);
      throw new Error('Unknown action');
    },
    onSuccess: () => {
      toast.success('Action completed successfully.');
      invalidate();
      setModalAction(null);
      setComment('');
    },
    onError: (e) => toast.error(e?.message ?? 'Action failed.'),
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const handleDownload = async (versionId) => {
    try {
      await api.downloadVersion(id, versionId);
    } catch {
      toast.error('Failed to download file.');
    }
  };

  const closeModal = () => { setModalAction(null); setComment(''); };

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 text-slate-400 animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading document…</p>
        </div>
      </div>
    );
  }

  if (error || !doc?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Document not found</h2>
          <p className="text-sm text-gray-500 mb-6">
            {error?.message ?? "The document doesn't exist or you don't have access."}
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const latestVersion = versions[versions.length - 1];
  const isTerminal    = status === 'APPROVED' || status === 'REJECTED';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{doc.title}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status] ?? ''}`}>
                  {STATUS_LABEL[status] ?? status}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-600">Entity:</span>{' '}
                {doc.entity_type ?? '—'}
                {doc.entity_ref && (
                  <> · <span className="font-medium text-gray-600">Ref:</span> {doc.entity_ref}</>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {status === 'DRAFT' && (
              <Button size="sm" onClick={() => setModalAction('submit')}>
                <Send className="h-4 w-4 mr-2" />
                Submit
              </Button>
            )}
            {doc.canApprove && (
              <>
                <Button size="sm" onClick={() => setModalAction('approve')} className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button size="sm" onClick={() => setModalAction('reject')} className="bg-red-600 hover:bg-red-700 text-white">
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Stat Pills ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Document Type',    value: doc.document_type?.name ?? '—' },
            { label: 'Created',          value: formatDate(doc.created_at) },
            { label: 'Current Version',  value: latestVersion ? `v${latestVersion.version_no}` : '—' },
            { label: 'Total Versions',   value: versions.length },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className="font-semibold text-gray-900 text-sm">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Main Grid ── */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Left: Versions + Approvals */}
          <div className="lg:col-span-2 space-y-6">

            {/* Versions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Versions
                  </CardTitle>
                  {status === 'DRAFT' && (
                    <>
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={uploadMutation.isPending}
                      />
                      <label
                        htmlFor="file-upload"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors
                          ${uploadMutation.isPending
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'}`}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {uploadMutation.isPending ? 'Uploading…' : 'Upload Version'}
                      </label>
                    </>
                  )}
                </div>
                <CardDescription>All uploaded versions of this document</CardDescription>
              </CardHeader>
              <CardContent>
                {versions.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No versions uploaded yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                        <th className="pb-2 font-medium">Version</th>
                        <th className="pb-2 font-medium">File</th>
                        <th className="pb-2 font-medium">Uploaded</th>
                        <th className="pb-2 font-medium">Size</th>
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {versions.map((v) => (
                        <tr key={v.id} className="hover:bg-gray-50/50">
                          <td className="py-3 font-semibold text-gray-700">v{v.version_no}</td>
                          <td className="py-3 text-gray-500 truncate max-w-[180px]" title={v.original_filename}>
                            {v.original_filename ?? '—'}
                          </td>
                          <td className="py-3 text-gray-500">{formatDate(v.created_at)}</td>
                          <td className="py-3 text-gray-500">{formatBytes(v.size_bytes)}</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleDownload(v.id)}
                              className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline font-medium"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            {/* Approval History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Approval History</CardTitle>
                <CardDescription>Workflow steps and decisions for this document</CardDescription>
              </CardHeader>
              <CardContent>
                {approvals.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No approval history yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                        <th className="pb-2 font-medium">Level</th>
                        <th className="pb-2 font-medium">Action</th>
                        <th className="pb-2 font-medium">Comment</th>
                        <th className="pb-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {approvals.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50/50">
                          <td className="py-3 font-medium text-gray-700">
                            {a.approval_level_name ?? a.level_name ?? '—'}
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {STATUS_LABEL[a.status] ?? a.status ?? '—'}
                            </span>
                          </td>
                          <td className="py-3 text-gray-500">{a.comment || '—'}</td>
                          <td className="py-3 text-gray-500">{formatDate(a.acted_at ?? a.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-5">

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {TIMELINE_EVENTS.map(({ key, label, Icon, color, iconColor }) => {
                    const dateVal = doc[key];
                    if (!dateVal && key !== 'created_at') return null;
                    return (
                      <div key={key} className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{label}</p>
                          <p className="text-xs text-gray-400">{formatDate(dateVal)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Document Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Document Info</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {[
                    { label: 'Status',        value: <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status] ?? ''}`}>{STATUS_LABEL[status] ?? status}</span> },
                    { label: 'Entity Type',   value: doc.entity_type ?? '—' },
                    { label: 'Entity Ref',    value: doc.entity_ref  ?? '—' },
                    { label: 'Document Type', value: doc.document_type?.name ?? '—' },
                    { label: 'Created',       value: formatDate(doc.created_at) },
                    { label: 'Last Updated',  value: formatDate(doc.updated_at) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center gap-2">
                      <dt className="text-gray-400 flex-shrink-0">{label}</dt>
                      <dd className="font-medium text-gray-800 text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            {/* Inline comment box (non-terminal states) */}
            {!isTerminal && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Comment</CardTitle>
                  <CardDescription>Pre-fill a comment for your next action</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment (optional)…"
                    rows={3}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ── Action Modal ── */}
      <Modal
        open={!!modalAction}
        onClose={closeModal}
        title={
          modalAction === 'submit'  ? 'Submit for Approval' :
          modalAction === 'approve' ? 'Approve Document'    :
          modalAction === 'reject'  ? 'Reject Document'     : ''
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Comment{modalAction === 'reject' ? ' (required)' : ' (optional)'}
            </label>
            <Textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                modalAction === 'reject'
                  ? 'Please provide a reason for rejection…'
                  : 'Add a comment…'
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() => actionMutation.mutate()}
              disabled={actionMutation.isPending || (modalAction === 'reject' && !comment.trim())}
              className={
                modalAction === 'reject'  ? 'bg-red-600   hover:bg-red-700   text-white' :
                modalAction === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' :
                ''
              }
            >
              {actionMutation.isPending ? 'Processing…' : 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}