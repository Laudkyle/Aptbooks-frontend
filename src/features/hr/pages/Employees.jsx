import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, AccountField, BankAccountField, Button, ContentCard, CurrencyField, ErrorBlock, FormGrid, HrShell, Input, Select, SimpleTable, StatusBadge, TaxCodeField, asNumber, cleanPayload, rowsOf, selectOptions, toFormValues, useCrudSave, useHr, useLookupData } from './_hrShared.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

const blank = {
  employee_no: '', first_name: '', last_name: '', other_names: '', email: '', phone: '', hire_date: '', status: 'draft',
  department_id: '', position_id: '', grade_id: '', compensation_band_id: '', base_salary_amount: '', base_salary_currency: 'GHS',
  base_salary_frequency: 'monthly', expense_account_id: '', payable_account_id: '', bank_account_ref: '', bank_name: '', bank_account_no: '',
  bank_branch: '', tax_id: '', national_id: ''
};

function employeePayload(form) {
  const { bank_account_ref, ...payload } = form;
  return cleanPayload({ ...payload, base_salary_amount: asNumber(payload.base_salary_amount) });
}

function bankValuesFromAccount(account) {
  if (!account) return { bank_name: '', bank_account_no: '', bank_branch: '' };
  const code = account.code ?? account.account_code ?? '';
  const name = account.name ?? account.account_name ?? '';
  const currency = account.currency_code ?? account.currencyCode ?? '';
  return {
    bank_name: name || code,
    bank_account_no: code,
    bank_branch: currency ? `${currency} bank account` : ''
  };
}

export default function Employees() {
  const api = useHr();
  const qc = useQueryClient();
  const toast = useToast();
  const lookups = useLookupData(api);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const reset = () => { setForm(blank); setEditingId(null); };
  const query = useQuery({ queryKey: ['hr.employees', filters], queryFn: () => api.employees.list(filters) });
  const save = useCrudSave({ key: 'hr.employees', createFn: (p) => api.employees.create(employeePayload(p)), updateFn: (id, p) => api.employees.update(id, employeePayload(p)), reset });
  const action = useMutation({ mutationFn: ({ id, op }) => api.employees[op](id), onSuccess: () => { toast.success('Employee status updated.'); qc.invalidateQueries({ queryKey: ['hr.employees'] }); }, onError: (e) => toast.error(e?.message ?? 'Action failed.') });
  const startEdit = (row) => { setEditingId(row.id); setForm({ ...toFormValues(row, blank), bank_account_ref: '' }); };

  return (
    <HrShell title="Employees" subtitle="Employee master file and lifecycle actions." icon={Users}>
      <ContentCard title={editingId ? 'Edit employee' : 'New employee'} actions={editingId ? <Button variant="outline" size="sm" onClick={reset}>Cancel edit</Button> : null}>
        <FormGrid onSubmit={(e) => { e.preventDefault(); save.mutate({ id: editingId, payload: form }); }}>
          <Input label="Employee No" value={form.employee_no} onChange={(e) => setForm({ ...form, employee_no: e.target.value })} required />
          <Input label="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
          <Input label="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
          <Input label="Other names" value={form.other_names} onChange={(e) => setForm({ ...form, other_names: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Hire date" type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'terminated', label: 'Terminated' }]} />
          <Select label="Department" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} options={selectOptions(lookups.departments, (r) => `${r.code} — ${r.name}`, 'None')} />
          <Select label="Position" value={form.position_id} onChange={(e) => setForm({ ...form, position_id: e.target.value })} options={selectOptions(lookups.positions, (r) => `${r.code} — ${r.name}`, 'None')} />
          <Select label="Grade" value={form.grade_id} onChange={(e) => setForm({ ...form, grade_id: e.target.value })} options={selectOptions(lookups.grades, (r) => `${r.code} — ${r.name}`, 'None')} />
          <Select label="Compensation band" value={form.compensation_band_id} onChange={(e) => setForm({ ...form, compensation_band_id: e.target.value })} options={selectOptions(lookups.bands, (r) => `${r.code} — ${r.name}`, 'None')} />
          <Input label="Base salary" type="number" step="0.01" value={form.base_salary_amount} onChange={(e) => setForm({ ...form, base_salary_amount: e.target.value })} />
          <CurrencyField label="Salary currency" value={form.base_salary_currency} onChange={(e) => setForm({ ...form, base_salary_currency: e.target.value })} />
          <Select label="Salary frequency" value={form.base_salary_frequency} onChange={(e) => setForm({ ...form, base_salary_frequency: e.target.value })} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'weekly', label: 'Weekly' }, { value: 'daily', label: 'Daily' }]} />
          <AccountField label="Expense account" value={form.expense_account_id} onChange={(e) => setForm({ ...form, expense_account_id: e.target.value })} />
          <AccountField label="Payable account" value={form.payable_account_id} onChange={(e) => setForm({ ...form, payable_account_id: e.target.value })} />
          <BankAccountField label={editingId && form.bank_name ? `Payroll bank account (${form.bank_name})` : 'Payroll bank account'} value={form.bank_account_ref} onChange={(e, account) => setForm({ ...form, bank_account_ref: e.target.value, ...bankValuesFromAccount(account) })} />
          <TaxCodeField label="Payroll tax code" value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
          <Input label="National ID" value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
          <div className="flex items-end"><Button type="submit" loading={save.isPending}>{editingId ? 'Update employee' : 'Create employee'}</Button></div>
        </FormGrid>
      </ContentCard>
      <ContentCard title="Employees" actions={<div className="flex gap-2"><Input placeholder="Search" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /><Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} options={[{ value: '', label: 'All' }, { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'terminated', label: 'Terminated' }]} /></div>}>
        <ErrorBlock query={query} label="employees" />{!query.isLoading && !query.isError ? <SimpleTable rows={rowsOf(query.data)} columns={[{ key: 'employee_no', label: 'Employee No' }, { key: 'name', label: 'Name', render: (r) => `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() }, { key: 'department_name', label: 'Department' }, { key: 'position_name', label: 'Position' }, { key: 'base_salary_amount', label: 'Salary' }, { key: 'base_salary_currency', label: 'Currency' }, { key: 'bank_name', label: 'Bank' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} actions={(r) => (<><Button size="sm" variant="outline" onClick={() => startEdit(r)}>Edit</Button>{r.status !== 'active' ? <Button size="sm" variant="outline" onClick={() => action.mutate({ id: r.id, op: 'activate' })}>Activate</Button> : <Button size="sm" variant="outline" onClick={() => action.mutate({ id: r.id, op: 'deactivate' })}>Deactivate</Button>}<Button size="sm" variant="danger" onClick={() => action.mutate({ id: r.id, op: 'terminate' })}>Terminate</Button></>)} /> : null}
      </ContentCard>
    </HrShell>
  );
}
