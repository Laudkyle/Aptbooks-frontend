import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Plus, Search, Download, Filter } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeInvoicesApi } from '../api/invoices.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';

export default function InvoiceList() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeInvoicesApi(http), [http]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading, error } = useQuery({
    queryKey: qk.invoices(),
    queryFn: () => api.list()
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];

  // Client-side filtering
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch = !searchTerm || 
        (row.invoiceNumber ?? row.code ?? row.id ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.customerName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.memo ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || (row.status ?? 'draft') === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchTerm, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = { all: rows.length, draft: 0, issued: 0, paid: 0, voided: 0 };
    rows.forEach((r) => {
      const status = r.status ?? 'draft';
      if (counts[status] !== undefined) counts[status]++;
    });
    return counts;
  }, [rows]);

  const columns = useMemo(
    () => [
      {
        header: 'Invoice #',
        render: (r) => (
          <div className="flex flex-col">
            <Link 
              to={ROUTES.invoiceDetail(r.id)} 
              className="font-semibold text-blue-700 hover:text-blue-800 hover:underline"
            >
              {r.invoiceNumber ?? r.code ?? r.id}
            </Link>
            {r.memo && <div className="text-xs text-gray-500 mt-0.5">{r.memo}</div>}
          </div>
        )
      },
      { 
        header: 'Customer', 
        render: (r) => (
          <span className="text-sm text-gray-900 font-medium">
            {r.customerName ?? r.customerId ?? '—'}
          </span>
        ) 
      },
      { 
        header: 'Invoice Date', 
        render: (r) => (
          <span className="text-sm text-gray-700">
            {r.invoiceDate ?? '—'}
          </span>
        ) 
      },
      { 
        header: 'Due Date', 
        render: (r) => (
          <span className="text-sm text-gray-700">
            {r.dueDate ?? '—'}
          </span>
        ) 
      },
      {
        header: 'Amount',
        render: (r) => (
          <span className="text-sm font-semibold text-gray-900">
            {r.total ? `$${Number(r.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </span>
        )
      },
      {
        header: 'Status',
        render: (r) => {
          const s = r.status ?? 'draft';
          const badgeStyles = {
            paid: 'bg-green-100 text-green-800 border-green-200',
            issued: 'bg-blue-100 text-blue-800 border-blue-200',
            overdue: 'bg-red-100 text-red-800 border-red-200',
            voided: 'bg-gray-100 text-gray-800 border-gray-200',
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
                <FileText className="h-7 w-7 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
              </div>
              <p className="text-sm text-gray-600">
                Create, manage, and track all customer invoices
              </p>
            </div>
            <Button 
              onClick={() => navigate(ROUTES.invoiceNew)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => setStatusFilter('all')}
            className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
              statusFilter === 'all' ? 'border-green-500 shadow-sm' : 'border-gray-200'
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">{statusCounts.all}</div>
            <div className="text-xs text-gray-600 mt-1">All Invoices</div>
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
            onClick={() => setStatusFilter('issued')}
            className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
              statusFilter === 'issued' ? 'border-blue-500 shadow-sm' : 'border-gray-200'
            }`}
          >
            <div className="text-2xl font-bold text-blue-600">{statusCounts.issued}</div>
            <div className="text-xs text-gray-600 mt-1">Issued</div>
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
              statusFilter === 'paid' ? 'border-green-500 shadow-sm' : 'border-gray-200'
            }`}
          >
            <div className="text-2xl font-bold text-green-600">{statusCounts.paid}</div>
            <div className="text-xs text-gray-600 mt-1">Paid</div>
          </button>
          <button
            onClick={() => setStatusFilter('voided')}
            className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
              statusFilter === 'voided' ? 'border-gray-500 shadow-sm' : 'border-gray-200'
            }`}
          >
            <div className="text-2xl font-bold text-gray-600">{statusCounts.voided}</div>
            <div className="text-xs text-gray-600 mt-1">Voided</div>
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
                placeholder="Search invoices by number, customer, or memo..."
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
                Showing <span className="font-semibold text-gray-900">{filteredRows.length}</span> of <span className="font-semibold text-gray-900">{rows.length}</span> invoices
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
                    <h3 className="text-sm font-medium text-red-800 mb-1">Failed to load invoices</h3>
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
                title: 'No invoices found', 
                description: statusFilter === 'all' 
                  ? 'Get started by creating your first invoice' 
                  : `No ${statusFilter} invoices to display`
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}