import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makePrintingApi } from '../api/printing.api.js';
import { qk } from '../../../shared/query/keys.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

// Ensure these match the API's expected enum exactly
const DOCUMENT_TYPES = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'bill', label: 'Bill' },
  { value: 'receipt', label: 'Customer Receipt' },
  { value: 'payment_out', label: 'Vendor Payment' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'debit_note', label: 'Debit Note' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'sales_order', label: 'Sales Order' },
  { value: 'purchase_requisition', label: 'Purchase Requisition' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'goods_receipt', label: 'Goods Receipt' },
  { value: 'expense', label: 'Expense' },
  { value: 'petty_cash', label: 'Petty Cash' },
  { value: 'advance', label: 'Advance' },
  { value: 'return', label: 'Return' },
  { value: 'refund', label: 'Refund' },
];

function rowsOf(data) {
  return Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
}

export default function AssignmentsPage() {
  const { http } = useApi();
  const api = useMemo(() => makePrintingApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState({}); // Track saving state per document type
  const [originalAssignments, setOriginalAssignments] = useState({});

  const templatesQ = useQuery({ 
    queryKey: qk.printingTemplates({ active: true }), 
    queryFn: () => api.listTemplates({ active: true }), 
    staleTime: 30_000 
  });
  
  const assignmentsQ = useQuery({ 
    queryKey: qk.printingTemplateAssignments, 
    queryFn: () => api.listAssignments(), 
    staleTime: 30_000 
  });

  const templates = rowsOf(templatesQ.data);
  const assignments = rowsOf(assignmentsQ.data);

  // Load existing assignments
  useEffect(() => {
    const next = {};
    assignments.forEach((row) => {
      // Handle both camelCase and snake_case responses
      const key = row.document_type ?? row.documentType ?? row.entityType;
      const templateId = row.template_id ?? row.templateId;
      if (key) next[key] = templateId != null ? String(templateId) : '';
    });
    setSelected(next);
    setOriginalAssignments(next);
  }, [assignments]);

  const templateOptions = [
    { value: '', label: 'None (use system default)' },
    ...templates.map((x) => ({ value: String(x.id), label: x.name ?? x.code ?? x.id }))
  ];

  // Individual save mutation per document type
  const saveAssignment = useMutation({
    mutationFn: ({ documentType, templateId }) => {
      // The API likely expects entityType, not document_type
      return api.upsertAssignment({
        entityType: documentType,
        templateId: templateId || null,
        // Also include camelCase version if API accepts both
        ...(api.upsertAssignment.name === 'upsertAssignment' ? {
          document_type: documentType,
          template_id: templateId || null
        } : {})
      });
    },
    onSuccess: (_, variables) => {
      toast.success(`${DOCUMENT_TYPES.find(d => d.value === variables.documentType)?.label} assignment saved`);
      qc.invalidateQueries({ queryKey: qk.printingTemplateAssignments });
      setSaving(prev => ({ ...prev, [variables.documentType]: false }));
    },
    onError: (err, variables) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to save assignment';
      
      // Handle validation errors more gracefully
      if (err?.response?.data?.details?.fields) {
        const fieldErrors = err.response.data.details.fields;
        const errorMessages = Object.entries(fieldErrors)
          .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
          .join('; ');
        toast.error(`Validation error: ${errorMessages}`);
      } else {
        toast.error(message);
      }
      
      setSaving(prev => ({ ...prev, [variables.documentType]: false }));
    },
  });

  const handleSave = (documentType, templateId) => {
    setSaving(prev => ({ ...prev, [documentType]: true }));
    saveAssignment.mutate({ documentType, templateId });
  };

  // Group document types by category for better organization
  const groupedDocumentTypes = useMemo(() => {
    const groups = {
      'Sales & Customer': ['invoice', 'credit_note', 'quotation', 'sales_order', 'receipt'],
      'Purchasing & Vendor': ['bill', 'debit_note', 'purchase_requisition', 'purchase_order', 'goods_receipt', 'payment_out'],
      'Financial & Expenses': ['expense', 'petty_cash', 'advance', 'refund', 'return']
    };
    
    return groups;
  }, []);

  const getDocumentGroup = (value) => {
    for (const [group, types] of Object.entries(groupedDocumentTypes)) {
      if (types.includes(value)) return group;
    }
    return 'Other';
  };

  // Group documents by category
  const documentsByGroup = useMemo(() => {
    const grouped = {};
    DOCUMENT_TYPES.forEach(doc => {
      const group = getDocumentGroup(doc.value);
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(doc);
    });
    return grouped;
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Print Assignments" 
        subtitle="Choose the default template for each document type. Templates are applied when printing or previewing documents." 
      />
      
      <ContentCard>
        <div className="mb-6">
          <div className="text-base font-semibold text-slate-900">Document Template Assignments</div>
          <div className="mt-1 text-sm text-slate-500">
            Configure which template is used by default for each document type
          </div>
        </div>

        {assignmentsQ.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading assignments...</div>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(documentsByGroup).map(([groupName, documents]) => (
              <div key={groupName}>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-900">{groupName}</h3>
                  <div className="mt-1 h-px bg-slate-200" />
                </div>
                <div className="grid gap-4">
                  {documents.map((doc) => {
                    const currentTemplateId = selected[doc.value] ?? '';
                    const isSaving = saving[doc.value];
                    
                    return (
                      <div 
                        key={doc.value} 
                        className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors md:grid-cols-[1fr_320px_auto] md:items-center"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-900">{doc.label}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {getDocumentDescription(doc.value)}
                          </div>
                        </div>
                        
                        <Select
                          label="Template"
                          value={currentTemplateId}
                          options={templateOptions}
                          onChange={(e) => setSelected(prev => ({ ...prev, [doc.value]: e.target.value }))}
                          disabled={isSaving}
                        />
                        
                        <Button
                          variant="outline"
                          onClick={() => handleSave(doc.value, currentTemplateId)}
                          disabled={isSaving || (currentTemplateId === (originalAssignments[doc.value] ?? ''))}
                          loading={isSaving}
                        >
                          {currentTemplateId ? 'Update' : 'Clear Assignment'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ContentCard>

      {/* Summary Card */}
      <ContentCard>
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            <span className="font-medium">{Object.values(selected).filter(id => id && id !== '').length}</span> of{' '}
            <span className="font-medium">{DOCUMENT_TYPES.length}</span> document types have custom templates assigned
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Reset all selections to empty
              const reset = {};
              DOCUMENT_TYPES.forEach(doc => { reset[doc.value] = ''; });
              setSelected(reset);
            }}
          >
            Clear All
          </Button>
        </div>
      </ContentCard>
    </div>
  );
}

// Helper function to provide descriptions for document types
function getDocumentDescription(documentType) {
  const descriptions = {
    'invoice': 'Sales invoices sent to customers',
    'bill': 'Bills received from vendors',
    'receipt': 'Customer payment receipts',
    'payment_out': 'Vendor payment confirmations',
    'credit_note': 'Credit notes issued to customers',
    'debit_note': 'Debit notes received from vendors',
    'quotation': 'Sales quotations and estimates',
    'sales_order': 'Customer sales orders',
    'purchase_requisition': 'Internal purchase requests',
    'purchase_order': 'Purchase orders sent to vendors',
    'goods_receipt': 'Receipt of goods from vendors',
    'expense': 'Employee expense claims',
    'petty_cash': 'Petty cash transactions',
    'advance': 'Advance payments',
    'return': 'Sales returns and credit memos',
    'refund': 'Customer refunds'
  };
  return descriptions[documentType] || 'Document template assignment';
}