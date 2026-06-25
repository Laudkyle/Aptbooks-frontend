import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Send, Trash2, XCircle } from 'lucide-react';
import { Button, CalendarDays, ContentCard, ErrorBlock, FormGrid, HrShell, Input, Select, SimpleTable, StatusBadge, Textarea, asNumber, cleanPayload, rowsOf, selectOptions, toFormValues, useCrudRemove, useCrudSave, useHr, useLookupData } from './_hrShared.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

const typeBlank = { code: '', name: '', unit: 'days', is_paid: true, status: 'active' };
const balanceBlank = { employee_id: '', leave_type_id: '', balance_days: '', reason: '' };
const requestBlank = { employee_id: '', leave_type_id: '', start_date: '', end_date: '', days: '', reason: '' };

export default function Leave() {
  const api = useHr();
  const qc = useQueryClient();
  const toast = useToast();
  const lookups = useLookupData(api);
  const [typeForm, setTypeForm] = useState(typeBlank);
  const [typeEditingId, setTypeEditingId] = useState(null);
  const [balanceForm, setBalanceForm] = useState(balanceBlank);
  const [requestForm, setRequestForm] = useState(requestBlank);
  const types = useQuery({ queryKey: ['hr.leave.types'], queryFn: () => api.leaveTypes.list() });
  const balances = useQuery({ queryKey: ['hr.leave.balances'], queryFn: () => api.leaveBalances.list() });
  const requests = useQuery({ queryKey: ['hr.leave.requests'], queryFn: () => api.leaveRequests.list() });
  const resetType = () => { setTypeForm(typeBlank); setTypeEditingId(null); };
  const saveType = useCrudSave({ key: 'hr.leave.types', createFn: (p) => api.leaveTypes.create(cleanPayload(p)), updateFn: (id, p) => api.leaveTypes.update(id, cleanPayload(p)), reset: resetType });
  const removeType = useCrudRemove({ key: 'hr.leave.types', removeFn: (id) => api.leaveTypes.remove(id) });
  const upsertBalance = useCrudSave({ key: 'hr.leave.balances', createFn: (p) => api.leaveBalances.upsert(cleanPayload({ ...p, balance_days: asNumber(p.balance_days) })), updateFn: (_, p) => api.leaveBalances.upsert(cleanPayload({ ...p, balance_days: asNumber(p.balance_days) })), reset: () => setBalanceForm(balanceBlank) });
  const createRequest = useCrudSave({ key: 'hr.leave.requests', createFn: (p) => api.leaveRequests.create(cleanPayload({ ...p, days: asNumber(p.days) })), updateFn: () => Promise.reject(new Error('Leave request editing is not supported by the backend after creation. Cancel and recreate if needed.')), reset: () => setRequestForm(requestBlank) });
  const removeRequest = useCrudRemove({ key: 'hr.leave.requests', removeFn: (id) => api.leaveRequests.remove(id) });
  const action = useMutation({ mutationFn: ({ id, op }) => api.leaveRequests[op](id), onSuccess: () => { toast.success('Leave request updated.'); qc.invalidateQueries({ queryKey: ['hr.leave.requests'] }); qc.invalidateQueries({ queryKey: ['hr.leave.balances'] }); }, onError: (e) => toast.error(e?.message ?? 'Leave action failed.') });

  const isLeaveActionLoading = (row, op) => action.isPending && action.variables?.id === row.id && action.variables?.op === op;
  const isRemoveRequestLoading = (row) => removeRequest.isPending && removeRequest.variables === row.id;
  const deleteLeaveRequest = (row) => {
    if (confirm('Delete this leave request? This is only allowed before final approval.')) removeRequest.mutate(row.id);
  };
  const renderLeaveRequestActions = (row) => {
    const status = String(row.status ?? 'draft').toLowerCase();
    if (status === 'draft') {
      return <><Button size="sm" leftIcon={Send} loading={isLeaveActionLoading(row, 'submit')} onClick={() => action.mutate({ id: row.id, op: 'submit' })}>Submit</Button><Button size="sm" variant="danger" leftIcon={Trash2} loading={isRemoveRequestLoading(row)} onClick={() => deleteLeaveRequest(row)}>Delete</Button></>;
    }
    if (status === 'submitted' || status === 'pending_approval') {
      return <><Button size="sm" leftIcon={CheckCircle2} loading={isLeaveActionLoading(row, 'approve')} onClick={() => action.mutate({ id: row.id, op: 'approve' })}>Approve</Button><Button size="sm" variant="danger" leftIcon={XCircle} loading={isLeaveActionLoading(row, 'reject')} onClick={() => action.mutate({ id: row.id, op: 'reject' })}>Reject</Button></>;
    }
    if (status === 'rejected') {
      return <><Button size="sm" leftIcon={Send} loading={isLeaveActionLoading(row, 'submit')} onClick={() => action.mutate({ id: row.id, op: 'submit' })}>Resubmit</Button><Button size="sm" variant="danger" leftIcon={Trash2} loading={isRemoveRequestLoading(row)} onClick={() => deleteLeaveRequest(row)}>Delete</Button></>;
    }
    return <span className="text-xs text-slate-500">No action available</span>;
  };

  const startTypeEdit = (row) => { setTypeEditingId(row.id); setTypeForm(toFormValues(row, typeBlank)); };
  const startBalanceEdit = (row) => setBalanceForm(toFormValues(row, balanceBlank));

  return (
    <HrShell title="Leave Management" subtitle="Leave types, leave balances and request approval workflow." icon={CalendarDays}>
      <div className="grid gap-6 xl:grid-cols-2">
        <ContentCard title={typeEditingId ? 'Edit leave type' : 'New leave type'} actions={typeEditingId ? <Button variant="outline" size="sm" onClick={resetType}>Cancel edit</Button> : null}>
          <FormGrid onSubmit={(e) => { e.preventDefault(); saveType.mutate({ id: typeEditingId, payload: typeForm }); }}>
            <Input label="Code" value={typeForm.code} onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })} required />
            <Input label="Name" value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} required />
            <Select label="Paid" value={String(typeForm.is_paid)} onChange={(e) => setTypeForm({ ...typeForm, is_paid: e.target.value === 'true' })} options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} />
            {typeEditingId ? <Select label="Status" value={typeForm.status} onChange={(e) => setTypeForm({ ...typeForm, status: e.target.value })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /> : null}
            <div className="flex items-end"><Button type="submit" loading={saveType.isPending}>{typeEditingId ? 'Update type' : 'Create type'}</Button></div>
          </FormGrid>
        </ContentCard>
        <ContentCard title="Set or edit leave balance">
          <FormGrid onSubmit={(e) => { e.preventDefault(); upsertBalance.mutate({ payload: balanceForm }); }}>
            <Select label="Employee" value={balanceForm.employee_id} onChange={(e) => setBalanceForm({ ...balanceForm, employee_id: e.target.value })} options={selectOptions(lookups.employees, (r) => `${r.employee_no} — ${r.first_name} ${r.last_name}`, 'Select employee')} required />
            <Select label="Leave type" value={balanceForm.leave_type_id} onChange={(e) => setBalanceForm({ ...balanceForm, leave_type_id: e.target.value })} options={selectOptions(lookups.leaveTypes, (r) => `${r.code} — ${r.name}`, 'Select type')} required />
            <Input label="Balance days" type="number" step="0.5" value={balanceForm.balance_days} onChange={(e) => setBalanceForm({ ...balanceForm, balance_days: e.target.value })} required />
            <Input label="Reason" value={balanceForm.reason} onChange={(e) => setBalanceForm({ ...balanceForm, reason: e.target.value })} />
            <div className="flex items-end"><Button type="submit" loading={upsertBalance.isPending}>Save balance</Button></div>
          </FormGrid>
        </ContentCard>
      </div>
      <ContentCard title="New leave request" actions={<div className="text-xs text-slate-500">Leave requests are controlled after creation; cancel and recreate if details are wrong.</div>}>
        <FormGrid onSubmit={(e) => { e.preventDefault(); createRequest.mutate({ payload: requestForm }); }}>
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
        <ContentCard title="Leave types"><ErrorBlock query={types} label="leave types" />{!types.isLoading && !types.isError ? <SimpleTable rows={rowsOf(types.data)} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'is_paid', label: 'Paid', render: (r) => r.is_paid ? 'Yes' : 'No' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} actions={(r) => (<><Button size="sm" variant="outline" onClick={() => startTypeEdit(r)}>Edit</Button><Button size="sm" variant="danger" loading={removeType.isPending} onClick={() => { if (confirm('Delete this leave type?')) removeType.mutate(r.id); }}>Delete</Button></>)} /> : null}</ContentCard>
        <ContentCard title="Leave balances"><ErrorBlock query={balances} label="leave balances" />{!balances.isLoading && !balances.isError ? <SimpleTable rows={rowsOf(balances.data)} columns={[{ key: 'employee_id', label: 'Employee ID' }, { key: 'leave_type_name', label: 'Leave type' }, { key: 'balance_days', label: 'Balance days' }]} actions={(r) => <Button size="sm" variant="outline" onClick={() => startBalanceEdit(r)}>Edit balance</Button>} /> : null}</ContentCard>
      </div>
      <ContentCard title="Leave requests"><ErrorBlock query={requests} label="leave requests" />{!requests.isLoading && !requests.isError ? <SimpleTable rows={rowsOf(requests.data)} columns={[{ key: 'employee_no', label: 'Employee' }, { key: 'leave_type_name', label: 'Type' }, { key: 'start_date', label: 'Start' }, { key: 'end_date', label: 'End' }, { key: 'days', label: 'Days' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> }]} actions={renderLeaveRequestActions} /> : null}</ContentCard>
    </HrShell>
  );
}
