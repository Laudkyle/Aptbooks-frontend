import React, { useMemo, useState, useEffect, useRef } from 'react';
import clsx from 'clsx';

export function Tabs({
  tabs,
  items,
  value,
  onChange,
  onValueChange,
  defaultValue,
  className,
  listClassName,
  contentClassName,
}) {
  const sourceItems = tabs ?? items ?? [];

  const normalized = useMemo(
    () =>
      (sourceItems ?? []).map((t) => ({
        ...t,
        value: t?.value ?? t?.key,
      })),
    [sourceItems]
  );

  const first = normalized[0]?.value;
  const [internal, setInternal] = useState(defaultValue ?? first);

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
  }, [defaultValue, value]);

  const active = value !== undefined ? value : internal;

  const setActive = (tabValue) => {
    onChange?.(tabValue);
    onValueChange?.(tabValue);
    if (value === undefined) setInternal(tabValue);
  };

  const activeTab = normalized.find((t) => t.value === active) ?? normalized[0];
  const hasContent = normalized.some((t) => typeof t?.content !== 'undefined');

  return (
    <div className={clsx('space-y-4', className)}>
      <div className="border-b border-gray-200">
        <div className={clsx('flex flex-wrap gap-6', listClassName)}>
          {normalized.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setActive(t.value)}
              className={clsx(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors inline-flex items-center gap-2',
                active === t.value
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              )}
            >
              {t.icon ? <t.icon className="h-4 w-4" /> : null}
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {hasContent ? <div className={contentClassName}>{activeTab?.content ?? null}</div> : null}
    </div>
  );
}
