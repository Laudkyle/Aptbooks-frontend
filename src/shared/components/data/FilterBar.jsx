import React from 'react';
import clsx from 'clsx';

export function FilterBar({ className, children, right }) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}
