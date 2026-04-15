import React from 'react';
import clsx from 'clsx';
import { clearValidationErrorForField, getValidationErrorForField, subscribeValidationErrors } from '../../forms/validationStore.js';

function inferFieldKey({ fieldKey, name, id, label }) {
  return fieldKey || name || id || label || '';
}

export function Select({ className, label, error, options, onChange, name, id, fieldKey, ...props }) {
  const resolvedFieldKey = inferFieldKey({ fieldKey, name, id, label });
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => subscribeValidationErrors(() => forceUpdate()), []);

  const serverError = error || getValidationErrorForField(resolvedFieldKey);

  return (
    <label className="block">
      {label ? <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span> : null}
      <select
        id={id}
        name={name || undefined}
        data-field-key={resolvedFieldKey || undefined}
        data-validation-managed="react"
        aria-invalid={serverError ? 'true' : undefined}
        className={clsx(
          'w-full rounded-xl border border-border-subtle bg-white/80 px-3 py-2 text-sm shadow-sm focus:border-brand-light focus:ring-2 focus:ring-brand-light/40 focus:ring-offset-2 focus:ring-offset-bg-main',
          serverError && 'border-red-300 focus:border-red-400 focus:ring-red-200',
          className
        )}
        onChange={(event) => {
          if (resolvedFieldKey) clearValidationErrorForField(resolvedFieldKey);
          onChange?.(event);
        }}
        {...props}
      >
        {(options ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {serverError ? <span className="mt-1 block text-xs text-red-600">{serverError}</span> : null}
    </label>
  );
}
