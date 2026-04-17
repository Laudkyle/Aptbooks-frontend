import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search as SearchIcon,
  FileText,
  Users,
  BookOpen,
  Briefcase,
  Receipt,
  Landmark,
  Boxes,
  FolderKanban,
  ShieldCheck
} from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeSearchApi } from '../api/search.api.js';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Skeleton } from '../../../shared/components/ui/Skeleton.jsx';
import { resolveSearchResultPath } from '../utils/searchNavigation.js';

const GROUP_CONFIG = {
  partners: { title: 'Partners', icon: Users, accent: 'text-blue-600' },
  accounts: { title: 'Accounts', icon: Briefcase, accent: 'text-green-600' },
  journals: { title: 'Journals', icon: BookOpen, accent: 'text-purple-600' },
  invoices: { title: 'Invoices', icon: Receipt, accent: 'text-emerald-600' },
  bills: { title: 'Bills', icon: Receipt, accent: 'text-red-600' },
  customerReceipts: { title: 'Customer Receipts', icon: Receipt, accent: 'text-sky-600' },
  vendorPayments: { title: 'Vendor Payments', icon: Receipt, accent: 'text-indigo-600' },
  creditNotes: { title: 'Credit Notes', icon: Receipt, accent: 'text-pink-600' },
  debitNotes: { title: 'Debit Notes', icon: Receipt, accent: 'text-rose-600' },
  operationalDocuments: { title: 'Operational Documents', icon: FileText, accent: 'text-amber-600' },
  assets: { title: 'Assets', icon: Landmark, accent: 'text-stone-600' },
  inventoryItems: { title: 'Inventory Items', icon: Boxes, accent: 'text-orange-600' },
  inventoryTransactions: { title: 'Inventory Transactions', icon: Boxes, accent: 'text-orange-600' },
  stockCounts: { title: 'Stock Counts', icon: Boxes, accent: 'text-orange-600' },
  transfers: { title: 'Transfers', icon: Boxes, accent: 'text-orange-600' },
  projects: { title: 'Projects', icon: FolderKanban, accent: 'text-cyan-600' },
  budgets: { title: 'Budgets', icon: FolderKanban, accent: 'text-teal-600' },
  forecasts: { title: 'Forecasts', icon: FolderKanban, accent: 'text-teal-600' },
  bankAccounts: { title: 'Bank Accounts', icon: Landmark, accent: 'text-violet-600' },
  bankStatements: { title: 'Bank Statements', icon: Landmark, accent: 'text-violet-600' },
  bankReconciliations: { title: 'Bank Reconciliations', icon: Landmark, accent: 'text-violet-600' },
  paymentRuns: { title: 'Payment Runs', icon: Landmark, accent: 'text-violet-600' },
  bankTransfers: { title: 'Bank Transfers', icon: Landmark, accent: 'text-violet-600' },
  approvalBatches: { title: 'Approval Batches', icon: Landmark, accent: 'text-violet-600' },
  leases: { title: 'IFRS 16 Leases', icon: ShieldCheck, accent: 'text-slate-600' },
  contracts: { title: 'IFRS 15 Contracts', icon: ShieldCheck, accent: 'text-slate-600' },
  withholdingRemittances: { title: 'WHT Remittances', icon: ShieldCheck, accent: 'text-fuchsia-600' },
  withholdingCertificates: { title: 'WHT Certificates', icon: ShieldCheck, accent: 'text-fuchsia-600' },
  documents: { title: 'Workflow Documents', icon: FileText, accent: 'text-amber-600' }
};

function formatMetaKey(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

function Group({ groupKey, items, onSelect }) {
  if (!items?.length) return null;

  const config = GROUP_CONFIG[groupKey] || { title: groupKey, icon: FileText, accent: 'text-gray-600' };
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="border-b border-gray-200 px-4 py-3 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${config.accent}`} />
        <h3 className="font-semibold text-gray-900 text-sm">{config.title}</h3>
        <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map((it) => (
          <button
            type="button"
            key={`${groupKey}-${it.id}`}
            className="w-full p-4 hover:bg-slate-50 transition-colors text-left"
            onClick={() => onSelect(it)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 mb-1">{it.label}</div>
                {it.meta && Object.keys(it.meta).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(it.meta)
                      .filter(([, value]) => value !== null && value !== undefined && value !== '')
                      .slice(0, 4)
                      .map(([key, value]) => (
                        <div key={key} className="inline-flex items-center gap-1.5 text-xs">
                          <span className="text-gray-500">{formatMetaKey(key)}:</span>
                          <span className="text-gray-700 font-medium">{String(value)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                Open
              </Badge>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeSearchApi(http), [http]);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(10);
  const enabled = q.trim().length >= 2;

  const query = useQuery({
    queryKey: ['search', q, limit],
    queryFn: () => api.search({ q: q.trim(), limit }),
    enabled,
    staleTime: 10_000
  });

  const results = query.data?.results ?? {};
  const groups = Object.entries(results);
  const totalResults = groups.reduce((sum, [, arr]) => sum + (arr?.length || 0), 0);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Global Search</h1>
          <p className="text-sm text-gray-600">
            Search across transactions, accounting, inventory, banking, compliance, planning, and workflow records.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 flex-col sm:flex-row">
            <div className="flex-1 relative w-full">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by code, number, name, memo, reference, or keyword..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div className="w-full sm:w-32">
              <label className="block text-xs font-medium text-gray-700 mb-1">Per group</label>
              <input
                type="number"
                min={1}
                max={25}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value) || 10)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>

          {enabled && !query.isLoading && totalResults > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Found <span className="font-semibold text-gray-900">{totalResults}</span> result{totalResults !== 1 ? 's' : ''} for “{q}”
              </p>
            </div>
          )}
        </div>

        {!enabled ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <SearchIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start searching</h3>
            <p className="text-sm text-gray-500">
              Enter at least 2 characters to search across the full app.
            </p>
          </div>
        ) : query.isLoading ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="animate-spin h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Searching...</span>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        ) : query.isError ? (
          <div className="bg-red-50 rounded-lg border border-red-200 shadow-sm p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-800 mb-1">Search failed</h3>
                <p className="text-sm text-red-700">{query.error?.message ?? 'An error occurred while searching.'}</p>
              </div>
            </div>
          </div>
        ) : totalResults === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <SearchIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-sm text-gray-500">Try adjusting your search terms or check your spelling.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {groups.map(([groupKey, items]) => (
              <Group
                key={groupKey}
                groupKey={groupKey}
                items={items}
                onSelect={(item) => navigate(resolveSearchResultPath(item))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
