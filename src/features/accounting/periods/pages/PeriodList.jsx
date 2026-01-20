import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makePeriodsApi } from '../api/periods.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';
import { Link } from 'react-router-dom';

export default function PeriodList() {
  const { http } = useApi();
  const api = useMemo(() => makePeriodsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const q = useQuery({ queryKey: ['periods'], queryFn: api.list, staleTime: 10_000 });

  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const create = useMutation({
    mutationFn: () => api.create({ code, startDate, endDate }),
    onSuccess: () => {
      toast.success('Period created.');
      setCreateOpen(false);
      setCode('');
      setStartDate('');
      setEndDate('');
      qc.invalidateQueries({ queryKey: ['periods'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Create failed')
  });

  const action = (label, fn, permNote) => (
    <Button
      size="sm"
      variant="secondary"
      onClick={fn}
      title={permNote ?? ''}
    >
      {label}
    </Button>
  );

  const lock = useMutation({
    mutationFn: (id) => api.lock(id),
    onSuccess: () => {
      toast.success('Period locked.');
      qc.invalidateQueries({ queryKey: ['periods'] });
    },
    onError: (e) => toast.error(e.message ?? 'Lock failed')
  });

  const unlock = useMutation({
    mutationFn: (id) => api.unlock(id),
    onSuccess: () => {
      toast.success('Period unlocked.');
      qc.invalidateQueries({ queryKey: ['periods'] });
    },
    onError: (e) => toast.error(e.message ?? 'Unlock failed')
  });

  const reopen = useMutation({
    mutationFn: (id) => api.reopen(id),
    onSuccess: () => {
      toast.success('Period reopened.');
      qc.invalidateQueries({ queryKey: ['periods'] });
    },
    onError: (e) => toast.error(e.message ?? 'Reopen failed')
  });

  const rollForward = useMutation({
    mutationFn: (id) => api.rollForward(id, {}),
    onSuccess: () => {
      toast.success('Roll-forward created.');
      qc.invalidateQueries({ queryKey: ['periods'] });
    },
    onError: (e) => toast.error(e.message ?? 'Roll-forward failed')
  });

  const periods = q.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Accounting Periods"
        subtitle="Create, lock/unlock, close, and roll-forward periods."
        actions={<Button onClick={() => setCreateOpen(true)}>New period</Button>}
      />

      <ContentCard title="Periods">
        {q.isLoading ? (
          <div className="text-sm text-slate-700">Loading…</div>
        ) : q.isError ? (
          <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load periods.'}</div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Code</TH>
                <TH>Start</TH>
                <TH>End</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {periods.map((p) => (
                <tr key={p.id}>
                  <TD className="font-medium text-brand-deep">{p.code}</TD>
                  <TD>{p.start_date ?? p.startDate ?? '—'}</TD>
                  <TD>{p.end_date ?? p.endDate ?? '—'}</TD>
                  <TD>
                    <Badge variant={p.status === 'open' ? 'success' : p.status === 'closed' ? 'warning' : 'default'}>
                      {p.status ?? '—'}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link className="text-sm text-brand-primary hover:underline" to={ROUTES.accountingPeriodClose(p.id)}>
                        Close
                      </Link>
                      {action('Lock', () => lock.mutate(p.id))}
                      {action('Unlock', () => unlock.mutate(p.id))}
                      {action('Reopen', () => reopen.mutate(p.id))}
                      {action('Roll-forward', () => rollForward.mutate(p.id))}
                    </div>
                  </TD>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </ContentCard>

      <Modal
        open={createOpen}
        title="Create period"
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isLoading || !code || !startDate || !endDate}>
              Create
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="2026-01" />
          <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <div className="text-xs text-slate-600">
            Backend returns 409 if dates overlap an existing period.
          </div>
        </div>
      </Modal>
    </div>
  );
}
