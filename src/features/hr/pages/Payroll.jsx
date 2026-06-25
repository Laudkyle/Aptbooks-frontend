import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AccountField, Button, ContentCard, CurrencyField, ErrorBlock, FormGrid, HrShell, Input, Landmark, PeriodField, Select, SimpleTable, StatusBadge, asNumber, cleanPayload, selectOptions, useCrudCreate, useHr, useLookupData } from './_hrShared.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export default function Payroll() {
  const api = useHr();
  const qc = useQueryClient();
  const toast = useToast();
  const lookups = useLookupData(api);
  const [component, setComponent] = useState({ code: '', name: '', kind: 'earning', calculation_method: 'fixed', expense_account_id: '', liability_account_id: '', is_taxable: false, is_statutory: false });
  const [assignment, setAssignment] = useState({ employee_id: '', component_id: '', amount: '', percent: '', status: 'active' });
  const [run, setRun] = useState({ period_id: '', pay_date: '', currency: 'GHS' });
  const components = useQuery({ queryKey: ['hr.payroll.components'], queryFn: () => api.payrollComponents.list() });
  const assignments = useQuery({ queryKey: ['hr.payroll.assignments'], queryFn: () => api.employeeComponents.list() });
  const runs = useQuery({ queryKey: ['hr.payroll.runs'], queryFn: () => api.payrollRuns.list() });
  const createComponent = useCrudCreate({ key: 'hr.payroll.components', createFn: (p) => api.payrollComponents.create(cleanPayload(p)), reset: () => setComponent({ code: '', name: '', kind: 'earning', calculation_method: 'fixed', expense_account_id: '', liability_account_id: '', is_taxable: false, is_statutory: false }) });
  const createAssignment = useCrudCreate({ key: 'hr.payroll.assignments', createFn: (p) => api.employeeComponents.create(cleanPayload({ ...p, amount: asNumber(p.amount), percent: asNumber(p.percent) })), reset: () => setAssignment({ employee_id: '', component_id: '', amount: '', percent: '', status: 'active' }) });
  const createRun = useCrudCreate({ key: 'hr.payroll.runs', createFn: (p) => api.payrollRuns.create(cleanPayload(p)), reset: () => setRun({ period_id: '', pay_date: '', currency: 'GHS' }) });
  const action = useMutation({ mutationFn: ({ id, op }) => api.payrollRuns[op](id), onSuccess: () => { toast.success('Payroll run updated.'); qc.invalidateQueries({ queryKey: ['hr.payroll.runs'] }); }, onError: (e) => toast.error(e?.message ?? 'Payroll action failed.') });

  return (
    <HrShell title="Payroll" subtitle="Payroll components, employee assignments, payroll runs and journal workflow." icon={Landmark}>
      <ContentCard title="New payroll component">
        <FormGrid onSubmit={(e) => { e.preventDefault(); createComponent.mutate(component); }}>
          <Input label="Code" value={component.code} onChange={(e) => setComponent({ ...component, code: e.target.value })} required />
          <Input label="Name" value={component.name} onChange={(e) => setComponent({ ...component, name: e.target.value })} required />
          <Select label="Kind" value={component.kind} onChange={(e) => setComponent({ ...component, kind: e.target.value })} options={[{ value: 'earning', label: 'Earning' }, { value: 'deduction', label: 'Deduction' }]} />
          <Select label="Method" value={component.calculation_method} onChange={(e) => setComponent({ ...component, calculation_method: e.target.value })} options={[{ value: 'fixed', label: 'Fixed' }, { value: 'percent_base', label: 'Percent of base' }]} />
          <AccountField label="Expense account" value={component.expense_account_id} onChange={(e) => setComponent({ ...component, expense_account_id: e.target.value })} />
          <AccountField label="Liability account" value={component.liability_account_id} onChange={(e) => setComponent({ ...component, liability_account_id: e.target.value })} />
          <Select label="Taxable" value={String(component.is_taxable)} onChange={(e) => setComponent({ ...component, is_taxable: e.target.value === 'true' })} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} />
          <Select label="Statutory" value={String(component.is_statutory)} onChange={(e) => setComponent({ ...component, is_statutory: e.target.value === 'true' })} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} />
          <div className="flex items-end"><Button type="submit" loading={createComponent.isPending}>Create component</Button></div>
        </FormGrid>
      </ContentCard>

      <ContentCard title="Assign component to employee">
        <FormGrid onSubmit={(e) => { e.preventDefault(); createAssignment.mutate(assignment); }}>
          <Select label="Employee" value={assignment.employee_id} onChange={(e) => setAssignment({ ...assignment, employee_id: e.target.value })} options={selectOptions(lookups.employees, (r) => `${r.employee_no} — ${r.first_name} ${r.last_name}`, 'Select employee')} required />
          <Select label="Component" value={assignment.component_id} onChange={(e) => setAssignment({ ...assignment, component_id: e.target.value })} options={selectOptions(lookups.components, (r) => `${r.code} — ${r.name}`, 'Select component')} required />
          <Input label="Fixed amount" type="number" step="0.01" value={assignment.amount} onChange={(e) => setAssignment({ ...assignment, amount: e.target.value })} />
          <Input label="Percent" type="number" step="0.01" value={assignment.percent} onChange={(e) => setAssignment({ ...assignment, percent: e.target.value })} />
          <div className="flex items-end"><Button type="submit" loading={createAssignment.isPending}>Assign</Button></div>
        </FormGrid>
      </ContentCard>

      <ContentCard title="Create payroll run">
        <FormGrid onSubmit={(e) => { e.preventDefault(); createRun.mutate(run); }}>
          <PeriodField label="Accounting period" value={run.period_id} onChange={(e) => setRun({ ...run, period_id: e.target.value })} required />
          <Input label="Pay date" type="date" value={run.pay_date} onChange={(e) => setRun({ ...run, pay_date: e.target.value })} required />
          <CurrencyField label="Currency" value={run.currency} onChange={(e) => setRun({ ...run, currency: e.target.value })} />
          <div className="flex items-end"><Button type="submit" loading={createRun.isPending}>Create run</Button></div>
        </FormGrid>
      </ContentCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <ContentCard title="Components"><ErrorBlock query={components} label="components" />{!components.isLoading && !components.isError ? <SimpleTable rows={components.data ?? []} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'kind', label: 'Kind' }, { key: 'calculation_method', label: 'Method' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} /> : null}</ContentCard>
        <ContentCard title="Employee assignments"><ErrorBlock query={assignments} label="assignments" />{!assignments.isLoading && !assignments.isError ? <SimpleTable rows={assignments.data ?? []} columns={[{ key: 'employee_id', label: 'Employee' }, { key: 'component_name', label: 'Component' }, { key: 'component_kind', label: 'Kind' }, { key: 'amount', label: 'Amount' }, { key: 'percent', label: 'Percent' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} /> : null}</ContentCard>
      </div>
      <ContentCard title="Payroll runs"><ErrorBlock query={runs} label="payroll runs" />{!runs.isLoading && !runs.isError ? <SimpleTable rows={runs.data ?? []} columns={[{ key: 'period_code', label: 'Period' }, { key: 'pay_date', label: 'Pay date' }, { key: 'currency', label: 'Currency' }, { key: 'gross_amount', label: 'Gross' }, { key: 'net_amount', label: 'Net' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} actions={(r) => (<><Button size="sm" variant="outline" onClick={() => action.mutate({ id: r.id, op: 'calculate' })}>Calculate</Button><Button size="sm" variant="outline" onClick={() => action.mutate({ id: r.id, op: 'submit' })}>Submit</Button><Button size="sm" variant="outline" onClick={() => action.mutate({ id: r.id, op: 'approve' })}>Approve</Button><Button size="sm" variant="outline" onClick={() => action.mutate({ id: r.id, op: 'buildJournal' })}>Build journal</Button><Button size="sm" onClick={() => action.mutate({ id: r.id, op: 'postJournal' })}>Post</Button></>)} /> : null}</ContentCard>
    </HrShell>
  );
}
