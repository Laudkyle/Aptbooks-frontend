import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit2, Save, X, Filter, AlertCircle } from 'lucide-react';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeCoaApi } from '../api/coa.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';

const ACCOUNT_TYPES = [
  { value: '', label: 'All types' },
  { value: 'ASSET', label: 'Asset' },
  { value: 'LIABILITY', label: 'Liability' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'REVENUE', label: 'Revenue' },
  { value: 'EXPENSE', label: 'Expense' }
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active only' },
  { value: 'inactive', label: 'Inactive only' },
  { value: 'all', label: 'All statuses' }
];

const TYPE_COLORS = {
  ASSET: 'bg-blue-100 text-blue-800 border-blue-200',
  LIABILITY: 'bg-red-100 text-red-800 border-red-200',
  EQUITY: 'bg-purple-100 text-purple-800 border-purple-200',
  REVENUE: 'bg-green-100 text-green-800 border-green-200',
  EXPENSE: 'bg-orange-100 text-orange-800 border-orange-200'
};

export default function AccountList() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeCoaApi(http), [http]);
  const toast = useToast();
  const qc = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const query = useQuery({
    queryKey: ['coa', statusFilter],
    queryFn: () => api.list({ includeArchived: statusFilter === 'all' }),
    staleTime: 10_000
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.update(id, data),
    onSuccess: () => {
      toast.success('Account updated successfully');
      qc.invalidateQueries({ queryKey: ['coa'] });
      setEditingId(null);
      setEditForm({});
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to update account')
  });

  const accounts = Array.isArray(query.data) ? query.data : query.data?.data ?? [];

  // Client-side filtering
  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const searchString = `${account.code ?? ''} ${account.name ?? ''} ${account.categoryName ?? account.category_name ?? ''}`.toLowerCase();
      const matchesSearch = !searchTerm || searchString.includes(searchTerm.toLowerCase());
      const matchesType = !typeFilter || account.accountTypeCode === typeFilter || account.account_type_code === typeFilter;
      const matchesStatus = statusFilter === 'all' || account.status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [accounts, searchTerm, typeFilter, statusFilter]);

  const typeCounts = useMemo(() => {
    const counts = { all: accounts.length, ASSET: 0, LIABILITY: 0, EQUITY: 0, REVENUE: 0, EXPENSE: 0 };
    accounts.forEach((acc) => {
      const type = acc.accountTypeCode || acc.account_type_code;
      if (counts[type] !== undefined) counts[type]++;
    });
    return counts;
  }, [accounts]);

  const startEdit = (account) => {
    setEditingId(account.id);
    setEditForm({
      name: account.name ?? '',
      code: account.code ?? '',
      categoryName: account.categoryName ?? account.category_name ?? '',
      status: account.status ?? 'active'
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = (id) => {
    updateMutation.mutate({ id, data: editForm });
  };

  const updateEditForm = (field, value) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const columns = useMemo(() => [
    { 
      header: 'Code',
      render: (r) => {
        if (editingId === r.id) {
          return (
            <Input
              value={editForm.code}
              onChange={(e) => updateEditForm('code', e.target.value)}
              className="w-24 text-xs"
            />
          );
        }
        return <span className="font-mono text-xs text-text-body">{r.code ?? '—'}</span>;
      }
    },
    {
      header: 'Name',
      render: (r) => {
        if (editingId === r.id) {
          return (
            <Input
              value={editForm.name}
              onChange={(e) => updateEditForm('name', e.target.value)}
              className="text-sm"
            />
          );
        }
        return (
          <Link 
            className="font-semibold text-blue-700 hover:text-blue-800 hover:underline" 
            to={ROUTES.accountingCoaDetail(r.id)}
          >
            {r.name ?? '—'}
          </Link>
        );
      }
    },
    { 
      header: 'Type',
      render: (r) => {
        const type = r.accountTypeCode ?? r.account_type_code ?? '—';
        return (
          <Badge 
            tone="subtle"
            className={`${TYPE_COLORS[type] || 'bg-surface-2 text-text-strong border-border-subtle'}`}
          >
            {type}
          </Badge>
        );
      }
    },
    { 
      header: 'Category',
      render: (r) => {
        if (editingId === r.id) {
          return (
            <Input
              value={editForm.categoryName}
              onChange={(e) => updateEditForm('categoryName', e.target.value)}
              className="text-sm"
            />
          );
        }
        return <span className="text-sm text-text-body">{r.categoryName ?? r.category_name ?? '—'}</span>;
      }
    },
    {
      header: 'Status',
      render: (r) => {
        if (editingId === r.id) {
          return (
            <select
              value={editForm.status}
              onChange={(e) => updateEditForm('status', e.target.value)}
              className="px-2 py-1 border border-border-subtle rounded text-xs focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          );
        }
        return (
          <Badge tone={r.status === 'active' ? 'success' : 'muted'}>
            {r.status ?? 'inactive'}
          </Badge>
        );
      }
    },
    {
      header: 'Actions',
      render: (r) => {
        if (editingId === r.id) {
          return (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => saveEdit(r.id)}
                loading={updateMutation.isPending}
                leftIcon={Save}
                iconOnly
                title="Save changes"
                className="text-green-600 hover:text-green-700"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEdit}
                leftIcon={X}
                iconOnly
                title="Cancel editing"
                className="text-red-600 hover:text-red-700"
              />
            </div>
          );
        }
        return (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => startEdit(r)}
            leftIcon={Edit2}
            iconOnly
            title="Edit account"
            className="text-blue-600 hover:text-blue-700"
          />
        );
      }
    }
  ], [editingId, editForm, updateMutation.isPending]);

  // Type card component
  const TypeCard = ({ type, label, color, count }) => (
    <button
      onClick={() => setTypeFilter(type)}
      className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
        typeFilter === type ? `border-${color}-500 shadow-sm` : 'border-slate-200'
      }`}
    >
      <div className={`text-2xl font-bold text-${color}-600`}>{count}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Maintain your account master data"
        icon={null}
        actions={
          <Button 
            onClick={() => navigate(ROUTES.accountingCoaNew)}
            leftIcon={Plus}
          >
            New Account
          </Button>
        }
      />

      {/* Type Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <button
          onClick={() => setTypeFilter('')}
          className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
            typeFilter === '' ? 'border-green-500 shadow-sm' : 'border-slate-200'
          }`}
        >
          <div className="text-2xl font-bold text-slate-900">{typeCounts.all}</div>
          <div className="text-xs text-slate-500 mt-1">All</div>
        </button>
        <button
          onClick={() => setTypeFilter('ASSET')}
          className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
            typeFilter === 'ASSET' ? 'border-blue-500 shadow-sm' : 'border-slate-200'
          }`}
        >
          <div className="text-2xl font-bold text-blue-600">{typeCounts.ASSET}</div>
          <div className="text-xs text-slate-500 mt-1">Assets</div>
        </button>
        <button
          onClick={() => setTypeFilter('LIABILITY')}
          className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
            typeFilter === 'LIABILITY' ? 'border-red-500 shadow-sm' : 'border-slate-200'
          }`}
        >
          <div className="text-2xl font-bold text-red-600">{typeCounts.LIABILITY}</div>
          <div className="text-xs text-slate-500 mt-1">Liabilities</div>
        </button>
        <button
          onClick={() => setTypeFilter('EQUITY')}
          className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
            typeFilter === 'EQUITY' ? 'border-purple-500 shadow-sm' : 'border-slate-200'
          }`}
        >
          <div className="text-2xl font-bold text-purple-600">{typeCounts.EQUITY}</div>
          <div className="text-xs text-slate-500 mt-1">Equity</div>
        </button>
        <button
          onClick={() => setTypeFilter('REVENUE')}
          className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
            typeFilter === 'REVENUE' ? 'border-green-500 shadow-sm' : 'border-slate-200'
          }`}
        >
          <div className="text-2xl font-bold text-green-600">{typeCounts.REVENUE}</div>
          <div className="text-xs text-slate-500 mt-1">Revenue</div>
        </button>
        <button
          onClick={() => setTypeFilter('EXPENSE')}
          className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
            typeFilter === 'EXPENSE' ? 'border-orange-500 shadow-sm' : 'border-slate-200'
          }`}
        >
          <div className="text-2xl font-bold text-orange-600">{typeCounts.EXPENSE}</div>
          <div className="text-xs text-slate-500 mt-1">Expenses</div>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <ContentCard>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 w-full">
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search code, name, or category..."
              leftIcon={Search}
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {searchTerm && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-900">{filteredAccounts.length}</span> of{' '}
              <span className="font-semibold text-slate-900">{accounts.length}</span> accounts
            </p>
          </div>
        )}
      </ContentCard>

      {/* Data Table */}
      <ContentCard>
        <div className="mb-4">
          <div className="text-base font-semibold text-slate-900">Account List</div>
          <div className="mt-1 text-sm text-slate-500">
            View and manage your chart of accounts
          </div>
        </div>

        {query.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-red-800">Failed to load accounts</div>
                <div className="text-sm text-red-700 mt-1">{query.error?.message ?? 'An error occurred'}</div>
              </div>
            </div>
          </div>
        ) : query.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading accounts...</div>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-medium text-slate-900 mb-1">No accounts found</div>
            <div className="text-sm text-slate-500 mb-4">
              {typeFilter 
                ? `No ${typeFilter.toLowerCase()} accounts to display` 
                : 'Create an account or adjust your filters'}
            </div>
            {!typeFilter && (
              <Button 
                onClick={() => navigate(ROUTES.accountingCoaNew)}
                leftIcon={Plus}
              >
                Create Account
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredAccounts.map((account, idx) => (
                  <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className="px-4 py-3 whitespace-nowrap">
                        {col.render(account)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>
    </div>
  );
}