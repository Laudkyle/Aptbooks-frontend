import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HandCoins, Plus, Search, Download } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeCustomerReceiptsApi } from '../api/customerReceipts.api.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';


export default function CustomerReceiptList() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeCustomerReceiptsApi(http), [http]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading, error } = useQuery({
    queryKey: qk.customerReceipts(),
    queryFn: () => api.list()
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];

  // Client-side filtering
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch = !searchTerm || 
        (row.receiptNumber ?? row.code ?? row.id ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.customer_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.memo ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || (row.status ?? 'draft') === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchTerm, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = { all: rows.length, draft: 0, posted: 0 };
    rows.forEach((r) => {
      const status = r.status ?? 'draft';
      if (counts[status] !== undefined) counts[status]++;
    });
    return counts;
  }, [rows]);

  const columns = useMemo(
    () => [
      {
        header: 'Receipt #',
        render: (r) => (
          <div className="flex flex-col">
            <Link 
              to={ROUTES.customerReceiptDetail(r.id)} 
              className="font-semibold text-blue-700 hover:text-blue-800 hover:underline"
            >
              {r.receiptNumber ?? r.code ?? r.id}
            </Link>
            {r.memo && <div className="text-xs text-gray-500 mt-0.5">{r.memo}</div>}
          </div>
        )
      },
      { 
        header: 'Customer', 
        render: (r) => (
          <span className="text-sm text-gray-900 font-medium">
            {r.customer_name ?? r.customerId ?? '—'}
          </span>
        ) 
      },
      { 
        header: 'Receipt Date', 
        render: (r) => (
          <span className="text-sm text-gray-700">
            {r.receiptDate ?? '—'}
          </span>
        ) 
      },
      {
        header: 'Amount',
        render: (r) => (
          <span className="text-sm font-semibold text-gray-900">
            {(r.amountTotal ?? r.amount) 
              ? `$${Number(r.amountTotal ?? r.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
              : '—'}
          </span>
        )
      },
      {
        header: 'Status',
        render: (r) => {
          const s = r.status ?? 'draft';
          const badgeStyles = {
            posted: 'bg-green-100 text-green-800 border-green-200',
            draft: 'bg-amber-100 text-amber-800 border-amber-200'
          };
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyles[s] || badgeStyles.draft}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          );
        }
      }
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <HandCoins className="h-7 w-7 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-900">Customer Receipts</h1>
              </div>
              <p className="text-sm text-gray-600">
                Capture collections, allocate to invoices, and post to the ledger
              </p>
            </div>
            <Button 
              onClick={() => navigate(ROUTES.customerReceiptNew)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Receipt
            </Button>
          </div>
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => setStatusFilter('all')}
            className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
              statusFilter === 'all' ? 'border-green-500 shadow-sm' : 'border-gray-200'
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">{statusCounts.all}</div>
            <div className="text-xs text-gray-600 mt-1">All Receipts</div>
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
              statusFilter === 'draft' ? 'border-amber-500 shadow-sm' : 'border-gray-200'
            }`}
          >
            <div className="text-2xl font-bold text-amber-600">{statusCounts.draft}</div>
            <div className="text-xs text-gray-600 mt-1">Draft</div>
          </button>
          <button
            onClick={() => setStatusFilter('posted')}
            className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
              statusFilter === 'posted' ? 'border-green-500 shadow-sm' : 'border-gray-200'
            }`}
          >
            <div className="text-2xl font-bold text-green-600">{statusCounts.posted}</div>
            <div className="text-xs text-gray-600 mt-1">Posted</div>
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search receipts by number, customer, or memo..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <Button
              variant="outline"
              className="border-gray-300"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          
          {searchTerm && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredRows.length}</span> of <span className="font-semibold text-gray-900">{rows.length}</span> receipts
              </p>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {error ? (
            <div className="p-12 text-center">
              <div className="bg-red-50 rounded-lg p-6 max-w-md mx-auto">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-red-800 mb-1">Failed to load receipts</h3>
                    <p className="text-sm text-red-700">{String(error?.message ?? 'An error occurred')}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={filteredRows}
              isLoading={isLoading}
              empty={{ 
                title: 'No receipts found', 
                description: statusFilter === 'all' 
                  ? 'Get started by creating your first customer receipt' 
                  : `No ${statusFilter} receipts to display`
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}