import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AccountField, Button, ContentCard, ErrorBlock, FormGrid, HeartHandshake, HrShell, Input, Select, SimpleTable, StatusBadge, asNumber, cleanPayload, rowsOf, selectOptions, toFormValues, useCrudRemove, useCrudSave, useHr, useLookupData } from './_hrShared.jsx';

const planBlank = { code: '', name: '', description: '', employer_rate: '', employee_rate: '', base_on: 'base', cap_amount: '', expense_account_id: '', liability_account_id: '', status: 'active' };
const assignmentBlank = { employee_id: '', benefit_plan_id: '', effective_from: '', effective_to: '', status: 'active' };
const planPayload = (p) => cleanPayload({ ...p, employer_rate: asNumber(p.employer_rate), employee_rate: asNumber(p.employee_rate), cap_amount: asNumber(p.cap_amount) });

export default function Benefits() {
  const api = useHr();
  const lookups = useLookupData(api);
  const [plan, setPlan] = useState(planBlank);
  const [planEditingId, setPlanEditingId] = useState(null);
  const [assignment, setAssignment] = useState(assignmentBlank);
  const [assignmentEditingId, setAssignmentEditingId] = useState(null);
  const plans = useQuery({ queryKey: ['hr.benefits.plans'], queryFn: () => api.benefitPlans.list() });
  const assignments = useQuery({ queryKey: ['hr.benefits.employeeBenefits'], queryFn: () => api.employeeBenefits.list() });
  const resetPlan = () => { setPlan(planBlank); setPlanEditingId(null); };
  const resetAssignment = () => { setAssignment(assignmentBlank); setAssignmentEditingId(null); };
  const savePlan = useCrudSave({ key: 'hr.benefits.plans', createFn: (p) => api.benefitPlans.create(planPayload(p)), updateFn: (id, p) => api.benefitPlans.update(id, planPayload(p)), reset: resetPlan });
  const saveAssignment = useCrudSave({ key: 'hr.benefits.employeeBenefits', createFn: (p) => api.employeeBenefits.create(cleanPayload(p)), updateFn: (id, p) => api.employeeBenefits.update(id, cleanPayload({ effective_from: p.effective_from, effective_to: p.effective_to, status: p.status })), reset: resetAssignment });
  const removePlan = useCrudRemove({ key: 'hr.benefits.plans', removeFn: (id) => api.benefitPlans.remove(id) });
  const removeAssignment = useCrudRemove({ key: 'hr.benefits.employeeBenefits', removeFn: (id) => api.employeeBenefits.remove(id) });
  const startPlanEdit = (row) => { setPlanEditingId(row.id); setPlan(toFormValues(row, planBlank)); };
  const startAssignmentEdit = (row) => { setAssignmentEditingId(row.id); setAssignment(toFormValues(row, assignmentBlank)); };

  return (
    <HrShell title="Benefits" subtitle="Benefit plans and employee benefit assignments." icon={HeartHandshake}>
      <ContentCard title={planEditingId ? 'Edit benefit plan' : 'New benefit plan'} actions={planEditingId ? <Button variant="outline" size="sm" onClick={resetPlan}>Cancel edit</Button> : null}>
        <FormGrid onSubmit={(e) => { e.preventDefault(); savePlan.mutate({ id: planEditingId, payload: plan }); }}>
          <Input label="Code" value={plan.code} onChange={(e) => setPlan({ ...plan, code: e.target.value })} required />
          <Input label="Name" value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} required />
          <Input label="Employer rate" type="number" step="0.01" value={plan.employer_rate} onChange={(e) => setPlan({ ...plan, employer_rate: e.target.value })} required />
          <Input label="Employee rate" type="number" step="0.01" value={plan.employee_rate} onChange={(e) => setPlan({ ...plan, employee_rate: e.target.value })} required />
          <Select label="Base on" value={plan.base_on} onChange={(e) => setPlan({ ...plan, base_on: e.target.value })} options={[{ value: 'base', label: 'Base salary' }, { value: 'gross', label: 'Gross pay' }]} />
          <Input label="Cap amount" type="number" step="0.01" value={plan.cap_amount} onChange={(e) => setPlan({ ...plan, cap_amount: e.target.value })} />
          <AccountField label="Expense account" value={plan.expense_account_id} onChange={(e) => setPlan({ ...plan, expense_account_id: e.target.value })} required />
          <AccountField label="Liability account" value={plan.liability_account_id} onChange={(e) => setPlan({ ...plan, liability_account_id: e.target.value })} required />
          {planEditingId ? <Select label="Status" value={plan.status} onChange={(e) => setPlan({ ...plan, status: e.target.value })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /> : null}
          <Input label="Description" value={plan.description} onChange={(e) => setPlan({ ...plan, description: e.target.value })} />
          <div className="flex items-end"><Button type="submit" loading={savePlan.isPending}>{planEditingId ? 'Update plan' : 'Create plan'}</Button></div>
        </FormGrid>
      </ContentCard>
      <ContentCard title={assignmentEditingId ? 'Edit employee benefit' : 'Assign benefit'} actions={assignmentEditingId ? <Button variant="outline" size="sm" onClick={resetAssignment}>Cancel edit</Button> : null}>
        <FormGrid onSubmit={(e) => { e.preventDefault(); saveAssignment.mutate({ id: assignmentEditingId, payload: assignment }); }}>
          <Select label="Employee" value={assignment.employee_id} onChange={(e) => setAssignment({ ...assignment, employee_id: e.target.value })} options={selectOptions(lookups.employees, (r) => `${r.employee_no} — ${r.first_name} ${r.last_name}`, 'Select employee')} required disabled={Boolean(assignmentEditingId)} />
          <Select label="Benefit plan" value={assignment.benefit_plan_id} onChange={(e) => setAssignment({ ...assignment, benefit_plan_id: e.target.value })} options={selectOptions(lookups.benefitPlans, (r) => `${r.code} — ${r.name}`, 'Select plan')} required disabled={Boolean(assignmentEditingId)} />
          <Input label="Effective from" type="date" value={assignment.effective_from} onChange={(e) => setAssignment({ ...assignment, effective_from: e.target.value })} required />
          <Input label="Effective to" type="date" value={assignment.effective_to} onChange={(e) => setAssignment({ ...assignment, effective_to: e.target.value })} />
          {assignmentEditingId ? <Select label="Status" value={assignment.status} onChange={(e) => setAssignment({ ...assignment, status: e.target.value })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /> : null}
          <div className="flex items-end"><Button type="submit" loading={saveAssignment.isPending}>{assignmentEditingId ? 'Update benefit' : 'Assign'}</Button></div>
        </FormGrid>
      </ContentCard>
      <div className="grid gap-6 xl:grid-cols-2">
        <ContentCard title="Benefit plans"><ErrorBlock query={plans} label="benefit plans" />{!plans.isLoading && !plans.isError ? <SimpleTable rows={rowsOf(plans.data)} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'employer_rate', label: 'Employer %' }, { key: 'employee_rate', label: 'Employee %' }, { key: 'base_on', label: 'Base' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} actions={(r) => (<><Button size="sm" variant="outline" onClick={() => startPlanEdit(r)}>Edit</Button><Button size="sm" variant="danger" loading={removePlan.isPending} onClick={() => { if (confirm('Delete this benefit plan?')) removePlan.mutate(r.id); }}>Delete</Button></>)} /> : null}</ContentCard>
        <ContentCard title="Employee benefits"><ErrorBlock query={assignments} label="employee benefits" />{!assignments.isLoading && !assignments.isError ? <SimpleTable rows={rowsOf(assignments.data)} columns={[{ key: 'employee_id', label: 'Employee ID' }, { key: 'plan_name', label: 'Plan' }, { key: 'effective_from', label: 'From' }, { key: 'effective_to', label: 'To' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} actions={(r) => (<><Button size="sm" variant="outline" onClick={() => startAssignmentEdit(r)}>Edit</Button><Button size="sm" variant="danger" loading={removeAssignment.isPending} onClick={() => { if (confirm('Delete this employee benefit?')) removeAssignment.mutate(r.id); }}>Delete</Button></>)} /> : null}</ContentCard>
      </div>
    </HrShell>
  );
}
