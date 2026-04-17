import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Upload, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeWorkflowDocumentsApi } from '../approvals/api/workflowDocuments.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../shared/components/ui/Card.jsx";
import { Button } from "../../../shared/components/ui/Button.jsx";
import { Table } from "../../../shared/components/ui/Table.jsx";
import { Badge } from "../../../shared/components/ui/Badge.jsx";
import { Input } from "../../../shared/components/ui/Input.jsx";
import { ROUTES } from '../../../app/constants/routes.js';


export default function DocumentsLibraryPage() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeWorkflowDocumentsApi(http), [http]);
  
  const [filters, setFilters] = useState({
    entity_type: '',
    entity_id: '',
    status: ''
  });

  // Load documents
  const { data, isLoading, error } = useQuery({
    queryKey: ['documents', filters],
    queryFn: () => api.listDocuments(filters)
  });

  const documents = Array.isArray(data) ? data : data?.data ?? [];

  const statusColors = {
    DRAFT: 'bg-amber-100 text-amber-800 border-amber-200',
    SUBMITTED: 'bg-blue-100 text-blue-800 border-blue-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200'
  };

  const statusIcons = {
    DRAFT: Clock,
    SUBMITTED: AlertCircle,
    APPROVED: CheckCircle,
    REJECTED: AlertCircle
  };

  const handleRowClick = (doc) => {
    navigate(ROUTES.documentDetail(doc.id));
  };

  const handleNewDocument = () => {
    navigate(ROUTES.documentCreate);
  };

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Type: {row.document_type?.name || '—'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'entity_ref',
      header: 'Entity',
      render: (value, row) => (
        <div>
          <div className="text-sm text-gray-900">{row.entity_type}</div>
          <div className="text-xs text-gray-500 mt-0.5">{value || '—'}</div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => {
        const Icon = statusIcons[value] || Clock;
        return (
          <Badge variant="outline" className={`${statusColors[value] || 'bg-gray-100 text-gray-800'} gap-1.5`}>
            <Icon className="h-3 w-3" />
            {value}
          </Badge>
        );
      }
    },
    {
      key: 'current_version_no',
      header: 'Version',
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value ? `v${value}` : '—'}
        </span>
      )
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (value) => (
        <span className="text-sm text-gray-600">
          {new Date(value).toLocaleDateString()}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Documents" 
        subtitle="Library, versions, and approval workflow"
        actions={
          <Button onClick={handleNewDocument} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Document
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Entity Type
              </label>
              <Input
                placeholder="e.g., invoice, contract"
                value={filters.entity_type}
                onChange={(e) => setFilters(prev => ({ ...prev, entity_type: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Entity ID
              </label>
              <Input
                placeholder="Entity reference"
                value={filters.entity_id}
                onChange={(e) => setFilters(prev => ({ ...prev, entity_id: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ entity_type: '', entity_id: '', status: '' })}
                className="border-gray-300"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading...' : `${documents.length} document${documents.length !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600">Failed to load documents</p>
              <p className="text-xs text-red-500 mt-1">{error.message}</p>
            </div>
          ) : (
            <Table
              columns={columns}
              data={documents}
              isLoading={isLoading}
              onRowClick={handleRowClick}
              emptyMessage="No documents found"
            />
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Work queue</CardTitle>
            <CardDescription>Create and manage documents, versions and approvals.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleNewDocument}>
                <Plus className="h-4 w-4 mr-2" />
                New document
              </Button>
              <Button size="sm" variant="secondary">
                <Upload className="h-4 w-4 mr-2" />
                Upload version
              </Button>
              <Button size="sm" variant="ghost">
                Open approvals inbox
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational tips</CardTitle>
            <CardDescription>Design choices aligned with your backend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Entity linking:</span> each document ties to an entity type/id.
            </div>
            <div>
              <span className="font-medium text-foreground">Versioning:</span> upload uses raw bytes + x-filename.
            </div>
            <div>
              <span className="font-medium text-foreground">Approvals:</span> approve/reject requires approvals.act.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}