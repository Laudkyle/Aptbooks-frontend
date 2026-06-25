import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Button, ContentCard, ErrorBlock, FormGrid, HrShell, Input, Select, SimpleTable, StatusBadge, cleanPayload, selectOptions, useCrudCreate, useHr, useLookupData } from './_hrShared.jsx';

export default function Positions() {
  const api = useHr();
  const lookups = useLookupData(api);
  const [form, setForm] = useState({ code: '', name: '', department_id: '', grade_id: '' });
  const query = useQuery({ queryKey: ['hr.positions'], queryFn: () => api.positions.list() });
  const create = useCrudCreate({ key: 'hr.positions', createFn: (p) => api.positions.create(cleanPayload(p)), reset: () => setForm({ code: '', name: '', department_id: '', grade_id: '' }) });
  return (
    <HrShell title="Positions" subtitle="Positions linked to departments and grades." icon={Briefcase}>
      <ContentCard title="New position">
        <FormGrid onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}>
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Select label="Department" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} options={selectOptions(lookups.departments, (r) => `${r.code} — ${r.name}`, 'None')} />
          <Select label="Grade" value={form.grade_id} onChange={(e) => setForm({ ...form, grade_id: e.target.value })} options={selectOptions(lookups.grades, (r) => `${r.code} — ${r.name}`, 'None')} />
          <div className="flex items-end"><Button type="submit" loading={create.isPending}>Create</Button></div>
        </FormGrid>
      </ContentCard>
      <ContentCard title="Positions"><ErrorBlock query={query} label="positions" />{!query.isLoading && !query.isError ? <SimpleTable rows={query.data ?? []} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'department_name', label: 'Department' }, { key: 'grade_name', label: 'Grade' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} /> : null}</ContentCard>
    </HrShell>
  );
}
