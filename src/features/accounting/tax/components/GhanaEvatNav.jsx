import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { ROUTES } from '../../../../app/constants/routes.js';

const tabs = [
  { to: ROUTES.accountingTaxGhanaEvat, label: 'Readiness', end: true },
  { to: ROUTES.accountingTaxGhanaEvatDocuments, label: 'Fiscal Documents' },
  { to: ROUTES.accountingTaxGhanaEvatQueue, label: 'Transmission Queue' },
  { to: ROUTES.accountingTaxGhanaEvatDevices, label: 'Locations & Devices' },
  { to: ROUTES.accountingTaxGhanaEvatLogs, label: 'System Logs' },
  { to: ROUTES.accountingTaxGhanaEvatSettings, label: 'Settings' },
];

export function GhanaEvatNav() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-white/80 p-1 shadow-sm">
      <nav className="flex min-w-max gap-1" aria-label="GRA E-VAT sections">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => clsx(
            'rounded-xl px-4 py-2 text-sm font-medium transition',
            isActive ? 'bg-brand-primary/10 text-brand-deep ring-1 ring-brand-primary/20' : 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900',
          )}>{tab.label}</NavLink>
        ))}
      </nav>
    </div>
  );
}
