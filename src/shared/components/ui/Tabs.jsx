import React from 'react';
import clsx from 'clsx';

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(tabs ?? []).map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange?.(t.value)}
          className={clsx(
            'rounded-md px-3 py-2 text-sm transition',
            value === t.value ? 'bg-slate-100 text-brand-deep font-medium' : 'text-slate-700 hover:bg-slate-50'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
