import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Button, ContentCard, ErrorBlock, FormGrid, HrShell, Input, PeriodField, Select, SimpleTable, cleanPayload, selectOptions, useHr, useLookupData } from './_hrShared.jsx';

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : '';
}

function daysBetweenInclusive(start, end) {
  if (!start || !end) return null;
  const a = new Date(`${start}T00:00:00Z`);
  const b = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.floor((b - a) / 86_400_000) + 1;
}

const blankFilters = { period_id: '', period_start: '', period_end: '', status: '', leave_type_id: '' };

export default function Reports() {
  const api = useHr();
  const lookups = useLookupData(api);
  const [draftFilters, setDraftFilters] = useState(blankFilters);
  const [filters, setFilters] = useState(blankFilters);

  const durationDays = useMemo(() => daysBetweenInclusive(filters.period_start, filters.period_end), [filters.period_start, filters.period_end]);
  const headcountParams = useMemo(() => cleanPayload({ status: filters.status, period_start: filters.period_start, period_end: filters.period_end }), [filters]);
  const leaveParams = useMemo(() => cleanPayload({ leave_type_id: filters.leave_type_id, period_start: filters.period_start, period_end: filters.period_end }), [filters]);
  const payrollParams = useMemo(() => cleanPayload({ period_start: filters.period_start, period_end: filters.period_end }), [filters]);

  const headcount = useQuery({ queryKey: ['hr.reports.headcount', headcountParams], queryFn: () => api.reports.headcount(headcountParams) });
  const leave = useQuery({ queryKey: ['hr.reports.leaveBalances', leaveParams], queryFn: () => api.reports.leaveBalances(leaveParams) });
  const payroll = useQuery({ queryKey: ['hr.reports.payrollCosts', payrollParams], queryFn: () => api.reports.payrollCosts(payrollParams) });

  return (
    <HrShell title="HR Reports" subtitle="Headcount, leave balance and payroll-cost reporting by selected period or date range." icon={BarChart3}>
      <ContentCard title="Report period and filters">
        <FormGrid onSubmit={(e) => { e.preventDefault(); setFilters(draftFilters); }}>
          <PeriodField
            label="Accounting period"
            value={draftFilters.period_id}
            onChange={(e, period) => setDraftFilters({
              ...draftFilters,
              period_id: e.target.value,
              period_start: dateOnly(period?.start_date ?? period?.startDate) || draftFilters.period_start,
              period_end: dateOnly(period?.end_date ?? period?.endDate) || draftFilters.period_end
            })}
          />
          <Input label="Start date" type="date" value={draftFilters.period_start} onChange={(e) => setDraftFilters({ ...draftFilters, period_id: '', period_start: e.target.value })} />
          <Input label="End date" type="date" value={draftFilters.period_end} onChange={(e) => setDraftFilters({ ...draftFilters, period_id: '', period_end: e.target.value })} />
          <Select label="Employee status" value={draftFilters.status} onChange={(e) => setDraftFilters({ ...draftFilters, status: e.target.value })} options={[{ value: '', label: 'All statuses' }, { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'terminated', label: 'Terminated' }]} />
          <Select label="Leave type" value={draftFilters.leave_type_id} onChange={(e) => setDraftFilters({ ...draftFilters, leave_type_id: e.target.value })} options={selectOptions(lookups.leaveTypes, (r) => `${r.code} — ${r.name}`, 'All leave types')} />
          <div className="flex items-end gap-2">
            <Button type="submit">Apply filters</Button>
            <Button type="button" variant="outline" onClick={() => { setDraftFilters(blankFilters); setFilters(blankFilters); }}>Reset</Button>
          </div>
        </FormGrid>
        <div className="mt-3 text-sm text-slate-500">
          {filters.period_start || filters.period_end
            ? `Applied duration: ${filters.period_start || 'open start'} to ${filters.period_end || 'open end'}${durationDays ? ` (${durationDays} days)` : ''}.`
            : 'No period selected. Reports currently show all available records.'}
        </div>
      </ContentCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <ContentCard title="Headcount"><ErrorBlock query={headcount} label="headcount" />{!headcount.isLoading && !headcount.isError ? <SimpleTable rows={headcount.data ?? []} columns={[{ key: 'department_name', label: 'Department' }, { key: 'position_name', label: 'Position' }, { key: 'status', label: 'Status' }, { key: 'headcount', label: 'Headcount' }]} /> : null}</ContentCard>
        <ContentCard title="Leave balances"><ErrorBlock query={leave} label="leave balances" />{!leave.isLoading && !leave.isError ? <SimpleTable rows={leave.data ?? []} columns={[{ key: 'leave_type_code', label: 'Code' }, { key: 'leave_type_name', label: 'Leave type' }, { key: 'employees', label: 'Employees' }, { key: 'total_balance_days', label: 'Total balance days' }]} /> : null}</ContentCard>
      </div>
      <ContentCard title="Payroll costs"><ErrorBlock query={payroll} label="payroll costs" />{!payroll.isLoading && !payroll.isError ? <SimpleTable rows={payroll.data ?? []} columns={[{ key: 'code', label: 'Run' }, { key: 'period_start', label: 'Period start' }, { key: 'period_end', label: 'Period end' }, { key: 'gross_pay', label: 'Gross' }, { key: 'total_deductions', label: 'Deductions' }, { key: 'net_pay', label: 'Net' }, { key: 'employees', label: 'Employees' }]} /> : null}</ContentCard>
    </HrShell>
  );
}
