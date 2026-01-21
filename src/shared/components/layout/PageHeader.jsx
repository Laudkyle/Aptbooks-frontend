import React from 'react';

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-deep">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
