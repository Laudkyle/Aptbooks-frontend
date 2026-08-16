import React, { useMemo } from 'react';
import { useApi } from '../../../../../../shared/hooks/useApi.js';
import { makeGhanaAdvancedApi } from '../../../api/ghanaAdvanced.api.js';
import { GhanaComplianceShell } from '../../../components/GhanaComplianceShell.jsx';
import { GhanaEvatNav } from '../../../components/GhanaEvatNav.jsx';

export function useGhanaAdvancedApi() { const { http } = useApi(); return useMemo(() => makeGhanaAdvancedApi(http), [http]); }
export function money(value) { const n=Number(value??0); return new Intl.NumberFormat('en-GH',{style:'currency',currency:'GHS'}).format(Number.isFinite(n)?n:0); }
export function dateText(value) { return value ? String(value).slice(0,10) : '—'; }
export function titleCase(value) { return String(value??'—').replaceAll('_',' ').replace(/\b\w/g,(c)=>c.toUpperCase()); }
export function EvatShell({ title, subtitle, actions, children }) { return <GhanaComplianceShell title={title} subtitle={subtitle} actions={actions}><GhanaEvatNav />{children}</GhanaComplianceShell>; }
