import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeBalancesApi } from '../api/balances.api.js';
import { makePeriodsApi } from '../../periods/api/periods.api.js';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { formatMoney } from '../../../../shared/utils/formatMoney.js';
import { formatDate } from '../../../../shared/utils/formatDate.js';
import { Download, Printer, Calendar, Scale, TrendingUp, TrendingDown, FileSpreadsheet } from 'lucide-react';

export default function TrialBalance() {
  const { http } = useApi();
  const api = useMemo(() => makeBalancesApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  
  
  const periodsQ = useQuery({ 
    queryKey: ['periods'], 
    queryFn: periodsApi.list, 
    staleTime: 10_000 
  });
  
  const [periodId, setPeriodId] = useState('');
  const [viewMode, setViewMode] = useState('net');// 'net' or 'debit-credit'
  
  const tbQ = useQuery({
    queryKey: ['trialBalance', periodId],
    queryFn: () => api.trialBalance({ periodId }),
    enabled: !!periodId
  });
  
  const periodOptions = [
    { value: '', label: 'Select period…' }
  ].concat((periodsQ.data ?? []).map((p) => ({ 
    value: p.id, 
    label: `${p.code}${p.name ? ` - ${p.name}` : ''}` 
  })));

  const selectedPeriod = periodsQ.data?.find(p => p.id === periodId);
  const rows = tbQ.data?.data ?? tbQ.data ?? [];

  // Calculate totals
  const totals = rows.reduce((acc, row) => {
    const debit = parseFloat(row.debit ?? row.debit_total ?? 0);
    const credit = parseFloat(row.credit ?? row.credit_total ?? 0);
    return {
      debit: acc.debit + debit,
      credit: acc.credit + credit
    };
  }, { debit: 0, credit: 0 });

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;
  const difference = totals.debit - totals.credit;

  // Calculate net balance for each row
  const getNetBalance = (row) => {
    const debit = parseFloat(row.debit ?? row.debit_total ?? 0);
    const credit = parseFloat(row.credit ?? row.credit_total ?? 0);
    const net = debit - credit;
    return {
      amount: Math.abs(net),
      type: net >= 0 ? 'debit' : 'credit',
      net: net
    };
  };

  return (
    <div className="min-h-screen bg-surface-2">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Scale className="w-8 h-8" />
                <div>
                  <h1 className="text-3xl font-bold">Trial Balance</h1>
                  <p className="text-blue-200 mt-1">Account balances verification report</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* Filters and Controls */}
          <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle">
            <div className="px-6 py-4 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-text-strong">Report Parameters</h2>
            </div>
            <div className="p-6">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-body mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Period *
                  </label>
                  <Select 
                    value={periodId} 
                    onChange={(e) => setPeriodId(e.target.value)} 
                    options={periodOptions}
                  />
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-body mb-2">
                    Display Mode
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'net' ? 'default' : 'secondary'}
                      onClick={() => setViewMode('net')}
                      className="flex-1"
                      size="sm"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Net Balance
                    </Button>
                    <Button
                      variant={viewMode === 'debit-credit' ? 'default' : 'secondary'}
                      onClick={() => setViewMode('debit-credit')}
                      className="flex-1"
                      size="sm"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Debit/Credit
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Status Card */}
          {periodId && !tbQ.isLoading && !tbQ.isError && rows.length > 0 && (
            <div className={`rounded-lg shadow-sm border-2 p-6 ${isBalanced ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full ${isBalanced ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Scale className={`w-6 h-6 ${isBalanced ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${isBalanced ? 'text-green-900' : 'text-red-900'}`}>
                      {isBalanced ? 'Trial Balance is Balanced ✓' : 'Trial Balance is Out of Balance ✗'}
                    </h3>
                    <p className={`text-sm ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>
                      {isBalanced 
                        ? 'Debits and credits are equal' 
                        : `Difference: ${formatMoney(Math.abs(difference), 'GHS')} (${difference > 0 ? 'Debit Heavy' : 'Credit Heavy'})`
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-text-muted uppercase tracking-wide">Total Debit</div>
                  <div className="text-xl font-bold text-text-strong">{formatMoney(totals.debit, 'GHS')}</div>
                  <div className="text-xs font-medium text-text-muted uppercase tracking-wide mt-2">Total Credit</div>
                  <div className="text-xl font-bold text-text-strong">{formatMoney(totals.credit, 'GHS')}</div>
                </div>
              </div>
            </div>
          )}

          {/* Trial Balance Content */}
          {!periodId ? (
            <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle">
              <div className="p-12 text-center">
                <Calendar className="w-16 h-16 text-text-soft mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-text-strong mb-2">Select a Period</h3>
                <p className="text-sm text-text-muted">Choose a period above to view the trial balance</p>
              </div>
            </div>
          ) : tbQ.isLoading ? (
            <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle">
              <div className="p-12 text-center">
                <div className="text-text-muted">Loading trial balance...</div>
              </div>
            </div>
          ) : tbQ.isError ? (
            <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle">
              <div className="p-12 text-center">
                <div className="text-red-600">{tbQ.error?.message ?? 'Failed to load trial balance.'}</div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle overflow-hidden">
              <div className="p-6 text-center border-b border-border-subtle bg-surface-2">
                <h2 className="text-xl font-bold text-text-strong">Trial Balance</h2>
                <p className="text-sm text-text-muted mt-1">
                  {selectedPeriod?.name || selectedPeriod?.code}
                </p>
                {selectedPeriod?.start_date && selectedPeriod?.end_date && (
                  <p className="text-xs text-text-muted mt-1">
                    {formatDate(selectedPeriod.start_date, 'MMM DD, YYYY')} - {formatDate(selectedPeriod.end_date, 'MMM DD, YYYY')}
                  </p>
                )}
              </div>

              <div className="overflow-x-auto">
                {viewMode === 'debit-credit' ? (
                  // Debit/Credit View
                  <table className="w-full">
                    <thead className="bg-surface-2 border-b-2 border-border-subtle">
                      <tr>
                        <th className="py-4 px-6 text-left text-xs font-bold text-text-body uppercase tracking-wider">
                          Code
                        </th>
                        <th className="py-4 px-6 text-left text-xs font-bold text-text-body uppercase tracking-wider">
                          Account Name
                        </th>
                        <th className="py-4 px-6 text-right text-xs font-bold text-text-body uppercase tracking-wider w-48">
                          Debit
                        </th>
                        <th className="py-4 px-6 text-right text-xs font-bold text-text-body uppercase tracking-wider w-48">
                          Credit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-12 text-center text-text-muted">
                            No accounts found for this period
                          </td>
                        </tr>
                      ) : (
                        rows.map((row, idx) => {
                          const debit = parseFloat(row.debit ?? row.debit_total ?? 0);
                          const credit = parseFloat(row.credit ?? row.credit_total ?? 0);
                          return (
                            <tr key={row.accountId ?? row.account_id ?? idx} className="hover:bg-surface-2 transition-colors">
                              <td className="py-3 px-6">
                                <div className="text-sm font-medium text-text-strong">
                                  {row.code ?? row.account_code ?? '—'}
                                </div>
                              </td>
                              <td className="py-3 px-6">
                                <div className="text-sm text-text-body">
                                  {row.name ?? row.account_name ?? '—'}
                                </div>
                              </td>
                              <td className="py-3 px-6 text-right">
                                <div className={`text-sm font-medium ${debit > 0 ? 'text-green-700' : 'text-text-soft'}`}>
                                  {debit > 0 ? formatMoney(debit, 'GHS') : '—'}
                                </div>
                              </td>
                              <td className="py-3 px-6 text-right">
                                <div className={`text-sm font-medium ${credit > 0 ? 'text-red-700' : 'text-text-soft'}`}>
                                  {credit > 0 ? formatMoney(credit, 'GHS') : '—'}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot className="bg-surface-2 border-t-2 border-border-subtle">
                      <tr>
                        <td colSpan="2" className="py-4 px-6 text-right text-sm font-bold text-text-strong uppercase">
                          Total
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="text-base font-bold text-green-700">
                            {formatMoney(totals.debit, 'GHS')}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="text-base font-bold text-red-700">
                            {formatMoney(totals.credit, 'GHS')}
                          </div>
                        </td>
                      </tr>
                      <tr className="bg-surface-2">
                        <td colSpan="2" className="py-3 px-6 text-right text-sm font-semibold text-text-body">
                          Difference
                        </td>
                        <td colSpan="2" className="py-3 px-6 text-right">
                          <div className={`text-sm font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                            {isBalanced ? '✓ Balanced' : `✗ ${formatMoney(Math.abs(difference), 'GHS')} (${difference > 0 ? 'DR' : 'CR'})`}
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  // Net Balance View - Shows single net amount per account
                  <table className="w-full">
                    <thead className="bg-surface-2 border-b-2 border-border-subtle">
                      <tr>
                        <th className="py-4 px-6 text-left text-xs font-bold text-text-body uppercase tracking-wider">
                          Code
                        </th>
                        <th className="py-4 px-6 text-left text-xs font-bold text-text-body uppercase tracking-wider">
                          Account Name
                        </th>
                        <th className="py-4 px-6 text-right text-xs font-bold text-text-body uppercase tracking-wider w-64">
                          Net Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="py-12 text-center text-text-muted">
                            No accounts found for this period
                          </td>
                        </tr>
                      ) : (
                        rows.map((row, idx) => {
                          const netBalance = getNetBalance(row);
                          return (
                            <tr key={row.accountId ?? row.account_id ?? idx} className="hover:bg-surface-2 transition-colors">
                              <td className="py-3 px-6">
                                <div className="text-sm font-medium text-text-strong">
                                  {row.code ?? row.accountCode ?? '—'}
                                </div>
                              </td>
                              <td className="py-3 px-6">
                                <div className="text-sm text-text-body">
                                  {row.name ?? row.accountName ?? '—'}
                                </div>
                              </td>
                              <td className="py-3 px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <span className={`text-sm font-medium ${netBalance.amount > 0 ? (netBalance.type === 'debit' ? 'text-green-700' : 'text-red-700') : 'text-text-soft'}`}>
                                    {netBalance.amount > 0 ? formatMoney(netBalance.amount, 'GHS') : '—'}
                                  </span>
                                  {netBalance.amount > 0 && (
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${netBalance.type === 'debit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {netBalance.type === 'debit' ? 'DR' : 'CR'}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot className="bg-surface-2 border-t-2 border-border-subtle">
                      <tr>
                        <td colSpan="2" className="py-4 px-6 text-right text-sm font-bold text-text-strong uppercase">
                          Net Totals
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="space-y-1">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-sm text-text-muted">Debit:</span>
                              <span className="text-base font-bold text-green-700">{formatMoney(totals.debit, 'GHS')}</span>
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-sm text-text-muted">Credit:</span>
                              <span className="text-base font-bold text-red-700">{formatMoney(totals.credit, 'GHS')}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr className="bg-surface-2">
                        <td colSpan="2" className="py-3 px-6 text-right text-sm font-semibold text-text-body">
                          Balance Check
                        </td>
                        <td className="py-3 px-6 text-right">
                          <div className={`text-sm font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                            {isBalanced ? '✓ Balanced' : `✗ Out of balance by ${formatMoney(Math.abs(difference), 'GHS')}`}
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}