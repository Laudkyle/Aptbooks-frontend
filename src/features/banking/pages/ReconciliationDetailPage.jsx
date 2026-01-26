import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeBankingApi } from '../api/banking.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

function normalizeRows(data) {
  return Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : data?.rows ?? [];
}

export default function ReconciliationDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { http } = useApi();
  const api = useMemo(() => makeBankingApi(http), [http]);

  const recQuery = useQuery({
    queryKey: ['banking.reconciliation.detail', id],
    queryFn: async () => api.getReconciliation(id),
    enabled: !!id
  });

  const diffQuery = useQuery({
    queryKey: ['banking.reconciliation.diff', id],
    queryFn: async () => api.diffReconciliation(id),
    enabled: !!id
  });

  const closeMutation = useMutation({
    mutationFn: async () => api.closeReconciliation(id, {}),
    onSuccess: () => {
      toast.success('Reconciliation closed.');
      qc.invalidateQueries({ queryKey: ['banking.reconciliations'] });
      qc.invalidateQueries({ queryKey: ['banking.reconciliation.detail', id] });
    },
    onError: (e) => toast.error(e?.response?.data?.error ?? e?.message ?? 'Failed to close reconciliation.')
  });

  const unlockMutation = useMutation({
    mutationFn: async () => api.unlockReconciliation(id),
    onSuccess: () => {
      toast.success('Reconciliation unlocked.');
      qc.invalidateQueries({ queryKey: ['banking.reconciliations'] });
      qc.invalidateQueries({ queryKey: ['banking.reconciliation.detail', id] });
    },
    onError: (e) => toast.error(e?.response?.data?.error ?? e?.message ?? 'Failed to unlock reconciliation.')
  });

  const recPayload = recQuery.data;
  const rec = recPayload?.data ?? recPayload;
  const diffPayload = diffQuery.data;
  const diff = diffPayload?.data ?? diffPayload;

  const diffRows = diff
    ? [
        { metric: 'Ledger balance', value: diff.ledger_balance ?? diff.ledgerBalance },
        { metric: 'Statement balance', value: diff.statement_balance ?? diff.statementBalance },
        { metric: 'Difference', value: diff.difference },
        { metric: 'Unmatched lines', value: diff.unmatched_lines ?? diff.unmatchedLines },
        { metric: 'Unposted journals', value: diff.unposted_journals ?? diff.unpostedJournals }
      ].filter((x) => typeof x.value !== 'undefined')
    : [];

  return (
    <>
      <PageHeader
        title="Reconciliation detail"
        subtitle={rec ? `Reconciliation ${rec.id ?? id}` : `Reconciliation ${id}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => nav(ROUTES.bankingReconciliations)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button disabled={closeMutation.isLoading} onClick={() => closeMutation.mutate()}>
              Close
            </Button>
            <Button variant="secondary" disabled={unlockMutation.isLoading} onClick={() => unlockMutation.mutate()}>
              Unlock
            </Button>
          </>
        }
      />

      <div className="mt-6" />

      <ContentCard title="Reconciliation" actions={<Badge variant="info">/modules/banking/reconciliations/:id</Badge>}>
        {recQuery.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : recQuery.isError ? (
          <div className="text-sm text-red-700">{recQuery.error?.message ?? 'Failed to load reconciliation.'}</div>
        ) : !rec ? (
          <div className="text-sm text-slate-700">No data.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Bank account id" value={rec.bank_account_id ?? rec.bankAccountId} />
            <Field label="Period id" value={rec.period_id ?? rec.periodId} />
            <Field label="Locked" value={(rec.is_locked ?? rec.isLocked) ? 'locked' : 'open'} />
            <Field label="Ledger balance" value={rec.ledger_balance} />
            <Field label="Statement balance" value={rec.statement_balance} />
            <Field label="Difference" value={rec.difference} />
          </div>
        )}
      </ContentCard>

      <div className="mt-6" />

      <ContentCard title="Diff" actions={<Badge variant="info">/modules/banking/reconciliations/:id/diff</Badge>}>
        {diffQuery.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : diffQuery.isError ? (
          <div className="text-sm text-red-700">{diffQuery.error?.message ?? 'Failed to load diff.'}</div>
        ) : (
          <Table
            columns={[
              { header: 'Metric', att: 'metric' },
              { header: 'Value', key: 'value', render: (r) => <span className="font-mono text-xs">{String(r.value ?? '—')}</span> }
            ]}
            rows={diffRows}
            keyField="metric"
          />
        )}
      </ContentCard>
    </>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-white/60 p-4">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div className="mt-1 font-mono text-xs text-slate-900">{value ? String(value) : '—'}</div>
    </div>
  );
}
