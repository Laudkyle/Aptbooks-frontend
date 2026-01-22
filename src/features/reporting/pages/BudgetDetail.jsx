import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { PiggyBank, Upload, Shuffle, CheckCircle2 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makePlanningApi } from '../api/planning.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';

function rowsFrom(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

export default function BudgetDetail() {
  const { id } = useParams();
  const { http } = useApi();
  const api = useMemo(() => makePlanningApi(http), [http]);

  const [openVersion, setOpenVersion] = useState(false);
  const [ver, setVer] = useState({ versionNo: 1, name: '', status: 'draft' });
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [distributeOpen, setDistributeOpen] = useState(false);
  const [dist, setDist] = useState({ accountId: '', annualAmount: 0, method: 'even', periodIds: '', dimensionJson: '{}' });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reporting', 'budgets', id],
    queryFn: () => api.budgets.get(id)
  });

  const budget = data?.data?.budget ?? data?.budget ?? data;
  const versions = rowsFrom(data?.data?.versions ?? data?.versions ?? []);
  const lines = rowsFrom(data?.data?.lines ?? data?.lines ?? []);

  const vcols = useMemo(() => {
    const cols = ['id', 'versionNo', 'name', 'status', 'created_at'];
    return cols.map((k) => ({ header: k, render: (r) => <span className="text-sm text-slate-800">{String(r[k] ?? '')}</span> }));
  }, []);

  const lcols = useMemo(() => {
    const keys = lines[0] ? Object.keys(lines[0]) : ['accountId', 'periodId', 'amount'];
    return keys.slice(0, 8).map((k) => ({ header: k, render: (r) => <span className="text-sm text-slate-800">{String(r[k] ?? '')}</span> }));
  }, [lines]);

  async function createVersion() {
    await api.budgets.createVersion(id, { ...ver, name: ver.name || null });
    setOpenVersion(false);
    refetch();
  }

  async function importCsv(versionId) {
    await api.budgets.importCsv(id, versionId, csvText);
    setCsvOpen(false);
    setCsvText('');
    refetch();
  }

  async function distribute(versionId) {
    const item = {
      accountId: dist.accountId,
      annualAmount: Number(dist.annualAmount),
      method: dist.method,
      periodIds: dist.periodIds ? dist.periodIds.split(',').map((s) => s.trim()).filter(Boolean) : [],
      dimensionJson: safeJson(dist.dimensionJson)
    };
    await api.budgets.distribute(id, versionId, { items: [item] });
    setDistributeOpen(false);
    refetch();
  }

  function safeJson(s) {
    try {
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={budget?.name ? `Budget — ${budget.name}` : 'Budget'}
        subtitle="Manage budget versions and lines (including CSV import and distribution)."
        icon={PiggyBank}
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button onClick={() => setOpenVersion(true)} leftIcon={Plus}>
              New version
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Versions</div>
            <div className="mt-3">
              <DataTable columns={vcols} rows={versions} loading={isLoading} empty={{ title: 'No versions', description: 'Create a version to add budget lines.' }} />
            </div>
            {versions?.[0]?.id ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button variant="outline" leftIcon={Upload} onClick={() => setCsvOpen(true)}>
                  Import CSV (latest)
                </Button>
                <Button variant="outline" leftIcon={Shuffle} onClick={() => setDistributeOpen(true)}>
                  Distribute (latest)
                </Button>
                <Button leftIcon={CheckCircle2} onClick={() => api.budgets.finalize(id, versions[0].id).then(refetch)}>
                  Finalize (latest)
                </Button>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Lines</div>
            <div className="mt-3">
              <DataTable columns={lcols} rows={lines} loading={isLoading} empty={{ title: 'No lines', description: 'Import or add lines to populate the budget.' }} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Raw response</div>
          <div className="mt-3">
            <JsonPanel title="Budget detail" value={data ?? {}} />
          </div>
        </div>
      </div>

      <Modal open={openVersion} onClose={() => setOpenVersion(false)} title="New budget version">
        <div className="space-y-3">
          <Input label="Version number" type="number" value={ver.versionNo} onChange={(e) => setVer((s) => ({ ...s, versionNo: Number(e.target.value) }))} />
          <Input label="Name" value={ver.name} onChange={(e) => setVer((s) => ({ ...s, name: e.target.value }))} placeholder="Optional" />
          <Select
            label="Status"
            value={ver.status}
            onChange={(e) => setVer((s) => ({ ...s, status: e.target.value }))}
            options={[
              { label: 'Draft', value: 'draft' },
              { label: 'Final', value: 'final' },
              { label: 'Archived', value: 'archived' }
            ]}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpenVersion(false)}>
              Cancel
            </Button>
            <Button onClick={createVersion}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal open={csvOpen} onClose={() => setCsvOpen(false)} title="Import lines (CSV)">
        <div className="space-y-3">
          <div className="text-sm text-slate-700">Paste CSV text. Accepted columns include accountId/account_id, periodId/period_id, amount, and optional dimensionJson.</div>
          <textarea
            className="h-56 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="accountId,periodId,amount,dimensionJson"
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setCsvOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => importCsv(versions?.[0]?.id)} disabled={!csvText || !versions?.[0]?.id}>
              Import
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={distributeOpen} onClose={() => setDistributeOpen(false)} title="Distribute annual amount">
        <div className="space-y-3">
          <Input label="Account ID" value={dist.accountId} onChange={(e) => setDist((s) => ({ ...s, accountId: e.target.value }))} placeholder="uuid" />
          <Input label="Annual amount" type="number" value={dist.annualAmount} onChange={(e) => setDist((s) => ({ ...s, annualAmount: e.target.value }))} />
          <Select
            label="Method"
            value={dist.method}
            onChange={(e) => setDist((s) => ({ ...s, method: e.target.value }))}
            options={[
              { label: 'Even', value: 'even' },
              { label: 'Weighted', value: 'weighted' },
              { label: 'Custom', value: 'custom' }
            ]}
          />
          <Input label="Period IDs (comma-separated)" value={dist.periodIds} onChange={(e) => setDist((s) => ({ ...s, periodIds: e.target.value }))} placeholder="uuid, uuid, uuid" />
          <textarea
            className="h-32 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800"
            value={dist.dimensionJson}
            onChange={(e) => setDist((s) => ({ ...s, dimensionJson: e.target.value }))}
            placeholder='dimensionJson, e.g. {"costCenterId":"..."}'
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setDistributeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => distribute(versions?.[0]?.id)} disabled={!versions?.[0]?.id || !dist.accountId}>
              Distribute
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
