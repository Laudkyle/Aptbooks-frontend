import React, { useMemo, useState, useEffect, useRef } from 'react';
import clsx from 'clsx';

export function Tabs({ tabs = [], value, onChange, defaultValue, className }) {
  const normalized = useMemo(
    () =>
      (tabs ?? []).map((t) => ({
        ...t,
        value: t?.value ?? t?.key,
      })),
    [tabs]
  );

  const first = normalized[0]?.value;

  const [internal, setInternal] = useState(defaultValue ?? first);

  // Only sync if defaultValue explicitly changes (skip on mount)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (value !== undefined) return;
    if (defaultValue !== undefined) {
      setInternal(defaultValue);
    }
  }, [defaultValue]);

  const active = value !== undefined ? value : internal;

  const setActive = (tabValue) => {
    if (onChange) onChange(tabValue);
    if (value === undefined) setInternal(tabValue);
  };

  const activeTab =
    normalized.find((t) => t.value === active) ?? normalized[0];

  const hasContent = normalized.some((t) => typeof t?.content !== 'undefined');

  return (
    <div className={clsx('space-y-3', className)}>
      <div className="flex flex-wrap gap-2">
        {normalized.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setActive(t.value)}
            className={clsx(
              'rounded-md px-3 py-2 text-sm transition flex items-center gap-2',
              active === t.value
                ? 'bg-slate-100 text-brand-deep font-medium'
                : 'text-slate-700 hover:bg-slate-50'
            )}
          >
            {t.icon && <t.icon className="h-4 w-4" />}
            {t.label}
          </button>
        ))}
      </div>
      {hasContent ? <div>{activeTab?.content ?? null}</div> : null}
    </div>
  );
}