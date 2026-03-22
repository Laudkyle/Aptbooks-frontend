import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeUtilitiesApi } from '../api/utilities.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export default function TestConsole() {
  const { http } = useApi();
  const api = useMemo(() => makeUtilitiesApi(http), [http]);
  const toast = useToast();

  const listQ = useQuery({ queryKey: ['testsList'], queryFn: api.testsList, staleTime: 60_000 });
  const files = listQ.data?.data?.files ?? listQ.data?.files ?? [];

  const [testFile, setTestFile] = useState('');
  const [pattern, setPattern] = useState('');
  const run = useMutation({
    mutationFn: () => api.testsRun({ testFile: testFile || undefined, pattern: pattern || undefined }),
    onSuccess: (r) => toast.success(r?.data?.ok ? 'Tests passed.' : 'Tests completed (some failures possible).'),
    onError: (e) => toast.error(e.message ?? 'Failed to run tests')
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Test Console" subtitle="/utilities/tests/list and /utilities/tests/run" />

      <ContentCard title="Available tests">
        {listQ.isLoading ? (
          <div className="text-sm text-text-body">Loading...</div>
        ) : listQ.isError ? (
          <div className="text-sm text-red-700">{listQ.error?.message ?? 'Failed to load test list.'}</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {files.map((f) => (
              <Button
                key={f}
                variant={testFile === f ? 'primary' : 'outline'}
                responsiveText={false}
                onClick={() => setTestFile(f)}
              >
                {f}
              </Button>
            ))}
            {files.length === 0 ? <div className="text-sm text-text-muted">No files.</div> : null}
          </div>
        )}
      </ContentCard>

      <ContentCard title="Run" actions={<Button onClick={() => run.mutate()} disabled={run.isLoading}>Run</Button>}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input label="testFile (optional)" value={testFile} onChange={(e) => setTestFile(e.target.value)} placeholder="" />
          <Input label="pattern (optional)" value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="" />
        </div>
        <div className="mt-2 text-xs text-text-muted">Idempotency-Key header is enforced by backend;client sends one automatically.</div>
      </ContentCard>

      <ContentCard title="Output">
        {run.isIdle ? (
          <div className="text-sm text-text-body">Run a test to see output.</div>
        ) : run.isLoading ? (
          <div className="text-sm text-text-body">Running...</div>
        ) : run.isError ? (
          <div className="text-sm text-red-700">{run.error?.message ?? 'Run failed.'}</div>
        ) : (
          <pre className="max-h-[32rem] overflow-auto rounded bg-surface-2 p-3 text-xs">{JSON.stringify(run.data, null, 2)}</pre>
        )}
      </ContentCard>
    </div>
  );
}
