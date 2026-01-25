import React, { useMemo, useState } from 'react'; 
import { useQuery } from '@tanstack/react-query'; 
import { Search as SearchIcon } from 'lucide-react'; 
import { useApi } from '../../../shared/hooks/useApi.js'; 
import { makeSearchApi } from '../api/search.api.js'; 
import { Input } from '../../../shared/components/ui/Input.jsx'; 
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx'; 
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx'; 
import { Badge } from '../../../shared/components/ui/Badge.jsx'; 
import { Skeleton } from '../../../shared/components/ui/Skeleton.jsx'; 

function Group({ title, items }) {
  if (!items?.length) return null; 
  return (
    <ContentCard title={title}>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3">
            <div>
              <div className="text-sm font-medium text-slate-900">{it.label}</div>
              <pre className="mt-1 max-h-24 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-700">
                {JSON.stringify(it.meta ?? {}, null, 2)}
              </pre>
            </div>
            <Badge variant="info">{it.type}</Badge>
          </div>
        ))}
      </div>
    </ContentCard>
  ); 
}

export default function GlobalSearch() {
  const { http } = useApi(); 
  const api = useMemo(() => makeSearchApi(http), [http]); 
  const [q, setQ] = useState(''); 
  const [limit, setLimit] = useState(10); 

  const enabled = q.trim().length >= 2; 

  const query = useQuery({
    queryKey: ['search', q, limit],
    queryFn: () => api.search({ q: q.trim(), limit }),
    enabled,
    staleTime: 10_000
  }); 

  const results = query.data?.results ?? {}; 

  return (
    <div className="space-y-4">
      <PageHeader
        title="Global Search"
        subtitle="Search across partners, accounts, journals, and documents."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type at least 2 characters..."
                className="pl-9 w-80"
              />
            </div>
            <Input
              type="number"
              min={1}
              max={25}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 10)}
              className="w-24"
              label="Limit"
            />
          </div>
        }
      />

      {!enabled ? (
        <ContentCard>
          <div className="text-sm text-slate-700">Enter at least 2 characters to search.</div>
        </ContentCard>
      ) : query.isLoading ? (
        <ContentCard title="Searching">
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </ContentCard>
      ) : query.isError ? (
        <ContentCard title="Error">
          <div className="text-sm text-red-700">{query.error?.message ?? 'Failed to search.'}</div>
        </ContentCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Group title="Partners" items={results.partners} />
          <Group title="Accounts" items={results.accounts} />
          <Group title="Journals" items={results.journals} />
          <Group title="Documents" items={results.documents} />
        </div>
      )}
    </div>
  ); 
}
