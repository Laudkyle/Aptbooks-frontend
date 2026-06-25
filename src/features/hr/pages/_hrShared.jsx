import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Building2, Briefcase, BadgeDollarSign, CalendarDays, HeartHandshake, Landmark, BarChart3, Wallet } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeHrApi } from '../api/hr.api.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { AccountSelect } from '../../../shared/components/forms/AccountSelect.jsx';
import { CurrencySelect } from '../../../shared/components/forms/CurrencySelect.jsx';
import { TaxCodeSelect } from '../../../shared/components/forms/TaxCodeSelect.jsx';
import { BankAccountSelect } from '../../../shared/components/forms/BankAccountSelect.jsx';
import { PeriodSelect } from '../../../shared/components/forms/PeriodSelect.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export function rowsOf(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export function asNumber(v) {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function cleanPayload(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined)
      .map(([k, v]) => [k, v === 'null' ? null : v])
  );
}

export function statusTone(status) {
  if (['active', 'approved', 'posted', 'completed'].includes(status)) return 'success';
  if (['inactive', 'cancelled', 'rejected', 'terminated'].includes(status)) return 'danger';
  if (['draft', 'pending_approval', 'calculated'].includes(status)) return 'warning';
  return 'default';
}

export function HrShell({ title, subtitle, icon, children, actions }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader title={title} subtitle={subtitle} icon={icon} actions={actions} />
      {children}
    </div>
  );
}

export function ErrorBlock({ query, label = 'records' }) {
  if (query.isLoading) return <div className="p-6 text-sm text-slate-500">Loading {label}...</div>;
  if (query.isError) return <div className="p-6 text-sm text-red-600">{query.error?.message ?? `Failed to load ${label}.`}</div>;
  return null;
}

