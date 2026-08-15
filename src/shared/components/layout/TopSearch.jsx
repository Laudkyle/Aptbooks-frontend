import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowRight, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { makeSearchApi } from '../../../features/search/api/search.api.js';
import { resolveSearchResultPath } from '../../../features/search/utils/searchNavigation.js';
import { ROUTES } from '../../../app/constants/routes.js';

const GROUP_LABELS = {
  partners: 'Partners',
  accounts: 'Accounts',
  journals: 'Journals',
  invoices: 'Invoices',
  bills: 'Bills',
  customerReceipts: 'Customer receipts',
  vendorPayments: 'Payments',
  creditNotes: 'Credit notes',
  debitNotes: 'Debit notes',
  operationalDocuments: 'Documents',
  assets: 'Assets',
  inventoryItems: 'Inventory items',
  inventoryTransactions: 'Inventory transactions',
  stockCounts: 'Stock counts',
  transfers: 'Transfers',
  projects: 'Projects',
  budgets: 'Budgets',
  forecasts: 'Forecasts',
  bankAccounts: 'Bank accounts',
  bankStatements: 'Bank statements',
  bankReconciliations: 'Bank reconciliations',
  paymentRuns: 'Payment runs',
  bankTransfers: 'Bank transfers',
  approvalBatches: 'Approval batches',
  leases: 'Leases',
  contracts: 'Contracts',
  withholdingRemittances: 'WHT remittances',
  withholdingCertificates: 'WHT certificates',
  documents: 'Workflow documents'
};

function secondaryText(item) {
  const meta = item?.meta || {};
  return [meta.code, meta.number, meta.reference, meta.status, meta.email].filter(Boolean).slice(0, 2).join(' · ');
}

export function TopSearch() {
  const { http } = useApi();
  const api = useMemo(() => makeSearchApi(http), [http]);
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [value, setValue] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value.trim()), 220);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    const onPointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, []);

  const query = useQuery({
    queryKey: ['top-search', debounced],
    queryFn: () => api.search({ q: debounced, limit: 3 }),
    enabled: debounced.length >= 2,
    staleTime: 10_000
  });

  const items = useMemo(() => {
    const results = query.data?.results || {};
    return Object.entries(results)
      .flatMap(([groupKey, groupItems]) => (groupItems || []).map((item) => ({ ...item, groupKey })))
      .slice(0, 8);
  }, [query.data]);

  useEffect(() => setActiveIndex(0), [debounced]);

  function openResult(item) {
    setValue('');
    setDebounced('');
    setOpen(false);
    navigate(resolveSearchResultPath(item));
  }

  function viewAll() {
    const q = value.trim();
    if (!q) return;
    setOpen(false);
    navigate(`${ROUTES.search}?q=${encodeURIComponent(q)}`);
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-xl">
      <div className={`flex items-center gap-2 rounded-xl border bg-white/80 px-3 py-2 shadow-sm transition ${open ? 'border-brand-primary ring-2 ring-brand-primary/10' : 'border-border-subtle hover:bg-white'}`}>
        {query.isFetching && debounced.length >= 2 ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <Search className="h-4 w-4 text-slate-500" />}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
            if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); setActiveIndex((i) => Math.min(items.length - 1, i + 1)); }
            if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); setActiveIndex((i) => Math.max(0, i - 1)); }
            if (e.key === 'Enter') {
              e.preventDefault();
              if (items[activeIndex]) openResult(items[activeIndex]);
              else viewAll();
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500"
          placeholder="Search partners, accounts, journals, documents…"
          aria-label="Search AptBooks"
        />
        <span className="hidden rounded-md bg-slate-900/5 px-2 py-0.5 text-[11px] text-slate-500 lg:inline">Ctrl K</span>
      </div>

      {open && value.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {query.isLoading ? <div className="p-4 text-sm text-slate-500">Searching…</div> : null}
          {!query.isLoading && query.isError ? <div className="p-4 text-sm text-rose-700">Search failed. Press Enter to open full search.</div> : null}
          {!query.isLoading && !query.isError && !items.length ? <div className="p-4 text-sm text-slate-500">No direct matches. Press Enter to search the full app.</div> : null}
          {items.length ? (
            <div className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => openResult(item)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${index === activeIndex ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{item.label}</div>
                    <div className="mt-0.5 truncate text-xs text-slate-500">{GROUP_LABELS[item.groupKey] || item.groupKey}{secondaryText(item) ? ` · ${secondaryText(item)}` : ''}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          ) : null}
          <button type="button" onClick={viewAll} className="flex w-full items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-brand-primary hover:bg-slate-100">
            <span>View all results for “{value.trim()}”</span><ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
