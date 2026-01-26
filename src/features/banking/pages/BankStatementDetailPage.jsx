import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Upload, RefreshCw, Check, X, Search, Filter, Download } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeBankingApi } from '../api/banking.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';
import { Pagination } from '../../../shared/components/ui/Pagination.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

function normalizeRows(data) {
  return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : data?.rows ?? [];
}

export default function BankStatementDetailPage() {
  const { statementId } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { http } = useApi();
  const api = useMemo(() => makeBankingApi(http), [http]);

  const [tab, setTab] = useState('lines');
  const [paging, setPaging] = useState({ limit: 200, offset: 0 });
  const [matchedFilter, setMatchedFilter] = useState('all');

  const [jsonOpen, setJsonOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [csvText, setCsvText] = useState('');

  const [selectedLineId, setSelectedLineId] = useState(null);
  const [suggestLimit, setSuggestLimit] = useState(10);
  const [manualJournalId, setManualJournalId] = useState('');

  const accountsQuery = useQuery({ queryKey: ['banking.accounts'], queryFn: async () => api.listAccounts() });
  const statementsQuery = useQuery({ queryKey: ['banking.statements'], queryFn: async () => api.listStatements() });

  const lineParams = useMemo(() => {
    const p = { ...paging };
    if (matchedFilter === 'matched') p.matched = 'true';
    if (matchedFilter === 'unmatched') p.matched = 'false';
    return p;
  }, [paging, matchedFilter]);

  const linesQuery = useQuery({
    queryKey: ['banking.statementLines', statementId, lineParams],
    queryFn: async () => api.listStatementLines(statementId, lineParams),
    keepPreviousData: true
  });

  const suggestionsQuery = useQuery({
    queryKey: ['banking.matching.suggestions', selectedLineId, suggestLimit],
    queryFn: async () => api.suggestMatches(selectedLineId, { limit: suggestLimit }),
    enabled: !!selectedLineId
  });

  const importJsonMutation = useMutation({
    mutationFn: async () => {
      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch (e) {
        throw new Error('Invalid JSON. Provide {"lines":[...]} or an array of lines.');
      }
      const payload = Array.isArray(parsed) ? { lines: parsed } : parsed;
      return api.addStatementLines(statementId, payload);
    },
    onSuccess: () => {
      toast.success('Statement lines imported.');
      setJsonOpen(false);
      setJsonText('');
      qc.invalidateQueries({ queryKey: ['banking.statementLines', statementId] });
    },
    onError: (e) => toast.error(e?.response?.data?.error ?? e?.message ?? 'Import failed.')
  });

  const importCsvMutation = useMutation({
    mutationFn: async () => api.importStatementLinesCsv(statementId, csvText),
    onSuccess: () => {
      toast.success('CSV imported.');
      setCsvOpen(false);
      setCsvText('');
      qc.invalidateQueries({ queryKey: ['banking.statementLines', statementId] });
    },
    onError: (e) => toast.error(e?.response?.data?.error ?? e?.message ?? 'CSV import failed.')
  });

  const matchMutation = useMutation({
    mutationFn: async ({ lineId, journalEntryId, reason, ruleVersion }) =>
      api.matchStatementLine(lineId, { journalEntryId, method: 'manual', reason, ruleVersion }),
    onSuccess: () => {
      toast.success('Transaction matched successfully');
      qc.invalidateQueries({ queryKey: ['banking.statementLines', statementId] });
      if (selectedLineId) qc.invalidateQueries({ queryKey: ['banking.matching.suggestions', selectedLineId] });
    },
    onError: (e) => toast.error(e?.response?.data?.error ?? e?.message ?? 'Match failed.')
  });

  const accounts = normalizeRows(accountsQuery.data);
  const statements = normalizeRows(statementsQuery.data);
  const accountsById = useMemo(() => {
    const m = new Map();
    accounts.forEach((a) => m.set(String(a.id), a));
    return m;
  }, [accounts]);

  const statement = statements.find((s) => String(s.id) === String(statementId)) ?? null;
  const bankAccount = statement ? accountsById.get(String(statement.bank_account_id)) : null;

  const linesPayload = linesQuery.data;
  const lines = Array.isArray(linesPayload?.data) ? linesPayload.data : normalizeRows(linesPayload);

  const suggestionsPayload = suggestionsQuery.data;
  const suggestions = Array.isArray(suggestionsPayload?.data) ? suggestionsPayload.data : normalizeRows(suggestionsPayload);
  const suggestionsNote = suggestionsPayload?.note;

  const matchedCount = lines.filter(l => l.matched).length;
  const totalCount = lines.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* QuickBooks-style Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => nav(ROUTES.bankingStatements)}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Bank Reconciliation</h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  {bankAccount ? `${bankAccount.code} - ${bankAccount.name}` : 'Loading...'}
                  {statement?.statement_date && ` • ${statement.statement_date}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCsvOpen(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import CSV
              </button>
              <button
                onClick={() => setJsonOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors inline-flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar - QuickBooks Style */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Statement Balance</div>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                ${lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Matched Transactions</div>
              <div className="text-2xl font-semibold text-green-600 mt-1">
                {matchedCount} of {totalCount}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Remaining</div>
              <div className="text-2xl font-semibold text-orange-600 mt-1">
                {totalCount - matchedCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter:</span>
            </div>
            <div className="flex gap-2">
              {['all', 'matched', 'unmatched'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setMatchedFilter(filter)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    matchedFilter === filter
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
            <div className="ml-auto">
              <button
                onClick={() => linesQuery.refetch()}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {linesQuery.isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading transactions...</div>
          ) : linesQuery.isError ? (
            <div className="p-8 text-center text-red-600">
              {linesQuery.error?.message ?? 'Failed to load transactions'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lines.map((line) => (
                    <tr 
                      key={line.id} 
                      className={`hover:bg-gray-50 transition-colors ${
                        String(selectedLineId) === String(line.id) ? 'bg-green-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {line.txn_date ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {line.description || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {line.reference || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                        <span className={parseFloat(line.amount) >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ${Math.abs(parseFloat(line.amount) || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {line.matched ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="h-3 w-3" />
                            Matched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <X className="h-3 w-3" />
                            Unmatched
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => {
                            setSelectedLineId(line.id);
                            setTab('matching');
                          }}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            String(selectedLineId) === String(line.id)
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-white text-green-600 border border-green-600 hover:bg-green-50'
                          }`}
                        >
                          Find Match
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Pagination
              limit={paging.limit}
              offset={paging.offset}
              onChange={(p) => setPaging((prev) => ({ ...prev, ...p }))}
            />
          </div>
        </div>

        {/* Matching Panel - Only show when line selected */}
        {selectedLineId && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Find Matching Transaction</h2>
              <button
                onClick={() => suggestionsQuery.refetch()}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            {suggestionsNote && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                {suggestionsNote}
              </div>
            )}

            {suggestionsQuery.isLoading ? (
              <div className="py-8 text-center text-gray-500">Loading suggestions...</div>
            ) : suggestionsQuery.isError ? (
              <div className="py-8 text-center text-red-600">Failed to load suggestions</div>
            ) : (
              <>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match Score</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Journal Entry</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Memo</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Difference</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {suggestions.map((sug) => (
                        <tr key={sug.journal_entry_line_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500 rounded-full"
                                  style={{ width: `${Math.min((sug.score || 0) * 100, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono text-gray-600">
                                {((sug.score || 0) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{sug.entry_date ?? '—'}</td>
                          <td className="px-4 py-3 text-sm font-mono text-gray-600">{sug.journal_entry_id}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{sug.memo || '—'}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                            ${Math.abs(parseFloat(sug.signed_amount) || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            {sug.amount_diff ? `$${Math.abs(parseFloat(sug.amount_diff)).toFixed(2)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => matchMutation.mutate({ 
                                lineId: selectedLineId, 
                                journalEntryId: sug.journal_entry_id 
                              })}
                              disabled={matchMutation.isLoading}
                              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                              Match
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Manual Match */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Manual Match</h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Enter Journal Entry ID"
                      value={manualJournalId}
                      onChange={(e) => setManualJournalId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <button
                      onClick={() => matchMutation.mutate({ 
                        lineId: selectedLineId, 
                        journalEntryId: manualJournalId 
                      })}
                      disabled={!manualJournalId || matchMutation.isLoading}
                      className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      Match Transaction
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Enter a posted journal entry ID to manually match this transaction
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Import Modals */}
      <Modal
        open={jsonOpen}
        title="Import Transactions (JSON)"
        onClose={() => !importJsonMutation.isLoading && setJsonOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setJsonOpen(false)}
              disabled={importJsonMutation.isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => importJsonMutation.mutate()}
              disabled={importJsonMutation.isLoading || !jsonText.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Import
            </button>
          </div>
        }
      >
        <Textarea
          label="JSON Payload"
          rows={10}
          placeholder='{"lines":[{"txnDate":"YYYY-MM-DD","amount":123.45,...}]}'
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
        />
        <p className="mt-2 text-xs text-gray-500">
          POST /modules/banking/statements/:statementId/lines
        </p>
      </Modal>

      <Modal
        open={csvOpen}
        title="Import Transactions (CSV)"
        onClose={() => !importCsvMutation.isLoading && setCsvOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setCsvOpen(false)}
              disabled={importCsvMutation.isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => importCsvMutation.mutate()}
              disabled={importCsvMutation.isLoading || !csvText.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Import
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Textarea
            label="CSV Text"
            rows={10}
            placeholder="txnDate,amount,description,reference,externalId&#10;2026-01-01,100.00,Deposit,REF123,EXT001"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Or Upload File</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setCsvText(await f.text());
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
          </div>
         
        </div>
      </Modal>
    </div>
  );
}