import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { makeIfrs15Api } from '../api/ifrs15.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters.js';

export default function IFRS15ContractDetailPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const toast = useToast();

  const api = useMemo(() => makeIfrs15Api(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  const { data: contract, isLoading, error } = useQuery({
    queryKey: qk.ifrs15Contract(contractId),
    queryFn: () => api.getContract(contractId)
  });

  const { data: schedule } = useQuery({
    queryKey: qk.ifrs15ContractSchedule(contractId),
    queryFn: () => api.getSchedule(contractId),
    enabled: !!contractId
  });

  const { data: costs } = useQuery({
    queryKey: qk.ifrs15ContractCosts(contractId),
    queryFn: () => api.listCosts(contractId),
    enabled: !!contractId
  });

  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: () => periodsApi.list()
  });

  const periodOptions = useMemo(() => {
    const rows = Array.isArray(periods) ? periods : periods?.data ?? [];
    return [{ value: '', label: '—' }, ...rows.map((p) => ({ value: p.id, label: `${p.code ?? p.name ?? p.id}` }))];
  }, [periods]);

  const [obligationOpen, setObligationOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [confirmActivate, setConfirmActivate] = useState(false);
  const [confirmGenSchedule, setConfirmGenSchedule] = useState(false);

  const [obligationForm, setObligationForm] = useState({
    name: '',
    standalone_selling_price: '',
    allocation_percent: ''
  });

  const [costForm, setCostForm] = useState({
    name: '',
    amount: '',
    recognition_method: 'straight_line',
    start_date: '',
    end_date: ''
  });

  const [postForm, setPostForm] = useState({
    period_id: '',
    posting_date: '',
    dry_run: true,
    memo: ''
  });

  const activateMutation = useMutation({
    mutationFn: () => api.activateContract(contractId, {}),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Contract activated' });
      setConfirmActivate(false);
      await qc.invalidateQueries({ queryKey: qk.ifrs15Contract(contractId) });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Activate failed', message: String(e?.message ?? e) })
  });

  const genScheduleMutation = useMutation({
    mutationFn: () => api.generateSchedule(contractId, {}),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Schedule generated' });
      setConfirmGenSchedule(false);
      await qc.invalidateQueries({ queryKey: qk.ifrs15ContractSchedule(contractId) });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Generate schedule failed', message: String(e?.message ?? e) })
  });

  const addObligationMutation = useMutation({
    mutationFn: () => api.addObligation(contractId, {
      ...obligationForm,
      standalone_selling_price: obligationForm.standalone_selling_price === '' ? undefined : Number(obligationForm.standalone_selling_price),
      allocation_percent: obligationForm.allocation_percent === '' ? undefined : Number(obligationForm.allocation_percent)
    }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Obligation added' });
      setObligationOpen(false);
      setObligationForm({ name: '', standalone_selling_price: '', allocation_percent: '' });
      await qc.invalidateQueries({ queryKey: qk.ifrs15Contract(contractId) });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Add obligation failed', message: String(e?.message ?? e) })
  });

  const addCostMutation = useMutation({
    mutationFn: () => api.addCost(contractId, {
      ...costForm,
      amount: costForm.amount === '' ? undefined : Number(costForm.amount)
    }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: 'Cost added' });
      setCostOpen(false);
      setCostForm({ name: '', amount: '', recognition_method: 'straight_line', start_date: '', end_date: '' });
      await qc.invalidateQueries({ queryKey: qk.ifrs15ContractCosts(contractId) });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Add cost failed', message: String(e?.message ?? e) })
  });

  const postRevenueMutation = useMutation({
    mutationFn: () => api.postRevenue(contractId, {
      ...postForm,
      period_id: postForm.period_id || undefined,
      dry_run: !!postForm.dry_run
    }),
    onSuccess: async () => {
      toast.push({ tone: 'success', title: postForm.dry_run ? 'Preview generated' : 'Revenue posted' });
      setPostOpen(false);
      await qc.invalidateQueries({ queryKey: qk.ifrs15Contract(contractId) });
    },
    onError: (e) => toast.push({ tone: 'danger', title: 'Posting failed', message: String(e?.message ?? e) })
  });

  const obligations = contract?.obligations ?? contract?.performance_obligations ?? [];
  const scheduleRows = Array.isArray(schedule) ? schedule : schedule?.data ?? [];
  const costRows = Array.isArray(costs) ? costs : costs?.data ?? [];

  const obligationColumns = useMemo(
    () => [
      { header: 'Name', render: (r) => <span className="font-medium text-slate-800">{r.name ?? '—'}</span> },
      { header: 'SSP', render: (r) => <span>{formatCurrency(r.standalone_selling_price ?? r.ssp ?? 0, contract?.currency)}</span> },
      { header: 'Allocation', render: (r) => <span>{r.allocation_percent ?? r.allocationPct ?? '—'}</span> }
    ],
    [contract?.currency]
  );

  const scheduleColumns = useMemo(
    () => [
      { header: 'Date', render: (r) => <span>{formatDate(r.date ?? r.recognition_date)}</span> },
      { header: 'Amount', render: (r) => <span>{formatCurrency(r.amount ?? r.revenue_amount ?? 0, contract?.currency)}</span> },
      { header: 'Status', render: (r) => <Badge tone={(r.status ?? 'pending') === 'posted' ? 'success' : 'muted'}>{r.status ?? 'pending'}</Badge> }
    ],
    [contract?.currency]
  );

  const costColumns = useMemo(
    () => [
      { header: 'Name', render: (r) => <span className="font-medium text-slate-800">{r.name ?? '—'}</span> },
      { header: 'Amount', render: (r) => <span>{formatCurrency(r.amount ?? 0, contract?.currency)}</span> },
      { header: 'Method', render: (r) => <span className="text-sm text-slate-700">{r.recognition_method ?? '—'}</span> }
    ],
    [contract?.currency]
  );

  const status = contract?.status ?? 'draft';

  if (isLoading) return <div className="text-sm text-slate-600">Loading…</div>;
  if (error) return <div className="text-sm text-red-600">{String(error?.message ?? error)}</div>;

  return (
    <div className="space-y-4">
      <PageHeader
        title={contract?.name ?? `Contract ${contractId}`}
        subtitle={`IFRS 15 contract • ${contract?.code ?? ''}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate(ROUTES.complianceIfrs15)} leftIcon={ArrowLeft}>
              Back
            </Button>
            <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: qk.ifrs15Contract(contractId) })} leftIcon={RefreshCw}>
              Refresh
            </Button>
            {status !== 'active' ? (
              <Button variant="primary" onClick={() => setConfirmActivate(true)}>
                Activate
              </Button>
            ) : null}
          </div>
        }
      />

      <ContentCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm text-slate-700">Customer</div>
            <div className="text-sm font-medium text-slate-900">{contract?.customer_name ?? contract?.customer?.name ?? contract?.customer_id ?? '—'}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-slate-700">Status</div>
            <Badge tone={status === 'active' ? 'success' : 'muted'}>{status}</Badge>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-slate-700">Transaction price</div>
            <div className="text-sm font-medium text-slate-900">{formatCurrency(contract?.total_transaction_price ?? contract?.transaction_price ?? 0, contract?.currency)}</div>
          </div>
        </div>
      </ContentCard>

      <ContentCard>
        <Tabs
          tabs={[
            {
              value: 'obligations',
              label: 'Obligations',
              content: (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button leftIcon={Plus} variant="primary" onClick={() => setObligationOpen(true)}>
                      Add obligation
                    </Button>
                  </div>
                  <DataTable
                    columns={obligationColumns}
                    rows={Array.isArray(obligations) ? obligations : []}
                    empty={{ title: 'No obligations', description: 'Add performance obligations to allocate revenue.' }}
                  />
                </div>
              )
            },
            {
              value: 'schedule',
              label: 'Schedule',
              content: (
                <div className="space-y-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={() => setConfirmGenSchedule(true)}>
                      Generate schedule
                    </Button>
                    <Button variant="primary" onClick={() => setPostOpen(true)}>
                      Post / Preview
                    </Button>
                  </div>
                  <DataTable
                    columns={scheduleColumns}
                    rows={scheduleRows}
                    empty={{ title: 'No schedule', description: 'Generate the revenue recognition schedule.' }}
                  />
                </div>
              )
            },
            {
              value: 'costs',
              label: 'Costs',
              content: (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button leftIcon={Plus} variant="primary" onClick={() => setCostOpen(true)}>
                      Add cost
                    </Button>
                  </div>
                  <DataTable
                    columns={costColumns}
                    rows={costRows}
                    empty={{ title: 'No costs', description: 'Track incremental and fulfilment costs and their amortisation.' }}
                  />
                </div>
              )
            }
          ]}
        />
      </ContentCard>

      <ConfirmDialog
        open={confirmActivate}
        title="Activate contract"
        message="Activate this contract? You should have obligations and accounting mappings configured."
        confirmText="Activate"
        onClose={() => setConfirmActivate(false)}
        onConfirm={() => activateMutation.mutate()}
      />

      <ConfirmDialog
        open={confirmGenSchedule}
        title="Generate schedule"
        message="Regenerate the recognition schedule? This may overwrite existing schedule lines."
        confirmText="Generate"
        onClose={() => setConfirmGenSchedule(false)}
        onConfirm={() => genScheduleMutation.mutate()}
      />

      <Modal
        open={obligationOpen}
        title="Add performance obligation"
        onClose={() => setObligationOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setObligationOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => addObligationMutation.mutate()} disabled={addObligationMutation.isPending}>
              Save
            </Button>
          </div>
        }
      >
        <Input label="Name" value={obligationForm.name} onChange={(e) => setObligationForm((s) => ({ ...s, name: e.target.value }))} />
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input label="Standalone selling price" type="number" value={obligationForm.standalone_selling_price} onChange={(e) => setObligationForm((s) => ({ ...s, standalone_selling_price: e.target.value }))} />
          <Input label="Allocation % (optional)" type="number" value={obligationForm.allocation_percent} onChange={(e) => setObligationForm((s) => ({ ...s, allocation_percent: e.target.value }))} />
        </div>
      </Modal>

      <Modal
        open={costOpen}
        title="Add contract cost"
        onClose={() => setCostOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCostOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => addCostMutation.mutate()} disabled={addCostMutation.isPending}>
              Save
            </Button>
          </div>
        }
      >
        <Input label="Name" value={costForm.name} onChange={(e) => setCostForm((s) => ({ ...s, name: e.target.value }))} />
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input label="Amount" type="number" value={costForm.amount} onChange={(e) => setCostForm((s) => ({ ...s, amount: e.target.value }))} />
          <Select
            label="Recognition method"
            value={costForm.recognition_method}
            onChange={(e) => setCostForm((s) => ({ ...s, recognition_method: e.target.value }))}
            options={[
              { value: 'straight_line', label: 'Straight line' },
              { value: 'units_of_delivery', label: 'Units of delivery' },
              { value: 'other', label: 'Other' }
            ]}
          />
          <Input label="Start date" type="date" value={costForm.start_date} onChange={(e) => setCostForm((s) => ({ ...s, start_date: e.target.value }))} />
          <Input label="End date" type="date" value={costForm.end_date} onChange={(e) => setCostForm((s) => ({ ...s, end_date: e.target.value }))} />
        </div>
      </Modal>

      <Modal
        open={postOpen}
        title="Post / preview revenue"
        onClose={() => setPostOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPostOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => postRevenueMutation.mutate()} disabled={postRevenueMutation.isPending}>
              Run
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Posting date" type="date" value={postForm.posting_date} onChange={(e) => setPostForm((s) => ({ ...s, posting_date: e.target.value }))} />
          <Select label="Period" value={postForm.period_id} onChange={(e) => setPostForm((s) => ({ ...s, period_id: e.target.value }))} options={periodOptions} />
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
        <Textarea className="mt-3" label="Memo (optional)" value={postForm.memo} onChange={(e) => setPostForm((s) => ({ ...s, memo: e.target.value }))} />
      </Modal>
    </div>
  );
}
