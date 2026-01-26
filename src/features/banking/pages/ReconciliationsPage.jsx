import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeBankingApi } from '../api/banking.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';

import { ROUTES } from '../../../app/constants/routes.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';
import { Pagination } from '../../../shared/components/ui/Pagination.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

function normalizeRows(data) {
  return Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : data?.rows ?? [];
}

export default function ReconciliationsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { http } = useApi();
  const api = useMemo(() => makeBankingApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  const [paging, setPaging] = useState({ limit: 100, offset: 0 });
  const [filters, setFilters] = useState({ bankAccountId: '', periodId: '' });
  const [runOpen, setRunOpen] = useState(false);
  const [runForm, setRunForm] = useState({ bankAccountId: '', periodId: '' });

  const accountsQuery = useQuery({ queryKey: ['banking.accounts'], queryFn: async () => api.listAccounts() });
  const periodsQuery = useQuery({ queryKey: ['periods.list'], queryFn: async () => periodsApi.list() });

  const listParams = useMemo(
    () => ({
      ...paging,
      ...(filters.bankAccountId ? { bankAccountId: filters.bankAccountId } : {}),
      ...(filters.periodId ? { periodId: filters.periodId } : {})
    }),
    [paging, filters]
  );

  const recsQuery = useQuery({
    queryKey: ['banking.reconciliations', listParams],
    queryFn: async () => api.listReconciliations(listParams),
    keepPreviousData: true
  });

  const runMutation = useMutation({
    mutationFn: async (payload) => api.runReconciliation(payload),
    onSuccess: () => {
      toast.success('Reconciliation started.');
      setRunOpen(false);
      setRunForm({ bankAccountId: '', periodId: '' });
      qc.invalidateQueries({ queryKey: ['banking.reconciliations'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error ?? e?.message ?? 'Failed to run reconciliation.')
  });

  const closeMutation = useMutation({
    mutationFn: async (id) => api.closeReconciliation(id, {}),
    onSuccess: () => {
      toast.success('Reconciliation closed.');
      qc.invalidateQueries({ queryKey: ['banking.reconciliations'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error ?? e?.message ?? 'Failed to close reconciliation.')
  });

  const unlockMutation = useMutation({
    mutationFn: async (id) => api.unlockReconciliation(id),
    onSuccess: () => {
      toast.success('Reconciliation unlocked.');
      qc.invalidateQueries({ queryKey: ['banking.reconciliations'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error ?? e?.message ?? 'Failed to unlock reconciliation.')
  });

  const accounts = normalizeRows(accountsQuery.data);
  const periods = normalizeRows(periodsQuery.data);
  const recsPayload = recsQuery.data;
  const recs = normalizeRows(recsPayload);

  const accOptions = [{ value: '', label: 'All bank accounts' }].concat(
    accounts.map((a) => ({ value: String(a.id), label: `${a.code ?? ''} — ${a.name ?? ''}`.trim() }))
  );

  const periodOptions = [{ value: '', label: 'All periods' }].concat(
    periods.map((p) => ({ value: String(p.id), label: `${p.code ?? p.period_code ?? ''} — ${p.name ?? p.period_name ?? ''}`.trim() }))
  );

  const accountsById = useMemo(() => {
    const m = new Map();
    accounts.forEach((a) => m.set(String(a.id), a));
    return m;
  }, [accounts]);

  const periodsById = useMemo(() => {
    const m = new Map();
    periods.forEach((p) => m.set(String(p.id), p));
    return m;
  }, [periods]);

  return (
    <>
      <PageHeader
        title="Reconciliations"
        subtitle="Run and manage bank reconciliations per period."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => recsQuery.refetch()}>
              Refresh
            </Button>
            <Button onClick={() => setRunOpen(true)}>Run reconciliation</Button>
          </div>
        }
      />

      <ContentCard title="Reconciliations" actions={<Badge variant="info">/modules/banking/reconciliations</Badge>}>
        <div className="grid gap-3 md:grid-cols-3">
          <Select
            label="Bank account"
            value={filters.bankAccountId}
            onChange={(e) => {
              setPaging((p) => ({ ...p, offset: 0 }));
              setFilters((p) => ({ ...p, bankAccountId: e.target.value }));
            }}
            options={accOptions}
          />
          <Select
            label="Period"
            value={filters.periodId}
            onChange={(e) => {
              setPaging((p) => ({ ...p, offset: 0 }));
              setFilters((p) => ({ ...p, periodId: e.target.value }));
            }}
            options={periodOptions}
          />
          <div className="text-xs text-slate-500 md:self-end">
            Run/close/unlock uses idempotency keys.
          </div>
        </div>

        <div className="mt-4">
          {recsQuery.isLoading ? (
            <div className="text-sm text-slate-700">Loading...</div>
          ) : recsQuery.isError ? (
            <div className="text-sm text-red-700">{recsQuery.error?.message ?? 'Failed to load reconciliations.'}</div>
          ) : (
            <>
              <Table
                columns={[
                  {
                    header: 'Bank account',
                    key: 'bank',
                    render: (r) => {
                      const a = accountsById.get(String(r.bank_account_id ?? r.bankAccountId));
                      return a ? (
                        <div>
                          <div className="text-sm font-medium">{a.code}</div>
                          <div className="text-xs text-slate-500">{a.name}</div>
                        </div>
                      ) : (
                        <span className="font-mono text-xs">{String(r.bank_account_id ?? '—')}</span>
                      );
                    }
                  },
                  {
                    header: 'Period',
                    key: 'period',
                    render: (r) => {
                      const p = periodsById.get(String(r.period_id ?? r.periodId));
                      return p ? (
                        <span>{p.code ?? p.period_code ?? p.name ?? '—'}</span>
                      ) : (
                        <span className="font-mono text-xs">{String(r.period_id ?? '—')}</span>
                      );
                    }
                  },
                  { header: 'Ledger', key: 'ledger_balance', render: (r) => <span className="font-mono text-xs">{r.ledger_balance ?? '—'}</span> },
                  { header: 'Statement', key: 'statement_balance', render: (r) => <span className="font-mono text-xs">{r.statement_balance ?? '—'}</span> },
                  { header: 'Diff', key: 'difference', render: (r) => <span className="font-mono text-xs">{r.difference ?? '—'}</span> },
                  {
                    header: 'Locked',
                    key: 'is_locked',
                    render: (r) => <Badge variant={(r.is_locked ?? r.isLocked) ? 'secondary' : 'success'}>{(r.is_locked ?? r.isLocked) ? 'locked' : 'open'}</Badge>
                  },
                  {
                    header: '',
                    key: 'act',
                    render: (r) => (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => nav(ROUTES.bankingReconciliationDetail(r.id))}>
                          Open
                        </Button>
                        <Button size="sm" disabled={closeMutation.isLoading} onClick={() => closeMutation.mutate(r.id)}>
                          Close
                        </Button>
                        <Button size="sm" variant="secondary" disabled={unlockMutation.isLoading} onClick={() => unlockMutation.mutate(r.id)}>
                          Unlock
                        </Button>
                      </div>
                    )
                  }
                ]}
                rows={recs}
                keyField="id"
              />

              <div className="mt-3">
                <Pagination
                  limit={paging.limit}
                  offset={paging.offset}
                  onChange={(p) => setPaging((prev) => ({ ...prev, ...p }))}
                />
              </div>
            </>
          )}
        </div>
      </ContentCard>

      <Modal
        open={runOpen}
        title="Run reconciliation"
        onClose={() => (runMutation.isLoading ? null : setRunOpen(false))}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setRunOpen(false)} disabled={runMutation.isLoading}>
              Cancel
            </Button>
            <Button
              onClick={() => runMutation.mutate({ bankAccountId: runForm.bankAccountId, periodId: runForm.periodId })}
              disabled={runMutation.isLoading || !runForm.bankAccountId || !runForm.periodId}
            >
              Run
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Bank account"
            value={runForm.bankAccountId}
            onChange={(e) => setRunForm((p) => ({ ...p, bankAccountId: e.target.value }))}
            options={[{ value: '', label: 'Select bank account' }].concat(
              accounts.map((a) => ({ value: String(a.id), label: `${a.code ?? ''} — ${a.name ?? ''}`.trim() }))
            )}
          />
          <Select
            label="Period"
            value={runForm.periodId}
            onChange={(e) => setRunForm((p) => ({ ...p, periodId: e.target.value }))}
            options={[{ value: '', label: 'Select period' }].concat(
              periods.map((p) => ({ value: String(p.id), label: `${p.code ?? p.period_code ?? ''} — ${p.name ?? p.period_name ?? ''}`.trim() }))
            )}
          />
          <div className="md:col-span-2 text-xs text-slate-500">
            Backend will compute ledger and statement balances and return a reconciliation row.
          </div>
        </div>
      </Modal>
    </>
  );
}
