import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, UploadCloud } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { makeIfrs16Api } from '../api/ifrs16.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { formatDate } from '../../../shared/utils/formatters.js';

export default function IFRS16LeaseDetailPage() {
  const { leaseId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const toast = useToast();

  const api = useMemo(() => makeIfrs16Api(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  const { data: lease, isLoading: leaseLoading, error: leaseError } = useQuery({
    queryKey: qk.ifrs16Lease(leaseId),
    queryFn: () => api.getLease(leaseId)
  });

  const { data: scheduleData, isLoading: scheduleLoading } = useQuery({
    queryKey: qk.ifrs16LeaseSchedule(leaseId),
    queryFn: () => api.getSchedule(leaseId),
    enabled: !!leaseId
  });

  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: () => periodsApi.list()
  });

  const [regenOpen, setRegenOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [initOpen, setInitOpen] = useState(false);

  const [postForm, setPostForm] = useState({
    from_date: '',
    to_date: '',
    dry_run: true
  });

  const [initForm, setInitForm] = useState({
    posting_date: '',
    memo: ''
  });

  const statusMutation = useMutation({
    mutationFn: (nextStatus) => api.updateLeaseStatus(leaseId, { status: nextStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.ifrs16Lease(leaseId) });
      toast.show({ type: 'success', message: 'Status updated' });
    },
    onError: (e) => toast.show({ type: 'error', message: String(e?.message ?? 'Failed to update status') })
  });

  const regenMutation = useMutation({
    mutationFn: () => api.generateSchedule(leaseId, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.ifrs16LeaseSchedule(leaseId) });
      toast.show({ type: 'success', message: 'Schedule regenerated' });
    },
    onError: (e) => toast.show({ type: 'error', message: String(e?.message ?? 'Failed to regenerate schedule') })
  });

  const initMutation = useMutation({
    mutationFn: () => api.postInitialRecognition(leaseId, { ...initForm }),
    onSuccess: () => {
      toast.show({ type: 'success', message: 'Initial recognition posted' });
      setInitOpen(false);
    },
    onError: (e) => toast.show({ type: 'error', message: String(e?.message ?? 'Failed to post') })
  });

  const postMutation = useMutation({
    mutationFn: () => api.postForRange(leaseId, { ...postForm, dry_run: !!postForm.dry_run }),
    onSuccess: () => {
      toast.show({ type: 'success', message: postForm.dry_run ? 'Preview generated' : 'Posted successfully' });
      setPostOpen(false);
    },
    onError: (e) => toast.show({ type: 'error', message: String(e?.message ?? 'Failed to post') })
  });

  const scheduleRows = Array.isArray(scheduleData) ? scheduleData : scheduleData?.data ?? [];

  const scheduleColumns = useMemo(
    () => [
      { header: 'Date', render: (r) => <span className="text-sm">{r?.date ? formatDate(r.date) : '—'}</span> },
      { header: 'Payment', render: (r) => <span className="text-sm">{r?.payment ?? '—'}</span> },
      { header: 'Interest', render: (r) => <span className="text-sm">{r?.interest ?? '—'}</span> },
      { header: 'Principal', render: (r) => <span className="text-sm">{r?.principal ?? '—'}</span> },
      { header: 'Balance', render: (r) => <span className="text-sm">{r?.balance ?? '—'}</span> }
    ],
    []
  );

  const periodOptions = useMemo(() => {
    const rows = Array.isArray(periods) ? periods : periods?.data ?? [];
    return [{ value: '', label: 'Select period' }, ...rows.map((p) => ({ value: p?.id, label: `${p?.code ?? p?.name ?? p?.id}` }))];
  }, [periods]);

  if (leaseError) {
    return (
      <div className="space-y-4">
        <PageHeader title="Lease" subtitle={String(leaseError?.message ?? 'Failed to load lease')} />
        <Button variant="secondary" onClick={() => navigate(ROUTES.complianceIfrs16)}>
          Back to leases
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={lease?.name ?? 'Lease'}
        subtitle={lease?.code ? `Code: ${lease.code}` : 'IFRS 16 lease detail'}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.complianceIfrs16)}>
              Back
            </Button>
            <Button variant="outline" leftIcon={RefreshCw} onClick={() => setRegenOpen(true)}>
              Regenerate schedule
            </Button>
            <Button variant="outline" leftIcon={UploadCloud} onClick={() => setInitOpen(true)}>
              Initial recognition
            </Button>
            <Button variant="primary" onClick={() => setPostOpen(true)}>
              Post period
            </Button>
          </div>
        }
      />

      <ContentCard>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={(lease?.status ?? 'draft') === 'active' ? 'success' : 'muted'}>{lease?.status ?? 'draft'}</Badge>
          <div className="text-xs text-slate-500">{lease?.commencement_date ? `Commenced ${formatDate(lease.commencement_date)}` : ''}</div>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="secondary" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate('draft')}>
              Mark Draft
            </Button>
            <Button size="sm" variant="primary" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate('active')}>
              Activate
            </Button>
          </div>
        </div>
      </ContentCard>

      <Tabs
        tabs={[
          {
            value: 'schedule',
            label: 'Schedule',
            content: (
              <ContentCard>
                <DataTable
                  columns={scheduleColumns}
                  rows={scheduleRows}
                  isLoading={leaseLoading || scheduleLoading}
                  empty={{ title: 'No schedule lines', description: 'Generate a schedule to begin posting.' }}
                />
              </ContentCard>
            )
          },
          {
            value: 'posting',
            label: 'Posting',
            content: (
              <ContentCard>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input label="From date" type="date" value={postForm.from_date} onChange={(e) => setPostForm((s) => ({ ...s, from_date: e.target.value }))} />
                  <Input label="To date" type="date" value={postForm.to_date} onChange={(e) => setPostForm((s) => ({ ...s, to_date: e.target.value }))} />
                  <Select
                    label="Dry run"
                    value={postForm.dry_run ? '1' : '0'}
                    onChange={(e) => setPostForm((s) => ({ ...s, dry_run: e.target.value === '1' }))}
                    options={[
                      { value: '1', label: 'Preview (dry run)' },
                      { value: '0', label: 'Post for real' }
                    ]}
                  />
                  <div className="flex items-end">
                    <Button variant="primary" onClick={() => postMutation.mutate()} disabled={postMutation.isPending}>
                      Run
                    </Button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Tip: use Preview first; you can then post with the same dates to create the journals.
                </div>
              </ContentCard>
            )
          }
        ]}
      />

      <ConfirmDialog
        open={regenOpen}
        title="Regenerate schedule"
        message="This will recompute the lease schedule based on current lease parameters. Proceed?"
        confirmText="Regenerate"
        onClose={() => setRegenOpen(false)}
        onConfirm={() => {
          setRegenOpen(false);
          regenMutation.mutate();
        }}
      />

      <Modal
        open={initOpen}
        title="Initial recognition posting"
        onClose={() => setInitOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setInitOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
              Post
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Posting date" type="date" value={initForm.posting_date} onChange={(e) => setInitForm((s) => ({ ...s, posting_date: e.target.value }))} />
          <Select label="Period" value={initForm.period_id ?? ''} onChange={(e) => setInitForm((s) => ({ ...s, period_id: e.target.value }))} options={periodOptions} />
        </div>
        <Input className="mt-3" label="Memo (optional)" value={initForm.memo} onChange={(e) => setInitForm((s) => ({ ...s, memo: e.target.value }))} />
      </Modal>

      <Modal
        open={postOpen}
        title="Post lease for date range"
        onClose={() => setPostOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPostOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => postMutation.mutate()} disabled={postMutation.isPending}>
              Run
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="From date" type="date" value={postForm.from_date} onChange={(e) => setPostForm((s) => ({ ...s, from_date: e.target.value }))} />
          <Input label="To date" type="date" value={postForm.to_date} onChange={(e) => setPostForm((s) => ({ ...s, to_date: e.target.value }))} />
          <Select
            label="Dry run"
            value={postForm.dry_run ? '1' : '0'}
            onChange={(e) => setPostForm((s) => ({ ...s, dry_run: e.target.value === '1' }))}
            options={[
              { value: '1', label: 'Preview (dry run)' },
              { value: '0', label: 'Post for real' }
            ]}
          />
        </div>
      </Modal>
    </div>
  );
}
