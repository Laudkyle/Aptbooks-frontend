import React from 'react';
import clsx from 'clsx';
import { clearValidationErrorForField, getValidationErrorForField, subscribeValidationErrors } from '../../forms/validationStore.js';

function inferFieldKey({ fieldKey, name, id, label, placeholder }) {
  return fieldKey || name || id || label || placeholder || '';
}

export const Textarea = React.forwardRef(function Textarea(
  { className, label, error, rows = 4, onChange, name, id, fieldKey, placeholder, ...props },
  ref
) {
  const resolvedFieldKey = inferFieldKey({ fieldKey, name, id, label, placeholder });
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => subscribeValidationErrors(() => forceUpdate()), []);

  const serverError = error || getValidationErrorForField(resolvedFieldKey);

  return (
    <label className="block">
      {label ? <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span> : null}
      <textarea
        ref={ref}
        rows={rows}
        id={id}
        name={name || undefined}
        data-field-key={resolvedFieldKey || undefined}
        data-validation-managed="react"
        aria-invalid={serverError ? 'true' : undefined}
        className={clsx(
          'w-full rounded-xl border border-border-subtle bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-brand-light focus:ring-2 focus:ring-brand-light/20',
          serverError ? 'border-red-300 focus:border-red-400 focus:ring-red-200/40' : null,
          className
        )}
        placeholder={placeholder}
        onChange={(event) => {
          if (resolvedFieldKey) clearValidationErrorForField(resolvedFieldKey);
          onChange?.(event);
        }}
        {...props}
      />
      {serverError ? <span className="mt-1 block text-xs text-red-600">{serverError}</span> : null}
    </label>
  );
});
