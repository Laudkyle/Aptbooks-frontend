import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

import { ROUTES } from '../../../../app/constants/routes.js';

const tabs = [
  { to: ROUTES.accountingTaxGhanaWithholding, label: 'Overview', end: true },
  { to: ROUTES.accountingTaxGhanaWithholdingEvents, label: 'Events' },
  { to: ROUTES.accountingTaxGhanaWithholdingCertificates, label: 'Certificates' },
  { to: ROUTES.accountingTaxGhanaWithholdingReturns, label: 'Returns' },
  { to: ROUTES.accountingTaxGhanaWithholdingRemittances, label: 'Remittances' },
  { to: ROUTES.accountingTaxGhanaWithholdingReconciliation, label: 'Reconciliation' },
];

export function GhanaWithholdingNav() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-white p-1 shadow-sm">
      <nav className="flex min-w-max gap-1" aria-label="Ghana withholding sections">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => clsx(
              'rounded-xl px-3.5 py-2 text-sm font-medium transition',
              isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
