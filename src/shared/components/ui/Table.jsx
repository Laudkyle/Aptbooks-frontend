import React from 'react';
import clsx from 'clsx';

export function Table({ className, children, columns, rows, keyField = 'id', onRowClick }) {
  // Two modes:
  // 1) Declarative: provide <THead> / <TBody> children
  // 2) Convenience: provide columns + rows
  const hasConvenience = Array.isArray(columns) && Array.isArray(rows);
  return (
    <div className={clsx('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        {hasConvenience ? (
          <>
            <THead>
              <tr>
                {columns.map((col) => (
                  <TH key={col.key ?? col.header}>{col.header}</TH>
                ))}
              </tr>
            </THead>
            <TBody>
              {rows.map((r) => {
                const key = r?.[keyField] ?? JSON.stringify(r);
                const clickable = typeof onRowClick === 'function';
                return (
                  <tr
                    key={key}
                    onClick={clickable ? () => onRowClick(r) : undefined}
                    className={clsx(
                      'transition-colors',
                      clickable && 'cursor-pointer hover:bg-slate-900/5'
                    )}
                  >
                    {columns.map((col) => (
                      <TD key={col.key ?? col.header} className={col.className}>
                        {typeof col.render === 'function' ? col.render(r) : r?.[col.att ?? col.accessor]}
                      </TD>
                    ))}
                  </tr>
                );
              })}
            </TBody>
          </>
        ) : (
          children
        )}
      </table>
    </div>
  );
}

export function THead({ children }) {
  return (
    <thead className="sticky top-0 z-10 bg-white/80 text-slate-700 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      {children}
    </thead>
  );
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function TH({ className, children, ...props }) {
  return (
    <th
      className={clsx(
        'px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TD({ className, children, ...props }) {
  return (
    <td className={clsx('px-4 py-3 align-top text-slate-800', className)} {...props}>
      {children}
    </td>
  );
}
