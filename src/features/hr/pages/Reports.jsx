import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, ContentCard, ErrorBlock, HrShell, SimpleTable, useHr } from './_hrShared.jsx';

export default function Reports() {
  const api = useHr();
  const headcount = useQuery({ queryKey: ['hr.reports.headcount'], queryFn: () => api.reports.headcount() });
  const leave = useQuery({ queryKey: ['hr.reports.leaveBalances'], queryFn: () => api.reports.leaveBalances() });
  const payroll = useQuery({ queryKey: ['hr.reports.payrollCosts'], queryFn: () => api.reports.payrollCosts() });
  return (
    <HrShell title="HR Reports" subtitle="Headcount, leave balance and payroll-cost reporting." icon={BarChart3}>
      <div className="grid gap-6 xl:grid-cols-2">
        <ContentCard title="Headcount"><ErrorBlock query={headcount} label="headcount" />{!headcount.isLoading && !headcount.isError ? <SimpleTable rows={headcount.data ?? []} columns={[{ key: 'department_name', label: 'Department' }, { key: 'position_name', label: 'Position' }, { key: 'status', label: 'Status' }, { key: 'headcount', label: 'Headcount' }]} /> : null}</ContentCard>
        <ContentCard title="Leave balances"><ErrorBlock query={leave} label="leave balances" />{!leave.isLoading && !leave.isError ? <SimpleTable rows={leave.data ?? []} columns={[{ key: 'leave_type_code', label: 'Code' }, { key: 'leave_type_name', label: 'Leave type' }, { key: 'employees', label: 'Employees' }, { key: 'total_balance_days', label: 'Total balance days' }]} /> : null}</ContentCard>
      </div>
      <ContentCard title="Payroll costs"><ErrorBlock query={payroll} label="payroll costs" />{!payroll.isLoading && !payroll.isError ? <SimpleTable rows={payroll.data ?? []} columns={[{ key: 'code', label: 'Run' }, { key: 'period_start', label: 'Period start' }, { key: 'period_end', label: 'Period end' }, { key: 'gross_pay', label: 'Gross' }, { key: 'total_deductions', label: 'Deductions' }, { key: 'net_pay', label: 'Net' }, { key: 'employees', label: 'Employees' }]} /> : null}</ContentCard>
    </HrShell>
  );
}
