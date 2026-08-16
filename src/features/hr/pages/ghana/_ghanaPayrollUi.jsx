import React, { useMemo } from 'react';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeGhanaPayrollApi } from '../../api/ghanaPayroll.api.js';
import { HrShell } from '../_hrShared.jsx';
import { GhanaPayrollNav } from '../../components/GhanaPayrollNav.jsx';
import { Landmark } from 'lucide-react';

export function money(value) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(Number.isFinite(n) ? n : 0);
}
export function dateText(value) { return value ? String(value).slice(0, 10) : '—'; }
export function titleCase(value) { return String(value ?? '—').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
export function useGhanaPayrollApi() {
  const { http } = useApi();
  return useMemo(() => makeGhanaPayrollApi(http), [http]);
}
export function GhanaPayrollShell({ title, subtitle, actions, children }) {
  return <HrShell title={title} subtitle={subtitle} icon={Landmark} actions={actions}><GhanaPayrollNav />{children}</HrShell>;
}
