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

/** Format an ISO date string (or date-time) to a locale date-only string. */
function formatDate(value) {
  if (!value) return '—';
  // Accept "2026-01-31" or "2026-01-31T00:00:00Z"
  const iso = String(value).slice(0, 10);
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return value;
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATUS_BADGE = {
  open:   'success',
  locked: 'default',
  closed: 'warning',
};

/** Which actions are valid per status */
const STATUS_ACTIONS = {
  open:   ['close', 'lock'],
  locked: ['unlock'],
  closed: ['reopen', 'rollForward'],
};

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

  const invalidate = () => qc.invalidateQueries({ queryKey: ['periods'] });

  const create = useMutation({
    mutationFn: () => api.create({ code, startDate, endDate }),
    onSuccess: () => {
      toast.success('Period created successfully.');
      setCreateOpen(false);
      setCode('');
      setStartDate('');
      setEndDate('');
      invalidate();
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Failed to create period.'),
  });

  const lock = useMutation({
    mutationFn: (id) => api.lock(id),
    onSuccess: () => { toast.success('Period locked.'); invalidate(); },
    onError: (e) => toast.error(e.message ?? 'Failed to lock period.'),
  });

  const unlock = useMutation({
    mutationFn: (id) => api.unlock(id),
    onSuccess: () => { toast.success('Period unlocked.'); invalidate(); },
    onError: (e) => toast.error(e.message ?? 'Failed to unlock period.'),
  });

  const reopen = useMutation({
    mutationFn: (id) => api.reopen(id),
    onSuccess: () => { toast.success('Period reopened.'); invalidate(); },
    onError: (e) => toast.error(e.message ?? 'Failed to reopen period.'),
  });

  const rollForward = useMutation({
    mutationFn: (id) => api.rollForward(id, {}),
    onSuccess: () => { toast.success('Roll-forward period created.'); invalidate(); },
    onError: (e) => toast.error(e.message ?? 'Roll-forward failed.'),
  });

  const periods = q.data ?? [];

  const isFormValid = code.trim() && startDate && endDate;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting Periods"
        subtitle="Manage fiscal periods — create, lock, close, and roll forward."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            + New Period
          </Button>
        }
      />

      <ContentCard title={`Periods ${periods.length ? `(${periods.length})` : ''}`}>
        {q.isLoading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading periods…</div>
        ) : q.isError ? (
          <div className="py-10 text-center text-sm text-red-600">
            {q.error?.message ?? 'Failed to load periods.'}
          </div>
        ) : periods.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            No periods found. Create your first period to get started.
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Code</TH>
                <TH>Start Date</TH>
                <TH>End Date</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {periods.map((p) => {
                const status = p.status ?? '';
                const allowed = STATUS_ACTIONS[status] ?? [];

                return (
                  <tr key={p.id}>
                    <TD className="font-semibold text-brand-deep">{p.code}</TD>
                    <TD className="text-slate-600">{formatDate(p.start_date ?? p.startDate)}</TD>
                    <TD className="text-slate-600">{formatDate(p.end_date ?? p.endDate)}</TD>
                    <TD>
                      <Badge variant={STATUS_BADGE[status] ?? 'default'}>
                        {status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        {allowed.includes('close') && (
                          <Link
                            className="inline-flex items-center text-sm font-medium text-brand-primary hover:underline"
                            to={ROUTES.accountingPeriodClose(p.id)}
                          >
                            Close
                          </Link>
                        )}
                        {allowed.includes('lock') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => lock.mutate(p.id)}
                            disabled={lock.isLoading}
                          >
                            Lock
                          </Button>
                        )}
                        {allowed.includes('unlock') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => unlock.mutate(p.id)}
                            disabled={unlock.isLoading}
                          >
                            Unlock
                          </Button>
                        )}
                        {allowed.includes('reopen') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => reopen.mutate(p.id)}
                            disabled={reopen.isLoading}
                          >
                            Reopen
                          </Button>
                        )}
                        {allowed.includes('rollForward') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => rollForward.mutate(p.id)}
                            disabled={rollForward.isLoading}
                          >
                            Roll Forward
                          </Button>
                        )}
                      </div>
                    </TD>
                  </tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </ContentCard>

      <Modal
        open={createOpen}
        title="Create Accounting Period"
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => create.mutate()}
              disabled={create.isLoading || !isFormValid}
            >
              {create.isLoading ? 'Creating…' : 'Create Period'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Period Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. 2026-01"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-500">
            Dates must not overlap an existing period. The server will return a 409 error if they do.
          </p>
        </div>
      </Modal>
    </div>
  );
}