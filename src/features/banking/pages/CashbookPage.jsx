import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeBankingApi } from '../api/banking.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';
import { Pagination } from '../../../shared/components/ui/Pagination.jsx';

function normalizeRows(data) {
  return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : data?.rows ?? [];
}

export default function CashbookPage() {
  const { http } = useApi();
  const api = useMemo(() => makeBankingApi(http), [http]);

  const [filters, setFilters] = useState({ bankAccountId: '', dateFrom: '', dateTo: '', includeRunningBalance: 'false' });
  const [paging, setPaging] = useState({ limit: 200, offset: 0 });

  const accountsQuery = useQuery({ queryKey: ['banking.accounts'], queryFn: async () => api.listAccounts() });

  const cashbookParams = useMemo(
    () => ({
      ...paging,
      ...(filters.bankAccountId ? { bankAccountId: filters.bankAccountId } : {}),
      ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
      ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
      includeRunningBalance: filters.includeRunningBalance
    }),
    [filters, paging]
  );

  const cashbookQuery = useQuery({
    queryKey: ['banking.cashbook', cashbookParams],
    queryFn: async () => api.listCashbook(cashbookParams),
    keepPreviousData: true
  });

  const accounts = normalizeRows(accountsQuery.data);
  const accountOptions = [{ value: '', label: 'All bank accounts' }].concat(
    accounts.map((a) => ({ value: String(a.id), label: `${a.code ?? ''} — ${a.name ?? ''}`.trim() }))
  );

  const payload = cashbookQuery.data;
  const rows = Array.isArray(payload?.data) ? payload.data : normalizeRows(payload);

  return (
    <>
      <PageHeader
        title="Cashbook"
        subtitle="Ledger-aligned bank transactions view (optionally with running balance)."
        actions={
          <Button variant="secondary" onClick={() => cashbookQuery.refetch()}>
            Refresh
          </Button>
        }
      />

      <ContentCard title="Cashbook" actions={<Badge variant="info">GET /modules/banking/cashbook</Badge>}>
        <div className="grid gap-3 md:grid-cols-4">
          <Select
            label="Bank account"
            value={filters.bankAccountId}
            onChange={(e) => {
              setPaging((p) => ({ ...p, offset: 0 }));
              setFilters((p) => ({ ...p, bankAccountId: e.target.value }));
            }}
            options={accountOptions}
          />
          <Input
            label="From"
            placeholder="YYYY-MM-DD"
            value={filters.dateFrom}
            onChange={(e) => {
              setPaging((p) => ({ ...p, offset: 0 }));
              setFilters((p) => ({ ...p, dateFrom: e.target.value }));
            }}
          />
          <Input
            label="To"
            placeholder="YYYY-MM-DD"
            value={filters.dateTo}
            onChange={(e) => {
              setPaging((p) => ({ ...p, offset: 0 }));
              setFilters((p) => ({ ...p, dateTo: e.target.value }));
            }}
          />
          <Select
            label="Running balance"
            value={filters.includeRunningBalance}
            onChange={(e) => {
              setPaging((p) => ({ ...p, offset: 0 }));
              setFilters((p) => ({ ...p, includeRunningBalance: e.target.value }));
            }}
            options={[
              { value: 'false', label: 'Off' },
              { value: 'true', label: 'On' }
            ]}
          />
        </div>

        <div className="mt-4">
          {cashbookQuery.isLoading ? (
            <div className="text-sm text-slate-700">Loading...</div>
          ) : cashbookQuery.isError ? (
            <div className="text-sm text-red-700">{cashbookQuery.error?.message ?? 'Failed to load cashbook.'}</div>
          ) : (
            <>
              <Table
                columns={[
                  { header: 'Date', key: 'txn_date', render: (r) => <span className="font-mono text-xs">{r.txn_date ?? '—'}</span> },
                  { header: 'Description', att: 'description' },
                  { header: 'Reference', att: 'reference', className: 'font-mono text-xs' },
                  { header: 'Amount', key: 'amount', render: (r) => <span className="font-mono text-xs">{r.amount ?? '—'}</span> },
                  { header: 'Source', att: 'source_type' },
                  { header: 'Journal', key: 'journal_entry_id', render: (r) => <span className="font-mono text-xs">{r.journal_entry_id ?? '—'}</span> },
                  ...(filters.includeRunningBalance === 'true'
                    ? [{ header: 'Running', key: 'running_balance', render: (r) => <span className="font-mono text-xs">{r.running_balance ?? '—'}</span> }]
                    : [])
                ]}
                rows={rows}
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
    </>
  );
}
