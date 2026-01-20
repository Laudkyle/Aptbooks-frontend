import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeAccrualsApi } from '../api/accruals.api.js';
import { makePeriodsApi } from '../../periods/api/periods.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../../shared/components/data/FilterBar.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';

export default function AccrualsHub() {
  const { http } = useApi();
  const api = useMemo(() => makeAccrualsApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const rulesQ = useQuery({ queryKey: ['accrual-rules'], queryFn: api.listRules, staleTime: 10_000 });
  const runsQ = useQuery({ queryKey: ['accrual-runs'], queryFn: () => api.listRuns({}), staleTime: 5_000 });
  const periodsQ = useQuery({ queryKey: ['periods'], queryFn: periodsApi.list, staleTime: 10_000 });

  const [asOfDate, setAsOfDate] = useState('');
  const [periodId, setPeriodId] = useState('');

  const runDue = useMutation({
    mutationFn: () => api.runDue({ asOfDate }),
    onSuccess: () => {
      toast.success('Due accrual run started.');
      qc.invalidateQueries({ queryKey: ['accrual-runs'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Run failed')
  });

  const runReversals = useMutation({
    mutationFn: () => api.runReversals({ periodId }),
    onSuccess: () => {
      toast.success('Reversals run started.');
      qc.invalidateQueries({ queryKey: ['accrual-runs'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Run failed')
  });

  const runPeriodEnd = useMutation({
    mutationFn: () => api.runPeriodEnd({ periodId, asOfDate: asOfDate || undefined }),
    onSuccess: () => {
      toast.success('Period-end accrual run started.');
      qc.invalidateQueries({ queryKey: ['accrual-runs'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Run failed')
  });

  const periodOptions = [{ value: '', label: 'Select period…' }].concat((periodsQ.data ?? []).map((p) => ({ value: p.id, label: p.code })));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Accruals"
        subtitle="Rules and runs (due, reversals, period-end)."
        actions={<Button onClick={() => (window.location.href = ROUTES.accountingAccrualNew)}>New rule</Button>}
      />

      <ContentCard title="Run accruals">
        <FilterBar
          right={
            <div className="flex gap-2">
              <Button onClick={() => runDue.mutate()} disabled={!asOfDate || runDue.isLoading}>Run due</Button>
              <Button onClick={() => runReversals.mutate()} disabled={!periodId || runReversals.isLoading}>Run reversals</Button>
              <Button onClick={() => runPeriodEnd.mutate()} disabled={!periodId || runPeriodEnd.isLoading}>Run period-end</Button>
            </div>
          }
        >
          <Select value={periodId} onChange={(e) => setPeriodId(e.target.value)} options={periodOptions} />
          <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
        </FilterBar>
        <div className="mt-2 text-xs text-slate-600">asOfDate is required for run/due; periodId is required for reversals and period-end.</div>
      </ContentCard>

      <ContentCard title="Rules">
        <div className="overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>Code</TH>
                <TH>Name</TH>
                <TH>Rule type</TH>
                <TH>Frequency</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {(rulesQ.data ?? []).map((r) => (
                <tr key={r.id}>
                  <TD>
                    <Link className="text-brand-primary hover:underline" to={ROUTES.accountingAccruals + `?ruleId=${r.id}`}>
                      {r.code}
                    </Link>
                  </TD>
                  <TD>{r.name}</TD>
                  <TD>{r.ruleType}</TD>
                  <TD>{r.frequency}</TD>
                  <TD>{r.status ?? '—'}</TD>
                </tr>
              ))}
            </TBody>
          </Table>
        </div>
      </ContentCard>

      <ContentCard title="Runs">
        <div className="overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>Run ID</TH>
                <TH>Status</TH>
                <TH>Created</TH>
              </tr>
            </THead>
            <TBody>
              {(runsQ.data ?? []).map((r) => (
                <tr key={r.runId ?? r.id}>
                  <TD className="font-mono text-xs">{r.runId ?? r.id}</TD>
                  <TD>{r.status ?? '—'}</TD>
                  <TD>{r.createdAt ?? r.created_at ?? '—'}</TD>
                </tr>
              ))}
            </TBody>
          </Table>
        </div>
      </ContentCard>
    </div>
  );
}
