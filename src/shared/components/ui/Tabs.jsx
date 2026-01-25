import React, { useMemo, useState } from 'react'; 
import clsx from 'clsx'; 

/**
 * Lightweight tabs component used across the app.
 *
 * Supports two calling styles:
 * 1) Controlled button-strip (legacy)
 *    <Tabs tabs={[{ value, label }]} value={value} onChange={setValue} />
 *
 * 2) Self-rendering tabs with content (app pages)
 *    <Tabs tabs={[{ key|value, label, content }]} />
 *
 * In both cases, each tab may use either `value` or `key`.
 */
export function Tabs({ tabs = [], value, onChange, defaultValue, className }) {
  const normalized = useMemo(
    () =>
      (tabs ?? []).map((t) => ({
        ...t,
        value: t?.value ?? t?.key
      })),
    [tabs]
  ); 

  const first = normalized?.[0]?.value; 
  const [internal, setInternal] = useState(defaultValue ?? first); 

  const active = value ?? internal; 

  const setActive = (next) => {
    onChange?.(next); 
    if (value === undefined) setInternal(next); 
  }; 

  const activeTab = normalized.find((t) => t.value === active) ?? normalized[0]; 
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
              'rounded-md px-3 py-2 text-sm transition',
              active === t.value ? 'bg-slate-100 text-brand-deep font-medium' : 'text-slate-700 hover:bg-slate-50'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {hasContent ? <div>{activeTab?.content ?? null}</div> : null}
    </div>
  ); 
}