export function SimpleTable({ rows, columns, empty = 'No records found.', actions }) {
  if (!rows.length) return <div className="p-6 text-sm text-slate-500">{empty}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => <th key={c.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">{c.label}</th>)}
            {actions ? <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((r) => (
            <tr key={r.id ?? r.code ?? JSON.stringify(r)} className="hover:bg-slate-50">
              {columns.map((c) => <td key={c.key} className="px-4 py-3 align-top text-slate-700">{c.render ? c.render(r) : String(r[c.key] ?? '')}</td>)}
              {actions ? <td className="px-4 py-3 text-right align-top"><div className="flex justify-end gap-2">{actions(r)}</div></td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusBadge({ value }) {
  return <Badge tone={statusTone(value)}>{value ?? '—'}</Badge>;
}

export function ModuleCards() {
  const cards = [
    { to: ROUTES.hrEmployees, icon: Users, title: 'Employees', text: 'Employee records, status lifecycle, payroll accounts and bank details.' },
    { to: ROUTES.hrDepartments, icon: Building2, title: 'Departments', text: 'Department codes and names used across HR reporting.' },
    { to: ROUTES.hrPositions, icon: Briefcase, title: 'Positions', text: 'Positions linked to departments and grades.' },
    { to: ROUTES.hrGrades, icon: BadgeDollarSign, title: 'Grades', text: 'Grade bands and salary ranges.' },
    { to: ROUTES.hrCompensationBands, icon: Wallet, title: 'Compensation Bands', text: 'Pay bands and salary frequency controls.' },
    { to: ROUTES.hrPayroll, icon: Landmark, title: 'Payroll', text: 'Payroll components, assignments, runs and journal posting workflow.' },
    { to: ROUTES.hrLeave, icon: CalendarDays, title: 'Leave', text: 'Leave types, balances, leave requests and approval actions.' },
    { to: ROUTES.hrBenefits, icon: HeartHandshake, title: 'Benefits', text: 'Benefit plans and employee benefit assignments.' },
    { to: ROUTES.hrStatutory, icon: Landmark, title: 'Statutory', text: 'PAYE, pension, social security and other payroll rules.' },
    { to: ROUTES.hrReports, icon: BarChart3, title: 'Reports', text: 'Headcount, leave balance and payroll cost summaries.' }
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.to} to={card.to} className="app-card p-5 hover:ring-2 hover:ring-brand-primary/20 transition">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-brand-primary/10 p-3 text-brand-deep"><Icon className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold text-slate-900">{card.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{card.text}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function useHr() {
  const { http } = useApi();
  return useMemo(() => makeHrApi(http), [http]);
}

export function useLookupData(api) {
  const departments = useQuery({ queryKey: ['hr.departments.lookup'], queryFn: () => api.departments.list({ status: 'active' }) });
  const grades = useQuery({ queryKey: ['hr.grades.lookup'], queryFn: () => api.grades.list({ status: 'active' }) });
  const positions = useQuery({ queryKey: ['hr.positions.lookup'], queryFn: () => api.positions.list({ status: 'active' }) });
  const bands = useQuery({ queryKey: ['hr.bands.lookup'], queryFn: () => api.compensationBands.list({ status: 'active' }) });
  const employees = useQuery({ queryKey: ['hr.employees.lookup'], queryFn: () => api.employees.list({ status: 'active' }) });
  const leaveTypes = useQuery({ queryKey: ['hr.leave.types.lookup'], queryFn: () => api.leaveTypes.list({ status: 'active' }) });
  const benefitPlans = useQuery({ queryKey: ['hr.benefits.plans.lookup'], queryFn: () => api.benefitPlans.list({ status: 'active' }) });
  const components = useQuery({ queryKey: ['hr.payroll.components.lookup'], queryFn: () => api.payrollComponents.list({ status: 'active' }) });
  return { departments, grades, positions, bands, employees, leaveTypes, benefitPlans, components };
}

export function selectOptions(query, labelFn, empty = 'Select') {
  return [{ value: '', label: empty }, ...rowsOf(query.data).map((r) => ({ value: r.id, label: labelFn(r) }))];
}

export function CreateActions({ mutation, disabledLabel = 'Save', children }) {
  return <Button type="submit" loading={mutation.isPending}>{children ?? disabledLabel}</Button>;
}

export function FormGrid({ children, onSubmit }) {
  return <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</form>;
}


export function toFormValues(row, blank) {
  const next = { ...blank };
  for (const key of Object.keys(next)) {
    const value = row?.[key];
    if (typeof next[key] === 'boolean') next[key] = Boolean(value);
    else next[key] = value === null || value === undefined ? '' : String(value);
  }
  return next;
}

export function useCrudSave({ key, createFn, updateFn, reset }) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, payload }) => id ? updateFn(id, payload) : createFn(payload),
    onSuccess: () => {
      toast.success('Saved successfully.');
      reset?.();
      qc.invalidateQueries({ queryKey: [key] });
    },
    onError: (e) => toast.error(e?.message ?? 'Save failed.')
  });
}

export function useCrudRemove({ key, removeFn }) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: removeFn,
    onSuccess: () => {
      toast.success('Deleted successfully.');
      qc.invalidateQueries({ queryKey: [key] });
    },
    onError: (e) => toast.error(e?.message ?? 'Delete failed.')
  });
}

export function useCrudCreate({ key, createFn, reset }) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      toast.success('Saved successfully.');
      reset?.();
      qc.invalidateQueries({ queryKey: [key] });
    },
    onError: (e) => toast.error(e?.message ?? 'Save failed.')
  });
}

export function AccountField({ label, value, onChange, required = false, allowEmpty = true }) {
  return <AccountSelect label={label} value={value} onChange={onChange} required={required} allowEmpty={allowEmpty} />;
}

export function CurrencyField({ label = 'Currency', value, onChange, required = false, allowEmpty = false }) {
  return <CurrencySelect label={label} value={value} onChange={onChange} required={required} allowEmpty={allowEmpty} />;
}

export function TaxCodeField({ label = 'Tax code', value, onChange, required = false, query = { status: 'active' } }) {
  return <TaxCodeSelect label={label} value={value} onChange={onChange} required={required} query={query} allowEmpty emptyLabel="Select tax code" />;
}

export function BankAccountField({ label = 'Bank account', value, onChange, required = false }) {
  return <BankAccountSelect label={label} value={value} onChange={onChange} required={required} allowEmpty emptyLabel="Select bank account" />;
}

export function PeriodField({ label = 'Period', value, onChange, required = false, query = {} }) {
  return <PeriodSelect label={label} value={value} onChange={onChange} required={required} query={query} allowEmpty emptyLabel="Select period" />;
}

export { Input, Select, Textarea, Button, ContentCard, Users, Building2, Briefcase, BadgeDollarSign, CalendarDays, HeartHandshake, Landmark, BarChart3, Wallet };
