import React, { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeImportsApi } from '../api/imports.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { ImportDropzone } from '../../../../shared/components/data/ImportDropzone.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';

export default function ImportsHub() {
  const { http } = useApi();
  const api = useMemo(() => makeImportsApi(http), [http]);
  const toast = useToast();

  const [coaText, setCoaText] = useState('');
  const [journalsText, setJournalsText] = useState('');
  const [dryRun, setDryRun] = useState('true');
  const [journalKeyField, setJournalKeyField] = useState('journalKey');
  const [result, setResult] = useState(null);

  const importCoa = useMutation({
    mutationFn: () => api.importCoa({ csvText: coaText, dryRun: dryRun === 'true' }),
    onSuccess: (data) => {
      setResult(data);
      toast.success('COA import processed.');
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Import failed')
  });

  const importJournals = useMutation({
    mutationFn: () => api.importJournals({ csvText: journalsText, dryRun: dryRun === 'true', journalKeyField }),
    onSuccess: (data) => {
      setResult(data);
      toast.success('Journals import processed.');
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Import failed')
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Imports" subtitle="Import COA CSV and journals CSV (supports dry-run)." />

      <ContentCard title="Settings">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select
            label="Dry run"
            value={dryRun}
            onChange={(e) => setDryRun(e.target.value)}
            options={[
              { value: 'true', label: 'Yes (validate only)' },
              { value: 'false', label: 'No (apply changes)' }
            ]}
          />
          <div className="md:col-span-2 text-xs text-slate-600">
            Import endpoints accept raw text CSV (text/plain) or JSON with csvText. This UI posts raw text.
          </div>
        </div>
      </ContentCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ContentCard title="Import COA CSV" actions={<Button onClick={() => importCoa.mutate()} disabled={!coaText || importCoa.isLoading}>Run</Button>}>
          <ImportDropzone onText={setCoaText} />
          <textarea className="mt-3 w-full rounded-md border border-slate-200 p-2 text-xs" rows={10} value={coaText} onChange={(e) => setCoaText(e.target.value)} placeholder="Paste CSV content here…" />
        </ContentCard>

        <ContentCard
          title="Import Journals CSV"
          actions={
            <Button onClick={() => importJournals.mutate()} disabled={!journalsText || importJournals.isLoading}>
              Run
            </Button>
          }
        >
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-slate-700">journalKeyField (optional)</label>
            <input className="w-full rounded-md border border-slate-200 p-2 text-sm" value={journalKeyField} onChange={(e) => setJournalKeyField(e.target.value)} />
          </div>
          <ImportDropzone onText={setJournalsText} />
          <textarea className="mt-3 w-full rounded-md border border-slate-200 p-2 text-xs" rows={10} value={journalsText} onChange={(e) => setJournalsText(e.target.value)} placeholder="Paste CSV content here…" />
        </ContentCard>
      </div>

      <ContentCard title="Result">
        {result ? (
          <pre className="max-h-96 overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-800">{JSON.stringify(result, null, 2)}</pre>
        ) : (
          <div className="text-sm text-slate-700">Run an import to see the response.</div>
        )}
      </ContentCard>
    </div>
  );
}
