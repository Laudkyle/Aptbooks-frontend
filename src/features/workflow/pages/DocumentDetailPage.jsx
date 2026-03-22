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
  Calendar
} from "lucide-react";

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeWorkflowDocumentsApi } from '../approvals/api/workflowDocuments.api.js';
import { Card } from "../../../shared/components/ui/Card.jsx";
import { Button } from "../../../shared/components/ui/Button.jsx";
import { Badge } from "../../../shared/components/ui/Badge.jsx";
import { Table } from "../../../shared/components/ui/Table.jsx";
import { Textarea } from "../../../shared/components/ui/Textarea.jsx";
import { Modal } from "../../../shared/components/ui/Modal.jsx";
import { useToast } from "../../../shared/components/ui/Toast.jsx";
import { formatDate } from "../../../shared/utils/formatDate.js";

// Generate UUID v4 for idempotency
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeWorkflowDocumentsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [comment, setComment] = useState('');
  const [action, setAction] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Load document details
  const { data, isLoading, error } = useQuery({
    queryKey: ['document', id],
    queryFn: () => api.getDocument(id)
  });

  const doc = data?.data ?? data;

  // Mutations for document actions
  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const idempotencyKey = generateUUID();
      return api.uploadVersion(id, file, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Version uploaded successfully');
      qc.invalidateQueries({ queryKey: ['document', id] });
      setSelectedFile(null);
    },
    onError: (e) => {
      toast.error(e?.message ?? 'Failed to upload version');
    }
  });

  const actionMutation = useMutation({
    mutationFn: async () => {
      const idempotencyKey = generateUUID();
      
      if (action === 'submit') {
        return api.submit(id, { comment }, { idempotencyKey });
      }
      if (action === 'approve') {
        return api.approve(id, { comment }, { idempotencyKey });
      }
      if (action === 'reject') {
        return api.reject(id, { comment }, { idempotencyKey });
      }
      throw new Error('Unknown action');
    },
    onSuccess: () => {
      toast.success('Action completed successfully');
      qc.invalidateQueries({ queryKey: ['document', id] });
      setAction(null);
      setComment('');
    },
    onError: (e) => {
      toast.error(e?.message ?? 'Action failed');
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      uploadMutation.mutate(file);
    }
  };

  const handleDownload = async (versionId) => {
    try {
      await api.downloadVersion(id, versionId);
    } catch (e) {
      toast.error('Failed to download file');
    }
  };

  const statusVariant = {
    DRAFT: "warning",
    SUBMITTED: "info",
    APPROVED: "success",
    REJECTED: "destructive",
  }[doc?.status];

  const statusColors = {
    DRAFT: 'bg-amber-100 text-amber-800 border-amber-200',
    SUBMITTED: 'bg-blue-100 text-blue-800 border-blue-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200'
  };

  if (isLoading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 text-text-soft animate-spin mx-auto mb-4" />
          <p className="text-sm text-text-muted">Loading document…</p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-text-strong mb-2">Document not found</h2>
          <p className="text-sm text-text-muted mb-6">
            {error?.message || 'The document you\'re looking for doesn\'t exist or you don\'t have access to it.'}
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="mr-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold text-text-strong">{doc.title}</h1>
                <Badge className={`${statusColors[doc.status]} border`}>
                  {doc.status}
                </Badge>
              </div>
              <div className="ml-12 text-sm text-text-muted">
                <span className="font-medium">Entity:</span> {doc.entity_type} · 
                <span className="font-medium ml-2">Ref:</span> {doc.entity_ref || "—"}
              </div>
            </div>

            <div className="flex gap-2">
              {doc.status === "DRAFT" && (
                <Button 
                  onClick={() => setAction('submit')} 
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit
                </Button>
              )}
              {doc.canApprove && (
                <>
                  <Button 
                    onClick={() => setAction('approve')} 
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    onClick={() => setAction('reject')} 
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Metadata Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-text-muted mb-1">Document Type</div>
              <div className="font-medium text-text-strong">
                {doc.document_type?.name || "—"}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-text-muted mb-1">Created</div>
              <div className="font-medium text-text-strong">
                {formatDate(doc.created_at)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-text-muted mb-1">Current Version</div>
              <div className="font-medium text-text-strong">
                {doc.versions?.length
                  ? `v${doc.versions[doc.versions.length - 1].version_no}`
                  : "—"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-text-muted mb-1">Total Versions</div>
              <div className="font-medium text-text-strong">
                {doc.versions?.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Versions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Versions
                  </CardTitle>

                  {doc.status === "DRAFT" && (
                    <div className="relative">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={uploadMutation.isPending}
                      />
                      <label
                        htmlFor="file-upload"
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer
                          ${uploadMutation.isPending 
                            ? 'bg-surface-2 text-text-soft cursor-not-allowed' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                      >
                        <Upload className="h-4 w-4" />
                        <span>
                          {uploadMutation.isPending ? 'Uploading...' : 'Upload New Version'}
                        </span>
                      </label>
                    </div>
                  )}
                </div>
                <CardDescription>
                  Document versions and download links
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table
                  columns={[
                    { 
                      key: "version_no", 
                      header: "Version",
                      render: (value) => <span className="font-medium">v{value}</span>
                    },
                    { 
                      key: "filename", 
                      header: "File",
                      render: (value) => (
                        <span className="text-sm text-text-muted">{value}</span>
                      )
                    },
                    { 
                      key: "created_at", 
                      header: "Uploaded",
                      render: (value) => formatDate(value)
                    },
                    { 
                      key: "size_bytes", 
                      header: "Size",
                      render: (value) => {
                        if (!value) return '—';
                        const kb = value / 1024;
                        if (kb < 1024) return `${kb.toFixed(1)} KB`;
                        return `${(kb / 1024).toFixed(1)} MB`;
                      }
                    },
                    { 
                      key: "action", 
                      header: "",
                      render: (_, row) => (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleDownload(row.id)}
                          className="border-border-subtle"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      )
                    },
                  ]}
                  data={doc.versions || []}
                  emptyMessage="No versions uploaded yet"
                />
              </CardContent>
            </Card>

            {/* Approval History */}
            <Card>
              <CardHeader>
                <CardTitle>Approval History</CardTitle>
                <CardDescription>
                  Track the approval workflow for this document
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table
                  columns={[
                    { 
                      key: "level_name", 
                      header: "Level",
                      render: (value) => (
                        <span className="font-medium">{value}</span>
                      )
                    },
                    { 
                      key: "actor_name", 
                      header: "Actor",
                      render: (value) => (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-text-soft" />
                          <span>{value || "—"}</span>
                        </div>
                      )
                    },
                    { key: "action", header: "Action" },
                    { key: "comment", header: "Comment" },
                    { 
                      key: "created_at", 
                      header: "Date",
                      render: (value) => formatDate(value)
                    },
                  ]}
                  data={doc.approvals || []}
                  emptyMessage="No approval history yet"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Document Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="h-3 w-3 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-strong">Created</p>
                      <p className="text-xs text-text-muted">{formatDate(doc.created_at)}</p>
                    </div>
                  </div>

                  {doc.submitted_at && (
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Send className="h-3 w-3 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-strong">Submitted</p>
                        <p className="text-xs text-text-muted">{formatDate(doc.submitted_at)}</p>
                      </div>
                    </div>
                  )}

                  {doc.approved_at && (
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-strong">Approved</p>
                        <p className="text-xs text-text-muted">{formatDate(doc.approved_at)}</p>
                      </div>
                    </div>
                  )}

                  {doc.rejected_at && (
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <XCircle className="h-3 w-3 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-strong">Rejected</p>
                        <p className="text-xs text-text-muted">{formatDate(doc.rejected_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Document Info */}
            <Card>
              <CardHeader>
                <CardTitle>Document Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Status</span>
                  <Badge className={`${statusColors[doc.status]} border`}>
                    {doc.status}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Entity Type</span>
                  <span className="font-medium text-text-strong">{doc.entity_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Entity Ref</span>
                  <span className="font-medium text-text-strong">{doc.entity_ref || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Document Type</span>
                  <span className="font-medium text-text-strong">
                    {doc.document_type?.name || '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Created By</span>
                  <span className="font-medium text-text-strong">
                    {doc.created_by_name || '—'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Comment Box */}
            {(doc.status !== "APPROVED" && doc.status !== "REJECTED") && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Comment</CardTitle>
                  <CardDescription>
                    Add a comment for the next action
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment (optional)"
                    rows={4}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Action Modals */}
      <Modal
        open={!!action}
        onClose={() => {
          setAction(null);
          setComment('');
        }}
        title={
          action === 'submit' ? 'Submit for Approval' :
          action === 'approve' ? 'Approve Document' :
          action === 'reject' ? 'Reject Document' : ''
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-body mb-2">
              Comment {action === 'reject' ? '(required for rejection)' : '(optional)'}
            </label>
            <Textarea 
              rows={4} 
              value={comment} 
              onChange={(e) => setComment(e.target.value)}
              placeholder={action === 'reject' 
                ? 'Please provide a reason for rejection...' 
                : 'Add a comment...'
              }
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This action will be processed with a unique idempotency key to prevent duplicates.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => {
              setAction(null);
              setComment('');
            }}
            className="border-border-subtle"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => actionMutation.mutate()}
            disabled={actionMutation.isPending || (action === 'reject' && !comment.trim())}
            className={
              action === 'reject' ? 'bg-red-600 hover:bg-red-700' :
              action === 'approve' ? 'bg-green-600 hover:bg-green-700' :
              'bg-blue-600 hover:bg-blue-700'
            }
          >
            {actionMutation.isPending ? 'Processing...' : 'Confirm'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}