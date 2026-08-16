import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

import { ROUTES } from '../../../../app/constants/routes.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';

const tabs = [
  { to: ROUTES.accountingTaxGhana, label: 'Overview', end: true },
  { to: ROUTES.accountingTaxGhanaLedger, label: 'Tax Ledger' },
  { to: ROUTES.accountingTaxGhanaCatalogProfiles, label: 'Catalog Profiles' },
  { to: ROUTES.accountingTaxGhanaVat, label: 'VAT' },
  { to: ROUTES.accountingTaxGhanaWithholding, label: 'Withholding' },
  { to: ROUTES.accountingTaxGhanaEvat, label: 'E-VAT' },
  { to: ROUTES.accountingTaxGhanaCit, label: 'Corporate Income Tax' },
  { to: ROUTES.accountingTaxGhanaCapitalAllowances, label: 'Capital Allowances' },
  { to: ROUTES.accountingTaxGhanaIndustryProfile, label: 'Industry Profile' },
  { to: ROUTES.accountingTaxGhanaPartnerProfiles, label: 'Partner Profiles' },
];

export function GhanaComplianceShell({ title, subtitle, actions, children }) {
  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title={title}
        subtitle={subtitle}
        icon={ShieldCheck}
        actions={actions}
      />

      <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-white/80 p-1 shadow-sm">
        <nav className="flex min-w-max gap-1" aria-label="Ghana compliance sections">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => clsx(
                'rounded-xl px-4 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-brand-primary/10 text-brand-deep ring-1 ring-brand-primary/20'
                  : 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900',
              )}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {children}
    </div>
  );
}
