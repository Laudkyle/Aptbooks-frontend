import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeBankingApi } from '../api/banking.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

function normalizeRows(data) {
  if (Array.isArray(data?.data)) return data.data;
  return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : data?.rows ?? [];
}

function defaultRuleForm() {
  return {
    name: '',
    is_active: true,
    amount_tolerance: 0,
    date_window_days: 3,
    description_similarity_min: 0.3,
    priority: 100
  };
}

export default function MatchingRulesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { http } = useApi();
  const api = useMemo(() => makeBankingApi(http), [http]);

  const [q, setQ] = useState('');
  const [activeOnly, setActiveOnly] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(defaultRuleForm());
  const [editId, setEditId] = useState(null);

  const rulesQuery = useQuery({ queryKey: ['banking.matching.rules'], queryFn: async () => api.listRules() });

  const createMutation = useMutation({
    mutationFn: async (payload) => api.createRule(payload),
    onSuccess: () => {
      toast.success('Rule created.');
      setCreateOpen(false);
      setForm(defaultRuleForm());
      qc.invalidateQueries({ queryKey: ['banking.matching.rules'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error ?? e?.message ?? 'Failed to create rule.')
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => api.updateRule(id, payload),
    onSuccess: () => {
      toast.success('Rule updated.');
      setEditOpen(false);
      setEditId(null);
      setForm(defaultRuleForm());
      qc.invalidateQueries({ queryKey: ['banking.matching.rules'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error ?? e?.message ?? 'Failed to update rule.')
  });

  const rows = normalizeRows(rulesQuery.data);
  const ql = q.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    const matchesQ = !ql || `${r.name ?? ''}`.toLowerCase().includes(ql);
    const active = r.is_active ?? r.isActive;
    const matchesActive = activeOnly === 'all' ? true : activeOnly === 'active' ? !!active : !active;
    return matchesQ && matchesActive;
  });

  const openCreate = () => {
    setForm(defaultRuleForm());
    setCreateOpen(true);
  };

  const openEdit = (r) => {
    setEditId(r.id);
    setForm({
      name: r.name ?? '',
      is_active: !!(r.is_active ?? r.isActive ?? true),
      amount_tolerance: Number(r.amount_tolerance ?? 0),
      date_window_days: Number(r.date_window_days ?? 3),
      description_similarity_min: Number(r.description_similarity_min ?? 0.3),
      priority: Number(r.priority ?? 100)
    });
    setEditOpen(true);
  };

  const submitPayload = {
    name: form.name?.trim(),
    is_active: !!form.is_active,
    amount_tolerance: Number(form.amount_tolerance ?? 0),
    date_window_days: Number(form.date_window_days ?? 3),
    description_similarity_min: Number(form.description_similarity_min ?? 0.3),
    priority: Number(form.priority ?? 100)
  };

  return (
    <>
      <PageHeader
        title="Matching rules"
        subtitle="Control automated matching tolerance, date windows, similarity threshold and priority."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => rulesQuery.refetch()}>
              Refresh
            </Button>
            <Button onClick={openCreate}>Create rule</Button>
          </div>
        }
      />

      <ContentCard title="Rules" actions={<Badge variant="info">/modules/banking/matching/rules</Badge>}>
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Search" placeholder="Rule name" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select
            label="Status"
            value={activeOnly}
            onChange={(e) => setActiveOnly(e.target.value)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
          />
          <div className="text-xs text-slate-500 md:self-end">
            Create/Update uses idempotency key.
          </div>
        </div>

        <div className="mt-4">
          {rulesQuery.isLoading ? (
            <div className="text-sm text-slate-700">Loading...</div>
          ) : rulesQuery.isError ? (
            <div className="text-sm text-red-700">{rulesQuery.error?.message ?? 'Failed to load rules.'}</div>
          ) : (
            <>
              <Table
                columns={[
                  { header: 'Name', att: 'name' },
                  {
                    header: 'Active',
                    key: 'is_active',
                    render: (r) => <Badge variant={(r.is_active ?? r.isActive) ? 'success' : 'secondary'}>{(r.is_active ?? r.isActive) ? 'yes' : 'no'}</Badge>
                  },
                  { header: 'Tolerance', key: 'amount_tolerance', render: (r) => <span className="font-mono text-xs">{r.amount_tolerance ?? 0}</span> },
                  { header: 'Window (days)', key: 'date_window_days', render: (r) => <span className="font-mono text-xs">{r.date_window_days ?? 3}</span> },
                  { header: 'Similarity', key: 'description_similarity_min', render: (r) => <span className="font-mono text-xs">{r.description_similarity_min ?? 0.3}</span> },
                  { header: 'Priority', key: 'priority', render: (r) => <span className="font-mono text-xs">{r.priority ?? 100}</span> },
                  { header: '', key: 'act', render: (r) => <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button> }
                ]}
                rows={filtered}
                keyField="id"
              />
              {filtered.length === 0 ? <div className="mt-3 text-sm text-slate-600">No rules found.</div> : null}
            </>
          )}
        </div>
      </ContentCard>

      <Modal
        open={createOpen}
        title="Create matching rule"
        onClose={() => (createMutation.isLoading ? null : setCreateOpen(false))}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={createMutation.isLoading}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(submitPayload)}
              disabled={createMutation.isLoading || !submitPayload.name}
            >
              Create
            </Button>
          </div>
        }
      >
        <RuleForm form={form} setForm={setForm} />
      </Modal>

      <Modal
        open={editOpen}
        title="Edit matching rule"
        onClose={() => (updateMutation.isLoading ? null : setEditOpen(false))}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={updateMutation.isLoading}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate({ id: editId, payload: submitPayload })}
              disabled={updateMutation.isLoading || !editId || !submitPayload.name}
            >
              Save
            </Button>
          </div>
        }
      >
        <RuleForm form={form} setForm={setForm} />
      </Modal>
    </>
  );
}

function RuleForm({ form, setForm }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Input label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
      <Select
        label="Active"
        value={form.is_active ? 'true' : 'false'}
        onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === 'true' }))}
        options={[
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' }
        ]}
      />
      <Input
        label="Amount tolerance"
        value={String(form.amount_tolerance)}
        onChange={(e) => setForm((p) => ({ ...p, amount_tolerance: e.target.value }))}
      />
      <Input
        label="Date window (days)"
        value={String(form.date_window_days)}
        onChange={(e) => setForm((p) => ({ ...p, date_window_days: e.target.value }))}
      />
      <Input
        label="Description similarity min"
        value={String(form.description_similarity_min)}
        onChange={(e) => setForm((p) => ({ ...p, description_similarity_min: e.target.value }))}
      />
      <Input
        label="Priority"
        value={String(form.priority)}
        onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
      />
      <div className="md:col-span-2 text-xs text-slate-500">
        Higher priority rules are evaluated first. Tune tolerances and windows carefully to avoid false positives.
      </div>
    </div>
  );
}
