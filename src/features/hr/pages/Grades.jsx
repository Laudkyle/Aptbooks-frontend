import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgeDollarSign, Button, ContentCard, CurrencyField, ErrorBlock, FormGrid, HrShell, Input, Select, SimpleTable, StatusBadge, asNumber, cleanPayload, rowsOf, toFormValues, useCrudRemove, useCrudSave, useHr } from './_hrShared.jsx';

const blank = { code: '', name: '', currency: 'GHS', min_amount: '', max_amount: '', status: 'active' };
const payload = (p) => cleanPayload({ ...p, min_amount: asNumber(p.min_amount), max_amount: asNumber(p.max_amount) });

export default function Grades() {
  const api = useHr();
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const reset = () => { setForm(blank); setEditingId(null); };
  const query = useQuery({ queryKey: ['hr.grades'], queryFn: () => api.grades.list() });
  const save = useCrudSave({ key: 'hr.grades', createFn: (p) => api.grades.create(payload(p)), updateFn: (id, p) => api.grades.update(id, payload(p)), reset });
  const remove = useCrudRemove({ key: 'hr.grades', removeFn: (id) => api.grades.remove(id) });
  const startEdit = (row) => { setEditingId(row.id); setForm(toFormValues(row, blank)); };
  return (
    <HrShell title="Grades" subtitle="Salary grades and ranges." icon={BadgeDollarSign}>
      <ContentCard title={editingId ? 'Edit grade' : 'New grade'} actions={editingId ? <Button variant="outline" size="sm" onClick={reset}>Cancel edit</Button> : null}>
        <FormGrid onSubmit={(e) => { e.preventDefault(); save.mutate({ id: editingId, payload: form }); }}>
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <CurrencyField value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          <Input label="Min amount" type="number" step="0.01" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} />
          <Input label="Max amount" type="number" step="0.01" value={form.max_amount} onChange={(e) => setForm({ ...form, max_amount: e.target.value })} />
          {editingId ? <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /> : null}
          <div className="flex items-end"><Button type="submit" loading={save.isPending}>{editingId ? 'Update grade' : 'Create grade'}</Button></div>
        </FormGrid>
      </ContentCard>
      <ContentCard title="Grades"><ErrorBlock query={query} label="grades" />{!query.isLoading && !query.isError ? <SimpleTable rows={rowsOf(query.data)} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'currency', label: 'Currency' }, { key: 'min_amount', label: 'Min' }, { key: 'max_amount', label: 'Max' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} actions={(r) => (<><Button size="sm" variant="outline" onClick={() => startEdit(r)}>Edit</Button><Button size="sm" variant="danger" loading={remove.isPending} onClick={() => { if (confirm('Delete this grade?')) remove.mutate(r.id); }}>Delete</Button></>)} /> : null}</ContentCard>
    </HrShell>
  );
}
