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

  const templatesQ = useQuery({ queryKey: qk.printingTemplates({ active: true }), queryFn: () => api.listTemplates({ active: true }), staleTime: 30_000 });
  const assignmentsQ = useQuery({ queryKey: qk.printingTemplateAssignments, queryFn: () => api.listAssignments(), staleTime: 30_000 });

  const templates = rowsOf(templatesQ.data);
  const assignments = rowsOf(assignmentsQ.data);

  useEffect(() => {
    const next = {};
    assignments.forEach((row) => {
      const key = row.document_type ?? row.documentType;
      const templateId = row.template_id ?? row.templateId;
      if (key) next[key] = templateId != null ? String(templateId) : '';
    });
    setSelected(next);
  }, [assignments]);

  const templateOptions = [{ value: '', label: 'Select template' }, ...templates.map((x) => ({ value: String(x.id), label: x.name ?? x.code ?? x.id }))];

  const save = useMutation({
    mutationFn: (body) => api.upsertAssignment(body),
    onSuccess: () => {
      toast.success('Assignment saved');
      qc.invalidateQueries({ queryKey: qk.printingTemplateAssignments });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to save assignment'),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Print Assignments" subtitle="Choose the default template each transaction document should use." />
      <ContentCard>
        <div className="grid gap-4">
          {DOCUMENT_TYPES.map((doc) => (
            <div key={doc.value} className="grid gap-3 rounded-2xl border border-border-subtle bg-white/70 p-4 md:grid-cols-[1fr_320px_auto] md:items-end">
              <div>
                <div className="text-sm font-medium text-slate-900">{doc.label}</div>
                <div className="text-xs text-slate-500">Applied automatically whenever users preview or print this document type.</div>
              </div>
              <Select
                label="Assigned template"
                value={selected[doc.value] ?? ''}
                options={templateOptions}
                onChange={(e) => setSelected((s) => ({ ...s, [doc.value]: e.target.value }))}
              />
              <Button
                variant="outline"
                onClick={() => save.mutate({
                  document_type: doc.value,
                  documentType: doc.value,
                  template_id: selected[doc.value] || null,
                  templateId: selected[doc.value] || null,
                })}
                loading={save.isPending}
              >
                Save
              </Button>
            </div>
          ))}
        </div>
      </ContentCard>
    </div>
  );
}
