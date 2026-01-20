import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

  const [periodId, setPeriodId] = useState('');
  const [status, setStatus] = useState('');
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
      header: 'Entry No',
      accessor: (r) => (
        <Link className="text-brand-primary hover:underline" to={ROUTES.accountingJournalDetail(r.id)}>
          {r.entryNo ?? r.entry_no ?? '—'}
        </Link>
      )
    },
    { header: 'Date', accessor: (r) => r.entryDate ?? r.entry_date ?? '—' },
    { header: 'Type', accessor: (r) => r.typeCode ?? r.type_code ?? '—' },
    {
      header: 'Status',
      accessor: (r) => (
        <Badge variant={r.status === 'POSTED' ? 'success' : r.status === 'DRAFT' ? 'default' : 'warning'}>
          {r.status ?? '—'}
        </Badge>
      )
    },
    { header: 'Memo', accessor: (r) => r.memo ?? '—' }
  ];

  const periodOptions = [{ value: '', label: 'All periods' }].concat(
    (periodsQ.data ?? []).map((p) => ({ value: p.id, label: p.code }))
  );

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'POSTED', label: 'Posted' },
    { value: 'VOIDED', label: 'Voided' }
  ];

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
          <DataTable columns={columns} rows={journals} isLoading={listQ.isLoading} emptyTitle="No journals" />
        )}
      </ContentCard>
    </div>
  );
}
