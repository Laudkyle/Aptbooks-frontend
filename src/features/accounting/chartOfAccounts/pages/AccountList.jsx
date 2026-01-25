import React, { useMemo, useState } from 'react'; 
import { Link } from 'react-router-dom'; 
import { useQuery } from '@tanstack/react-query'; 
import { useApi } from '../../../../shared/hooks/useApi.js'; 
import { makeCoaApi } from '../api/coa.api.js'; 
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx'; 
import { FilterBar } from '../../../../shared/components/data/FilterBar.jsx'; 
import { DataTable } from '../../../../shared/components/data/DataTable.jsx'; 
import { Input } from '../../../../shared/components/ui/Input.jsx'; 
import { Select } from '../../../../shared/components/ui/Select.jsx'; 
import { Button } from '../../../../shared/components/ui/Button.jsx'; 
import { Badge } from '../../../../shared/components/ui/Badge.jsx'; 
import { ROUTES } from '../../../../app/constants/routes.js'; 

const ACCOUNT_TYPES = [
  { value: '', label: 'All types' },
  { value: 'ASSET', label: 'Asset' },
  { value: 'LIABILITY', label: 'Liability' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'REVENUE', label: 'Revenue' },
  { value: 'EXPENSE', label: 'Expense' }
]; 

export default function AccountList() {
  const { http } = useApi(); 
  const api = useMemo(() => makeCoaApi(http), [http]); 

  const [q, setQ] = useState(''); 
  const [type, setType] = useState(''); 
  const [includeArchived, setIncludeArchived] = useState('false'); 

  const query = useQuery({
    queryKey: ['coa', includeArchived],
    queryFn: () => api.list({ includeArchived }),
    staleTime: 10_000
  }); 

  const rows = (query.data ?? []).filter((a) => {
    const s = `${a.code ?? ''} ${a.name ?? ''} ${a.category_name ?? ''}`.toLowerCase(); 
    const matchQ = !q || s.includes(q.toLowerCase()); 
    const matchType = !type || a.account_type_code === type; 
    return matchQ && matchType; 
  }); 

  const columns = [
    { header: 'Code', att:'code',accessor: (r) => r.code ?? '—' },
    {
      header: 'Name',
      att: 'name',
      accessor: (r) => (
        <Link className="text-brand-primary hover:underline" to={ROUTES.accountingCoaDetail(r.id)}>
          {r.name ?? '—'}
        </Link>
      )
    },
    { header: 'Type', att: 'account_type_code', accessor: (r) => r.accountTypeCode ?? '—' },
    { header: 'Category', att: 'category_name', accessor: (r) => r.categoryName ?? '—' },
    {
      header: 'Status',
      att: 'status',
      accessor: (r) => (
        <Badge variant={r.status === 'active' ? 'success' : r.status === 'inactive' ? 'warning' : 'default'}>
          {r.status ?? '—'}
        </Badge>
      )
    }
  ]; 

  return (
    <div className="space-y-4">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Maintain your account master data."
        actions={<Button onClick={() => (window.location.href = ROUTES.accountingCoaNew)}>New account</Button>}
      />

      <FilterBar
        right={
          <Select
            value={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.value)}
            options={[
              { value: 'false', label: 'Active only' },
              { value: 'true', label: 'Include archived' }
            ]}
          />
        }
      >
        <Input placeholder="Search code/name/category…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={type} onChange={(e) => setType(e.target.value)} options={ACCOUNT_TYPES} />
      </FilterBar>

      <ContentCard title="Accounts">
        {query.isError ? (
          <div className="text-sm text-red-700">{query.error?.message ?? 'Failed to load accounts.'}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            isLoading={query.isLoading}
            emptyTitle="No accounts"
            emptyDescription="Create an account or adjust your filters."
          />
        )}
      </ContentCard>
    </div>
  ); 
}
