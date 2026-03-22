import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, FilePlus2, Plus, Trash2, FileText } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeWorkflowDocumentsApi } from '../approvals/api/workflowDocuments.api.js';
import { makeDocumentTypesApi } from '../approvals/api/documentTypes.api.js'
import { ROUTES } from '../../../app/constants/routes.js';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function DocumentCreatePage() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeWorkflowDocumentsApi(http), [http]);
  const documentTypesApi = useMemo(() => makeDocumentTypesApi(http), [http]);
  const toast = useToast();

  const [payload, setPayload] = useState({
    title: '',
    document_type_id: '',
    entity_type: '',
    entity_id: '',
    entity_ref: ''
  });

  // Load document types
  const { data: typesData, isLoading: typesLoading } = useQuery({
    queryKey: ['documentTypes'],
    queryFn: () => documentTypesApi.list()
  });

  // Load entity types
  const { data: entityTypesData } = useQuery({
    queryKey: ['entityTypes'],
    queryFn: () => documentTypesApi.listEntityTypes()
  });

  const documentTypes = Array.isArray(typesData) ? typesData : typesData?.data ?? [];
  const entityTypes = Array.isArray(entityTypesData) ? entityTypesData : entityTypesData?.supported ?? [];

  const createMutation = useMutation({
    mutationFn: () => {
      const idempotencyKey = generateUUID();
      return api.createDocument(payload, { idempotencyKey });
    },
    onSuccess: (res) => {
      toast.success('Document created successfully');
      const id = res?.id ?? res?.data?.id;
      if (id) navigate(ROUTES.documentDetail(id));
    },
    onError: (e) => {
      toast.error(e?.message ?? 'Failed to create document');
    }
  });

  const updateField = (field, value) => {
    setPayload(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!payload.title?.trim()) {
      toast.error('Please enter a document title');
      return;
    }
    
    if (!payload.document_type_id) {
      toast.error('Please select a document type');
      return;
    }
    
    if (!payload.entity_type) {
      toast.error('Please select an entity type');
      return;
    }
    
    if (!payload.entity_id?.trim()) {
      toast.error('Please enter an entity ID');
      return;
    }
    
    createMutation.mutate();
  };

  return (
    <div className="min-h-screen ">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FilePlus2 className="h-7 w-7 text-text-body" />
                <h1 className="text-2xl font-bold text-text-strong">Create New Document</h1>
              </div>
              <p className="text-sm text-text-muted">
                Fill in the details below to create a new document
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                onClick={() => navigate(-1)}
                className="border-border-subtle"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Document'}
              </Button>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Document Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-text-body mb-2">
                Document Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={payload.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Enter document title"
              />
            </div>

            {/* Document Type */}
            <div>
              <label className="block text-sm font-medium text-text-body mb-2">
                Document Type <span className="text-red-500">*</span>
              </label>
              {typesLoading ? (
                <div className="text-sm text-text-muted">Loading document types...</div>
              ) : (
                <select
                  value={payload.document_type_id}
                  onChange={(e) => updateField('document_type_id', e.target.value)}
                  className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                >
                  <option value="">Select document type</option>
                  {documentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Entity Type */}
            <div>
              <label className="block text-sm font-medium text-text-body mb-2">
                Entity Type <span className="text-red-500">*</span>
              </label>
              <select
                value={payload.entity_type}
                onChange={(e) => updateField('entity_type', e.target.value)}
                className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
              >
                <option value="">Select entity type</option>
                {entityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity ID */}
            <div>
              <label className="block text-sm font-medium text-text-body mb-2">
                Entity ID <span className="text-red-500">*</span>
              </label>
              <Input
                value={payload.entity_id}
                onChange={(e) => updateField('entity_id', e.target.value)}
                placeholder="e.g., invoice-123, contract-456"
              />
              <p className="text-xs text-text-muted mt-1">
                The ID of the entity this document is linked to
              </p>
            </div>

            {/* Entity Reference (Optional) */}
            <div>
              <label className="block text-sm font-medium text-text-body mb-2">
                Entity Reference
              </label>
              <Input
                value={payload.entity_ref}
                onChange={(e) => updateField('entity_ref', e.target.value)}
                placeholder="Optional reference (e.g., invoice number)"
              />
              <p className="text-xs text-text-muted mt-1">
                Optional human-readable reference for the entity
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-1">Next Steps</h3>
                <p className="text-sm text-blue-700">
                  After creating the document, you'll be able to upload versions and submit it for approval.
                  Make sure you have the correct entity type and ID to link this document to.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}