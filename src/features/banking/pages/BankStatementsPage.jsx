import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeBankingApi } from '../api/banking.api.js';

import { ROUTES } from '../../../app/constants/routes.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

function normalizeRows(data) {
  return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : data?.rows ?? [];
}

export default function BankStatementsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { http } = useApi();
  const api = useMemo(() => makeBankingApi(http), [http]);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ bankAccountId: '', statementDate: '', openingBalance: '', closingBalance: '' });
  const [q, setQ] = useState('');

  const accountsQuery = useQuery({ queryKey: ['banking.accounts'], queryFn: async () => api.listAccounts() });
  const statementsQuery = useQuery({ queryKey: ['banking.statements'], queryFn: async () => api.listStatements() });

  const createMutation = useMutation({
    mutationFn: async (payload) => api.createStatement(payload),
    onSuccess: () => {
      toast.success('Statement created.');
      setCreateOpen(false);
      setForm({ bankAccountId: '', statementDate: '', openingBalance: '', closingBalance: '' });
      qc.invalidateQueries({ queryKey: ['banking.statements'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error ?? e?.message ?? 'Failed to create statement.')
  });

  const accounts = normalizeRows(accountsQuery.data);
  const statements = normalizeRows(statementsQuery.data);

  const accountsById = useMemo(() => {
    const m = new Map();
    accounts.forEach((a) => m.set(String(a.id), a));
    return m;
  }, [accounts]);

  const ql = q.trim().toLowerCase();
  const filtered = statements.filter((s) => {
    const acc = accountsById.get(String(s.bank_account_id ?? s.bankAccountId)) ?? null;
    const hay = `${s.statement_date ?? ''} ${acc?.code ?? ''} ${acc?.name ?? ''}`.toLowerCase();
    return !ql || hay.includes(ql);
  });

  const accountOptions = [{ value: '', label: 'Select bank account' }].concat(
    accounts.map((a) => ({ value: String(a.id), label: `${a.code ?? ''} — ${a.name ?? ''}`.trim() }))
  );

  return (
    <>
      <PageHeader
        title="Statements"
        subtitle="Create statements, import lines, and match to posted journals."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            Create statement
          </Button>
        }
      />

      <ContentCard
        title="Bank statements"
        actions={<Badge variant="info">/modules/banking/statements</Badge>}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Search" placeholder="Date, bank account" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="md:col-span-2 flex items-end justify-end gap-2">
            <Button variant="secondary" onClick={() => statementsQuery.refetch()}>
              Refresh
            </Button>
          </div>
        </div>

        {statementsQuery.isLoading ? (
          <div className="mt-4 text-sm text-slate-700">Loading...</div>
        ) : statementsQuery.isError ? (
          <div className="mt-4 text-sm text-red-700">{statementsQuery.error?.message ?? 'Failed to load statements.'}</div>
        ) : (
          <div className="mt-4">
            <Table
              columns={[
                {
                  header: 'Statement date',
                  key: 'statement_date',
                  render: (r) => <span className="font-mono text-xs">{r.statement_date ?? '—'}</span>
                },
                {
                  header: 'Bank account',
                  key: 'bank',
                  render: (r) => {
                    const acc = accountsById.get(String(r.bank_account_id ?? r.bankAccountId));
                    return acc ? (
                      <div>
                        <div className="text-sm font-medium">{acc.code}</div>
                        <div className="text-xs text-slate-500">{acc.name}</div>
                      </div>
                    ) : (
                      <span className="text-slate-500">{String(r.bank_account_id ?? '—')}</span>
                    );
                  }
                },
                {
                  header: 'Opening',
                  key: 'opening_balance',
                  render: (r) => <span className="font-mono text-xs">{r.opening_balance ?? '—'}</span>
                },
                {
                  header: 'Closing',
                  key: 'closing_balance',
                  render: (r) => <span className="font-mono text-xs">{r.closing_balance ?? '—'}</span>
                },
                {
                  header: '',
                  key: 'actions',
                  render: (r) => (
                    <Button size="sm" onClick={() => nav(ROUTES.bankingStatementDetail(r.id))}>
                      Open
                    </Button>
                  )
                }
              ]}
              rows={filtered}
              keyField="id"
            />
            {filtered.length === 0 ? <div className="mt-3 text-sm text-slate-600">No statements found.</div> : null}
          </div>
        )}
      </ContentCard>

      <Modal
        open={createOpen}
        title="Create statement"
        onClose={() => (createMutation.isLoading ? null : setCreateOpen(false))}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={createMutation.isLoading}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  bankAccountId: form.bankAccountId,
                  statementDate: form.statementDate,
                  openingBalance: form.openingBalance === '' ? 0 : Number(form.openingBalance),
                  closingBalance: form.closingBalance === '' ? 0 : Number(form.closingBalance)
                })
              }
              disabled={
                createMutation.isLoading ||
                !form.bankAccountId ||
                !form.statementDate
              }
            >
              Create
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Bank account"
            value={form.bankAccountId}
            onChange={(e) => setForm((p) => ({ ...p, bankAccountId: e.target.value }))}
            options={accountOptions}
          />
          <Input
            label="Statement date"
            placeholder="YYYY-MM-DD"
            value={form.statementDate}
            onChange={(e) => setForm((p) => ({ ...p, statementDate: e.target.value }))}
          />
          <Input
            label="Opening balance"
            placeholder="0"
            value={form.openingBalance}
            onChange={(e) => setForm((p) => ({ ...p, openingBalance: e.target.value }))}
          />
          <Input
            label="Closing balance"
            placeholder="0"
            value={form.closingBalance}
            onChange={(e) => setForm((p) => ({ ...p, closingBalance: e.target.value }))}
          />
          <div className="md:col-span-2 text-xs text-slate-500">
            After creating a statement, open it to import lines (JSON or CSV) and run matching.
          </div>
        </div>
      </Modal>
    </>
  );
}
