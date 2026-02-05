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

function calculateSummary(rows) {
  if (!rows || rows.length === 0) return null;
  
  const summary = {
    totalVendors: rows.length,
    totalOutstanding: 0,
    current: 0,
    days30: 0,
    days60: 0,
    days90: 0,
    days90Plus: 0
  };

  rows.forEach(row => {
    // Try different possible column names
    const total = row.total || row.Total || row.total_amount || row.balance || 0;
    summary.totalOutstanding += parseFloat(total) || 0;

    // Sum aging buckets if they exist
    summary.current += parseFloat(row.current || row.Current || 0);
    summary.days30 += parseFloat(row.days_1_30 || row['1-30'] || row.days30 || 0);
    summary.days60 += parseFloat(row.days_31_60 || row['31-60'] || row.days60 || 0);
    summary.days90 += parseFloat(row.days_61_90 || row['61-90'] || row.days90 || 0);
    summary.days90Plus += parseFloat(row.days_90_plus || row['90+'] || row.over90 || 0);
  });

  return summary;
}

export default function ReportApAging() {
  const { http } = useApi();
  const api = useMemo(() => makeReportingApi(http), [http]);
  
  const [asOfDate, setAsOfDate] = useState('');
  const [bucketSetId, setBucketSetId] = useState('');
  const [errors, setErrors] = useState({});

  const qs = useMemo(
    () => ({ 
      asOfDate: asOfDate || undefined, 
      bucketSetId: bucketSetId || undefined 
    }),
    [asOfDate, bucketSetId]
  );

  const { data, isLoading, isFetching, refetch } = useQuery({ 
    queryKey: qk.reportApAging(qs), 
    queryFn: () => api.ap.agedPayables(qs),
    staleTime: 60_000
  });

  const rows = rowsFrom(data);
  const summary = calculateSummary(rows);

  const columns = useMemo(() => {
    if (rows.length === 0) {
      return [
        { header: 'Vendor', accessor: 'vendor' },
        { header: 'Total', accessor: 'total' }
      ];
    }

    const firstRow = rows[0];
    const keys = Object.keys(firstRow);
    
    return keys.map((key) => {
      const isNumeric = typeof firstRow[key] === 'number' || 
                       (typeof firstRow[key] === 'string' && !isNaN(parseFloat(firstRow[key])));
      const isCurrency = key.toLowerCase().includes('amount') || 
                        key.toLowerCase().includes('total') || 
                        key.toLowerCase().includes('balance') ||
                        key.toLowerCase().includes('current') ||
                        key.toLowerCase().includes('days') ||
                        key.toLowerCase().includes('over');

      return {
        header: formatHeader(key),
        accessor: key,
        render: (row) => {
          const value = row[key];
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

  const handleRefresh = () => {
    const newErrors = {};

    if (asOfDate && !/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
      newErrors.asOfDate = 'Date must be in YYYY-MM-DD format';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    refetch();
  };

  const handleExport = () => {
    if (rows.length === 0) return;

    // Convert to CSV
    const headers = columns.map(col => col.header).join(',');
    const csvRows = rows.map(row => 
      columns.map(col => {
        const value = row[col.accessor];
        // Escape commas and quotes
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
    a.download = `ap-aging-${asOfDate || new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-8">
      <PageHeader
        title="Accounts Payable Aging"
        subtitle="View outstanding payables grouped by aging period to manage cash flow and vendor relationships"
      />

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-medium text-slate-600 mb-1">Total Vendors</p>
            <p className="text-2xl font-bold text-slate-900">{summary.totalVendors}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-medium text-slate-600 mb-1">Total Outstanding</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary.totalOutstanding)}</p>
          </div>
          {summary.current > 0 && (
            <div className="bg-white border border-green-200 rounded-lg p-4">
              <p className="text-xs font-medium text-green-700 mb-1">Current</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.current)}</p>
            </div>
          )}
          {summary.days30 > 0 && (
            <div className="bg-white border border-yellow-200 rounded-lg p-4">
              <p className="text-xs font-medium text-yellow-700 mb-1">1-30 Days</p>
              <p className="text-2xl font-bold text-yellow-700">{formatCurrency(summary.days30)}</p>
            </div>
          )}
          {summary.days60 > 0 && (
            <div className="bg-white border border-orange-200 rounded-lg p-4">
              <p className="text-xs font-medium text-orange-700 mb-1">31-60 Days</p>
              <p className="text-2xl font-bold text-orange-700">{formatCurrency(summary.days60)}</p>
            </div>
          )}
          {(summary.days90 > 0 || summary.days90Plus > 0) && (
            <div className="bg-white border border-red-200 rounded-lg p-4">
              <p className="text-xs font-medium text-red-700 mb-1">Over 60 Days</p>
              <p className="text-2xl font-bold text-red-700">
                {formatCurrency(summary.days90 + summary.days90Plus)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filters and Actions */}
      <ContentCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Report Filters</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={isLoading || isFetching}
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isFetching ? 'Refreshing...' : 'Refresh'}
              </Button>
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
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Input
                label="As of Date"
                type="date"
                value={asOfDate}
                onChange={(e) => {
                  setAsOfDate(e.target.value);
                  if (errors.asOfDate) {
                    setErrors(prev => ({ ...prev, asOfDate: undefined }));
                  }
                }}
                error={errors.asOfDate}
                placeholder="YYYY-MM-DD"
              />
              <p className="mt-1.5 text-xs text-slate-600">
                View payables as of a specific date (leave blank for current date)
              </p>
            </div>

            <div>
              <Input
                label="Bucket Set ID (Optional)"
                value={bucketSetId}
                onChange={(e) => setBucketSetId(e.target.value)}
                placeholder="Enter bucket set ID"
              />
              <p className="mt-1.5 text-xs text-slate-600">
                Use a custom aging bucket configuration
              </p>
            </div>
          </div>

          {asOfDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-blue-800">
                    Viewing payables as of <span className="font-semibold">{new Date(asOfDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </ContentCard>

      {/* Data Table */}
      <ContentCard>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-slate-600">Loading aging report...</p>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Data Available</h3>
            <p className="text-sm text-slate-600 mb-6">
              No payables found for the selected criteria. Try adjusting your filters or date range.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Vendor Details</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {rows.length} vendor{rows.length !== 1 ? 's' : ''} with outstanding balances
                </p>
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <DataTable
                columns={columns}
                rows={rows}
                loading={isLoading}
                empty={{
                  title: 'No payables found',
                  description: 'Adjust filters and refresh to view data.'
                }}
              />
            </div>
          </>
        )}
      </ContentCard>

      {/* Help Section */}
      <ContentCard>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">About AP Aging</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-700">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">What is AP Aging?</h4>
              <p className="text-xs text-slate-600">
                The Accounts Payable Aging report shows how long invoices from vendors have been outstanding. 
                This helps you manage cash flow, prioritize payments, and maintain good vendor relationships.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">How to Use This Report</h4>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Review vendors with overdue balances (61+ days)</li>
                <li>• Prioritize payments based on aging buckets</li>
                <li>• Export to CSV for further analysis</li>
                <li>• Monitor trends by comparing different dates</li>
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