import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AccountField, Button, ContentCard, CurrencyField, ErrorBlock, FormGrid, HrShell, Input, Landmark, PeriodField, Select, SimpleTable, StatusBadge, asNumber, cleanPayload, rowsOf, selectOptions, toFormValues, useCrudRemove, useCrudSave, useHr, useLookupData } from './_hrShared.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

const componentBlank = { code: '', name: '', kind: 'earning', calculation_method: 'fixed', expense_account_id: '', liability_account_id: '', is_taxable: false, is_statutory: false, status: 'active' };
const assignmentBlank = { employee_id: '', component_id: '', calculation_method: 'fixed', amount: '', percent: '', status: 'active' };
const runBlank = { period_id: '', pay_date: '', currency: 'GHS' };

export default function Payroll() {
  const api = useHr();
  const qc = useQueryClient();
  const toast = useToast();
  const lookups = useLookupData(api);
  const [component, setComponent] = useState(componentBlank);
  const [componentEditingId, setComponentEditingId] = useState(null);
  const [assignment, setAssignment] = useState(assignmentBlank);
  const [assignmentEditingId, setAssignmentEditingId] = useState(null);
  const [run, setRun] = useState(runBlank);
  const components = useQuery({ queryKey: ['hr.payroll.components'], queryFn: () => api.payrollComponents.list() });
  const assignments = useQuery({ queryKey: ['hr.payroll.assignments'], queryFn: () => api.employeeComponents.list() });
  const runs = useQuery({ queryKey: ['hr.payroll.runs'], queryFn: () => api.payrollRuns.list() });

  const resetComponent = () => { setComponent(componentBlank); setComponentEditingId(null); };
  const resetAssignment = () => { setAssignment(assignmentBlank); setAssignmentEditingId(null); };
  const componentPayload = (p) => cleanPayload(p);
  const saveComponent = useCrudSave({ key: 'hr.payroll.components', createFn: (p) => api.payrollComponents.create(componentPayload(p)), updateFn: (id, p) => api.payrollComponents.update(id, componentPayload(p)), reset: resetComponent });
  const removeComponent = useCrudRemove({ key: 'hr.payroll.components', removeFn: (id) => api.payrollComponents.remove(id) });

  const buildAssignmentPayload = (p) => {
    const base = { employee_id: p.employee_id, component_id: p.component_id, status: p.status };
    if (p.calculation_method === 'fixed') return cleanPayload({ ...base, amount: asNumber(p.amount), percent: undefined });
    return cleanPayload({ ...base, amount: undefined, percent: asNumber(p.percent) });
  };
  const saveAssignment = useCrudSave({ key: 'hr.payroll.assignments', createFn: (p) => api.employeeComponents.create(buildAssignmentPayload(p)), updateFn: (id, p) => api.employeeComponents.update(id, buildAssignmentPayload(p)), reset: resetAssignment });
  const removeAssignment = useCrudRemove({ key: 'hr.payroll.assignments', removeFn: (id) => api.employeeComponents.remove(id) });
  const createRun = useCrudSave({ key: 'hr.payroll.runs', createFn: (p) => api.payrollRuns.create(cleanPayload(p)), updateFn: () => Promise.reject(new Error('Payroll run editing is not supported by the backend. Create a new draft run for a different period/pay date.')), reset: () => setRun(runBlank) });
  const action = useMutation({ mutationFn: ({ id, op }) => api.payrollRuns[op](id), onSuccess: () => { toast.success('Payroll run updated.'); qc.invalidateQueries({ queryKey: ['hr.payroll.runs'] }); }, onError: (e) => toast.error(e?.message ?? 'Payroll action failed.') });

  const selectedComponent = rowsOf(lookups.components.data).find((r) => r.id === assignment.component_id);
  const assignmentIsFixed = assignment.calculation_method === 'fixed';
  const setAssignmentMethod = (calculationMethod) => {
    setAssignment((current) => ({ ...current, calculation_method: calculationMethod, amount: calculationMethod === 'fixed' ? current.amount : '', percent: calculationMethod === 'percent_base' ? current.percent : '' }));
  };
  const handleAssignmentSubmit = (event) => {
    event.preventDefault();
    if (assignmentIsFixed && !assignment.amount) return toast.error('Enter a fixed amount or choose Percentage of base.');
    if (!assignmentIsFixed && !assignment.percent) return toast.error('Enter a percentage rate or choose Fixed amount.');
    saveAssignment.mutate({ id: assignmentEditingId, payload: assignment });
  };
  const startComponentEdit = (row) => { setComponentEditingId(row.id); setComponent(toFormValues(row, componentBlank)); };
  const startAssignmentEdit = (row) => {
    const method = row.percent !== null && row.percent !== undefined && String(row.percent) !== '' ? 'percent_base' : 'fixed';
    setAssignmentEditingId(row.id);
    setAssignment({ ...toFormValues(row, assignmentBlank), calculation_method: method, amount: method === 'fixed' ? String(row.amount ?? '') : '', percent: method === 'percent_base' ? String(row.percent ?? '') : '' });
  };

  return (
    <HrShell title="Payroll" subtitle="Payroll components, employee assignments, payroll runs and journal workflow." icon={Landmark}>
      <ContentCard title={componentEditingId ? 'Edit payroll component' : 'New payroll component'} actions={componentEditingId ? <Button variant="outline" size="sm" onClick={resetComponent}>Cancel edit</Button> : null}>
        <FormGrid onSubmit={(e) => { e.preventDefault(); saveComponent.mutate({ id: componentEditingId, payload: component }); }}>
          <Input label="Code" value={component.code} onChange={(e) => setComponent({ ...component, code: e.target.value })} required />
          <Input label="Name" value={component.name} onChange={(e) => setComponent({ ...component, name: e.target.value })} required />
          <Select label="Kind" value={component.kind} onChange={(e) => setComponent({ ...component, kind: e.target.value })} options={[{ value: 'earning', label: 'Earning' }, { value: 'deduction', label: 'Deduction' }]} />
          <Select label="Method" value={component.calculation_method} onChange={(e) => setComponent({ ...component, calculation_method: e.target.value })} options={[{ value: 'fixed', label: 'Fixed' }, { value: 'percent_base', label: 'Percent of base' }]} />
          <AccountField label="Expense account" value={component.expense_account_id} onChange={(e) => setComponent({ ...component, expense_account_id: e.target.value })} />
          <AccountField label="Liability account" value={component.liability_account_id} onChange={(e) => setComponent({ ...component, liability_account_id: e.target.value })} />
          <Select label="Taxable" value={String(component.is_taxable)} onChange={(e) => setComponent({ ...component, is_taxable: e.target.value === 'true' })} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} />
          <Select label="Statutory" value={String(component.is_statutory)} onChange={(e) => setComponent({ ...component, is_statutory: e.target.value === 'true' })} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} />
          {componentEditingId ? <Select label="Status" value={component.status} onChange={(e) => setComponent({ ...component, status: e.target.value })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /> : null}
          <div className="flex items-end"><Button type="submit" loading={saveComponent.isPending}>{componentEditingId ? 'Update component' : 'Create component'}</Button></div>
        </FormGrid>
      </ContentCard>

      <ContentCard title={assignmentEditingId ? 'Edit employee component assignment' : 'Assign component to employee'} actions={assignmentEditingId ? <Button variant="outline" size="sm" onClick={resetAssignment}>Cancel edit</Button> : null}>
        <FormGrid onSubmit={handleAssignmentSubmit}>
          <Select label="Employee" value={assignment.employee_id} onChange={(e) => setAssignment({ ...assignment, employee_id: e.target.value })} options={selectOptions(lookups.employees, (r) => `${r.employee_no} — ${r.first_name} ${r.last_name}`, 'Select employee')} required />
          <Select label="Component" value={assignment.component_id} onChange={(e) => {
            const componentId = e.target.value;
            const componentRow = rowsOf(lookups.components.data).find((r) => r.id === componentId);
            const nextMethod = componentRow?.calculation_method === 'percent_base' ? 'percent_base' : 'fixed';
            setAssignment({ ...assignment, component_id: componentId, calculation_method: nextMethod, amount: nextMethod === 'fixed' ? assignment.amount : '', percent: nextMethod === 'percent_base' ? assignment.percent : '' });
          }} options={selectOptions(lookups.components, (r) => `${r.code} — ${r.name}`, 'Select component')} required />
          <Select label="Calculation method" value={assignment.calculation_method} onChange={(e) => setAssignmentMethod(e.target.value)} options={[{ value: 'fixed', label: 'Fixed amount' }, { value: 'percent_base', label: 'Percentage of base' }]} />
          <Input label="Fixed amount" type="number" step="0.01" min="0" value={assignment.amount} onChange={(e) => setAssignment({ ...assignment, amount: e.target.value, percent: '' })} disabled={!assignmentIsFixed} required={assignmentIsFixed} />
          <Input label="Percentage rate" type="number" step="0.01" min="0" max="100" value={assignment.percent} onChange={(e) => setAssignment({ ...assignment, amount: '', percent: e.target.value })} disabled={assignmentIsFixed} required={!assignmentIsFixed} />
          <Select label="Status" value={assignment.status} onChange={(e) => setAssignment({ ...assignment, status: e.target.value })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <div className="text-xs text-slate-500 xl:col-span-2">{selectedComponent?.calculation_method ? `Selected component default: ${selectedComponent.calculation_method === 'percent_base' ? 'percentage of base' : 'fixed amount'}. ` : ''}Use either a fixed amount or a percentage rate.</div>
          <div className="flex items-end"><Button type="submit" loading={saveAssignment.isPending}>{assignmentEditingId ? 'Update assignment' : 'Assign'}</Button></div>
        </FormGrid>
      </ContentCard>

      <ContentCard title="Create payroll run" actions={<div className="text-xs text-slate-500">Payroll runs become controlled records after creation. Edit components/assignments before recalculating.</div>}>
        <FormGrid onSubmit={(e) => { e.preventDefault(); createRun.mutate({ payload: run }); }}>
          <PeriodField label="Accounting period" value={run.period_id} onChange={(e) => setRun({ ...run, period_id: e.target.value })} required />
          <Input label="Pay date" type="date" value={run.pay_date} onChange={(e) => setRun({ ...run, pay_date: e.target.value })} required />
          <CurrencyField label="Currency" value={run.currency} onChange={(e) => setRun({ ...run, currency: e.target.value })} />
          <div className="flex items-end"><Button type="submit" loading={createRun.isPending}>Create run</Button></div>
        </FormGrid>
      </ContentCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <ContentCard title="Components"><ErrorBlock query={components} label="components" />{!components.isLoading && !components.isError ? <SimpleTable rows={rowsOf(components.data)} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'kind', label: 'Kind' }, { key: 'calculation_method', label: 'Method' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} actions={(r) => (<><Button size="sm" variant="outline" onClick={() => startComponentEdit(r)}>Edit</Button><Button size="sm" variant="danger" loading={removeComponent.isPending} onClick={() => { if (confirm('Delete this payroll component?')) removeComponent.mutate(r.id); }}>Delete</Button></>)} /> : null}</ContentCard>
        <ContentCard title="Employee assignments"><ErrorBlock query={assignments} label="assignments" />{!assignments.isLoading && !assignments.isError ? <SimpleTable rows={rowsOf(assignments.data)} columns={[{ key: 'employee_id', label: 'Employee' }, { key: 'component_name', label: 'Component' }, { key: 'component_kind', label: 'Kind' }, { key: 'amount', label: 'Amount' }, { key: 'percent', label: 'Percent' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} actions={(r) => (<><Button size="sm" variant="outline" onClick={() => startAssignmentEdit(r)}>Edit</Button><Button size="sm" variant="danger" loading={removeAssignment.isPending} onClick={() => { if (confirm('Delete this employee component assignment?')) removeAssignment.mutate(r.id); }}>Delete</Button></>)} /> : null}</ContentCard>
      </div>
      <ContentCard title="Payroll runs"><ErrorBlock query={runs} label="payroll runs" />{!runs.isLoading && !runs.isError ? <SimpleTable rows={rowsOf(runs.data)} columns={[{ key: 'period_code', label: 'Period' }, { key: 'pay_date', label: 'Pay date' }, { key: 'currency', label: 'Currency' }, { key: 'gross_amount', label: 'Gross' }, { key: 'net_amount', label: 'Net' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} actions={(r) => (<><Button size="sm" variant="outline" onClick={() => action.mutate({ id: r.id, op: 'calculate' })}>Calculate</Button><Button size="sm" variant="outline" onClick={() => action.mutate({ id: r.id, op: 'submit' })}>Submit</Button><Button size="sm" variant="outline" onClick={() => action.mutate({ id: r.id, op: 'approve' })}>Approve</Button><Button size="sm" variant="outline" onClick={() => action.mutate({ id: r.id, op: 'buildJournal' })}>Build journal</Button><Button size="sm" onClick={() => action.mutate({ id: r.id, op: 'postJournal' })}>Post</Button></>)} /> : null}</ContentCard>
    </HrShell>
  );
}
