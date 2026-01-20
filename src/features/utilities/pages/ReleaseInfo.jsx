import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeUtilitiesApi } from '../api/utilities.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';

export default function ReleaseInfo() {
  const { http } = useApi();
  const api = useMemo(() => makeUtilitiesApi(http), [http]);

  const q = useQuery({ queryKey: ['releaseInfo'], queryFn: api.releaseInfo, staleTime: 60_000 });

  return (
    <div className="space-y-4">
      <PageHeader title="Release Info" subtitle="/utilities/release/info" />
      <ContentCard title="Data">
        {q.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : q.isError ? (
          <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load release info.'}</div>
        ) : (
          <pre className="max-h-[32rem] overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(q.data, null, 2)}</pre>
        )}
      </ContentCard>
    </div>
  );
}
