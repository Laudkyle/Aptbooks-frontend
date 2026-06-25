import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Button, ContentCard, ErrorBlock, FormGrid, HrShell, Input, Select, SimpleTable, StatusBadge, cleanPayload, rowsOf, toFormValues, useCrudRemove, useCrudSave, useHr } from './_hrShared.jsx';

const blank = { code: '', name: '', status: 'active' };

export default function Departments() {
  const api = useHr();
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const reset = () => { setForm(blank); setEditingId(null); };
  const query = useQuery({ queryKey: ['hr.departments'], queryFn: () => api.departments.list() });
  const save = useCrudSave({ key: 'hr.departments', createFn: (p) => api.departments.create(cleanPayload({ code: p.code, name: p.name })), updateFn: (id, p) => api.departments.update(id, cleanPayload(p)), reset });
  const remove = useCrudRemove({ key: 'hr.departments', removeFn: (id) => api.departments.remove(id) });
  const startEdit = (row) => { setEditingId(row.id); setForm(toFormValues(row, blank)); };

  return (
    <HrShell title="Departments" subtitle="Department codes and names used across HR reporting." icon={Building2}>
      <ContentCard title={editingId ? 'Edit department' : 'New department'} actions={editingId ? <Button variant="outline" size="sm" onClick={reset}>Cancel edit</Button> : null}>
        <FormGrid onSubmit={(e) => { e.preventDefault(); save.mutate({ id: editingId, payload: form }); }}>
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          {editingId ? <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /> : null}
          <div className="flex items-end gap-2"><Button type="submit" loading={save.isPending}>{editingId ? 'Update' : 'Create'}</Button></div>
        </FormGrid>
      </ContentCard>
      <ContentCard title="Departments"><ErrorBlock query={query} label="departments" />{!query.isLoading && !query.isError ? <SimpleTable rows={rowsOf(query.data)} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} actions={(r) => (<><Button size="sm" variant="outline" onClick={() => startEdit(r)}>Edit</Button><Button size="sm" variant="danger" loading={remove.isPending} onClick={() => { if (confirm('Delete this department?')) remove.mutate(r.id); }}>Delete</Button></>)} /> : null}</ContentCard>
    </HrShell>
  );
}
