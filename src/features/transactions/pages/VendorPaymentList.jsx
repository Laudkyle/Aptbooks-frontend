import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Banknote, Plus, AlertCircle } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeVendorPaymentsApi } from '../api/vendorPayments.api.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';

/**
 * VendorPaymentList Component
 * 
 * Displays a filterable list of vendor payments with QuickBooks-style formatting.
 * Supports filtering by vendor ID and navigation to payment details and creation.
 * 
 * @component
 */
export default function VendorPaymentList() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeVendorPaymentsApi(http), [http]);
  
  // Filter state
  const [vendorId, setVendorId] = useState('');
  
  // Memoized query string to prevent unnecessary re-renders
  const queryString = useMemo(
    () => (vendorId.trim() ? { vendor_id: vendorId.trim() } : {}),
    [vendorId]
  );
  
  // Fetch vendor payments
  const { 
    data, 
    isLoading, 
    error,
    isError 
  } = useQuery({
    queryKey: qk.vendorPayments(queryString),
    queryFn: () => api.list(queryString),
    staleTime: 30000, // Consider data fresh for 30 seconds
    retry: 2,
    refetchOnWindowFocus: true
  });
  
  // Extract rows safely with fallback - handle nested structure
  const rows = useMemo(() => {
    // Check if data is an array
    if (Array.isArray(data)) return data;
    
    // Check if data has a data property that's an array
    if (data?.data && Array.isArray(data.data)) return data.data;
    
    // Handle the case where payments might be in vendorPayments property
    if (data?.vendorPayments && Array.isArray(data.vendorPayments)) return data.vendorPayments;
    
    return [];
  }, [data]);
  
  // Navigation handlers
  const handleCreatePayment = useCallback(() => {
    navigate(ROUTES.vendorPaymentNew);
  }, [navigate]);
  
  const handleVendorIdChange = useCallback((e) => {
    setVendorId(e.target.value);
  }, []);
  
  // Clear filter
  const handleClearFilter = useCallback(() => {
    setVendorId('');
  }, []);
  
  // Format currency
  const formatCurrency = useCallback((amount, currencyCode = 'USD') => {
    if (amount == null || amount === '') return '—';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '—';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  }, []);
  
  // Format date
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch {
      return dateString;
    }
  }, []);
  
  // Get status badge configuration
  const getStatusBadge = useCallback((status) => {
    const normalizedStatus = (status ?? 'draft').toLowerCase();
    
    const statusConfig = {
      posted: { tone: 'success', label: 'Posted' },
      draft: { tone: 'muted', label: 'Draft' },
      pending: { tone: 'warning', label: 'Pending' },
      voided: { tone: 'error', label: 'Voided' }
    };
    
    const config = statusConfig[normalizedStatus] || { tone: 'muted', label: status || 'Draft' };
    
    return <Badge tone={config.tone}>{config.label}</Badge>;
  }, []);
  
  // Table columns configuration with snake_case properties
  const columns = useMemo(
    () => [
      {
        header: 'Payment No.',
        accessor: 'payment_no',
        render: (row) => (
          <div className="flex flex-col gap-0.5">
            <Link 
              to={ROUTES.vendorPaymentDetail(row.id)} 
              className="font-medium text-brand-deep hover:text-brand-deep/80 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-deep focus:ring-offset-1 rounded"
              aria-label={`View payment ${row.payment_no ?? row.id}`}
            >
              {row.payment_no ?? row.id}
            </Link>
            {row.memo && (
              <span className="text-xs text-slate-500 line-clamp-1" title={row.memo}>
                {row.memo}
              </span>
            )}
          </div>
        )
      },
      { 
        header: 'Vendor', 
        accessor: 'vendor_name',
        render: (row) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-slate-700 font-medium">
              {row.vendor_name ?? row.vendor_id ?? '—'}
            </span>
            {row.vendor_code && (
              <span className="text-xs text-slate-500">
                {row.vendor_code}
              </span>
            )}
          </div>
        ) 
      },
      { 
        header: 'Payment Date', 
        accessor: 'payment_date',
        render: (row) => (
          <span className="text-sm text-slate-700 tabular-nums">
            {formatDate(row.payment_date)}
          </span>
        ) 
      },
      { 
        header: 'Amount', 
        accessor: 'amount_total',
        render: (row) => (
          <div className="flex flex-col gap-0.5 items-end">
            <span className="text-sm text-slate-900 font-semibold tabular-nums">
              {formatCurrency(row.amount_total, row.currency_code)}
            </span>
            {row.currency_code && row.currency_code !== 'USD' && (
              <span className="text-xs text-slate-500">
                {row.currency_code}
              </span>
            )}
          </div>
        ),
        align: 'right'
      },
      {
        header: 'Status',
        accessor: 'status',
        render: (row) => getStatusBadge(row.status)
      },
      {
        header: 'Payment Method',
        accessor: 'payment_method_id',
        render: (row) => (
          <span className="text-sm text-slate-700">
            {row.payment_method_name ?? (row.payment_method_id ? `${row.payment_method_id.substring(0, 8)}...` : '—')}
          </span>
        )
      }
    ],
    [formatCurrency, formatDate, getStatusBadge]
  );
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Payments"
        subtitle="Capture payments, allocate to bills, and post to the ledger."
        icon={Banknote}
        actions={
          <Button 
            leftIcon={Plus} 
            onClick={handleCreatePayment}
            aria-label="Create new vendor payment"
          >
            New Payment
          </Button>
        }
      />
      
      <ContentCard>
        <FilterBar
          left={
            <div className="flex items-center gap-3">
              <Input 
                label="Vendor ID" 
                value={vendorId} 
                onChange={handleVendorIdChange}
                placeholder="Filter by vendor ID..."
                aria-label="Filter payments by vendor ID"
                className="min-w-[240px]"
              />
              {vendorId && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearFilter}
                  aria-label="Clear vendor filter"
                >
                  Clear
                </Button>
              )}
            </div>
          }
          right={
            isError && error ? (
              <div className="flex items-center gap-2 text-sm text-red-600" role="alert">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error?.message ?? 'Failed to load payments'}</span>
              </div>
            ) : null
          }
        />
        
        <div className="mt-4">
          <DataTable
            columns={columns}
            rows={rows}
            isLoading={isLoading}
            empty={{ 
              title: 'No vendor payments found', 
              description: vendorId 
                ? 'No payments match your filter. Try a different vendor ID or clear the filter.'
                : 'Create a vendor payment to allocate to bills and post the transaction.'
            }}
            aria-label="Vendor payments table"
          />
        </div>
      </ContentCard>
      
      {/* Results summary */}
      {!isLoading && rows.length > 0 && (
        <div className="text-sm text-slate-600 text-center">
          Showing {rows.length} {rows.length === 1 ? 'payment' : 'payments'}
          {vendorId && ' for selected vendor'}
          {rows.length > 0 && (
            <span className="ml-4">
              Total: {formatCurrency(
                rows.reduce((sum, row) => sum + (parseFloat(row.amount_total) || 0), 0),
                rows[0]?.currency_code || 'USD'
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}