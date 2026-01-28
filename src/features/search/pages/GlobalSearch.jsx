import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, FileText, Users, BookOpen, Briefcase } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeSearchApi } from '../api/search.api.js';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Skeleton } from '../../../shared/components/ui/Skeleton.jsx';

const categoryIcons = {
  Partners: Users,
  Accounts: Briefcase,
  Journals: BookOpen,
  Documents: FileText
};

const categoryColors = {
  Partners: 'bg-blue-50 border-blue-200',
  Accounts: 'bg-green-50 border-green-200',
  Journals: 'bg-purple-50 border-purple-200',
  Documents: 'bg-orange-50 border-orange-200'
};

const iconColors = {
  Partners: 'text-blue-600',
  Accounts: 'text-green-600',
  Journals: 'text-purple-600',
  Documents: 'text-orange-600'
};

function Group({ title, items }) {
  if (!items?.length) return null;
  
  const Icon = categoryIcons[title] || FileText;
  const bgColor = categoryColors[title] || 'bg-gray-50 border-gray-200';
  const iconColor = iconColors[title] || 'text-gray-600';

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map((it) => (
          <div 
            key={it.id} 
            className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 mb-1">{it.label}</div>
                {it.meta && Object.keys(it.meta).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(it.meta).slice(0, 3).map(([key, value]) => (
                      <div key={key} className="inline-flex items-center gap-1.5 text-xs">
                        <span className="text-gray-500">{key}:</span>
                        <span className="text-gray-700 font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                {it.type}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GlobalSearch() {
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
  const totalResults = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Search</h1>
          <p className="text-sm text-gray-600">
            Find partners, accounts, journals, and documents across your organization
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, ID, or keyword..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs font-medium text-gray-700 mb-1">Results</label>
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
                Found <span className="font-semibold text-gray-900">{totalResults}</span> result{totalResults !== 1 ? 's' : ''} for "{q}"
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        {!enabled ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <SearchIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start searching</h3>
            <p className="text-sm text-gray-500">
              Enter at least 2 characters to search across all categories
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
            <p className="text-sm text-gray-500">
              Try adjusting your search terms or check your spelling
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Group title="Partners" items={results.partners} />
            <Group title="Accounts" items={results.accounts} />
            <Group title="Journals" items={results.journals} />
            <Group title="Documents" items={results.documents} />
          </div>
        )}
      </div>
    </div>
  );
}