import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AccountField, Button, ContentCard, ErrorBlock, FormGrid, HeartHandshake, HrShell, Input, Select, SimpleTable, StatusBadge, asNumber, cleanPayload, selectOptions, useCrudCreate, useHr, useLookupData } from './_hrShared.jsx';

export default function Benefits() {
  const api = useHr();
  const lookups = useLookupData(api);
  const [plan, setPlan] = useState({ code: '', name: '', description: '', employer_rate: '', employee_rate: '', base_on: 'base', cap_amount: '', expense_account_id: '', liability_account_id: '' });
  const [assignment, setAssignment] = useState({ employee_id: '', benefit_plan_id: '', effective_from: '', effective_to: '' });
  const plans = useQuery({ queryKey: ['hr.benefits.plans'], queryFn: () => api.benefitPlans.list() });
  const assignments = useQuery({ queryKey: ['hr.benefits.employeeBenefits'], queryFn: () => api.employeeBenefits.list() });
  const createPlan = useCrudCreate({ key: 'hr.benefits.plans', createFn: (p) => api.benefitPlans.create(cleanPayload({ ...p, employer_rate: asNumber(p.employer_rate), employee_rate: asNumber(p.employee_rate), cap_amount: asNumber(p.cap_amount) })), reset: () => setPlan({ code: '', name: '', description: '', employer_rate: '', employee_rate: '', base_on: 'base', cap_amount: '', expense_account_id: '', liability_account_id: '' }) });
  const createAssignment = useCrudCreate({ key: 'hr.benefits.employeeBenefits', createFn: (p) => api.employeeBenefits.create(cleanPayload(p)), reset: () => setAssignment({ employee_id: '', benefit_plan_id: '', effective_from: '', effective_to: '' }) });

  return (
    <HrShell title="Benefits" subtitle="Benefit plans and employee benefit assignments." icon={HeartHandshake}>
      <ContentCard title="New benefit plan">
        <FormGrid onSubmit={(e) => { e.preventDefault(); createPlan.mutate(plan); }}>
          <Input label="Code" value={plan.code} onChange={(e) => setPlan({ ...plan, code: e.target.value })} required />
          <Input label="Name" value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} required />
          <Input label="Employer rate" type="number" step="0.01" value={plan.employer_rate} onChange={(e) => setPlan({ ...plan, employer_rate: e.target.value })} required />
          <Input label="Employee rate" type="number" step="0.01" value={plan.employee_rate} onChange={(e) => setPlan({ ...plan, employee_rate: e.target.value })} required />
          <Select label="Base on" value={plan.base_on} onChange={(e) => setPlan({ ...plan, base_on: e.target.value })} options={[{ value: 'base', label: 'Base salary' }, { value: 'gross', label: 'Gross pay' }]} />
          <Input label="Cap amount" type="number" step="0.01" value={plan.cap_amount} onChange={(e) => setPlan({ ...plan, cap_amount: e.target.value })} />
          <AccountField label="Expense account" value={plan.expense_account_id} onChange={(e) => setPlan({ ...plan, expense_account_id: e.target.value })} required />
          <AccountField label="Liability account" value={plan.liability_account_id} onChange={(e) => setPlan({ ...plan, liability_account_id: e.target.value })} required />
          <Input label="Description" value={plan.description} onChange={(e) => setPlan({ ...plan, description: e.target.value })} />
          <div className="flex items-end"><Button type="submit" loading={createPlan.isPending}>Create plan</Button></div>
        </FormGrid>
      </ContentCard>
      <ContentCard title="Assign benefit">
        <FormGrid onSubmit={(e) => { e.preventDefault(); createAssignment.mutate(assignment); }}>
          <Select label="Employee" value={assignment.employee_id} onChange={(e) => setAssignment({ ...assignment, employee_id: e.target.value })} options={selectOptions(lookups.employees, (r) => `${r.employee_no} — ${r.first_name} ${r.last_name}`, 'Select employee')} required />
          <Select label="Benefit plan" value={assignment.benefit_plan_id} onChange={(e) => setAssignment({ ...assignment, benefit_plan_id: e.target.value })} options={selectOptions(lookups.benefitPlans, (r) => `${r.code} — ${r.name}`, 'Select plan')} required />
          <Input label="Effective from" type="date" value={assignment.effective_from} onChange={(e) => setAssignment({ ...assignment, effective_from: e.target.value })} required />
          <Input label="Effective to" type="date" value={assignment.effective_to} onChange={(e) => setAssignment({ ...assignment, effective_to: e.target.value })} />
          <div className="flex items-end"><Button type="submit" loading={createAssignment.isPending}>Assign</Button></div>
        </FormGrid>
      </ContentCard>
      <div className="grid gap-6 xl:grid-cols-2">
        <ContentCard title="Benefit plans"><ErrorBlock query={plans} label="benefit plans" />{!plans.isLoading && !plans.isError ? <SimpleTable rows={plans.data ?? []} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'employer_rate', label: 'Employer %' }, { key: 'employee_rate', label: 'Employee %' }, { key: 'base_on', label: 'Base' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} /> : null}</ContentCard>
        <ContentCard title="Employee benefits"><ErrorBlock query={assignments} label="employee benefits" />{!assignments.isLoading && !assignments.isError ? <SimpleTable rows={assignments.data ?? []} columns={[{ key: 'employee_id', label: 'Employee ID' }, { key: 'plan_name', label: 'Plan' }, { key: 'effective_from', label: 'From' }, { key: 'effective_to', label: 'To' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} /> : null}</ContentCard>
      </div>
    </HrShell>
  );
}
