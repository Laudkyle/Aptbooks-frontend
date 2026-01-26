import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeBankingApi } from '../api/banking.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

function normalizeRows(data) {
  return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : data?.rows ?? [];
}

export default function BankAccountsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { http } = useApi();
  const api = useMemo(() => makeBankingApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);

  const [filters, setFilters] = useState({ q: '', status: 'all' });
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', currencyCode: 'GHS', glAccountId: '', isActive: true });

  const accountsQuery = useQuery({
    queryKey: ['banking.accounts'],
    queryFn: async () => api.listAccounts()
  });

  const coaQuery = useQuery({
    queryKey: ['coa.list'],
    queryFn: async () => coaApi.listAccounts?.() ?? coaApi.list?.() ?? []
  });

  const currenciesQuery = useQuery({
    queryKey: ['currencies.list'],
    queryFn: async () => api.listCurrencies(http)
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => api.createAccount(payload),
    onSuccess: () => {
      toast.success('Bank account created.');
      setCreateOpen(false);
      setForm({ code: '', name: '', currencyCode: 'GHS', glAccountId: '', isActive: true });
      qc.invalidateQueries({ queryKey: ['banking.accounts'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error ?? e?.message ?? 'Failed to create bank account.')
  });

  const rows = normalizeRows(accountsQuery.data);
  const q = (filters.q ?? '').trim().toLowerCase();
  const filtered = rows.filter((r) => {
    const hay = `${r.code ?? ''} ${r.name ?? ''} ${r.currency_code ?? ''}`.toLowerCase();
    const matchesQ = !q || hay.includes(q);
    const active = r.is_active ?? r.isActive;
    const matchesStatus =
      filters.status === 'all' ? true : filters.status === 'active' ? !!active : filters.status === 'inactive' ? !active : true;
    return matchesQ && matchesStatus;
  });

  const coaRows = normalizeRows(coaQuery.data);
  const coaOptions = [{ value: '', label: 'Select GL account' }].concat(
    coaRows.map((a) => ({
      value: String(a.id),
      label: `${a.code ?? a.account_code ?? ''} — ${a.name ?? a.account_name ?? ''}`.trim()
    }))
  );

  const currencyRows = normalizeRows(currenciesQuery.data?.data);
  console.log('currencyRows', currenciesQuery);
  const currencyOptions = [{ value: '', label: 'Select currency' }].concat(
    currencyRows.map((c) => ({
      value: c.code ?? c.currency_code,
      label: `${c.code ?? c.currency_code} — ${c.name ?? c.currency_name ?? ''}`.trim()
    }))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* QuickBooks-style Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Bank Accounts</h1>
            <p className="mt-1 text-sm text-gray-600">
              GL-linked bank accounts for statements, cashbook, and reconciliations
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            // className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-md font-medium transition-colors shadow-sm"
          >
            New Bank Account
          </Button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Filters Section */}
          <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
            <div className="grid gap-3 md:grid-cols-4">
              <Input
                label="Search"
                placeholder="Code, name, currency"
                value={filters.q}
                onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
              />
              <Select
                label="Status"
                value={filters.status}
                onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
              />
              <div className="flex items-end">
                <Button
                  onClick={() => accountsQuery.refetch()}
                  className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-50 transition-colors"
                >
                  Refresh
                </Button>
              </div>
              <div className="flex items-end justify-end">
                <span className="text-xs text-gray-500 font-mono">/modules/banking/accounts</span>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="overflow-x-auto">
            {accountsQuery.isLoading ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">Loading bank accounts...</div>
            ) : accountsQuery.isError ? (
              <div className="px-6 py-8 text-center text-sm text-red-600">
                {accountsQuery.error?.message ?? 'Failed to load accounts.'}
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Currency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        GL Account
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                          {rows.length === 0 
                            ? 'No bank accounts found. Create your first bank account to get started.'
                            : 'No accounts match the current filters.'}
                        </td>
                      </tr>
                    ) : (
                      filtered.map((r) => {
                        const active = r.is_active ?? r.isActive;
                        return (
                          <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.code ?? '—'}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{r.name ?? '—'}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                {r.currency_code ?? r.currencyCode ?? '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-mono text-gray-600">
                              {r.gl_account_id ?? r.glAccountId ?? '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        title="Create Bank Account"
        onClose={() => (createMutation.isLoading ? null : setCreateOpen(false))}
        footer={
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
            <Button
              onClick={() => setCreateOpen(false)}
              disabled={createMutation.isLoading}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  code: form.code?.trim(),
                  name: form.name?.trim(),
                  currencyCode: form.currencyCode,
                  glAccountId: form.glAccountId,
                  isActive: !!form.isActive
                })
              }
              disabled={
                createMutation.isLoading || !form.code?.trim() || !form.name?.trim() || !form.currencyCode || !form.glAccountId
              }
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {createMutation.isLoading ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
        }
      >
        <div className="px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Account Code"
              placeholder="e.g., GCB-001"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            />
            <Select
              label="Currency"
              value={form.currencyCode}
              onChange={(e) => setForm((p) => ({ ...p, currencyCode: e.target.value }))}
              options={currencyOptions}
            />
            <div className="md:col-span-2">
              <Input
                label="Account Name"
                placeholder="e.g., GCB Main Account"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Select
                label="GL Account"
                value={form.glAccountId}
                onChange={(e) => setForm((p) => ({ ...p, glAccountId: e.target.value }))}
                options={coaOptions}
              />
              <p className="mt-1.5 text-xs text-gray-600">
                Select the general ledger account that represents this bank account
              </p>
            </div>
            <Select
              label="Status"
              value={form.isActive ? 'active' : 'inactive'}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === 'active' }))}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
          </div>
          
        </div>
      </Modal>
    </div>
  );
}