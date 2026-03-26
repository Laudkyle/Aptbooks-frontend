import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CopyPlus,
  Eye,
  FileSearch,
  Layers3,
  LayoutTemplate,
  ListChecks,
  Rocket,
  Save,
} from 'lucide-react';

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
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import {
  TRANSACTION_DOCUMENT_TYPE_OPTIONS,
  TRANSACTION_TEMPLATE_SPECS,
  getTemplateSpec,
  groupTemplateSpecsByFamily,
} from '../templateSpecs.js';

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

function resolveHtml(data) {
  return data?.html
    ?? data?.renderedHtml
    ?? data?.preview_html
    ?? data?.previewHtml
    ?? data?.data?.html
    ?? '';
}

export default function TemplatesPage() {
  const { http } = useApi();
  const api = useMemo(() => makePrintingApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('registry');
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sampleDocumentType, setSampleDocumentType] = useState('invoice');
  const [sampleTemplateId, setSampleTemplateId] = useState('');
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

  const samplePreviewQ = useQuery({
    queryKey: ['printing', 'template-sample', sampleDocumentType, sampleTemplateId || null],
    queryFn: () => api.previewSample(sampleDocumentType, sampleTemplateId || undefined),
    enabled: Boolean(sampleDocumentType),
    staleTime: 30_000,
  });

  const templates = rowsOf(templatesQ.data);
  const sampleHtml = resolveHtml(samplePreviewQ.data);
  const groupedSpecs = useMemo(() => groupTemplateSpecsByFamily(), []);
  const sampleSpec = getTemplateSpec(sampleDocumentType);

  const createTemplate = useMutation({
    mutationFn: async () => api.createTemplate({
      name: form.name.trim(),
      code: form.code.trim() || null,
      design_key: form.designKey,
      baseTemplateKey: form.designKey,
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

  const openSamplePreview = (templateId = '') => {
    setSampleTemplateId(templateId ? String(templateId) : '');
    setActiveTab('samples');
    setPreviewOpen(true);
  };

  const columns = [
    {
      header: 'Template',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-900">{row.name ?? row.code ?? 'Untitled template'}</div>
          <div className="text-xs text-slate-500">{row.code ?? row.template_code ?? 'No code'}</div>
        </div>
      ),
    },
    {
      header: 'Design',
      render: (row) => <span className="text-sm text-slate-700">{row.design_key ?? row.designKey ?? 'classic'}</span>,
    },
    {
      header: 'Paper',
      render: (row) => <span className="text-sm text-slate-700">{row.paper_size ?? row.paperSize ?? 'A4'}</span>,
    },
    {
      header: 'Recommended transaction coverage',
      render: () => (
        <div className="text-sm text-slate-700">
          <div>{TRANSACTION_TEMPLATE_SPECS.length} supported transaction document types</div>
          <div className="text-xs text-slate-500">Header, party, dates, lines, totals, workflow, and document-specific sections</div>
        </div>
      ),
    },
    {
      header: 'Version',
      render: (row) => <span className="text-sm text-slate-700">{row.version_no ?? row.versionNo ?? 1}</span>,
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
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" leftIcon={Eye} onClick={() => openSamplePreview(row.id)}>
            Sample
          </Button>
          <Button size="sm" variant="outline" leftIcon={Rocket} loading={publish.isPending} onClick={() => publish.mutate(row.id)}>
            Publish
          </Button>
        </div>
      ),
    },
  ];

  const tabItems = [
    {
      value: 'registry',
      label: 'Template Registry',
      icon: LayoutTemplate,
      content: (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {DESIGN_OPTIONS.map((option) => (
              <ContentCard key={option.value}>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-deep">
                    <Layers3 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{option.label}</div>
                    <div className="text-xs text-slate-500">Preset production design</div>
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
        </div>
      ),
    },
    {
      value: 'coverage',
      label: 'Transaction Coverage',
      icon: ListChecks,
      content: (
        <div className="space-y-6">
          <ContentCard>
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard label="Supported document types" value={String(TRANSACTION_TEMPLATE_SPECS.length)} helper="Drawn directly from features/transactions" />
              <MetricCard label="Coverage families" value={String(Object.keys(groupedSpecs).length)} helper="Sales, purchasing, and finance flows" />
              <MetricCard label="Baseline expectation" value="Complete" helper="Each template should cover all sections shown below" />
            </div>
          </ContentCard>

          {Object.entries(groupedSpecs).map(([family, specs]) => (
            <ContentCard key={family} title={family}>
              <div className="grid gap-4 xl:grid-cols-2">
                {specs.map((spec) => (
                  <div key={spec.documentType} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-900">{spec.label}</div>
                        <div className="mt-1 text-sm text-slate-500">{spec.description}</div>
                      </div>
                      <Badge tone="brand">{spec.sections.length} sections</Badge>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Required print sections</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {spec.sections.map((section) => (
                          <span key={section} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                            {section}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Key fields to preserve</div>
                      <div className="mt-2 text-sm text-slate-600">{spec.keyFields.join(' • ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ContentCard>
          ))}
        </div>
      ),
    },
    {
      value: 'samples',
      label: 'Sample Preview',
      icon: FileSearch,
      content: (
        <div className="space-y-4">
          <ContentCard>
            <div className="grid gap-4 lg:grid-cols-[240px_240px_1fr] lg:items-end">
              <Select
                label="Document type"
                value={sampleDocumentType}
                onChange={(e) => setSampleDocumentType(e.target.value)}
                options={TRANSACTION_DOCUMENT_TYPE_OPTIONS}
              />
              <Select
                label="Template"
                value={sampleTemplateId}
                onChange={(e) => setSampleTemplateId(e.target.value)}
                options={[{ value: '', label: 'Use resolved default' }, ...templates.map((x) => ({ value: String(x.id), label: x.name ?? x.code ?? x.id }))]}
              />
              <div className="text-sm text-slate-500">
                Preview a sample render and compare it against the required sections pulled from the transaction module.
              </div>
            </div>
          </ContentCard>

          <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
            <ContentCard title={sampleSpec?.label ?? 'Document coverage'}>
              {sampleSpec ? (
                <div className="space-y-4 text-sm">
                  <p className="text-slate-600">{sampleSpec.description}</p>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected sections</div>
                    <ul className="mt-2 space-y-2 text-slate-700">
                      {sampleSpec.sections.map((section) => (
                        <li key={section} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">{section}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Critical fields</div>
                    <p className="mt-2 text-slate-600">{sampleSpec.keyFields.join(' • ')}</p>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">No coverage definition is available for this document type yet.</div>
              )}
            </ContentCard>

            <ContentCard className="overflow-hidden p-0">
              {samplePreviewQ.isLoading ? (
                <div className="p-10 text-sm text-slate-500">Loading sample preview…</div>
              ) : sampleHtml ? (
                <iframe title="Template sample preview" className="min-h-[720px] w-full bg-white" srcDoc={sampleHtml} />
              ) : (
                <div className="p-10 text-sm text-slate-500">No sample preview is available for the current selection.</div>
              )}
            </ContentCard>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Document Templates"
        subtitle="Redesigned around the actual transaction modules so template coverage can be checked against every document type before printing."
        actions={<Button leftIcon={CopyPlus} onClick={() => setOpen(true)}>New template</Button>}
      />

      <Tabs tabs={tabItems} value={activeTab} onValueChange={setActiveTab} />

      <Modal open={open} onClose={() => setOpen(false)} title="New document template">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); createTemplate.mutate(); }}>
          <Input label="Template name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
          <Input label="Code" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} />
          <Select label="Base design" value={form.designKey} onChange={(e) => setForm((s) => ({ ...s, designKey: e.target.value }))} options={DESIGN_OPTIONS} />
          <Select label="Paper size" value={form.paperSize} onChange={(e) => setForm((s) => ({ ...s, paperSize: e.target.value }))} options={PAPER_OPTIONS} />
          <Select label="Active" value={form.isActive} onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.value }))} options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} />
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 md:col-span-2">
            New templates should be validated against all required transaction sections in the <span className="font-semibold">Transaction Coverage</span> tab before being assigned for production use.
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" leftIcon={Save} loading={createTemplate.isPending}>Save template</Button>
          </div>
        </form>
      </Modal>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Sample preview" size="xl">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Document type"
              value={sampleDocumentType}
              onChange={(e) => setSampleDocumentType(e.target.value)}
              options={TRANSACTION_DOCUMENT_TYPE_OPTIONS}
            />
            <Select
              label="Template"
              value={sampleTemplateId}
              onChange={(e) => setSampleTemplateId(e.target.value)}
              options={[{ value: '', label: 'Use resolved default' }, ...templates.map((x) => ({ value: String(x.id), label: x.name ?? x.code ?? x.id }))]}
            />
          </div>

          {sampleSpec ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">Expected coverage for {sampleSpec.label}</div>
              <div className="mt-2">{sampleSpec.sections.join(' • ')}</div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {samplePreviewQ.isLoading ? (
              <div className="p-10 text-sm text-slate-500">Loading sample preview…</div>
            ) : sampleHtml ? (
              <iframe title="Template sample preview modal" className="min-h-[720px] w-full bg-white" srcDoc={sampleHtml} />
            ) : (
              <div className="p-10 text-sm text-slate-500">No sample preview is available for the selected combination.</div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function MetricCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{helper}</div>
    </div>
  );
}
