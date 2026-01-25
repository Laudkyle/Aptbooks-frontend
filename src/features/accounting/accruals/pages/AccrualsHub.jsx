import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeAccrualsApi } from '../api/accruals.api.js';
import { makePeriodsApi } from '../../periods/api/periods.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../../shared/components/data/FilterBar.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';

export default function AccrualsHub() {
  const { http } = useApi();
  const api = useMemo(() => makeAccrualsApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const rulesQ = useQuery({ queryKey: ['accrual-rules'], queryFn: api.listRules, staleTime: 10_000 });
  const runsQ = useQuery({ queryKey: ['accrual-runs'], queryFn: () => api.listRuns({}), staleTime: 5_000 });
  const periodsQ = useQuery({ queryKey: ['periods'], queryFn: periodsApi.list, staleTime: 10_000 });

  const [asOfDate, setAsOfDate] = useState('');
  const [periodId, setPeriodId] = useState('');

  const runDue = useMutation({
    mutationFn: () => api.runDue({ asOfDate }),
    onSuccess: () => {
      toast.success('Due accrual run started.');
      qc.invalidateQueries({ queryKey: ['accrual-runs'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Run failed')
  });

  const runReversals = useMutation({
    mutationFn: () => api.runReversals({ periodId }),
    onSuccess: () => {
      toast.success('Reversals run started.');
      qc.invalidateQueries({ queryKey: ['accrual-runs'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Run failed')
  });

  const runPeriodEnd = useMutation({
    mutationFn: () => api.runPeriodEnd({ periodId, asOfDate: asOfDate || undefined }),
    onSuccess: () => {
      toast.success('Period-end accrual run started.');
      qc.invalidateQueries({ queryKey: ['accrual-runs'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Run failed')
  });

  const rules = Array.isArray(rulesQ.data) ? rulesQ.data : [];
  const runs = Array.isArray(runsQ.data) ? runsQ.data : [];
  const periods = Array.isArray(periodsQ.data) ? periodsQ.data : [];

  const periodOptions = [{ value: '', label: 'Select period…' }].concat(
    periods.map((p) => ({ value: p.id, label: p.code }))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* QuickBooks-style Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Accruals</h1>
            <p className="mt-1 text-sm text-gray-600">Manage accrual rules and run accrual processes</p>
          </div>
          <button
            onClick={() => (window.location.href = ROUTES.accountingAccrualNew)}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-md font-medium transition-colors shadow-sm"
          >
            New Rule
          </button>
        </div>

        <div className="space-y-6">
          {/* Run Accruals Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Run Accruals</h2>
              <p className="mt-1 text-sm text-gray-600">Execute accrual processes for due items, reversals, or period-end</p>
            </div>
            
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Select 
                    label="Period" 
                    value={periodId} 
                    onChange={(e) => setPeriodId(e.target.value)} 
                    options={periodOptions} 
                  />
                  <Input 
                    label="As of Date" 
                    type="date" 
                    value={asOfDate} 
                    onChange={(e) => setAsOfDate(e.target.value)} 
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button 
                    onClick={() => runDue.mutate()} 
                    disabled={!asOfDate || runDue.isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {runDue.isLoading ? 'Running...' : 'Run Due'}
                  </Button>
                  <Button 
                    onClick={() => runReversals.mutate()} 
                    disabled={!periodId || runReversals.isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {runReversals.isLoading ? 'Running...' : 'Run Reversals'}
                  </Button>
                  <Button 
                    onClick={() => runPeriodEnd.mutate()} 
                    disabled={!periodId || runPeriodEnd.isLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {runPeriodEnd.isLoading ? 'Running...' : 'Run Period-End'}
                  </Button>
                </div>

                <div className="mt-4 text-xs text-gray-600 bg-white rounded px-3 py-2 border border-gray-200">
                  <span className="font-semibold">Note:</span> As of Date is required for "Run Due". Period is required for "Run Reversals" and "Run Period-End".
                </div>
              </div>
            </div>
          </div>

          {/* Rules Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Accrual Rules</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rule Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Frequency</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                        No accrual rules found. Create your first rule to get started.
                      </td>
                    </tr>
                  ) : (
                    rules.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm">
                          <Link 
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium" 
                            to={ROUTES.accountingAccruals + `?ruleId=${r.id}`}
                          >
                            {r.code}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{r.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                            {r.rule_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{r.frequency}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            r.status === 'active' ? 'bg-green-100 text-green-800' : 
                            r.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {r.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Runs Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Runs</h2>
              <p className="mt-1 text-sm text-gray-600">History of accrual process executions</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Run ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {runs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                        No runs found. Execute an accrual run above to see results here.
                      </td>
                    </tr>
                  ) : (
                    runs.map((r) => (
                      <tr key={r.runId ?? r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-gray-900 bg-gray-50">
                          {r.runId ?? r.id}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            r.status === 'completed' ? 'bg-green-100 text-green-800' :
                            r.status === 'running' ? 'bg-blue-100 text-blue-800' :
                            r.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {r.status || 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {r.createdAt ?? r.created_at ?? '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}