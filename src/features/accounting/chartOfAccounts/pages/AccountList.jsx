import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit2, Save, X } from 'lucide-react';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeCoaApi } from '../api/coa.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../../shared/components/data/DataTable.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
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
        return <span className="font-mono text-xs text-gray-700">{r.code ?? '—'}</span>;
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
        const typeColors = {
          ASSET: 'bg-blue-100 text-blue-800 border-blue-200',
          LIABILITY: 'bg-red-100 text-red-800 border-red-200',
          EQUITY: 'bg-purple-100 text-purple-800 border-purple-200',
          REVENUE: 'bg-green-100 text-green-800 border-green-200',
          EXPENSE: 'bg-orange-100 text-orange-800 border-orange-200'
        };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${typeColors[type] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
            {type}
          </span>
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
        return <span className="text-sm text-gray-700">{r.categoryName ?? r.category_name ?? '—'}</span>;
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
              className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          );
        }
        const statusColors = {
          active: 'bg-green-100 text-green-800 border-green-200',
          inactive: 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[r.status] || statusColors.inactive}`}>
            {r.status ?? 'inactive'}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      render: (r) => {
        if (editingId === r.id) {
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveEdit(r.id)}
                disabled={updateMutation.isPending}
                className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-50"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                onClick={cancelEdit}
                className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        }
        return (
          <button
            onClick={() => startEdit(r)}
            className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        );
      }
    }
  ], [editingId, editForm, updateMutation.isPending]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Chart of Accounts</h1>
              <p className="text-sm text-gray-600">
                Maintain your account master data
              </p>
            </div>
            <Button 
              onClick={() => navigate(ROUTES.accountingCoaNew)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Account
            </Button>
          </div>
        </div>

        {/* Type Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <button
            onClick={() => setTypeFilter('')}
            className={`bg-white rounded-lg border-2 p-3 text-left transition-all hover:shadow-md ${
              typeFilter === '' ? 'border-green-500 shadow-sm' : 'border-gray-200'
            }`}
          >
            <div className="text-xl font-bold text-gray-900">{typeCounts.all}</div>
            <div className="text-xs text-gray-600 mt-1">All</div>
          </button>
          <button
            onClick={() => setTypeFilter('ASSET')}
            className={`bg-white rounded-lg border-2 p-3 text-left transition-all hover:shadow-md ${
              typeFilter === 'ASSET' ? 'border-blue-500 shadow-sm' : 'border-gray-200'
            }`}
          >
            <div className="text-xl font-bold text-blue-600">{typeCounts.ASSET}</div>
            <div className="text-xs text-gray-600 mt-1">Assets</div>
          </button>
          <button
            onClick={() => setTypeFilter('LIABILITY')}
            className={`bg-white rounded-lg border-2 p-3 text-left transition-all hover:shadow-md ${
              typeFilter === 'LIABILITY' ? 'border-red-500 shadow-sm' : 'border-gray-200'
            }`}
          >
            <div className="text-xl font-bold text-red-600">{typeCounts.LIABILITY}</div>
            <div className="text-xs text-gray-600 mt-1">Liabilities</div>
          </button>
          <button
            onClick={() => setTypeFilter('EQUITY')}
            className={`bg-white rounded-lg border-2 p-3 text-left transition-all hover:shadow-md ${
              typeFilter === 'EQUITY' ? 'border-purple-500 shadow-sm' : 'border-gray-200'
            }`}
          >
            <div className="text-xl font-bold text-purple-600">{typeCounts.EQUITY}</div>
            <div className="text-xs text-gray-600 mt-1">Equity</div>
          </button>
          <button
            onClick={() => setTypeFilter('REVENUE')}
            className={`bg-white rounded-lg border-2 p-3 text-left transition-all hover:shadow-md ${
              typeFilter === 'REVENUE' ? 'border-green-500 shadow-sm' : 'border-gray-200'
            }`}
          >
            <div className="text-xl font-bold text-green-600">{typeCounts.REVENUE}</div>
            <div className="text-xs text-gray-600 mt-1">Revenue</div>
          </button>
          <button
            onClick={() => setTypeFilter('EXPENSE')}
            className={`bg-white rounded-lg border-2 p-3 text-left transition-all hover:shadow-md ${
              typeFilter === 'EXPENSE' ? 'border-orange-500 shadow-sm' : 'border-gray-200'
            }`}
          >
            <div className="text-xl font-bold text-orange-600">{typeCounts.EXPENSE}</div>
            <div className="text-xs text-gray-600 mt-1">Expenses</div>
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search code, name, or category..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div className="w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
              >
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
                <option value="all">All statuses</option>
              </select>
            </div>
          </div>
          
          {searchTerm && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredAccounts.length}</span> of <span className="font-semibold text-gray-900">{accounts.length}</span> accounts
              </p>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {query.isError ? (
            <div className="p-12 text-center">
              <div className="bg-red-50 rounded-lg p-6 max-w-md mx-auto">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-red-800 mb-1">Failed to load accounts</h3>
                    <p className="text-sm text-red-700">{query.error?.message ?? 'An error occurred'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={filteredAccounts}
              isLoading={query.isLoading}
              empty={{ 
                title: 'No accounts found', 
                description: typeFilter 
                  ? `No ${typeFilter.toLowerCase()} accounts to display` 
                  : 'Create an account or adjust your filters'
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}