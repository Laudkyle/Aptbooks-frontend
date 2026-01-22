import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { CloudSun, Plus, CheckCircle2, Copy, Archive, Check } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makePlanningApi } from '../api/planning.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';

function rowsFrom(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Forecast detail is implemented strictly using the Phase 7 route map.
 * The route map provides GET /reporting/forecasts (list) but does not guarantee a GET /reporting/forecasts/:id.
 * We therefore hydrate the header from the list, and provide version/line operations that are explicitly documented.
 */
export default function ForecastDetail() {
  const { id } = useParams();
  const { http } = useApi();
  const api = useMemo(() => makePlanningApi(http), [http]);

  const [openVersion, setOpenVersion] = useState(false);
  const [ver, setVer] = useState({ versionNo: 1, name: '', status: 'draft' });
  const [createdVersions, setCreatedVersions] = useState([]);

  const [compare, setCompare] = useState({ baseVersionId: '', compareVersionId: '', periodId: '' });
  const [compareResult, setCompareResult] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reporting', 'forecasts', 'list-for-detail', { id }],
    queryFn: () => api.forecasts.list({ limit: 500, offset: 0 })
  });

  const forecasts = rowsFrom(data);
  const forecast = forecasts.find((f) => String(f.id) === String(id)) ?? null;

  async function activate() {
    await api.forecasts.activate(id);
    refetch();
  }

  async function archive() {
    await api.forecasts.archive(id);
    refetch();
  }

  async function createVersion() {
    const res = await api.forecasts.versions.create(id, { ...ver, name: ver.name || null, status: ver.status || 'draft' });
    const created = res?.data ?? res;
    if (created) setCreatedVersions((s) => [created, ...s]);
    setOpenVersion(false);
  }

  async function finalizeVersion(versionId) {
    await api.forecasts.versions.finalize(id, versionId);
  }

  async function copyVersion(versionId) {
    // Copy uses the documented endpoint: POST /forecasts/:id/versions/:versionId/copy
    const newNo = Number(ver.versionNo || 1) + 1;
    const res = await api.forecasts.versions.copy(id, versionId, {
      newVersionNo: newNo,
      name: ver.name ? `${ver.name} (Copy v${newNo})` : `Copy v${newNo}`,
      scenarioKey: null,
      probabilityWeight: 1
    });
    const created = res?.data ?? res;
    if (created) setCreatedVersions((s) => [created, ...s]);
  }

  async function runCompare() {
    const res = await api.forecasts.compare(id, {
      baseVersionId: compare.baseVersionId,
      compareVersionId: compare.compareVersionId,
      periodId: compare.periodId || undefined
    });
    setCompareResult(res?.data ?? res);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={forecast?.name ? `Forecast — ${forecast.name}` : `Forecast — ${id}`}
        subtitle="Scenario planning with versions, lines, and comparisons."
        icon={CloudSun}
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button leftIcon={Plus} onClick={() => setOpenVersion(true)}>
              New version
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <ContentCard title="Header" subtitle="Forecast status and actions" loading={isLoading}>
          <div className="space-y-2 text-sm text-slate-700">
            <div>
              <span className="font-medium text-slate-900">Currency:</span> {forecast?.currencyCode ?? forecast?.currency_code ?? '—'}
            </div>
            <div>
              <span className="font-medium text-slate-900">Status:</span> {forecast?.status ?? '—'}
            </div>
            <div className="pt-2 flex flex-wrap gap-2">
              <Button variant="outline" leftIcon={Check} onClick={activate}>
                Activate
              </Button>
              <Button variant="outline" leftIcon={Archive} onClick={archive}>
                Archive
              </Button>
            </div>
          </div>
        </ContentCard>

        <ContentCard title="Compare" subtitle="Variance between two versions" loading={isLoading}>
          <div className="space-y-3">
            <Input label="Base version ID" value={compare.baseVersionId} onChange={(e) => setCompare((s) => ({ ...s, baseVersionId: e.target.value }))} />
            <Input label="Compare version ID" value={compare.compareVersionId} onChange={(e) => setCompare((s) => ({ ...s, compareVersionId: e.target.value }))} />
            <Input label="Period ID (optional)" value={compare.periodId} onChange={(e) => setCompare((s) => ({ ...s, periodId: e.target.value }))} />
            <div className="flex justify-end">
              <Button onClick={runCompare} disabled={!compare.baseVersionId || !compare.compareVersionId}>
                Run compare
              </Button>
            </div>
            {compareResult ? (
              <pre className="mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">{JSON.stringify(compareResult, null, 2)}</pre>
            ) : null}
          </div>
        </ContentCard>

        <ContentCard title="Versions" subtitle="Created in this session" loading={isLoading}>
          <div className="space-y-2">
            {createdVersions.length ? (
              createdVersions.slice(0, 6).map((v) => (
                <div key={v.id ?? `${v.versionNo}-${v.created_at ?? ''}`} className="rounded-xl border border-slate-200 p-3">
                  <div className="text-sm font-medium text-slate-900">v{v.versionNo ?? '—'} {v.name ? `· ${v.name}` : ''}</div>
                  <div className="text-xs text-slate-600">{v.id ?? '—'}</div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" leftIcon={Copy} onClick={() => copyVersion(v.id)} disabled={!v.id}>
                      Copy
                    </Button>
                    <Button size="sm" variant="outline" leftIcon={CheckCircle2} onClick={() => finalizeVersion(v.id)} disabled={!v.id}>
                      Finalize
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-600">Create a version to see it here. (Listing existing versions requires a backend list endpoint.)</div>
            )}
          </div>
        </ContentCard>
      </div>

      <Modal open={openVersion} onClose={() => setOpenVersion(false)} title="New forecast version">
        <div className="space-y-3">
          <Input label="Version number" type="number" value={ver.versionNo} onChange={(e) => setVer((s) => ({ ...s, versionNo: Number(e.target.value) }))} />
          <Input label="Name" value={ver.name} onChange={(e) => setVer((s) => ({ ...s, name: e.target.value }))} placeholder="Optional" />
          <Select
            label="Status"
            value={ver.status}
            onChange={(e) => setVer((s) => ({ ...s, status: e.target.value }))}
            options={[
              { label: 'Draft', value: 'draft' },
              { label: 'Active', value: 'active' },
              { label: 'Archived', value: 'archived' }
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpenVersion(false)}>
              Cancel
            </Button>
            <Button onClick={createVersion} disabled={!ver.versionNo}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
