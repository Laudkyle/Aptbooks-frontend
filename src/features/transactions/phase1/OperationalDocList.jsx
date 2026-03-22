import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { formatDate } from '../../../shared/utils/formatDate.js';
import { makeOpsDocsApi } from '../api/opsDocs.api.js';
import { getPhase1ModuleConfig } from './moduleConfigs.js';
import { getStatusBadgeClass, toCurrency } from './helpers.js';

export default function OperationalDocList({ moduleKey }) {
  const config = getPhase1ModuleConfig(moduleKey);
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeOpsDocsApi(http, config.endpoints), [http, config]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading, error } = useQuery({
    queryKey: qk[config.listQueryKey] ? qk[config.listQueryKey]() : ['phase1', moduleKey],
    queryFn: () => api.list()
  });

  const rows = Array.isArray(data) ? data : data?.data ?? [];
  const filteredRows = useMemo(() => rows.filter((row) => {
    const hay = [row.document_no, row.partner_name, row.memo, row.reference].join(' ').toLowerCase();
    const matchSearch = !searchTerm || hay.includes(searchTerm.toLowerCase());
    const normalizedStatus = String(row.status ?? 'draft').toLowerCase();
    const matchStatus = statusFilter === 'all' || normalizedStatus === statusFilter;
    return matchSearch && matchStatus;
  }), [rows, searchTerm, statusFilter]);

  const columns = useMemo(() => [
    {
      header: `${config.singular} #`,
      render: (r) => <Link to={config.routeDetail(r.id)} className="font-semibold text-blue-700 hover:underline">{r.document_no ?? r.id}</Link>
    },
    { header: 'Date', render: (r) => formatDate(r.document_date) ?? '—' },
    { header: 'Partner', render: (r) => r.partner_name ?? '—' },
    { header: 'Reference', render: (r) => r.reference ?? '—' },
    { header: 'Amount', render: (r) => <span className="font-semibold">{toCurrency(r.amount_total, r.currency_code || 'USD')}</span> },
    { header: 'Status', render: (r) => <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(r.status)}`}>{r.status ?? 'draft'}</span> },
  ], [config]);

  const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: config.statusFinal, label: config.statusFinal[0].toUpperCase() + config.statusFinal.slice(1) },
    { value: 'rejected', label: 'Rejected' },
    { value: 'voided', label: 'Voided' }
  ];

  const Icon = config.icon;
  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Icon className="h-7 w-7 text-text-body" />
              <h1 className="text-2xl font-bold text-text-strong">{config.title}</h1>
            </div>
            <p className="text-sm text-text-muted">Manage {config.title.toLowerCase()} and their workflow.</p>
          </div>
          <Button onClick={() => navigate(config.routeNew)} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> New {config.singular}
          </Button>
        </div>

        <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle p-4 mb-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={`Search ${config.title.toLowerCase()}...`} label="Search" />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={statusOptions} label="Status" />
            <div className="flex items-end text-sm text-text-muted">{filteredRows.length} record(s)</div>
          </div>
        </div>

        <DataTable columns={columns} rows={filteredRows} loading={isLoading} error={error} emptyMessage={`No ${config.title.toLowerCase()} found.`} />
      </div>
    </div>
  );
}
