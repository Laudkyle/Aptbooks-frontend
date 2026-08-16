import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ROUTES } from '../../../../../app/constants/routes.js';
import { useApi } from '../../../../../shared/hooks/useApi.js';
import { qk } from '../../../../../shared/query/keys.js';
import { ContentCard } from '../../../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../../../shared/components/ui/Badge.jsx';
import { makeGhanaComplianceApi } from '../../api/ghanaCompliance.api.js';
import { GhanaComplianceShell } from '../../components/GhanaComplianceShell.jsx';

const actionRoutes = {
  taxpayer_id: ROUTES.accountingTaxGhanaCit,
  cit_enabled: ROUTES.accountingTaxGhanaCit,
  cit_rate: ROUTES.accountingTaxGhanaCit,
  cit_accounts: ROUTES.accountingTaxGhanaCit,
  catalog_classification: ROUTES.inventoryItems,
  withholding_review: ROUTES.accountingTaxGhanaWithholding,
  ghana_payroll: ROUTES.hrPayrollGhana,
  evat: ROUTES.accountingTaxGhanaEvat,
  tax_assets: ROUTES.accountingTaxGhanaCapitalAllowances,
  industry_profile: ROUTES.accountingTaxGhanaIndustryProfile,
  fiscal_dead_letters: ROUTES.accountingTaxGhanaEvatQueue,
};

function statusTone(status) {
  if (status === 'ready') return 'success';
  if (status === 'ready_with_warnings') return 'warning';
  if (status === 'in_progress') return 'info';
  return 'danger';
}

function statusLabel(status) {
  return String(status || 'not_ready').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function GhanaComplianceOverview() {
  const { http } = useApi();
  const api = useMemo(() => makeGhanaComplianceApi(http), [http]);

  const readinessQuery = useQuery({
    queryKey: qk.ghanaReadiness,
    queryFn: () => api.getReadiness(),
    staleTime: 30_000,
  });

  const readiness = readinessQuery.data;
  const checks = readiness?.checks ?? [];
  const blockers = readiness?.blockers ?? [];
  const warnings = readiness?.warnings ?? [];

  return (
    <GhanaComplianceShell
      title="Ghana Compliance"
      subtitle="A single view of AptBooks' Ghana tax and statutory readiness."
      actions={
        <Button variant="outline" onClick={() => readinessQuery.refetch()} disabled={readinessQuery.isFetching}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      {readinessQuery.isLoading ? (
        <ContentCard><div className="py-10 text-center text-sm text-slate-500">Checking Ghana compliance readiness…</div></ContentCard>
      ) : readinessQuery.isError ? (
        <ContentCard><div className="py-10 text-center text-sm text-red-600">Unable to load Ghana compliance readiness.</div></ContentCard>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            <ContentCard className="lg:col-span-2">
              <div className="flex items-center justify-between gap-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">GRA readiness</div>
                  <div className="mt-2 flex items-end gap-3">
                    <span className="text-5xl font-bold tracking-tight text-slate-950">{readiness.score}%</span>
                    <Badge tone={statusTone(readiness.status)} size="md">{statusLabel(readiness.status)}</Badge>
                  </div>
                  <p className="mt-3 max-w-xl text-sm text-slate-500">
                    Operational readiness across Ghana tax, payroll, fiscalization, CIT and sector configuration. This is an AptBooks readiness indicator, not GRA certification.
                  </p>
                </div>
                <div className="hidden h-20 w-20 items-center justify-center rounded-full bg-brand-primary/10 ring-1 ring-brand-primary/20 md:flex">
                  <ShieldCheck className="h-9 w-9 text-brand-primary" />
                </div>
              </div>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, readiness.score))}%` }} />
              </div>
            </ContentCard>

            <ContentCard>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-red-50 p-2"><XCircle className="h-5 w-5 text-red-600" /></div>
                <div><div className="text-2xl font-bold text-slate-950">{blockers.length}</div><div className="text-sm text-slate-500">Blockers</div></div>
              </div>
            </ContentCard>

            <ContentCard>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-50 p-2"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
                <div><div className="text-2xl font-bold text-slate-950">{warnings.length}</div><div className="text-sm text-slate-500">Warnings</div></div>
              </div>
            </ContentCard>
          </div>

          {(blockers.length > 0 || warnings.length > 0) && (
            <ContentCard title="Attention required">
              <div className="grid gap-3 md:grid-cols-2">
                {[...blockers.map((x) => ({ ...x, severity: 'blocker' })), ...warnings.map((x) => ({ ...x, severity: 'warning' }))].map((item) => {
                  const route = actionRoutes[item.code];
                  return (
                    <div key={`${item.severity}-${item.code}`} className="rounded-2xl border border-border-subtle bg-slate-50/60 p-4">
                      <div className="flex items-start gap-3">
                        {item.severity === 'blocker' ? <XCircle className="mt-0.5 h-5 w-5 text-red-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900">{checks.find((check) => check.code === item.code)?.label ?? item.code}</div>
                          {item.detail ? <div className="mt-1 text-sm text-slate-500">{item.detail}</div> : null}
                          {route ? <Link to={route} className="mt-2 inline-flex text-sm font-semibold text-brand-primary hover:underline">Resolve this</Link> : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ContentCard>
          )}

          <ContentCard title="Compliance checks">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {checks.map((check) => (
                <div key={check.code} className="rounded-2xl border border-border-subtle bg-white p-4">
                  <div className="flex items-start gap-3">
                    {check.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : check.severity === 'blocker' ? <XCircle className="mt-0.5 h-5 w-5 text-red-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />}
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{check.label}</div>
                      {check.detail ? <div className="mt-1 text-xs leading-5 text-slate-500">{check.detail}</div> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ContentCard>
        </>
      )}
    </GhanaComplianceShell>
  );
}
