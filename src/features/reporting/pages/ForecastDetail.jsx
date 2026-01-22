import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { CloudSun, Copy, CheckCircle2, TrendingUp } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makePlanningApi } from '../api/planning.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';

export default function ForecastDetail() {
  const { id } = useParams();
  const { http } = useApi();
  const api = useMemo(() => makePlanningApi(http), [http]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reporting', 'forecasts', id],
    queryFn: () => api.forecasts.get(id)
  });

  const [openVersion, setOpenVersion] = useState(false);
  const [versionForm, setVersionForm] = useState({ versionNo: 1, name: '' });

  const [openCopy, setOpenCopy] = useState(false);
  const [copyForm, setCopyForm] = useState({ baseVersionId: '', compareVersionId: '', periodId: '' });

  async function createVersion() {
    await api.forecasts.createVersion(id, { versionNo: Number(versionForm.versionNo), name: versionForm.name || null });
    setOpenVersion(false);
    refetch();
  }

  async function finalizeVersion(versionId) {
    await api.forecasts.finalizeVersion(id, versionId);
    refetch();
  }

  async function copyVersion(versionId) {
    await api.forecasts.copyVersion(id, versionId, {
      newVersionNo: Number(versionForm.versionNo) + 1,
      name: `${versionForm.name || 'Copy'} (v${Number(versionForm.versionNo) + 1})`,
      scenarioKey: null,
      probabilityWeight: 1
    });
    refetch();
  }

  const forecast = data?.data ?? data ?? null;
  const versions = Array.isArray(forecast?.versions) ? forecast.versions : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Forecast"
        subtitle={forecast?.name ? `Scenario planning · ${forecast.name}` : 'Scenario planning and forecasting'}
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
        <ContentCard title="Details" subtitle="Forecast header and status" loading={isLoading}>
          <div className="space-y-2">
            <div className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Currency:</span> {forecast?.currencyCode ?? '—'}
            </div>
            <div className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Status:</span> {forecast?.status ?? '—'}
            </div>
          </div>
        </ContentCard>
        <ContentCard title="Compare" subtitle="Quick variance helpers" loading={isLoading}>
          <div className="space-y-3">
            <Input label="Base version ID" value={copyForm.baseVersionId} onChange={(e) => setCopyForm((s) => ({ ...s, baseVersionId: e.target.value }))} />
            <Input
              label="Compare version ID"
              value={copyForm.compareVersionId}
              onChange={(e) => setCopyForm((s) => ({ ...s, compareVersionId: e.target.value }))}
            />
            <Input label="Period ID" value={copyForm.periodId} onChange={(e) => setCopyForm((s) => ({ ...s, periodId: e.target.value }))} />
            <div className="flex justify-end">
              <Button
                leftIcon={TrendingUp}
                onClick={async () => {
                  await api.forecasts.compare(id, {
                    baseVersionId: copyForm.baseVersionId,
                    compareVersionId: copyForm.compareVersionId,
                    periodId: copyForm.periodId || undefined
                  });
                }}
                disabled={!copyForm.baseVersionId || !copyForm.compareVersionId}
              >
                Run compare
              </Button>
            </div>
          </div>
        </ContentCard>
        <ContentCard title="Raw" subtitle="Server response" loading={isLoading}>
          <JsonPanel title="" value={data ?? {}} />
        </ContentCard>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Versions</div>
            <div className="text-xs text-slate-600">Create scenarios, lock by finalizing, and promote active versions.</div>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Version</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {versions.length ? (
                versions.map((v) => (
                  <tr key={v.id ?? `${v.versionNo}`} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-900">v{v.versionNo ?? '—'}</td>
                    <td className="py-3 pr-4 text-slate-700">{v.name ?? '—'}</td>
                    <td className="py-3 pr-4 text-slate-700">{v.status ?? '—'}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" leftIcon={Copy} onClick={() => copyVersion(v.id)}>
                          Copy
                        </Button>
                        <Button variant="outline" size="sm" leftIcon={CheckCircle2} onClick={() => finalizeVersion(v.id)}>
                          Finalize
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-600">
                    No versions returned by the service yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={openVersion} onClose={() => setOpenVersion(false)} title="New forecast version">
        <div className="space-y-3">
          <Input
            label="Version number"
            value={String(versionForm.versionNo)}
            onChange={(e) => setVersionForm((s) => ({ ...s, versionNo: e.target.value }))}
          />
          <Input label="Name" value={versionForm.name} onChange={(e) => setVersionForm((s) => ({ ...s, name: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpenVersion(false)}>
              Cancel
            </Button>
            <Button onClick={createVersion} disabled={!versionForm.versionNo}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={openCopy} onClose={() => setOpenCopy(false)} title="Copy version">
        <div className="space-y-3">
          <Input label="Version ID" value={copyForm.baseVersionId} onChange={(e) => setCopyForm((s) => ({ ...s, baseVersionId: e.target.value }))} />
          <Input label="New version no" value={String(Number(versionForm.versionNo) + 1)} readOnly />
          <Select
            label="Probability weight"
            value="1"
            onChange={() => {}}
            options={[{ label: '1.0', value: '1' }]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpenCopy(false)}>
              Cancel
            </Button>
            <Button onClick={() => copyVersion(copyForm.baseVersionId)} disabled={!copyForm.baseVersionId}>
              Copy
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
