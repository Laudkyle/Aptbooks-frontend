import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeReportingApi } from '../api/reporting.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { makePartnersApi } from '../../business/api/partners.api.js';
import { toOptions, NONE_OPTION } from '../../../shared/utils/options.js';

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

function parseStatementData(data) {
  if (!data) return null;

  // Try to extract meaningful data from various possible response structures
  const statement = {
    customer: data.customer || data.customer_name || data.customerName || {},
    period: {
      from: data.from || data.start_date || data.startDate,
      to: data.to || data.end_date || data.endDate
    },
    summary: {
      beginningBalance: data.beginning_balance || data.beginningBalance || 0,
      totalCharges: data.total_charges || data.totalCharges || 0,
      totalPayments: data.total_payments || data.totalPayments || 0,
      endingBalance: data.ending_balance || data.endingBalance || 0
    },
    transactions: data.transactions || data.items || data.details || [],
    metadata: data.metadata || {}
  };

  return statement;
}

export default function ReportArCustomerStatement() {
  const { http } = useApi();
  const api = useMemo(() => makeReportingApi(http), [http]);
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);
  
  const [customerId, setCustomerId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [errors, setErrors] = useState({});
  const [hasSearched, setHasSearched] = useState(false);

  const qs = useMemo(
    () => ({ 
      customerId: customerId || undefined, 
      from: from || undefined, 
      to: to || undefined 
    }),
    [customerId, from, to]
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: qk.reportArCustomerStatement(qs),
    queryFn: () => api.ar.customerStatement(qs),
    enabled: false,
    staleTime: 60_000
  });

  const customersQ = useQuery({ queryKey: ['partners', 'customers'], queryFn: () => partnersApi.list({ type: 'customer' }), staleTime: 60_000 });
  const customers = Array.isArray(customersQ.data) ? customersQ.data : customersQ.data?.data ?? [];
  const customerOptions = [NONE_OPTION, ...toOptions(customers, { valueKey: 'id', label: (c) => `${c.code ?? ''} ${c.name ?? c.business_name ?? ''}`.trim() || c.id })];

  const statement = parseStatementData(data);

  const validateAndRun = () => {
    const newErrors = {};

    if (!customerId.trim()) {
      newErrors.customerId = 'Customer is required';
    }

    if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      newErrors.from = 'Date must be in YYYY-MM-DD format';
    }

    if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      newErrors.to = 'Date must be in YYYY-MM-DD format';
    }

    if (from && to && new Date(from) > new Date(to)) {
      newErrors.to = 'End date must be after start date';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setHasSearched(true);
    refetch();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!statement) return;

    // Create a formatted text version of the statement
    let text = `CUSTOMER STATEMENT\n`;
    text += `==================\n\n`;
    
    if (statement.customer.name) {
      text += `Customer: ${statement.customer.name}\n`;
    }
    if (statement.customer.id || customerId) {
      text += `Customer ID: ${statement.customer.id || customerId}\n`;
    }
    
    text += `\nStatement Period: ${formatDate(from)} to ${formatDate(to)}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    text += `SUMMARY\n`;
    text += `-------\n`;
    text += `Beginning Balance: ${formatCurrency(statement.summary.beginningBalance)}\n`;
    text += `Total Charges:     ${formatCurrency(statement.summary.totalCharges)}\n`;
    text += `Total Payments:    ${formatCurrency(statement.summary.totalPayments)}\n`;
    text += `Amount Due:        ${formatCurrency(statement.summary.endingBalance)}\n\n`;
    
    if (statement.transactions.length > 0) {
      text += `TRANSACTIONS\n`;
      text += `------------\n`;
      statement.transactions.forEach(tx => {
        text += `${formatDate(tx.date || tx.transaction_date)} | ${tx.description || tx.type || 'Transaction'} | ${formatCurrency(tx.amount)}\n`;
      });
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-statement-${customerId}-${from || 'all'}-${to || 'all'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleEmail = () => {
    // Placeholder for email functionality
    alert('Email functionality would be implemented here to send the statement to the customer.');
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-8">
      <PageHeader
        title="Customer Account Statement"
        subtitle="Generate detailed statements showing all transactions with a customer for a specific period"
      />

      {/* Search Criteria */}
      <ContentCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-strong">Statement Parameters</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Select
                label="Customer"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  if (errors.customerId) {
                    setErrors(prev => ({ ...prev, customerId: undefined }));
                  }
                }}
                options={customerOptions}
                error={errors.customerId}
                required
              />
              <p className="mt-1.5 text-xs text-text-muted">
                Customer selection (required)
              </p>
            </div>

            <div>
              <Input
                label="Start Date"
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  if (errors.from) {
                    setErrors(prev => ({ ...prev, from: undefined }));
                  }
                }}
                error={errors.from}
                placeholder="YYYY-MM-DD"
              />
              <p className="mt-1.5 text-xs text-text-muted">
                Statement period start (optional)
              </p>
            </div>

            <div>
              <Input
                label="End Date"
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  if (errors.to) {
                    setErrors(prev => ({ ...prev, to: undefined }));
                  }
                }}
                error={errors.to}
                placeholder="YYYY-MM-DD"
              />
              <p className="mt-1.5 text-xs text-text-muted">
                Statement period end (optional)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              onClick={validateAndRun}
              disabled={isLoading || isFetching}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {isFetching ? 'Generating...' : 'Generate Statement'}
            </Button>
          </div>
        </div>
      </ContentCard>

      {/* Statement Display */}
      {!hasSearched ? (
        <ContentCard>
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-text-strong mb-2">Generate Customer Statement</h3>
            <p className="text-sm text-text-muted">
              Enter customer details above and click "Generate Statement" to create a detailed account statement
            </p>
          </div>
        </ContentCard>
      ) : isLoading || isFetching ? (
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-border-subtle border-t-brand-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-text-muted">Generating statement...</p>
            </div>
          </div>
        </ContentCard>
      ) : !statement || (!statement.transactions?.length && !statement.summary.endingBalance) ? (
        <ContentCard>
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-text-strong mb-2">No Statement Data</h3>
            <p className="text-sm text-text-muted mb-6">
              No statement data available for customer ID <span className="font-mono font-semibold">{customerId}</span> in the specified period.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setHasSearched(false);
                setCustomerId('');
                setFrom('');
                setTo('');
              }}
            >
              Generate New Statement
            </Button>
          </div>
        </ContentCard>
      ) : (
        <>
          {/* Statement Header */}
          <ContentCard>
            <div className="print:p-8">
              {/* Actions Bar - Hidden on Print */}
              <div className="mb-6 flex items-center justify-between print:hidden">
                <h3 className="text-sm font-semibold text-text-strong">Customer Statement</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleEmail}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email to Customer
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handlePrint}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleExport}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export
                  </Button>
                </div>
              </div>

              {/* Statement Header */}
              <div className="border-b-2 border-slate-900 pb-6 mb-6">
                <h1 className="text-2xl font-bold text-text-strong mb-4">CUSTOMER STATEMENT</h1>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs font-semibold text-text-muted uppercase mb-2">Customer Information</h3>
                    <div className="space-y-1">
                      {statement.customer.name && (
                        <p className="text-sm font-semibold text-text-strong">{statement.customer.name}</p>
                      )}
                      <p className="text-sm text-text-body">
                        Customer ID: <span className="font-mono">{statement.customer.id || customerId}</span>
                      </p>
                      {statement.customer.address && (
                        <p className="text-sm text-text-muted">{statement.customer.address}</p>
                      )}
                      {statement.customer.email && (
                        <p className="text-sm text-text-muted">{statement.customer.email}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-text-muted uppercase mb-2">Statement Period</h3>
                    <div className="space-y-1">
                      <p className="text-sm text-text-strong">
                        <span className="font-medium">From:</span> {from ? formatDate(from) : 'Beginning'}
                      </p>
                      <p className="text-sm text-text-strong">
                        <span className="font-medium">To:</span> {to ? formatDate(to) : 'Current'}
                      </p>
                      <p className="text-sm text-text-muted">
                        Generated: {new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Section with Amount Due Highlight */}
              <div className="mb-6">
                <div className="bg-surface-2 rounded-lg p-6 mb-4">
                  <h3 className="text-sm font-semibold text-text-strong mb-4">Account Summary</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-text-body">Beginning Balance:</span>
                        <span className="text-sm font-medium text-text-strong tabular-nums">
                          {formatCurrency(statement.summary.beginningBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-text-body">Total Charges:</span>
                        <span className="text-sm font-medium text-text-strong tabular-nums">
                          {formatCurrency(statement.summary.totalCharges)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-text-body">Total Payments:</span>
                        <span className="text-sm font-medium text-green-700 tabular-nums">
                          ({formatCurrency(statement.summary.totalPayments)})
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t-2 border-border-subtle">
                        <span className="text-sm font-semibold text-text-strong">Current Balance:</span>
                        <span className="text-lg font-bold text-text-strong tabular-nums">
                          {formatCurrency(statement.summary.endingBalance)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amount Due Callout */}
                {statement.summary.endingBalance > 0 && (
                  <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-red-900">Amount Due</p>
                          <p className="text-xs text-red-700">Please remit payment by the due date</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-red-900 tabular-nums">
                          {formatCurrency(statement.summary.endingBalance)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Transactions Table */}
              {statement.transactions && statement.transactions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-strong mb-3">Transaction Details</h3>
                  <div className="border border-border-subtle rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-border-subtle">
                      <thead className="bg-surface-2">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-text-body uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-text-body uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-text-body uppercase">Description</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-text-body uppercase">Charges</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-text-body uppercase">Payments</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-text-body uppercase">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle bg-surface-1">
                        {statement.transactions.map((tx, idx) => {
                          const isPayment = tx.amount < 0 || tx.type?.toLowerCase().includes('payment');
                          
                          return (
                            <tr key={idx} className="hover:bg-surface-2">
                              <td className="px-4 py-3 text-sm text-text-strong">
                                {formatDate(tx.date || tx.transaction_date || tx.created_at)}
                              </td>
                              <td className="px-4 py-3 text-sm text-text-body">
                                {tx.type || tx.transaction_type || '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-text-body">
                                {tx.description || tx.memo || tx.reference || '—'}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-right tabular-nums">
                                {!isPayment ? formatCurrency(Math.abs(tx.amount)) : '—'}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-green-700 text-right tabular-nums">
                                {isPayment ? formatCurrency(Math.abs(tx.amount)) : '—'}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-text-strong text-right tabular-nums">
                                {formatCurrency(tx.balance || tx.running_balance)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payment Instructions */}
              {statement.summary.endingBalance > 0 && (
                <div className="mt-8 pt-6 border-t-2 border-border-subtle">
                  <h3 className="text-sm font-semibold text-text-strong mb-3">Payment Information</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900 mb-2">
                      Please include your customer ID ({statement.customer.id || customerId}) with your payment.
                    </p>
                    <p className="text-xs text-blue-800">
                      For questions about this statement, please contact our accounts receivable department.
                    </p>
                  </div>
                </div>
              )}

              {/* Footer Notes */}
              <div className="mt-6 text-xs text-text-muted text-center">
                <p>
                  Thank you for your business. This statement reflects all transactions recorded in our system for the specified period.
                </p>
              </div>
            </div>
          </ContentCard>
        </>
      )}

      {/* Help Section */}
      <ContentCard className="print:hidden">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-strong">About Customer Statements</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-text-body">
            <div>
              <h4 className="font-medium text-text-strong mb-2">What is a Customer Statement?</h4>
              <p className="text-xs text-text-muted">
                A customer statement is a comprehensive record of all financial transactions between your company and a specific customer. 
                It shows invoices, payments, credits, and the current outstanding balance over a specified period.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-text-strong mb-2">How to Use This Report</h4>
              <ul className="text-xs text-text-muted space-y-1">
                <li>• Send to customers for account reconciliation</li>
                <li>• Use for collection follow-ups on overdue accounts</li>
                <li>• Print or email directly to customers</li>
                <li>• Export for record-keeping and audit purposes</li>
              </ul>
            </div>
          </div>
        </div>
      </ContentCard>
    </div>
  );
}