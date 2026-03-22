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
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { Tooltip } from '../../../../shared/components/ui/Tooltip.jsx';
import { 
  Lock, 
  Unlock, 
  DoorClosed, 
  RotateCcw, 
  FastForward,
  Plus,
  X,
  AlertCircle
} from 'lucide-react';

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
  const [closeConfirm, setCloseConfirm] = useState(null);

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

  const close = useMutation({
    mutationFn: (id) => api.close(id),
    onSuccess: () => {
      toast.success('Period closed.');
      qc.invalidateQueries({ queryKey: ['periods'] });
      setCloseConfirm(null);
    },
    onError: (e) => toast.error(e.message ?? 'Close failed')
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

  const handleClose = (period) => {
    setCloseConfirm(period);
  };

  const handleCloseConfirm = () => {
    if (closeConfirm) {
      close.mutate(closeConfirm.id);
    }
  };

  const periods = q.data ?? [];

  // Helper to determine if actions should be disabled based on period status
  const isActionDisabled = (period, action) => {
    const status = period.status?.toLowerCase();
    switch (action) {
      case 'lock':
        return status !== 'open';
      case 'unlock':
        return status !== 'locked';
      case 'close':
        return status !== 'open' && status !== 'locked';
      case 'reopen':
        return status !== 'closed';
      case 'roll-forward':
        return status === 'closed' ? false : true;
      default:
        return false;
    }
  };

  // Helper to get tooltip text
  const getActionTooltip = (period, action) => {
    const status = period.status?.toLowerCase();
    switch (action) {
      case 'lock':
        return status === 'open' 
          ? 'Lock this period to prevent further changes' 
          : 'Only open periods can be locked';
      case 'unlock':
        return status === 'locked' 
          ? 'Unlock this period to allow changes' 
          : 'Only locked periods can be unlocked';
      case 'close':
        return (status === 'open' || status === 'locked') 
          ? 'Close this period to finalize and prevent changes' 
          : 'Only open or locked periods can be closed';
      case 'reopen':
        return status === 'closed' 
          ? 'Reopen a closed period to make changes' 
          : 'Only closed periods can be reopened';
      case 'roll-forward':
        return status === 'closed' 
          ? 'Create the next period based on this one' 
          : 'Period must be closed before rolling forward';
      default:
        return '';
    }
  };

  // Helper to get icon for action button
  const getActionIcon = (action) => {
    switch (action) {
      case 'lock':
        return Lock;
      case 'unlock':
        return Unlock;
      case 'close':
        return DoorClosed;
      case 'reopen':
        return RotateCcw;
      case 'roll-forward':
        return FastForward;
      default:
        return null;
    }
  };

  // Helper to get button variant
  const getActionVariant = (action, disabled) => {
    if (disabled) return 'secondary';
    switch (action) {
      case 'close':
        return 'danger';
      case 'lock':
        return 'secondary';
      case 'unlock':
        return 'secondary';
      case 'reopen':
        return 'warning';
      case 'roll-forward':
        return 'success';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting Periods"
        subtitle="Create, lock/unlock, close, and roll-forward accounting periods"
        actions={
          <Button onClick={() => setCreateOpen(true)} leftIcon={Plus}>
            New Period
          </Button>
        }
      />

      <ContentCard>
        <div className="mb-4">
          <div className="text-base font-semibold text-slate-900">Period Management</div>
          <div className="mt-1 text-sm text-slate-500">
            Manage accounting periods, control edit access, and roll forward to new periods
          </div>
        </div>

        {q.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading periods...</div>
          </div>
        ) : q.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {q.error?.message ?? 'Failed to load periods.'}
            </div>
          </div>
        ) : periods.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-sm font-medium text-slate-900 mb-1">No periods created</div>
            <div className="text-sm text-slate-500 mb-4">Create your first accounting period to get started</div>
            <Button onClick={() => setCreateOpen(true)} leftIcon={Plus}>
              Create Period
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
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
                  const status = p.status?.toLowerCase() || 'open';
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <TD className="font-medium text-slate-900">{p.code}</TD>
                      <TD className="text-slate-600">{p.start_date ?? p.startDate ?? '—'}</TD>
                      <TD className="text-slate-600">{p.end_date ?? p.endDate ?? '—'}</TD>
                      <TD>
                        <Badge 
                          tone={
                            status === 'open' ? 'success' : 
                            status === 'locked' ? 'warning' : 
                            status === 'closed' ? 'default' : 
                            'muted'
                          }
                        >
                          {p.status ?? 'Open'}
                        </Badge>
                      </TD>
                      <TD className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* Close Action */}
                          <Tooltip content={getActionTooltip(p, 'close')}>
                            <Button
                              size="sm"
                              variant={getActionVariant('close', isActionDisabled(p, 'close'))}
                              onClick={() => handleClose(p)}
                              disabled={isActionDisabled(p, 'close') || close.isPending}
                              leftIcon={DoorClosed}
                              iconOnly
                              aria-label="Close period"
                            />
                          </Tooltip>

                          {/* Lock Action */}
                          <Tooltip content={getActionTooltip(p, 'lock')}>
                            <Button
                              size="sm"
                              variant={getActionVariant('lock', isActionDisabled(p, 'lock'))}
                              onClick={() => lock.mutate(p.id)}
                              disabled={isActionDisabled(p, 'lock') || lock.isPending}
                              leftIcon={Lock}
                              iconOnly
                              aria-label="Lock period"
                              loading={lock.isPending && lock.variables === p.id}
                            />
                          </Tooltip>

                          {/* Unlock Action */}
                          <Tooltip content={getActionTooltip(p, 'unlock')}>
                            <Button
                              size="sm"
                              variant={getActionVariant('unlock', isActionDisabled(p, 'unlock'))}
                              onClick={() => unlock.mutate(p.id)}
                              disabled={isActionDisabled(p, 'unlock') || unlock.isPending}
                              leftIcon={Unlock}
                              iconOnly
                              aria-label="Unlock period"
                              loading={unlock.isPending && unlock.variables === p.id}
                            />
                          </Tooltip>

                          {/* Reopen Action */}
                          <Tooltip content={getActionTooltip(p, 'reopen')}>
                            <Button
                              size="sm"
                              variant={getActionVariant('reopen', isActionDisabled(p, 'reopen'))}
                              onClick={() => reopen.mutate(p.id)}
                              disabled={isActionDisabled(p, 'reopen') || reopen.isPending}
                              leftIcon={RotateCcw}
                              iconOnly
                              aria-label="Reopen period"
                              loading={reopen.isPending && reopen.variables === p.id}
                            />
                          </Tooltip>

                          {/* Roll-forward Action */}
                          <Tooltip content={getActionTooltip(p, 'roll-forward')}>
                            <Button
                              size="sm"
                              variant={getActionVariant('roll-forward', isActionDisabled(p, 'roll-forward'))}
                              onClick={() => rollForward.mutate(p.id)}
                              disabled={isActionDisabled(p, 'roll-forward') || rollForward.isPending}
                              leftIcon={FastForward}
                              iconOnly
                              aria-label="Roll forward period"
                              loading={rollForward.isPending && rollForward.variables === p.id}
                            />
                          </Tooltip>
                        </div>
                      </TD>
                    </tr>
                  );
                })}
              </TBody>
            </Table>
          </div>
        )}
      </ContentCard>

      {/* Create Period Modal */}
      <Modal
        open={createOpen}
        title="Create New Period"
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} leftIcon={X}>
              Cancel
            </Button>
            <Button 
              onClick={() => create.mutate()} 
              disabled={create.isPending || !code || !startDate || !endDate}
              loading={create.isPending}
              leftIcon={Plus}
            >
              Create Period
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-600 mb-4">
            Create a new accounting period. Periods cannot overlap with existing periods.
          </div>
          
          <Input 
            label="Period Code" 
            value={code} 
            onChange={(e) => setCode(e.target.value)} 
            placeholder="e.g., 2026-01, Q1-2026, FY2026"
            required
          />
          
          <Input 
            label="Start Date" 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            required
          />
          
          <Input 
            label="End Date" 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            required
          />
          
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <div className="font-medium text-slate-700 mb-1">Note:</div>
            <ul className="list-disc list-inside space-y-1">
              <li>Period codes must be unique</li>
              <li>Dates cannot overlap with existing periods</li>
              <li>Start date must be before end date</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Close Period Confirmation Dialog */}
      <ConfirmDialog
        open={!!closeConfirm}
        title="Close Period"
        message={`Are you sure you want to close period "${closeConfirm?.code}"? This will finalize the period and prevent further changes. This action can be reversed by reopening the period.`}
        confirmText="Close Period"
        danger
        onClose={() => setCloseConfirm(null)}
        onConfirm={handleCloseConfirm}
        loading={close.isPending}
      />
    </div>
  );
}