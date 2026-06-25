import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Button, ContentCard, ErrorBlock, FormGrid, HrShell, Input, Select, SimpleTable, StatusBadge, asNumber, cleanPayload, useCrudCreate, useHr } from './_hrShared.jsx';

export default function CompensationBands() {
  const api = useHr();
  const [form, setForm] = useState({ code: '', name: '', currency: 'GHS', min_amount: '', max_amount: '', pay_frequency: 'monthly' });
  const query = useQuery({ queryKey: ['hr.compensationBands'], queryFn: () => api.compensationBands.list() });
  const create = useCrudCreate({ key: 'hr.compensationBands', createFn: (p) => api.compensationBands.create(cleanPayload({ ...p, min_amount: asNumber(p.min_amount), max_amount: asNumber(p.max_amount) })), reset: () => setForm({ code: '', name: '', currency: 'GHS', min_amount: '', max_amount: '', pay_frequency: 'monthly' }) });
  return (
    <HrShell title="Compensation Bands" subtitle="Compensation ranges and pay frequency." icon={Wallet}>
      <ContentCard title="New compensation band">
        <FormGrid onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}>
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
          <Select label="Frequency" value={form.pay_frequency} onChange={(e) => setForm({ ...form, pay_frequency: e.target.value })} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'weekly', label: 'Weekly' }, { value: 'daily', label: 'Daily' }]} />
          <Input label="Min amount" type="number" step="0.01" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} required />
          <Input label="Max amount" type="number" step="0.01" value={form.max_amount} onChange={(e) => setForm({ ...form, max_amount: e.target.value })} required />
          <div className="flex items-end"><Button type="submit" loading={create.isPending}>Create</Button></div>
        </FormGrid>
      </ContentCard>
      <ContentCard title="Compensation bands"><ErrorBlock query={query} label="compensation bands" />{!query.isLoading && !query.isError ? <SimpleTable rows={query.data ?? []} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'currency', label: 'Currency' }, { key: 'min_amount', label: 'Min' }, { key: 'max_amount', label: 'Max' }, { key: 'pay_frequency', label: 'Frequency' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} /> : null}</ContentCard>
    </HrShell>
  );
}
