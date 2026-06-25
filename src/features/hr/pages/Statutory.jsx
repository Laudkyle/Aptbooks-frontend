import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AccountField, Button, ContentCard, ErrorBlock, FormGrid, HrShell, Input, Landmark, Select, SimpleTable, StatusBadge, Textarea, asNumber, cleanPayload, useCrudCreate, useHr } from './_hrShared.jsx';

export default function Statutory() {
  const api = useHr();
  const [form, setForm] = useState({ code: '', name: '', description: '', rule_type: 'income_tax', calculation_method: 'flat', employee_rate: '', employer_rate: '', base_on: 'base', cap_amount: '', allowance_amount: '', expense_account_id: '', liability_account_id: '' });
  const query = useQuery({ queryKey: ['hr.statutory.rules'], queryFn: () => api.statutoryRules.list() });
  const create = useCrudCreate({ key: 'hr.statutory.rules', createFn: (p) => api.statutoryRules.create(cleanPayload({ ...p, employee_rate: asNumber(p.employee_rate), employer_rate: asNumber(p.employer_rate), cap_amount: asNumber(p.cap_amount), allowance_amount: asNumber(p.allowance_amount) })), reset: () => setForm({ code: '', name: '', description: '', rule_type: 'income_tax', calculation_method: 'flat', employee_rate: '', employer_rate: '', base_on: 'base', cap_amount: '', allowance_amount: '', expense_account_id: '', liability_account_id: '' }) });
  return (
    <HrShell title="Statutory Rules" subtitle="Payroll statutory deductions and employer contribution rules." icon={Landmark}>
      <ContentCard title="New statutory rule">
        <FormGrid onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}>
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Select label="Rule type" value={form.rule_type} onChange={(e) => setForm({ ...form, rule_type: e.target.value })} options={[{ value: 'income_tax', label: 'Income tax' }, { value: 'pension', label: 'Pension' }, { value: 'social_security', label: 'Social security' }, { value: 'health_insurance', label: 'Health insurance' }, { value: 'other', label: 'Other' }]} />
          <Select label="Method" value={form.calculation_method} onChange={(e) => setForm({ ...form, calculation_method: e.target.value })} options={[{ value: 'flat', label: 'Flat' }, { value: 'progressive', label: 'Progressive' }]} />
          <Input label="Employee rate" type="number" step="0.01" value={form.employee_rate} onChange={(e) => setForm({ ...form, employee_rate: e.target.value })} required />
          <Input label="Employer rate" type="number" step="0.01" value={form.employer_rate} onChange={(e) => setForm({ ...form, employer_rate: e.target.value })} required />
          <Select label="Base on" value={form.base_on} onChange={(e) => setForm({ ...form, base_on: e.target.value })} options={[{ value: 'base', label: 'Base salary' }, { value: 'gross', label: 'Gross pay' }]} />
          <Input label="Allowance amount" type="number" step="0.01" value={form.allowance_amount} onChange={(e) => setForm({ ...form, allowance_amount: e.target.value })} />
          <Input label="Cap amount" type="number" step="0.01" value={form.cap_amount} onChange={(e) => setForm({ ...form, cap_amount: e.target.value })} />
          <AccountField label="Expense account" value={form.expense_account_id} onChange={(e) => setForm({ ...form, expense_account_id: e.target.value })} required />
          <AccountField label="Liability account" value={form.liability_account_id} onChange={(e) => setForm({ ...form, liability_account_id: e.target.value })} required />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex items-end"><Button type="submit" loading={create.isPending}>Create rule</Button></div>
        </FormGrid>
      </ContentCard>
      <ContentCard title="Rules"><ErrorBlock query={query} label="statutory rules" />{!query.isLoading && !query.isError ? <SimpleTable rows={query.data ?? []} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'rule_type', label: 'Type' }, { key: 'employee_rate', label: 'Employee %' }, { key: 'employer_rate', label: 'Employer %' }, { key: 'base_on', label: 'Base' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} /> : null}</ContentCard>
    </HrShell>
  );
}
