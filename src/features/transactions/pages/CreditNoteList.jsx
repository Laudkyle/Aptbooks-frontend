import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileMinus2, Plus, AlertCircle } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeCreditNotesApi } from '../api/creditNotes.api.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export default function CreditNoteList() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeCreditNotesApi(http), [http]);
  const toast = useToast();
  
  // Filter state
  const [customerId, setCustomerId] = useState('');
  
  // Memoized query string to prevent unnecessary re-renders
  const queryString = useMemo(
    () => (customerId.trim() ? { customer_id: customerId.trim() } : {}),
    [customerId]
  );
  
  // Fetch credit notes
  const { 
    data, 
    isLoading, 
    error,
    isError 
  } = useQuery({
    queryKey: qk.creditNotes(queryString),
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
    
    // Handle the case where credit notes might be in creditNotes property
    if (data?.creditNotes && Array.isArray(data.creditNotes)) return data.creditNotes;
    
    return [];
  }, [data]);
  
  // Navigation handlers
  const handleCreateCreditNote = useCallback(() => {
    navigate(ROUTES.creditNoteNew);
  }, [navigate]);
  
  const handleCustomerIdChange = useCallback((e) => {
    setCustomerId(e.target.value);
  }, []);
  
  // Clear filter
  const handleClearFilter = useCallback(() => {
    setCustomerId('');
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
      issued: { tone: 'brand', label: 'Issued' },
      applied: { tone: 'success', label: 'Applied' },
      draft: { tone: 'muted', label: 'Draft' },
      voided: { tone: 'error', label: 'Voided' },
      partial: { tone: 'warning', label: 'Partially Applied' }
    };
    
    const config = statusConfig[normalizedStatus] || { tone: 'muted', label: status || 'Draft' };
    
    return <Badge tone={config.tone}>{config.label}</Badge>;
  }, []);
  
  // Table columns configuration with snake_case properties
  const columns = useMemo(
    () => [
      {
        header: 'Credit Note',
        accessor: 'credit_note_number',
        render: (row) => (
          <div className="flex flex-col gap-0.5">
            <Link 
              to={ROUTES.creditNoteDetail(row.id)} 
              className="font-medium text-brand-deep hover:text-brand-deep/80 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-deep focus:ring-offset-1 rounded"
              aria-label={`View credit note ${row.credit_note_number ?? row.code ?? row.id}`}
            >
              {row.credit_note_number ?? row.code ?? row.id}
            </Link>
            {row.memo && (
              <span className="text-xs text-slate-500 line-clamp-2" title={row.memo}>
                {row.memo}
              </span>
            )}
          </div>
        )
      },
      { 
        header: 'Customer', 
        accessor: 'customer_name',
        render: (row) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-slate-700 font-medium">
              {row.customer_name ?? row.customer_id ?? '—'}
            </span>
            {row.customer_code && (
              <span className="text-xs text-slate-500">
                {row.customer_code}
              </span>
            )}
          </div>
        ) 
      },
      { 
        header: 'Date', 
        accessor: 'credit_note_date',
        render: (row) => (
          <span className="text-sm text-slate-700 tabular-nums">
            {formatDate(row.credit_note_date)}
          </span>
        ) 
      },
      { 
        header: 'Amount', 
        accessor: 'total',
        render: (row) => {
          const amount = row.total ?? row.total;
          return (
           
              <span className="text-sm text-slate-900 font-semibold tabular-nums">
                {formatCurrency(amount, row.currency_code)}
              </span>
             
          );
        },
      },
      {
        header: 'Status',
        accessor: 'status',
        render: (row) => getStatusBadge(row.status)
      }
    ],
    [formatCurrency, formatDate, getStatusBadge]
  );
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit Notes"
        subtitle="AR adjustments and credit application to customer invoices."
        icon={FileMinus2}
        actions={
          <Button 
            leftIcon={Plus} 
            onClick={handleCreateCreditNote}
            aria-label="Create new credit note"
          >
            New Credit Note
          </Button>
        }
      />
      
      <ContentCard>
        <FilterBar
          left={
            <div className="flex items-center gap-3">
              <Input 
                label="Customer ID" 
                value={customerId} 
                onChange={handleCustomerIdChange}
                placeholder="Filter by customer ID..."
                aria-label="Filter credit notes by customer ID"
                className="min-w-[240px]"
              />
              {customerId && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearFilter}
                  aria-label="Clear customer filter"
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
                <span>{error?.message ?? 'Failed to load credit notes'}</span>
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
              title: 'No credit notes found', 
              description: customerId 
                ? 'No credit notes match your filter. Try a different customer ID or clear the filter.'
                : 'Create a credit note to adjust customer balances and apply credits to invoices.'
            }}
            aria-label="Credit notes table"
          />
        </div>
      </ContentCard>
      
      {/* Results summary */}
      {!isLoading && rows.length > 0 && (
        <div className="text-sm text-slate-600 text-center">
          Showing {rows.length} credit {rows.length === 1 ? 'note' : 'notes'}
          {customerId && ' for selected customer'}
          {rows.length > 0 && (
            <span className="ml-4">
              Total: {formatCurrency(
                rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0),
                rows[0]?.currency_code || 'USD'
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}