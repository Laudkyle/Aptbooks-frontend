import React from 'react';
import clsx from 'clsx';

export function Table({ className, children }) {
  return (
    <div className={clsx('w-full overflow-x-auto rounded-lg border border-slate-200', className)}>
      <table className="w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

export function THead({ children }) {
  return <thead className="bg-slate-50 text-slate-700">{children}</thead>;
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function TH({ className, children, ...props }) {
  return (
    <th
      className={clsx('px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide', className)}
      {...props}
    >
      {children}
    </th>
  );
}

export function TD({ className, children, ...props }) {
  return (
    <td className={clsx('px-3 py-2 align-top text-slate-800', className)} {...props}>
      {children}
    </td>
  );
}
