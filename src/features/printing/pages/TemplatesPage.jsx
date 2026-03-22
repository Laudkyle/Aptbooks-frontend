import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CopyPlus, Layers3, Rocket, Save } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makePrintingApi } from '../api/printing.api.js';
import { qk } from '../../../shared/query/keys.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

const DESIGN_OPTIONS = [
  { value: 'classic', label: 'Classic' },
  { value: 'modern', label: 'Modern' },
  { value: 'compact', label: 'Compact' },
  { value: 'corporate', label: 'Corporate' },
];

const PAPER_OPTIONS = [
  { value: 'A4', label: 'A4' },
  { value: 'LETTER', label: 'Letter' },
];

function rowsOf(data) {
  return Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
}

export default function TemplatesPage() {
  const { http } = useApi();
  const api = useMemo(() => makePrintingApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    designKey: 'classic',
    paperSize: 'A4',
    isActive: 'true',
  });

  const templatesQ = useQuery({
    queryKey: qk.printingTemplates({}),
    queryFn: () => api.listTemplates(),
    staleTime: 30_000,
  });

  const templates = rowsOf(templatesQ.data);

  const createTemplate = useMutation({
    mutationFn: async () => api.createTemplate({
      name: form.name.trim(),
      code: form.code.trim() || null,
      design_key: form.designKey,
      designKey: form.designKey,
      paper_size: form.paperSize,
      paperSize: form.paperSize,
      is_active: form.isActive === 'true',
      isActive: form.isActive === 'true',
    }),
    onSuccess: () => {
      toast.success('Document template created');
      qc.invalidateQueries({ queryKey: qk.printingTemplates({}) });
      setOpen(false);
      setForm({ name: '', code: '', designKey: 'classic', paperSize: 'A4', isActive: 'true' });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to create template'),
  });

  const publish = useMutation({
    mutationFn: (id) => api.publishTemplate(id, {}),
    onSuccess: () => {
      toast.success('Template published');
      qc.invalidateQueries({ queryKey: qk.printingTemplates({}) });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to publish template'),
  });

  const columns = [
    {
      header: 'Template',
      render: (row) => (
        <div>
          <div className="font-medium text-text-strong">{row.name ?? row.code ?? 'Untitled template'}</div>
          <div className="text-xs text-text-muted">{row.code ?? row.template_code ?? 'No code'}</div>
        </div>
      ),
    },
    {
      header: 'Design',
      render: (row) => <span className="text-sm text-text-body">{row.design_key ?? row.designKey ?? 'classic'}</span>,
    },
    {
      header: 'Paper',
      render: (row) => <span className="text-sm text-text-body">{row.paper_size ?? row.paperSize ?? 'A4'}</span>,
    },
    {
      header: 'Version',
      render: (row) => <span className="text-sm text-text-body">{row.version_no ?? row.versionNo ?? 1}</span>,
    },
    {
      header: 'Status',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Badge tone={(row.is_active ?? row.isActive) ? 'success' : 'muted'}>
            {(row.is_active ?? row.isActive) ? 'active' : 'inactive'}
          </Badge>
          {(row.is_published ?? row.isPublished) ? <Badge tone="brand">published</Badge> : null}
        </div>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" leftIcon={Rocket} loading={publish.isPending} onClick={() => publish.mutate(row.id)}>
            Publish
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Document Templates"
        subtitle="Manage the preset print designs used across transaction documents."
        actions={<Button leftIcon={CopyPlus} onClick={() => setOpen(true)}>New template</Button>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        {DESIGN_OPTIONS.map((option) => (
          <ContentCard key={option.value}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-deep">
                <Layers3 className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium text-text-strong">{option.label}</div>
                <div className="text-xs text-text-muted">Preset production design</div>
              </div>
            </div>
          </ContentCard>
        ))}
      </div>

      <ContentCard>
        <DataTable
          columns={columns}
          rows={templates}
          isLoading={templatesQ.isLoading}
          empty={{ title: 'No templates yet', description: 'Create your first transaction print template.' }}
        />
      </ContentCard>

      <Modal open={open} onClose={() => setOpen(false)} title="New document template">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); createTemplate.mutate(); }}>
          <Input label="Template name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
          <Input label="Code" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} />
          <Select label="Base design" value={form.designKey} onChange={(e) => setForm((s) => ({ ...s, designKey: e.target.value }))} options={DESIGN_OPTIONS} />
          <Select label="Paper size" value={form.paperSize} onChange={(e) => setForm((s) => ({ ...s, paperSize: e.target.value }))} options={PAPER_OPTIONS} />
          <Select label="Active" value={form.isActive} onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.value }))} options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} />
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" leftIcon={Save} loading={createTemplate.isPending}>Save template</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
