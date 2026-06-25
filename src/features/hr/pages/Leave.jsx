import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, CalendarDays, ContentCard, ErrorBlock, FormGrid, HrShell, Input, Select, SimpleTable, StatusBadge, Textarea, asNumber, cleanPayload, selectOptions, useCrudCreate, useHr, useLookupData } from './_hrShared.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export default function Leave() {
  const api = useHr();
  const qc = useQueryClient();
  const toast = useToast();
  const lookups = useLookupData(api);
  const [typeForm, setTypeForm] = useState({ code: '', name: '', unit: 'days', is_paid: true });
  const [balanceForm, setBalanceForm] = useState({ employee_id: '', leave_type_id: '', balance_days: '', reason: '' });
  const [requestForm, setRequestForm] = useState({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', days: '', reason: '' });
  const types = useQuery({ queryKey: ['hr.leave.types'], queryFn: () => api.leaveTypes.list() });
  const balances = useQuery({ queryKey: ['hr.leave.balances'], queryFn: () => api.leaveBalances.list() });
  const requests = useQuery({ queryKey: ['hr.leave.requests'], queryFn: () => api.leaveRequests.list() });
  const createType = useCrudCreate({ key: 'hr.leave.types', createFn: (p) => api.leaveTypes.create(cleanPayload(p)), reset: () => setTypeForm({ code: '', name: '', unit: 'days', is_paid: true }) });
  const upsertBalance = useCrudCreate({ key: 'hr.leave.balances', createFn: (p) => api.leaveBalances.upsert(cleanPayload({ ...p, balance_days: asNumber(p.balance_days) })), reset: () => setBalanceForm({ employee_id: '', leave_type_id: '', balance_days: '', reason: '' }) });
  const createRequest = useCrudCreate({ key: 'hr.leave.requests', createFn: (p) => api.leaveRequests.create(cleanPayload({ ...p, days: asNumber(p.days) })), reset: () => setRequestForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', days: '', reason: '' }) });
  const action = useMutation({ mutationFn: ({ id, op }) => api.leaveRequests[op](id), onSuccess: () => { toast.success('Leave request updated.'); qc.invalidateQueries({ queryKey: ['hr.leave.requests'] }); qc.invalidateQueries({ queryKey: ['hr.leave.balances'] }); }, onError: (e) => toast.error(e?.message ?? 'Leave action failed.') });

  return (
    <HrShell title="Leave Management" subtitle="Leave types, leave balances and request approval workflow." icon={CalendarDays}>
      <div className="grid gap-6 xl:grid-cols-2">
        <ContentCard title="New leave type">
          <FormGrid onSubmit={(e) => { e.preventDefault(); createType.mutate(typeForm); }}>
            <Input label="Code" value={typeForm.code} onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })} required />
            <Input label="Name" value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} required />
            <Select label="Paid" value={String(typeForm.is_paid)} onChange={(e) => setTypeForm({ ...typeForm, is_paid: e.target.value === 'true' })} options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} />
            <div className="flex items-end"><Button type="submit" loading={createType.isPending}>Create type</Button></div>
          </FormGrid>
        </ContentCard>
        <ContentCard title="Set leave balance">
          <FormGrid onSubmit={(e) => { e.preventDefault(); upsertBalance.mutate(balanceForm); }}>
            <Select label="Employee" value={balanceForm.employee_id} onChange={(e) => setBalanceForm({ ...balanceForm, employee_id: e.target.value })} options={selectOptions(lookups.employees, (r) => `${r.employee_no} — ${r.first_name} ${r.last_name}`, 'Select employee')} required />
            <Select label="Leave type" value={balanceForm.leave_type_id} onChange={(e) => setBalanceForm({ ...balanceForm, leave_type_id: e.target.value })} options={selectOptions(lookups.leaveTypes, (r) => `${r.code} — ${r.name}`, 'Select type')} required />
            <Input label="Balance days" type="number" step="0.5" value={balanceForm.balance_days} onChange={(e) => setBalanceForm({ ...balanceForm, balance_days: e.target.value })} required />
            <Input label="Reason" value={balanceForm.reason} onChange={(e) => setBalanceForm({ ...balanceForm, reason: e.target.value })} />
            <div className="flex items-end"><Button type="submit" loading={upsertBalance.isPending}>Save balance</Button></div>
          </FormGrid>
        </ContentCard>
      </div>
      <ContentCard title="New leave request">
        <FormGrid onSubmit={(e) => { e.preventDefault(); createRequest.mutate(requestForm); }}>
          <Select label="Employee" value={requestForm.employee_id} onChange={(e) => setRequestForm({ ...requestForm, employee_id: e.target.value })} options={selectOptions(lookups.employees, (r) => `${r.employee_no} — ${r.first_name} ${r.last_name}`, 'Select employee')} required />
          <Select label="Leave type" value={requestForm.leave_type_id} onChange={(e) => setRequestForm({ ...requestForm, leave_type_id: e.target.value })} options={selectOptions(lookups.leaveTypes, (r) => `${r.code} — ${r.name}`, 'Select type')} required />
          <Input label="Start date" type="date" value={requestForm.start_date} onChange={(e) => setRequestForm({ ...requestForm, start_date: e.target.value })} required />
          <Input label="End date" type="date" value={requestForm.end_date} onChange={(e) => setRequestForm({ ...requestForm, end_date: e.target.value })} required />
          <Input label="Days" type="number" step="0.5" value={requestForm.days} onChange={(e) => setRequestForm({ ...requestForm, days: e.target.value })} required />
          <Textarea label="Reason" value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} />
          <div className="flex items-end"><Button type="submit" loading={createRequest.isPending}>Create request</Button></div>
        </FormGrid>
      </ContentCard>
      <div className="grid gap-6 xl:grid-cols-2">
        <ContentCard title="Leave types"><ErrorBlock query={types} label="leave types" />{!types.isLoading && !types.isError ? <SimpleTable rows={types.data ?? []} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'is_paid', label: 'Paid', render: (r) => r.is_paid ? 'Yes' : 'No' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} /> : null}</ContentCard>
        <ContentCard title="Leave balances"><ErrorBlock query={balances} label="leave balances" />{!balances.isLoading && !balances.isError ? <SimpleTable rows={balances.data ?? []} columns={[{ key: 'employee_id', label: 'Employee ID' }, { key: 'leave_type_name', label: 'Leave type' }, { key: 'balance_days', label: 'Balance days' }]} /> : null}</ContentCard>
      </div>
      <ContentCard title="Leave requests"><ErrorBlock query={requests} label="leave requests" />{!requests.isLoading && !requests.isError ? <SimpleTable rows={requests.data ?? []} columns={[{ key: 'employee_no', label: 'Employee' }, { key: 'leave_type_name', label: 'Type' }, { key: 'start_date', label: 'Start' }, { key: 'end_date', label: 'End' }, { key: 'days', label: 'Days' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} actions={(r) => (<><Button size="sm" variant="outline" onClick={() => action.mutate({ id: r.id, op: 'submit' })}>Submit</Button><Button size="sm" variant="outline" onClick={() => action.mutate({ id: r.id, op: 'approve' })}>Approve</Button><Button size="sm" variant="danger" onClick={() => action.mutate({ id: r.id, op: 'cancel' })}>Cancel</Button></>)} /> : null}</ContentCard>
    </HrShell>
  );
}
