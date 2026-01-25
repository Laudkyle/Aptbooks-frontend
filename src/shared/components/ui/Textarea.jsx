import React from 'react'; 
import clsx from 'clsx'; 

export const Textarea = React.forwardRef(function Textarea(
  { className, label, error, rows = 4, ...props },
  ref
) {
  return (
    <label className="block">
      {label ? <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span> : null}
      <textarea
        ref={ref}
        rows={rows}
        className={clsx(
          'w-full rounded-xl border border-border-subtle bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ' +
            'placeholder:text-slate-400 focus:border-brand-light focus:ring-2 focus:ring-brand-light/20',
          error ? 'border-red-300 focus:border-red-400 focus:ring-red-200/40' : null,
          className
        )}
        {...props}
      />
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  ); 
}); 
