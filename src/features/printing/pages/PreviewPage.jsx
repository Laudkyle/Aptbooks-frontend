import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { Printer, RefreshCw } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makePrintingApi } from '../api/printing.api.js';
import { qk } from '../../../shared/query/keys.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';

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

export default function PreviewPage() {
  const { documentType, documentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const templateId = searchParams.get('templateId') ?? '';
  const autoPrint = searchParams.get('autoprint') === '1';
  const iframeRef = useRef(null);
  const [didAutoPrint, setDidAutoPrint] = useState(false);

  const { http } = useApi();
  const api = useMemo(() => makePrintingApi(http), [http]);

  const templatesQ = useQuery({
    queryKey: qk.printingTemplates({ documentType, active: true }),
    queryFn: () => api.listTemplates({ documentType, active: true }),
    staleTime: 30_000,
  });

  const previewQ = useQuery({
    queryKey: qk.printingPreview(documentType, documentId, templateId || null),
    queryFn: () => api.renderDocument(documentType, documentId, templateId ? { templateId } : {}),
    enabled: Boolean(documentType && documentId),
  });

  const templates = rowsOf(templatesQ.data);
  const html = resolveHtml(previewQ.data);
  const resolvedTemplateName = previewQ.data?.template?.name ?? previewQ.data?.resolvedTemplate?.name;

  useEffect(() => {
    if (!autoPrint || didAutoPrint || !html) return;
    const t = setTimeout(() => {
      try {
        const win = iframeRef.current?.contentWindow;
        win?.focus();
        win?.print();
        setDidAutoPrint(true);
      } catch {}
    }, 700);
    return () => clearTimeout(t);
  }, [autoPrint, didAutoPrint, html]);

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Document Preview"
        subtitle={`${documentType ?? 'document'} · ${documentId ?? ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" leftIcon={RefreshCw} onClick={() => previewQ.refetch()}>Refresh</Button>
            <Button leftIcon={Printer} onClick={() => iframeRef.current?.contentWindow?.print()}>Print</Button>
          </div>
        }
      />

      <ContentCard>
        <div className="grid gap-4 md:grid-cols-[280px_1fr] md:items-end">
          <Select
            label="Template override"
            value={templateId}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value) next.set('templateId', e.target.value); else next.delete('templateId');
              setSearchParams(next);
              setDidAutoPrint(false);
            }}
            options={[{ value: '', label: resolvedTemplateName ? `Assigned template · ${resolvedTemplateName}` : 'Use assigned template' }, ...templates.map((x) => ({ value: String(x.id), label: x.name ?? x.code ?? x.id }))]}
          />
          <div className="text-sm text-slate-500">
            Use the assigned default or temporarily preview another approved design before printing.
          </div>
        </div>
      </ContentCard>

      <ContentCard className="p-0 overflow-hidden">
        {previewQ.isLoading ? (
          <div className="p-10 text-sm text-slate-500">Loading preview…</div>
        ) : html ? (
          <iframe
            ref={iframeRef}
            title="Document preview"
            className="min-h-[calc(100vh-16rem)] w-full bg-white"
            srcDoc={html}
          />
        ) : (
          <div className="p-10 text-sm text-slate-500">No preview available for this document yet.</div>
        )}
      </ContentCard>
    </div>
  );
}
