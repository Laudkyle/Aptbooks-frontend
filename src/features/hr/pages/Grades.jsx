import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgeDollarSign, Button, ContentCard, ErrorBlock, FormGrid, HrShell, Input, SimpleTable, StatusBadge, asNumber, cleanPayload, useCrudCreate, useHr } from './_hrShared.jsx';

export default function Grades() {
  const api = useHr();
  const [form, setForm] = useState({ code: '', name: '', currency: 'GHS', min_amount: '', max_amount: '' });
  const query = useQuery({ queryKey: ['hr.grades'], queryFn: () => api.grades.list() });
  const create = useCrudCreate({ key: 'hr.grades', createFn: (p) => api.grades.create(cleanPayload({ ...p, min_amount: asNumber(p.min_amount), max_amount: asNumber(p.max_amount) })), reset: () => setForm({ code: '', name: '', currency: 'GHS', min_amount: '', max_amount: '' }) });
  return (
    <HrShell title="Grades" subtitle="Salary-grade master data from /modules/hr/grades." icon={BadgeDollarSign}>
      <ContentCard title="New grade">
        <FormGrid onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}>
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
          <Input label="Min amount" type="number" step="0.01" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} />
          <Input label="Max amount" type="number" step="0.01" value={form.max_amount} onChange={(e) => setForm({ ...form, max_amount: e.target.value })} />
          <div className="flex items-end"><Button type="submit" loading={create.isPending}>Create</Button></div>
        </FormGrid>
      </ContentCard>
      <ContentCard title="Grades"><ErrorBlock query={query} label="grades" />{!query.isLoading && !query.isError ? <SimpleTable rows={query.data ?? []} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'currency', label: 'Currency' }, { key: 'min_amount', label: 'Min' }, { key: 'max_amount', label: 'Max' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} /> : null}</ContentCard>
    </HrShell>
  );
}
