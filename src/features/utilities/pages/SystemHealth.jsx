import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Database,
  RefreshCw,
  Shield,
  Timer,
  Wrench,
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeUtilitiesApi } from '../api/utilities.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';

function StatusBadge({ ok, trueLabel = 'Healthy', falseLabel = 'Issue detected' }) {
  return <Badge tone={ok ? 'success' : 'danger'}>{ok ? trueLabel : falseLabel}</Badge>;
}

function StatCard({ icon: Icon, label, value, tone = 'default', helper }) {
  const toneMap = {
    default: 'bg-surface-2 text-text-body',
    success: 'bg-emerald-50 text-emerald-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
    warning: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-2 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-text-strong">{value}</div>
          {helper ? <div className="mt-1 text-xs text-text-muted">{helper}</div> : null}
        </div>
        <div className={`rounded-2xl p-2 ${toneMap[tone] ?? toneMap.default}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function getModuleSummaryPayload(data) {
  return data?.moduleSummary ?? data?.summary ?? null;
}

export default function SystemHealth() {
  const { http } = useApi();
  const api = useMemo(() => makeUtilitiesApi(http), [http]);
  const [search, setSearch] = useState('');
  const [selectedModuleKey, setSelectedModuleKey] = useState('');

  const healthQ = useQuery({ queryKey: ['healthz'], queryFn: api.healthz, staleTime: 15_000, refetchInterval: 30_000 });
  const readyQ = useQuery({ queryKey: ['readyz'], queryFn: api.readyz, staleTime: 15_000, refetchInterval: 30_000 });
  const systemQ = useQuery({ queryKey: ['systemHealth'], queryFn: api.systemHealth, staleTime: 15_000, refetchInterval: 60_000 });
  const modulesQ = useQuery({ queryKey: ['health.modules'], queryFn: api.modulesHealth, staleTime: 15_000, refetchInterval: 60_000 });

  const moduleRows = useMemo(() => modulesQ.data?.modules ?? systemQ.data?.modules ?? [], [modulesQ.data, systemQ.data]);
  const moduleSummary = useMemo(() => getModuleSummaryPayload(modulesQ.data) ?? getModuleSummaryPayload(systemQ.data), [modulesQ.data, systemQ.data]);

  const filteredModules = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return moduleRows;
    return moduleRows.filter((m) => {
      const haystack = [m.module, ...(m.missingTables ?? [])].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [moduleRows, search]);

  const selectedKey = selectedModuleKey || filteredModules[0]?.module || moduleRows[0]?.module || '';

  const moduleDetailQ = useQuery({
    queryKey: ['health.module', selectedKey],
    queryFn: () => api.moduleHealth(selectedKey),
    enabled: !!selectedKey,
    staleTime: 15_000,
  });

  const refreshAll = () => {
    healthQ.refetch();
    readyQ.refetch();
    systemQ.refetch();
    modulesQ.refetch();
    if (selectedKey) moduleDetailQ.refetch();
  };

  const modulesColumns = useMemo(() => [
    {
      header: 'Module',
      render: (r) => (
        <div>
          <div className="font-medium text-text-strong">{r.module}</div>
          <div className="text-xs text-text-muted">{r.presentCount ?? 0} / {r.requiredCount ?? 0} tables available</div>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (r) => <StatusBadge ok={!!r.ok} trueLabel="Healthy" falseLabel="Missing tables" />,
    },
    {
      header: 'Missing',
      render: (r) => (
        <div className="max-w-md text-sm text-text-muted">
          {r.missingTables?.length ? r.missingTables.slice(0, 4).join(', ') + (r.missingTables.length > 4 ? ` +${r.missingTables.length - 4} more` : '') : 'None'}
        </div>
      ),
    },
  ], []);

  const schedulerTasks = systemQ.data?.scheduler?.tasks ?? [];
  const failingSchedulerTasks = schedulerTasks.filter((t) => t.is_enabled && (t.window_failed_count ?? 0) > 0 && (t.window_success_count ?? 0) === 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="System Health"
        subtitle="Monitor liveness, readiness, module integrity, and scheduler stability from one operational view."
        icon={Activity}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={refreshAll} loading={healthQ.isFetching || readyQ.isFetching || systemQ.isFetching || modulesQ.isFetching} leftIcon={RefreshCw}>
              Refresh
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Shield} label="Service status" value={systemQ.data?.ok ? 'Healthy' : 'Attention'} tone={systemQ.data?.ok ? 'success' : 'danger'} helper={systemQ.data?.service ?? 'Backend'} />
        <StatCard icon={Boxes} label="Healthy modules" value={moduleSummary ? `${moduleSummary.healthy}/${moduleSummary.total}` : '—'} tone={moduleSummary?.unhealthy ? 'warning' : 'success'} helper={moduleSummary?.unhealthy ? `${moduleSummary.unhealthy} unhealthy` : 'All modules available'} />
        <StatCard icon={Database} label="Database latency" value={readyQ.data?.db?.latency_ms != null ? `${readyQ.data.db.latency_ms} ms` : '—'} tone={readyQ.data?.ok ? 'info' : 'danger'} helper={readyQ.data?.ok ? 'Readiness check passed' : 'Readiness degraded'} />
        <StatCard icon={Timer} label="Scheduler issues" value={String(failingSchedulerTasks.length)} tone={failingSchedulerTasks.length ? 'warning' : 'success'} helper={schedulerTasks.length ? `${schedulerTasks.length} tracked tasks` : 'No scheduler summary'} />
      </div>

      <Tabs
        defaultValue="overview"
        tabs={[
          {
            key: 'overview',
            label: 'Overview',
            content: (
              <div className="grid gap-4 xl:grid-cols-3">
                <ContentCard title="Service checks" className="xl:col-span-1">
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-border-subtle bg-surface-2 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-text-strong">Liveness</div>
                          <div className="text-xs text-text-muted">Public endpoint /healthz</div>
                        </div>
                        <StatusBadge ok={!!healthQ.data?.ok} trueLabel="Up" falseLabel="Down" />
                      </div>
                      <div className="mt-3 text-sm text-text-muted">Uptime: {healthQ.data?.uptime_seconds != null ? `${healthQ.data.uptime_seconds}s` : '—'}</div>
                    </div>

                    <div className="rounded-2xl border border-border-subtle bg-surface-2 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-text-strong">Readiness</div>
                          <div className="text-xs text-text-muted">Public endpoint /readyz</div>
                        </div>
                        <StatusBadge ok={!!readyQ.data?.ok} trueLabel="Ready" falseLabel="Not ready" />
                      </div>
                      <div className="mt-3 text-sm text-text-muted">Database latency: {readyQ.data?.db?.latency_ms != null ? `${readyQ.data.db.latency_ms} ms` : '—'}</div>
                    </div>

                    <div className="rounded-2xl border border-border-subtle bg-surface-2 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-text-strong">Authenticated system report</div>
                          <div className="text-xs text-text-muted">/health/system</div>
                        </div>
                        <StatusBadge ok={!!systemQ.data?.ok} />
                      </div>
                      <div className="mt-3 text-sm text-text-muted">Elapsed: {systemQ.data?.elapsed_ms != null ? `${systemQ.data.elapsed_ms} ms` : '—'}</div>
                    </div>
                  </div>
                </ContentCard>

                <ContentCard title="Environment" className="xl:col-span-1">
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl border border-border-subtle bg-surface-2 p-4">
                      <dt className="text-xs uppercase tracking-wide text-text-muted">Environment</dt>
                      <dd className="mt-1 text-sm font-medium text-text-strong">{systemQ.data?.env ?? '—'}</dd>
                    </div>
                    <div className="rounded-2xl border border-border-subtle bg-surface-2 p-4">
                      <dt className="text-xs uppercase tracking-wide text-text-muted">Host</dt>
                      <dd className="mt-1 text-sm font-medium text-text-strong">{systemQ.data?.host?.hostname ?? '—'}</dd>
                    </div>
                    <div className="rounded-2xl border border-border-subtle bg-surface-2 p-4">
                      <dt className="text-xs uppercase tracking-wide text-text-muted">Node</dt>
                      <dd className="mt-1 text-sm font-medium text-text-strong">{systemQ.data?.host?.node ?? '—'}</dd>
                    </div>
                    <div className="rounded-2xl border border-border-subtle bg-surface-2 p-4">
                      <dt className="text-xs uppercase tracking-wide text-text-muted">Memory RSS</dt>
                      <dd className="mt-1 text-sm font-medium text-text-strong">{systemQ.data?.process?.memory_rss_bytes != null ? `${Math.round(systemQ.data.process.memory_rss_bytes / 1024 / 1024)} MB` : '—'}</dd>
                    </div>
                  </dl>
                </ContentCard>

                <ContentCard title="Attention needed" className="xl:col-span-1">
                  {moduleSummary?.unhealthy ? (
                    <div className="space-y-2">
                      {moduleSummary.unhealthyModules.slice(0, 10).map((module) => (
                        <button
                          key={module}
                          type="button"
                          onClick={() => setSelectedModuleKey(module)}
                          className="flex w-full items-start justify-between rounded-2xl border border-red-100 bg-red-50/70 p-3 text-left transition hover:bg-red-50"
                        >
                          <div>
                            <div className="text-sm font-medium text-text-strong">{module}</div>
                            <div className="text-xs text-text-muted">Missing required tables</div>
                          </div>
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-red-500" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-800">
                      <CheckCircle2 className="h-5 w-5" />
                      All registered modules are present.
                    </div>
                  )}
                </ContentCard>
              </div>
            ),
          },
          {
            key: 'modules',
            label: 'Modules',
            content: (
              <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
                <ContentCard
                  title="Module registry"
                  actions={<div className="w-72 max-w-full"><Input placeholder="Search module or missing table" value={search} onChange={(e) => setSearch(e.target.value)} /></div>}
                >
                  <DataTable
                    columns={modulesColumns}
                    rows={filteredModules}
                    isLoading={modulesQ.isLoading && !moduleRows.length}
                    empty={{ title: 'No modules found', description: 'Try another search term.' }}
                    onRowClick={(row) => setSelectedModuleKey(row.module)}
                  />
                </ContentCard>

                <ContentCard
                  title="Module detail"
                  actions={selectedKey ? <Badge tone="info">{selectedKey}</Badge> : null}
                >
                  {!selectedKey ? (
                    <div className="text-sm text-text-muted">Select a module to inspect its required tables and health status.</div>
                  ) : moduleDetailQ.isLoading ? (
                    <div className="text-sm text-text-muted">Loading module detail…</div>
                  ) : moduleDetailQ.isError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{moduleDetailQ.error?.message ?? 'Failed to load module detail.'}</div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-2 p-4">
                        <div>
                          <div className="text-sm font-semibold text-text-strong">{moduleDetailQ.data?.module?.module}</div>
                          <div className="text-xs text-text-muted">Required tables: {moduleDetailQ.data?.module?.requiredCount ?? 0}</div>
                        </div>
                        <StatusBadge ok={!!moduleDetailQ.data?.ok} trueLabel="Healthy" falseLabel="Issue detected" />
                      </div>

                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Missing tables</div>
                        {moduleDetailQ.data?.module?.missingTables?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {moduleDetailQ.data.module.missingTables.map((table) => (
                              <Badge key={table} tone="danger" size="md">{table}</Badge>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-text-muted">No missing tables.</div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Coverage</div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${moduleDetailQ.data?.module?.ok ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.max(4, Math.min(100, ((moduleDetailQ.data?.module?.presentCount ?? 0) / Math.max(1, moduleDetailQ.data?.module?.requiredCount ?? 1)) * 100))}%` }}
                          />
                        </div>
                        <div className="mt-2 text-sm text-text-muted">{moduleDetailQ.data?.module?.presentCount ?? 0} of {moduleDetailQ.data?.module?.requiredCount ?? 0} required tables detected.</div>
                      </div>
                    </div>
                  )}
                </ContentCard>
              </div>
            ),
          },
          {
            key: 'scheduler',
            label: 'Scheduler',
            content: (
              <ContentCard title="Task stability overview">
                {systemQ.isLoading ? (
                  <div className="text-sm text-text-muted">Loading scheduler summary…</div>
                ) : !schedulerTasks.length ? (
                  <div className="rounded-2xl border border-border-subtle bg-surface-2 p-4 text-sm text-text-muted">No scheduler summary returned by the backend.</div>
                ) : (
                  <div className="space-y-4">
                    {failingSchedulerTasks.length ? (
                      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <Wrench className="mt-0.5 h-4 w-4" />
                        <div>
                          <div className="font-medium">Enabled tasks with only failed runs detected</div>
                          <div className="mt-1 text-amber-800">{failingSchedulerTasks.map((t) => t.code).join(', ')}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                        <CheckCircle2 className="h-4 w-4" />
                        No enabled scheduler tasks are currently in a failed-only state.
                      </div>
                    )}

                    <DataTable
                      columns={[
                        { header: 'Task', render: (r) => <div><div className="font-medium text-text-strong">{r.name ?? r.code}</div><div className="text-xs text-text-muted">{r.code}</div></div> },
                        { header: 'Status', render: (r) => <Badge tone={r.is_enabled ? 'success' : 'muted'}>{r.is_enabled ? 'Enabled' : 'Disabled'}</Badge> },
                        { header: 'Last result', render: (r) => <Badge tone={r.last_status === 'success' ? 'success' : r.last_status === 'failed' ? 'danger' : 'warning'}>{r.last_status ?? 'No runs'}</Badge> },
                        { header: 'Last run', render: (r) => <span className="text-sm text-text-muted">{formatDateTime(r.last_started_at)}</span> },
                        { header: 'Next run', render: (r) => <span className="text-sm text-text-muted">{formatDateTime(r.next_run_at)}</span> },
                      ]}
                      rows={schedulerTasks}
                      isLoading={false}
                    />
                  </div>
                )}
              </ContentCard>
            ),
          },
          {
            key: 'raw',
            label: 'Raw payload',
            content: (
              <ContentCard title="Authenticated health payload">
                {systemQ.isLoading ? (
                  <div className="text-sm text-text-muted">Loading payload…</div>
                ) : systemQ.isError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{systemQ.error?.message ?? 'Failed to load system health payload.'}</div>
                ) : (
                  <pre className="max-h-[40rem] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(systemQ.data, null, 2)}</pre>
                )}
              </ContentCard>
            ),
          },
        ]}
      />
    </div>
  );
}
