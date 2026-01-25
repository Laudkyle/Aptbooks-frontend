import React, { useMemo, useState } from 'react'; 
import { Link, useNavigate } from 'react-router-dom'; 
import { useQuery } from '@tanstack/react-query'; 
import { Plus, Users } from 'lucide-react'; 

import { useApi } from '../../../shared/hooks/useApi.js'; 
import { qk } from '../../../shared/query/keys.js'; 
import { makePartnersApi } from '../api/partners.api.js'; 
import { ROUTES } from '../../../app/constants/routes.js'; 

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx'; 
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx'; 
import { DataTable } from '../../../shared/components/data/DataTable.jsx'; 
import { Button } from '../../../shared/components/ui/Button.jsx'; 
import { Badge } from '../../../shared/components/ui/Badge.jsx'; 
import { Input } from '../../../shared/components/ui/Input.jsx'; 
import { Select } from '../../../shared/components/ui/Select.jsx'; 

export default function Customers() {
  const navigate = useNavigate(); 
  const { http } = useApi(); 
  const api = useMemo(() => makePartnersApi(http), [http]); 

  const [q, setQ] = useState(''); 
  const [status, setStatus] = useState('active'); 

  const query = useMemo(() => ({ type: 'customer', status: status || undefined }), [status]); 

  const { data, isLoading, error } = useQuery({
    queryKey: qk.partners(query),
    queryFn: () => api.list(query)
  }); 

    const normalizedQ = q.trim().toLowerCase(); 
const rows = Array.isArray(data) ? data : data?.data ?? []; 
  const filteredRows = normalizedQ
    ? rows.filter((r) => (r?.name ?? '').toLowerCase().includes(normalizedQ) || (r?.code ?? '').toLowerCase().includes(normalizedQ))
    : rows; 

  const columns = useMemo(
    () => [
      {
        header: 'Name',
        render: (r) => (
          <div className="flex flex-col">
            <Link to={ROUTES.businessPartnerDetail(r.id)} className="font-medium text-brand-deep hover:underline">
              {r.name ?? '—'}
            </Link>
            <div className="text-xs text-slate-500">{r.email ?? r.phone ?? ''}</div>
          </div>
        )
      },
      { header: 'Code', render: (r) => <span className="text-sm text-slate-700">{r.code ?? '—'}</span> },
      {
        header: 'Status',
        render: (r) => <Badge tone={(r.status ?? 'active') === 'active' ? 'success' : 'muted'}>{r.status ?? 'active'}</Badge>
      }
    ],
    []
  ); 

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers"
        subtitle="Manage customer master data, credit policy, contacts and addresses."
        icon={Users}
        actions={
          <Button
            leftIcon={Plus}
            variant="primary"
            onClick={() => navigate(`${ROUTES.businessPartnerNew}?type=customer`)}
          >
            New customer
          </Button>
        }
      />

      <ContentCard>
        <FilterBar
          left={
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, email…" label="Search" />
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: '', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
              />
              <div className="hidden md:block" />
            </div>
          }
          right={
            <div className="text-xs text-slate-500">
              {error ? <span className="text-red-600">{String(error?.message ?? 'Failed to load')}</span> : null}
            </div>
          }
        />
        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={filteredRows}
            isLoading={isLoading}
            empty={{
              title: 'No customers yet',
              description: 'Create your first customer to start invoicing and collections.'
            }}
          />
        </div>
      </ContentCard>
    </div>
  ); 
}
