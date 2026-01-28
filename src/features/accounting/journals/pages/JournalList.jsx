import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeJournalsApi } from '../api/journals.api.js';
import { makePeriodsApi } from '../../periods/api/periods.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../../shared/components/data/FilterBar.jsx';
import { DataTable } from '../../../../shared/components/data/DataTable.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';

export default function JournalList() {
  const { http } = useApi();
  const api = useMemo(() => makeJournalsApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  const navigate = useNavigate();
  const [periodId, setPeriodId] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [hasSelectedPeriod, setHasSelectedPeriod] = useState(false);

  const periodsQ = useQuery({ 
    queryKey: ['periods'], 
    queryFn: periodsApi.list, 
    staleTime: 10_000 
  });

  const listQ = useQuery({
    queryKey: ['journals', { periodId, status }],
    queryFn: () => api.list({ periodId: periodId || undefined, status: status || "" }),
    staleTime: 5_000,
    enabled: hasSelectedPeriod && !!periodId, // Only enabled when period is selected
  });
console.log(listQ);
  // Auto-fetch when period changes (if a period is selected)
  useEffect(() => {
    if (periodId && !hasSelectedPeriod) {
      setHasSelectedPeriod(true);
    } else if (!periodId && hasSelectedPeriod) {
      setHasSelectedPeriod(false);
    }
  }, [periodId, hasSelectedPeriod]);

  const journals = (listQ.data ?? []).filter((j) => {
    const s = `${j.entryNo ?? ''} ${j.memo ?? ''} ${j.id ?? ''}`.toLowerCase();
    return !q || s.includes(q.toLowerCase());
  });

  const columns = [
    {
      key: 'entry_no',
      header: 'Entry No',
      accessor: (r) => r.entryNo ?? r.entry_no ?? '—',
      render: (r) => (
        <Link 
          className="text-brand-primary hover:underline" 
          to={ROUTES.accountingJournalDetail(r.id)}
          onClick={(e) => e.stopPropagation()}
        >
          {r.entryNo ?? r.entry_no ?? '—'}
        </Link>
      )
    },
    { header: 'Date', att: 'entry_date', accessor: (r) => r.entry_date ?? '—' },
    { header: 'Type', att: 'journal_entry_type', accessor: (r) => r.journal_entry_type ?? '—' },
    {
      header: 'Status',
      att: 'status',
      accessor: (r) => (
        <Badge variant={r.status === 'POSTED' ? 'success' : r.status === 'DRAFT' ? 'default' : 'warning'}>
          {r.status ?? '—'}
        </Badge>
      )
    },
    { header: 'Memo', att: 'memo', accessor: (r) => r.memo ?? '—' }
  ];

  const periodOptions = [{ value: '', label: 'Select a period' }].concat(
    (periodsQ.data ?? []).map((p) => ({ value: p.id, label: `${p.code}` }))
  );

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Submitted', label: 'Submitted' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Posted', label: 'Posted' },
    { value: 'Voided', label: 'Voided' }
  ];

  const handleRowClick = (journal) => {
    navigate(ROUTES.accountingJournalDetail(journal.id));
  };

  const handleClear = () => {
    setPeriodId('');
    setStatus('');
    setQ('');
    setHasSelectedPeriod(false);
  };

  const handlePeriodChange = (e) => {
    const newPeriodId = e.target.value;
    setPeriodId(newPeriodId);
    // Clear other filters when period changes
    if (newPeriodId) {
      setStatus('');
      setQ('');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Journals"
        subtitle="Create, submit, approve/reject, post, and void journals."
        actions={<Button onClick={() => (window.location.href = ROUTES.accountingJournalNew)}>New journal</Button>}
      />

      <FilterBar
        right={
          <div className="flex gap-2">
            {listQ.isFetching ? (
              <span className="text-sm text-gray-500 flex items-center">
                Loading...
              </span>
            ) : hasSelectedPeriod && (
              <Button 
                variant="secondary" 
                onClick={() => listQ.refetch()} 
                disabled={listQ.isFetching}
              >
                Refresh
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleClear}
            >
              Clear
            </Button>
          </div>
        }
      >
        <div className="flex items-center gap-2">
          <Select 
            value={periodId} 
            onChange={handlePeriodChange} 
            options={periodOptions}
            className="min-w-[200px]"
          />
          {hasSelectedPeriod && (
            <>
              <Select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)} 
                options={statusOptions}
                className="min-w-[180px]"
              />
              <Input 
                placeholder="Search entry no / memo…" 
                value={q} 
                onChange={(e) => setQ(e.target.value)}
                className="min-w-[250px]"
              />
            </>
          )}
        </div>
      </FilterBar>

      <ContentCard title="Journal list">
        {!periodId ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">Please select a period to view journals</div>
          </div>
        ) : listQ.isError ? (
          <div className="text-sm text-red-700">{listQ.error?.message ?? 'Failed to load journals.'}</div>
        ) : listQ.isLoading ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">Loading journals for selected period...</div>
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            rows={journals} 
            onRowClick={handleRowClick} 
            isLoading={listQ.isFetching} 
            emptyTitle="No journals found for this period"
          />
        )}
      </ContentCard>
    </div>
  );
}