import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeUtilitiesApi } from '../api/utilities.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';

export default function SystemHealth() {
  const { http } = useApi();
  const api = useMemo(() => makeUtilitiesApi(http), [http]);

  const healthQ = useQuery({ queryKey: ['healthz'], queryFn: api.healthz, staleTime: 10_000 });
  const readyQ = useQuery({ queryKey: ['readyz'], queryFn: api.readyz, staleTime: 10_000 });
  const systemQ = useQuery({ queryKey: ['systemHealth'], queryFn: api.systemHealth, staleTime: 10_000 });

  return (
    <div className="space-y-4">
      <PageHeader
        title="System Health"
        subtitle="/healthz, /readyz, /health/system"
        actions={<Button variant="secondary" onClick={() => { healthQ.refetch();readyQ.refetch();systemQ.refetch();}}>Refresh</Button>}
      />

      <ContentCard title="Liveness">
        {healthQ.isLoading ? 'Loading...' : healthQ.isError ? (healthQ.error?.message ?? 'Failed') : <pre className="max-h-64 overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(healthQ.data, null, 2)}</pre>}
      </ContentCard>

      <ContentCard title="Readiness">
        {readyQ.isLoading ? 'Loading...' : readyQ.isError ? (readyQ.error?.message ?? 'Failed') : <pre className="max-h-64 overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(readyQ.data, null, 2)}</pre>}
      </ContentCard>

      <ContentCard title="Authenticated Health">
        {systemQ.isLoading ? 'Loading...' : systemQ.isError ? (systemQ.error?.message ?? 'Failed') : <pre className="max-h-[32rem] overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(systemQ.data, null, 2)}</pre>}
      </ContentCard>
    </div>
  );
}
