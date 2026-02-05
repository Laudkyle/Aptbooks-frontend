import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeReportingApi } from '../api/reporting.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';

function rowsFrom(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.rows)) return data.rows;
  return [];
}

function formatCurrency(value) {
  if (value == null || value === '') return '—';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (e) {
    return dateString;
  }
}

function calculateSummary(rows) {
  if (!rows || rows.length === 0) return null;
  
  const summary = {
    totalItems: rows.length,
    totalAmount: 0,
    oldestItem: null,
    newestItem: null
  };

  rows.forEach(row => {
    const amount = row.amount || row.balance || row.total || row.amount_due || 0;
    summary.totalAmount += parseFloat(amount) || 0;

    const date = row.date || row.invoice_date || row.due_date || row.created_at;
    if (date) {
      const itemDate = new Date(date);
      if (!summary.oldestItem || itemDate < new Date(summary.oldestItem)) {
        summary.oldestItem = date;
      }
      if (!summary.newestItem || itemDate > new Date(summary.newestItem)) {
        summary.newestItem = date;
      }
    }
  });

  return summary;
}

export default function ReportApOpenItems() {
  const { http } = useApi();
  const api = useMemo(() => makeReportingApi(http), [http]);
  
  const [vendorId, setVendorId] = useState('');
  const [errors, setErrors] = useState({});
  const [hasSearched, setHasSearched] = useState(false);

  const qs = useMemo(() => ({ 
    vendorId: vendorId || undefined 
  }), [vendorId]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: qk.reportApOpenItems(qs),
    queryFn: () => api.ap.openItems(qs),
    enabled: false, // Don't auto-run on mount
    staleTime: 60_000
  });

  const rows = rowsFrom(data);
  const summary = calculateSummary(rows);

  const columns = useMemo(() => {
    if (rows.length === 0) {
      return [
        { header: 'Invoice', accessor: 'id' },
        { header: 'Date', accessor: 'date' },
        { header: 'Amount', accessor: 'amount' }
      ];
    }

    const firstRow = rows[0];
    const keys = Object.keys(firstRow);
    
    return keys.map((key) => {
      const sampleValue = firstRow[key];
      const isNumeric = typeof sampleValue === 'number' || 
                       (typeof sampleValue === 'string' && !isNaN(parseFloat(sampleValue)));
      const isCurrency = key.toLowerCase().includes('amount') || 
                        key.toLowerCase().includes('total') || 
                        key.toLowerCase().includes('balance') ||
                        key.toLowerCase().includes('due') ||
                        key.toLowerCase().includes('price') ||
                        key.toLowerCase().includes('cost');
      const isDate = key.toLowerCase().includes('date') ||
                    key.toLowerCase().includes('time') ||
                    (typeof sampleValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sampleValue));

      return {
        header: formatHeader(key),
        accessor: key,
        render: (row) => {
          const value = row[key];
          
          if (isDate && !isCurrency) {
            return (
              <span className="text-sm text-slate-900">
                {formatDate(value)}
              </span>
            );
          }
          
          if (isCurrency && isNumeric) {
            return (
              <span className="text-sm font-medium text-slate-900 tabular-nums">
                {formatCurrency(value)}
              </span>
            );
          }
          
          if (isNumeric) {
            return (
              <span className="text-sm text-slate-900 tabular-nums">
                {value}
              </span>
            );
          }
          
          return (
            <span className="text-sm text-slate-900">
              {value || '—'}
            </span>
          );
        }
      };
    });
  }, [rows]);

  const handleRun = () => {
    const newErrors = {};

    if (!vendorId.trim()) {
      newErrors.vendorId = 'Vendor ID is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setHasSearched(true);
    refetch();
  };

  const handleExport = () => {
    if (rows.length === 0) return;

    const headers = columns.map(col => col.header).join(',');
    const csvRows = rows.map(row => 
      columns.map(col => {
        const value = row[col.accessor];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    );
    
    const csv = [headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ap-open-items-vendor-${vendorId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleRun();
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-8">
      <PageHeader
        title="Open Payables Detail"
        subtitle="View detailed list of outstanding payable items for specific vendors"
      />

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-600">Open Items</p>
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-slate-900">{summary.totalItems}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-600">Total Outstanding</p>
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary.totalAmount)}</p>
          </div>

          {summary.oldestItem && (
            <div className="bg-white border border-amber-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-amber-700">Oldest Item</p>
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-bold text-amber-900">{formatDate(summary.oldestItem)}</p>
            </div>
          )}

          {summary.newestItem && (
            <div className="bg-white border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-green-700">Newest Item</p>
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-bold text-green-900">{formatDate(summary.newestItem)}</p>
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <ContentCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Search Criteria</h3>
            {hasSearched && rows.length > 0 && (
              <Button
                variant="secondary"
                onClick={handleExport}
                disabled={rows.length === 0}
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </Button>
            )}
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-md">
              <Input
                label="Vendor ID"
                value={vendorId}
                onChange={(e) => {
                  setVendorId(e.target.value);
                  if (errors.vendorId) {
                    setErrors(prev => ({ ...prev, vendorId: undefined }));
                  }
                }}
                onKeyPress={handleKeyPress}
                error={errors.vendorId}
                placeholder="Enter vendor ID"
                required
              />
              <p className="mt-1.5 text-xs text-slate-600">
                Enter the vendor ID to view their open payable items
              </p>
            </div>

            <Button
              onClick={handleRun}
              disabled={isLoading || isFetching}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {isFetching ? 'Searching...' : 'Run Report'}
            </Button>
          </div>

          {vendorId && hasSearched && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-blue-800">
                    Showing open items for vendor ID: <span className="font-semibold">{vendorId}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </ContentCard>

      {/* Data Table */}
      <ContentCard>
        {!hasSearched ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Enter Vendor ID to Begin</h3>
            <p className="text-sm text-slate-600 mb-6">
              Enter a vendor ID above and click "Run Report" to view their open payable items
            </p>
          </div>
        ) : isLoading || isFetching ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-slate-600">Loading open items...</p>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Open Items Found</h3>
            <p className="text-sm text-slate-600 mb-6">
              Vendor ID <span className="font-mono font-semibold">{vendorId}</span> has no outstanding payable items.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setVendorId('');
                setHasSearched(false);
              }}
            >
              Search Another Vendor
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Open Items Detail</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {rows.length} open item{rows.length !== 1 ? 's' : ''} for vendor {vendorId}
                </p>
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <DataTable
                columns={columns}
                rows={rows}
                loading={isLoading}
                empty={{
                  title: 'No open items found',
                  description: 'Try searching for a different vendor.'
                }}
              />
            </div>
          </>
        )}
      </ContentCard>

      {/* Help Section */}
      <ContentCard>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">About Open Payables</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-700">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">What are Open Items?</h4>
              <p className="text-xs text-slate-600">
                Open payable items are invoices or bills from vendors that haven't been fully paid yet. 
                This report provides a detailed breakdown of all outstanding amounts owed to a specific vendor.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">How to Use This Report</h4>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Enter the vendor's ID to view their open items</li>
                <li>• Review individual invoice details and amounts</li>
                <li>• Identify which items need to be paid first</li>
                <li>• Export the data for vendor reconciliation</li>
              </ul>
            </div>
          </div>
        </div>
      </ContentCard>
    </div>
  );
}

// Helper function to format column headers
function formatHeader(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}