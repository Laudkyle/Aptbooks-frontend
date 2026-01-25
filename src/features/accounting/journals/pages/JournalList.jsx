import React, { useMemo, useState } from 'react';
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
  const navigate = useNavigate(); // Add this hook
  const [periodId, setPeriodId] = useState('');
  const [status, setStatus] = useState('draft');
  const [q, setQ] = useState('');

  const periodsQ = useQuery({ queryKey: ['periods'], queryFn: periodsApi.list, staleTime: 10_000 });
  const listQ = useQuery({
    queryKey: ['journals', { periodId, status }],
    queryFn: () => api.list({ periodId: periodId || undefined, status: status || undefined }),
    staleTime: 5_000
  });

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
          onClick={(e) => e.stopPropagation()} // Prevent row click when clicking the link
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

  const periodOptions = [{ value: '', label: 'All periods' }].concat(
    (periodsQ.data ?? []).map((p) => ({ value: p.id, label: p.code }))
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
  return (
    <div className="space-y-4">
      <PageHeader
        title="Journals"
        subtitle="Create, submit, approve/reject, post, and void journals."
        actions={<Button onClick={() => (window.location.href = ROUTES.accountingJournalNew)}>New journal</Button>}
      />

      <FilterBar
        right={
          <Button variant="secondary" onClick={() => listQ.refetch()} disabled={listQ.isFetching}>
            Refresh
          </Button>
        }
      >
        <Select value={periodId} onChange={(e) => setPeriodId(e.target.value)} options={periodOptions} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions} />
        <Input placeholder="Search entry no / memo…" value={q} onChange={(e) => setQ(e.target.value)} />
      </FilterBar>

      <ContentCard title="Journal list">
        {listQ.isError ? (
          <div className="text-sm text-red-700">{listQ.error?.message ?? 'Failed to load journals.'}</div>
        ) : (
          <DataTable columns={columns} rows={journals}   onRowClick={handleRowClick} isLoading={listQ.isLoading} emptyTitle="No journals" />
        )}
      </ContentCard>
    </div>
  );
}
