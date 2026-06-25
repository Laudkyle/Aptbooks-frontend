import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Button, ContentCard, ErrorBlock, FormGrid, HrShell, Input, Select, SimpleTable, StatusBadge, cleanPayload, rowsOf, selectOptions, toFormValues, useCrudRemove, useCrudSave, useHr, useLookupData } from './_hrShared.jsx';

const blank = { code: '', name: '', department_id: '', grade_id: '', status: 'active' };

export default function Positions() {
  const api = useHr();
  const lookups = useLookupData(api);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const reset = () => { setForm(blank); setEditingId(null); };
  const query = useQuery({ queryKey: ['hr.positions'], queryFn: () => api.positions.list() });
  const save = useCrudSave({ key: 'hr.positions', createFn: (p) => api.positions.create(cleanPayload(p)), updateFn: (id, p) => api.positions.update(id, cleanPayload(p)), reset });
  const remove = useCrudRemove({ key: 'hr.positions', removeFn: (id) => api.positions.remove(id) });
  const startEdit = (row) => { setEditingId(row.id); setForm(toFormValues(row, blank)); };
  return (
    <HrShell title="Positions" subtitle="Positions linked to departments and grades." icon={Briefcase}>
      <ContentCard title={editingId ? 'Edit position' : 'New position'} actions={editingId ? <Button variant="outline" size="sm" onClick={reset}>Cancel edit</Button> : null}>
        <FormGrid onSubmit={(e) => { e.preventDefault(); save.mutate({ id: editingId, payload: form }); }}>
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Select label="Department" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} options={selectOptions(lookups.departments, (r) => `${r.code} — ${r.name}`, 'None')} />
          <Select label="Grade" value={form.grade_id} onChange={(e) => setForm({ ...form, grade_id: e.target.value })} options={selectOptions(lookups.grades, (r) => `${r.code} — ${r.name}`, 'None')} />
          {editingId ? <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /> : null}
          <div className="flex items-end"><Button type="submit" loading={save.isPending}>{editingId ? 'Update position' : 'Create position'}</Button></div>
        </FormGrid>
      </ContentCard>
      <ContentCard title="Positions"><ErrorBlock query={query} label="positions" />{!query.isLoading && !query.isError ? <SimpleTable rows={rowsOf(query.data)} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'department_name', label: 'Department' }, { key: 'grade_name', label: 'Grade' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} actions={(r) => (<><Button size="sm" variant="outline" onClick={() => startEdit(r)}>Edit</Button><Button size="sm" variant="danger" loading={remove.isPending} onClick={() => { if (confirm('Delete this position?')) remove.mutate(r.id); }}>Delete</Button></>)} /> : null}</ContentCard>
    </HrShell>
  );
}
