import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeReportingApi } from '../api/reporting.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';

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
    vendor: data.vendor || data.vendor_name || data.vendorName || {},
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

export default function ReportApVendorStatement() {
  const { http } = useApi();
  const api = useMemo(() => makeReportingApi(http), [http]);
  
  const [vendorId, setVendorId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [errors, setErrors] = useState({});
  const [hasSearched, setHasSearched] = useState(false);

  const qs = useMemo(() => ({ 
    vendorId: vendorId || undefined, 
    from: from || undefined, 
    to: to || undefined 
  }), [vendorId, from, to]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: qk.reportApVendorStatement(qs),
    queryFn: () => api.ap.vendorStatement(qs),
    enabled: false,
    staleTime: 60_000
  });

  const statement = parseStatementData(data);

  const validateAndRun = () => {
    const newErrors = {};

    if (!vendorId.trim()) {
      newErrors.vendorId = 'Vendor ID is required';
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
    let text = `VENDOR STATEMENT\n`;
    text += `================\n\n`;
    
    if (statement.vendor.name) {
      text += `Vendor: ${statement.vendor.name}\n`;
    }
    if (statement.vendor.id || vendorId) {
      text += `Vendor ID: ${statement.vendor.id || vendorId}\n`;
    }
    
    text += `\nStatement Period: ${formatDate(from)} to ${formatDate(to)}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    text += `SUMMARY\n`;
    text += `-------\n`;
    text += `Beginning Balance: ${formatCurrency(statement.summary.beginningBalance)}\n`;
    text += `Total Charges:     ${formatCurrency(statement.summary.totalCharges)}\n`;
    text += `Total Payments:    ${formatCurrency(statement.summary.totalPayments)}\n`;
    text += `Ending Balance:    ${formatCurrency(statement.summary.endingBalance)}\n\n`;
    
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
    a.download = `vendor-statement-${vendorId}-${from || 'all'}-${to || 'all'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-8">
      <PageHeader
        title="Vendor Account Statement"
        subtitle="Generate detailed statements showing all transactions with a vendor for a specific period"
      />

      {/* Search Criteria */}
      <ContentCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Statement Parameters</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Input
                label="Vendor ID"
                value={vendorId}
                onChange={(e) => {
                  setVendorId(e.target.value);
                  if (errors.vendorId) {
                    setErrors(prev => ({ ...prev, vendorId: undefined }));
                  }
                }}
                error={errors.vendorId}
                placeholder="Enter vendor ID"
                required
              />
              <p className="mt-1.5 text-xs text-slate-600">
                Vendor identifier (required)
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
              <p className="mt-1.5 text-xs text-slate-600">
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
              <p className="mt-1.5 text-xs text-slate-600">
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
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Generate Vendor Statement</h3>
            <p className="text-sm text-slate-600">
              Enter vendor details above and click "Generate Statement" to create a detailed account statement
            </p>
          </div>
        </ContentCard>
      ) : isLoading || isFetching ? (
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-slate-600">Generating statement...</p>
            </div>
          </div>
        </ContentCard>
      ) : !statement || (!statement.transactions?.length && !statement.summary.endingBalance) ? (
        <ContentCard>
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Statement Data</h3>
            <p className="text-sm text-slate-600 mb-6">
              No statement data available for vendor ID <span className="font-mono font-semibold">{vendorId}</span> in the specified period.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setHasSearched(false);
                setVendorId('');
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
                <h3 className="text-sm font-semibold text-slate-900">Vendor Statement</h3>
                <div className="flex items-center gap-2">
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
                <h1 className="text-2xl font-bold text-slate-900 mb-4">VENDOR STATEMENT</h1>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-600 uppercase mb-2">Vendor Information</h3>
                    <div className="space-y-1">
                      {statement.vendor.name && (
                        <p className="text-sm font-semibold text-slate-900">{statement.vendor.name}</p>
                      )}
                      <p className="text-sm text-slate-700">
                        Vendor ID: <span className="font-mono">{statement.vendor.id || vendorId}</span>
                      </p>
                      {statement.vendor.address && (
                        <p className="text-sm text-slate-600">{statement.vendor.address}</p>
                      )}
                      {statement.vendor.email && (
                        <p className="text-sm text-slate-600">{statement.vendor.email}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-600 uppercase mb-2">Statement Period</h3>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">From:</span> {from ? formatDate(from) : 'Beginning'}
                      </p>
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">To:</span> {to ? formatDate(to) : 'Current'}
                      </p>
                      <p className="text-sm text-slate-600">
                        Generated: {new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Section */}
              <div className="bg-slate-50 rounded-lg p-6 mb-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Account Summary</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-700">Beginning Balance:</span>
                      <span className="text-sm font-medium text-slate-900 tabular-nums">
                        {formatCurrency(statement.summary.beginningBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-700">Total Charges:</span>
                      <span className="text-sm font-medium text-red-700 tabular-nums">
                        {formatCurrency(statement.summary.totalCharges)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-700">Total Payments:</span>
                      <span className="text-sm font-medium text-green-700 tabular-nums">
                        {formatCurrency(statement.summary.totalPayments)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t-2 border-slate-300">
                      <span className="text-sm font-semibold text-slate-900">Ending Balance:</span>
                      <span className="text-lg font-bold text-slate-900 tabular-nums">
                        {formatCurrency(statement.summary.endingBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              {statement.transactions && statement.transactions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Transaction Details</h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Description</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Amount</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {statement.transactions.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm text-slate-900">
                              {formatDate(tx.date || tx.transaction_date || tx.created_at)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {tx.type || tx.transaction_type || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {tx.description || tx.memo || tx.reference || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-right tabular-nums">
                              <span className={tx.amount < 0 ? 'text-green-700' : 'text-red-700'}>
                                {formatCurrency(Math.abs(tx.amount))}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right tabular-nums">
                              {formatCurrency(tx.balance || tx.running_balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Footer Notes */}
              <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-600">
                <p>
                  This statement reflects all transactions recorded in our system for the specified period. 
                  Please review and contact us if you have any questions or discrepancies.
                </p>
              </div>
            </div>
          </ContentCard>
        </>
      )}

      {/* Help Section */}
      <ContentCard className="print:hidden">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">About Vendor Statements</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-700">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">What is a Vendor Statement?</h4>
              <p className="text-xs text-slate-600">
                A vendor statement is a comprehensive record of all financial transactions between your company and a specific vendor. 
                It shows invoices, payments, credits, and the running balance over a specified period.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">How to Use This Report</h4>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Use for vendor reconciliation and account verification</li>
                <li>• Print or export for your records or to share with vendors</li>
                <li>• Review transaction details to identify discrepancies</li>
                <li>• Track payment history and outstanding balances</li>
              </ul>
            </div>
          </div>
        </div>
      </ContentCard>
    </div>
  );
}