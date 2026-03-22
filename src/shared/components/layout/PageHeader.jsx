import React from 'react';

export function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {Icon ? (
            <div className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-deep sm:flex">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-brand-deep">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-text-muted">{subtitle}</p> : null}
          </div>
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
