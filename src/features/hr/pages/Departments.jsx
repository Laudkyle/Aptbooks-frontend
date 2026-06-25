import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Button, ContentCard, ErrorBlock, FormGrid, HrShell, Input, Select, SimpleTable, StatusBadge, cleanPayload, useCrudCreate, useHr } from './_hrShared.jsx';

export default function Departments() {
  const api = useHr();
  const [form, setForm] = useState({ code: '', name: '' });
  const query = useQuery({ queryKey: ['hr.departments'], queryFn: () => api.departments.list() });
  const create = useCrudCreate({ key: 'hr.departments', createFn: (p) => api.departments.create(cleanPayload(p)), reset: () => setForm({ code: '', name: '' }) });
  return (
    <HrShell title="Departments" subtitle="Department master data from /modules/hr/departments." icon={Building2}>
      <ContentCard title="New department">
        <FormGrid onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}>
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="flex items-end"><Button type="submit" loading={create.isPending}>Create</Button></div>
        </FormGrid>
      </ContentCard>
      <ContentCard title="Departments"><ErrorBlock query={query} label="departments" />{!query.isLoading && !query.isError ? <SimpleTable rows={query.data ?? []} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} /> : null}</ContentCard>
    </HrShell>
  );
}
