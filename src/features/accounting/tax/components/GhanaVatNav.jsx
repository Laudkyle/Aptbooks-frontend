import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

import { ROUTES } from '../../../../app/constants/routes.js';

const tabs = [
  { to: ROUTES.accountingTaxGhanaVat, label: 'VAT Overview', end: true },
  { to: ROUTES.accountingTaxGhanaVatReturn, label: 'VAT Return' },
  { to: ROUTES.accountingTaxGhanaVatApportionment, label: 'Input VAT Apportionment' },
  { to: ROUTES.accountingTaxGhanaImportedServices, label: 'Imported Services' },
  { to: ROUTES.accountingTaxGhanaVatReconciliation, label: 'Reconciliation' },
];

export function GhanaVatNav() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-slate-50/70 p-1">
      <nav className="flex min-w-max gap-1" aria-label="Ghana VAT sections">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => clsx(
              'rounded-xl px-3 py-2 text-sm font-medium transition',
              isActive
                ? 'bg-white text-brand-deep shadow-sm ring-1 ring-brand-primary/15'
                : 'text-slate-600 hover:bg-white/70 hover:text-slate-900',
            )}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
