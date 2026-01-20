import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeRolesApi } from '../../roles/api/roles.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';

export default function PermissionMatrix() {
  const { http } = useApi();
  const rolesApi = useMemo(() => makeRolesApi(http), [http]);
  const [filter, setFilter] = useState('');

  const q = useQuery({ queryKey: ['roleMatrix'], queryFn: rolesApi.matrix, staleTime: 30_000 });
  const rows = q.data?.data ?? [];

  const filtered = rows.filter((r) => {
    if (!filter.trim()) return true;
    const f = filter.trim().toLowerCase();
    return r.name.toLowerCase().includes(f) || (r.permissions ?? []).some((p) => p.toLowerCase().includes(f));
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Role-Permission Matrix" subtitle="Read-only matrix from /core/roles/matrix" />
      <ContentCard title="Filter">
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by role name or permission code" />
      </ContentCard>
      <ContentCard title="Matrix">
        {q.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : q.isError ? (
          <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load matrix.'}</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">{r.name}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(r.permissions ?? []).map((p) => (
                    <span key={p} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">{p}</span>
                  ))}
                  {(r.permissions ?? []).length === 0 ? <span className="text-xs text-slate-500">No permissions</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </ContentCard>

      <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">Raw response</summary>
        <pre className="mt-2 max-h-96 overflow-auto text-xs">{JSON.stringify(q.data, null, 2)}</pre>
      </details>
    </div>
  );
}
