import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, FileText, Download, Filter, Search, Sparkles } from 'lucide-react';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeReconciliationApi } from '../api/reconciliation.api.js';
import { makePeriodsApi } from '../../periods/api/periods.api.js';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';

export default function Reconciliation() {
  const { http } = useApi();
  const api = useMemo(() => makeReconciliationApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  
  const periodsQ = useQuery({ 
    queryKey: ['periods'], 
    queryFn: periodsApi.list, 
    staleTime: 10_000 
  });
  
  const [periodId, setPeriodId] = useState('');
  const [showOnlyMismatches, setShowOnlyMismatches] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [showAutoCorrectModal, setShowAutoCorrectModal] = useState(false);
  const [autoCorrectThreshold, setAutoCorrectThreshold] = useState('0.01');
  
  const q = useQuery({
    queryKey: ['reconcile-period', periodId, showOnlyMismatches],
    queryFn: () => api.period({ periodId, onlyMismatches: showOnlyMismatches }),
    enabled: !!periodId
  });

  const discrepancyDetailsQ = useQuery({
    queryKey: ['discrepancy-details', periodId, selectedAccountId],
    queryFn: () => api.getDiscrepancyDetails({ periodId, accountId: selectedAccountId }),
    enabled: !!periodId && !!selectedAccountId && showDiscrepancyModal
  });

  const autoCorrectMutation = useMutation({
    mutationFn: ({ dryRun }) => api.autoCorrect({ 
      periodId, 
      threshold: parseFloat(autoCorrectThreshold),
      dryRun 
    }),
    onSuccess: (data) => {
      if (data.data.dryRun) {
        toast.success(`Preview: ${data.data.summary.correctableAccounts} accounts can be corrected`);
      } else {
        toast.success(`Successfully corrected ${data.data.summary.correctableAccounts} accounts`);
        qc.invalidateQueries({ queryKey: ['reconcile-period', periodId] });
        setShowAutoCorrectModal(false);
      }
    },
    onError: (error) => {
      toast.error(error?.message ?? 'Auto-correction failed');
    }
  });

  const periodOptions = [
    { value: '', label: 'Select period…' }
  ].concat(
    (periodsQ.data ?? []).map((p) => ({ 
      value: p.id, 
      label: p.code 
    }))
  );

  const reconciliationData = q.data?.data;
  const isReconciled = reconciliationData?.ok === true;
  const accountsCompared = reconciliationData?.summary?.accountsCompared || 0;
  const mismatchCount = reconciliationData?.summary?.mismatches || 0;
  const totalVariance = reconciliationData?.summary?.totalVariance || 0;
  const diffs = reconciliationData?.diffs || [];
  const selectedPeriod = (periodsQ.data ?? []).find(p => p.id === periodId);

  const handleViewDetails = (accountId) => {
    setSelectedAccountId(accountId);
    setShowDiscrepancyModal(true);
  };

  const discrepancyDetails = discrepancyDetailsQ.data?.data;
  const autoCorrectPreview = autoCorrectMutation.data?.data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* QuickBooks-style Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Ledger Reconciliation</h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Period-level general ledger reconciliation and variance analysis
              </p>
            </div>
            <div className="flex items-center gap-2">
              {mismatchCount > 0 && (
                <button
                  onClick={() => setShowAutoCorrectModal(true)}
                  disabled={!periodId}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Auto-Correct
                </button>
              )}
              <button
                onClick={() => q.refetch()}
                disabled={!periodId || q.isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${q.isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                disabled={!periodId}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Period Selection Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accounting Period
              </label>
              <Select 
                value={periodId} 
                onChange={(e) => setPeriodId(e.target.value)} 
                options={periodOptions}
                className="w-full"
              />
            </div>
            {selectedPeriod && (
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Period Details</div>
                <div className="text-sm text-gray-900 mt-1">
                  {selectedPeriod.code} {selectedPeriod.name && `• ${selectedPeriod.name}`}
                  {reconciliationData?.periodStatus && (
                    <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      reconciliationData.periodStatus === 'closed' 
                        ? 'bg-gray-100 text-gray-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {reconciliationData.periodStatus}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {!periodId ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Period to Begin</h3>
            <p className="text-sm text-gray-600">
              Choose an accounting period from the dropdown above to view reconciliation results
            </p>
          </div>
        ) : q.isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <RefreshCw className="h-16 w-16 text-green-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Reconciliation...</h3>
            <p className="text-sm text-gray-600">Please wait while we verify your accounts</p>
          </div>
        ) : q.isError ? (
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-12 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Reconciliation</h3>
            <p className="text-sm text-red-600">{q.error?.message ?? 'Failed to load reconciliation data'}</p>
          </div>
        ) : (
          <>
            {/* Warnings */}
            {reconciliationData?.warnings?.length > 0 && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">Warnings</h3>
                    {reconciliationData.warnings.map((warning, idx) => (
                      <p key={idx} className="text-sm text-yellow-700 mt-1">{warning}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Status Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {/* Reconciliation Status */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Status
                    </div>
                    <div className="text-xl font-semibold text-gray-900">
                      {isReconciled ? (
                        <span className="text-green-600 flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          Reconciled
                        </span>
                      ) : (
                        <span className="text-orange-600 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Issues
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Accounts Compared */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Accounts
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {accountsCompared.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Compared
                </div>
              </div>

              {/* Discrepancies */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Discrepancies
                </div>
                <div className={`text-2xl font-bold ${mismatchCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {mismatchCount.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {mismatchCount > 0 ? 'Need attention' : 'All balanced'}
                </div>
              </div>

              {/* Total Variance */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Total Variance
                </div>
                <div className={`text-2xl font-bold ${totalVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${Math.abs(totalVariance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Across all accounts
                </div>
              </div>
            </div>

            {/* Account Details Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Table Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Account Details</h2>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowOnlyMismatches(!showOnlyMismatches)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-2 ${
                        showOnlyMismatches
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Filter className="h-4 w-4" />
                      {showOnlyMismatches ? 'Show All' : 'Discrepancies Only'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Table Content */}
              {diffs.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Perfect Balance</h3>
                  <p className="text-sm text-gray-600">
                    No account differences detected for this period
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Account
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          GL Balance
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Computed Balance
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Variance
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {diffs.map((diff) => {
                        const hasDifference = !diff.isMatch;
                        return (
                          <tr 
                            key={diff.accountId}
                            className={`hover:bg-gray-50 transition-colors ${
                              hasDifference ? 'bg-red-50' : ''
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-mono font-semibold text-gray-900">
                                {diff.accountCode || '—'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {diff.accountName || 'Unnamed Account'}
                              </div>
                              {diff.accountType && (
                                <div className="text-xs text-gray-500 mt-0.5 capitalize">
                                  {diff.accountType}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-mono font-semibold text-gray-900">
                                ${(diff.glBalance || 0).toLocaleString('en-US', { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-mono font-semibold text-gray-900">
                                ${(diff.recomputedBalance || 0).toLocaleString('en-US', { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className={`text-sm font-mono font-bold ${
                                hasDifference ? 'text-red-600' : 'text-green-600'
                              }`}>
                                ${Math.abs(diff.balanceDifference || 0).toLocaleString('en-US', { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {hasDifference ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <XCircle className="h-3 w-3" />
                                  Out of Balance
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3" />
                                  Balanced
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {hasDifference && (
                                <button
                                  onClick={() => handleViewDetails(diff.accountId)}
                                  className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                                >
                                  <Search className="h-3 w-3" />
                                  Investigate
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Table Footer */}
              {diffs.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {diffs.length} accounts
                    {mismatchCount > 0 && ` • ${mismatchCount} with discrepancies`}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Discrepancy Details Modal */}
      {showDiscrepancyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Discrepancy Investigation</h2>
                {discrepancyDetails?.account && (
                  <p className="text-sm text-gray-600 mt-0.5">
                    {discrepancyDetails.account.code} - {discrepancyDetails.account.name}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowDiscrepancyModal(false);
                  setSelectedAccountId(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
              {discrepancyDetailsQ.isLoading ? (
                <div className="py-12 text-center">
                  <RefreshCw className="h-12 w-12 text-green-500 mx-auto mb-4 animate-spin" />
                  <p className="text-sm text-gray-600">Loading transaction details...</p>
                </div>
              ) : discrepancyDetailsQ.isError ? (
                <div className="py-12 text-center">
                  <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-sm text-red-600">{discrepancyDetailsQ.error?.message ?? 'Failed to load'}</p>
                </div>
              ) : discrepancyDetails ? (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs font-medium text-gray-500 uppercase">Transactions</div>
                      <div className="text-xl font-bold text-gray-900 mt-1">
                        {discrepancyDetails.summary.transactionCount}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs font-medium text-gray-500 uppercase">GL Balance</div>
                      <div className="text-xl font-bold text-gray-900 mt-1">
                        ${discrepancyDetails.summary.glBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs font-medium text-gray-500 uppercase">Computed</div>
                      <div className="text-xl font-bold text-gray-900 mt-1">
                        ${discrepancyDetails.summary.computedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="text-xs font-medium text-red-600 uppercase">Variance</div>
                      <div className="text-xl font-bold text-red-600 mt-1">
                        ${Math.abs(discrepancyDetails.summary.variance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Transactions */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {discrepancyDetails.transactions.map((txn) => (
                          <tr key={txn.lineId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{txn.entryDate}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 font-mono">{txn.reference || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{txn.memo || txn.lineDescription || '—'}</td>
                            <td className="px-4 py-3 text-sm text-right font-mono">
                              {txn.type === 'debit' ? `$${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-mono">
                              {txn.type === 'credit' ? `$${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-mono font-semibold">
                              ${txn.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Auto-Correct Modal */}
      {showAutoCorrectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Auto-Correct Rounding Differences</h2>
                <p className="text-sm text-gray-600 mt-0.5">Automatically fix minor variance discrepancies</p>
              </div>
              <button
                onClick={() => setShowAutoCorrectModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="px-6 py-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Variance Threshold
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={autoCorrectThreshold}
                  onChange={(e) => setAutoCorrectThreshold(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only accounts with variance less than or equal to this amount will be corrected
                </p>
              </div>

              {autoCorrectPreview && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Preview Results</h3>
                  <div className="text-sm text-blue-800">
                    <p>• {autoCorrectPreview.summary.correctableAccounts} of {autoCorrectPreview.summary.totalMismatches} accounts can be corrected</p>
                    <p>• Total variance to be corrected: ${autoCorrectPreview.summary.totalVarianceCorrected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  
                  {autoCorrectPreview.corrections.length > 0 && (
                    <div className="mt-3 max-h-40 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-blue-100">
                          <tr>
                            <th className="px-2 py-1 text-left">Account</th>
                            <th className="px-2 py-1 text-right">Variance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {autoCorrectPreview.corrections.map((corr, idx) => (
                            <tr key={idx} className="border-t border-blue-200">
                              <td className="px-2 py-1">{corr.accountCode} - {corr.accountName}</td>
                              <td className="px-2 py-1 text-right font-mono">
                                ${Math.abs(corr.variance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAutoCorrectModal(false)}
                disabled={autoCorrectMutation.isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => autoCorrectMutation.mutate({ dryRun: true })}
                disabled={autoCorrectMutation.isLoading || !autoCorrectThreshold}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Preview
              </button>
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to correct ${autoCorrectPreview?.summary?.correctableAccounts || 0} accounts?`)) {
                    autoCorrectMutation.mutate({ dryRun: false });
                  }
                }}
                disabled={autoCorrectMutation.isLoading || !autoCorrectThreshold || !autoCorrectPreview}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {autoCorrectMutation.isLoading ? 'Applying...' : 'Apply Corrections'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}