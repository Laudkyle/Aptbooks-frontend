import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makePlanningApi } from '../api/planning.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { toOptions, NONE_OPTION } from '../../../shared/utils/options.js';

function rowsFrom(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

export default function ManagementReports() {
  const { http } = useApi();
  const api = useMemo(() => makePlanningApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  const [periodId, setPeriodId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [profitCenterId, setProfitCenterId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [mode, setMode] = useState('departmental-pnl');

  const periodsQ = useQuery({ queryKey: ['periods', 'all'], queryFn: () => periodsApi.list({ limit: 500, offset: 0 }), staleTime: 60_000 });
  const centersQ = useQuery({ queryKey: ['reporting', 'centers', 'all-grouped'], queryFn: () => api.centers.getAllGrouped({ status: 'active', includeArchived: false }), staleTime: 60_000 });
  const projectsQ = useQuery({ queryKey: ['reporting', 'projects', 'all'], queryFn: () => api.projects.list({ status: 'active', includeArchived: false, limit: 500, offset: 0 }), staleTime: 60_000 });

  const periods = rowsFrom(periodsQ.data);
  const groupedCenters = centersQ.data ?? {};
  const costCenters = rowsFrom(groupedCenters.cost ?? groupedCenters.costCenters ?? []);
  const profitCenters = rowsFrom(groupedCenters.profit ?? groupedCenters.profitCenters ?? []);
  const projects = rowsFrom(projectsQ.data);

  const periodOptions = useMemo(() => [NONE_OPTION, ...toOptions(periods, { valueKey: 'id', label: (p) => `${p.code ?? ''} ${p.name ?? ''}`.trim() || p.id })], [periods]);
  const costCenterOptions = useMemo(() => [NONE_OPTION, ...toOptions(costCenters, { valueKey: 'id', label: (c) => `${c.code ?? ''} ${c.name ?? ''}`.trim() || c.id })], [costCenters]);
  const profitCenterOptions = useMemo(() => [NONE_OPTION, ...toOptions(profitCenters, { valueKey: 'id', label: (c) => `${c.code ?? ''} ${c.name ?? ''}`.trim() || c.id })], [profitCenters]);
  const projectOptions = useMemo(() => [NONE_OPTION, ...toOptions(projects, { valueKey: 'id', label: (p) => `${p.code ?? ''} ${p.name ?? ''}`.trim() || p.id })], [projects]);

  const queryKey = ['reporting', 'management', mode, { periodId, costCenterId, profitCenterId, projectId }];
  const { data, isFetching, refetch } = useQuery({
    queryKey,
    enabled: false,
    queryFn: () =>
      mode === 'departmental-pnl'
        ? api.management.departmentalPnl({ periodId, costCenterId: costCenterId || null, profitCenterId: profitCenterId || null, projectId: projectId || null })
        : api.management.costCenterSummary({ periodId })
  });

  const rows = rowsFrom(data);
  const columns = useMemo(() => {
    const keys = rows[0] ? Object.keys(rows[0]) : [];
    return keys.slice(0, 8).map((k) => ({ header: k, render: (r) => <span className="text-sm text-slate-800">{String(r[k] ?? '')}</span> }));
  }, [rows]);

  return (
    <div className="space-y-4">
      <PageHeader title="Management Reports" subtitle="Dimension-aware summaries for departmental performance." icon={BarChart3} />

      <ContentCard>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-2">
            <button className={`rounded-xl px-3 py-2 text-sm ${mode === 'departmental-pnl' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'}`} onClick={() => setMode('departmental-pnl')}>Departmental P&L</button>
            <button className={`rounded-xl px-3 py-2 text-sm ${mode === 'cost-center-summary' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'}`} onClick={() => setMode('cost-center-summary')}>Cost Center Summary</button>
          </div>
          <div className="flex items-center gap-2"><Button onClick={() => refetch()} disabled={!periodId} loading={isFetching}>Run</Button></div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Select label="Period" value={periodId} onChange={(e) => setPeriodId(e.target.value)} options={periodOptions} />
          <Select label="Cost center" value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)} options={costCenterOptions} />
          <Select label="Profit center" value={profitCenterId} onChange={(e) => setProfitCenterId(e.target.value)} options={profitCenterOptions} />
          <Select label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)} options={projectOptions} />
        </div>

        <div className="mt-4"><DataTable columns={columns} rows={rows} loading={isFetching} empty={{ title: 'No data', description: 'Run the report to see results.' }} /></div>
        <div className="mt-4"><JsonPanel title="Raw response" value={data ?? {}} /></div>
      </ContentCard>
    </div>
  );
}
