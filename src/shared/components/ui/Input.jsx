import React from 'react'; 
import clsx from 'clsx'; 

export const Input = React.forwardRef(function Input(
  { className, label, error, ...props },
  ref
) {
  return (
    <label className="block">
      {label ? <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span> : null}
      <input
        ref={ref}
        className={clsx(
          'w-full rounded-xl border border-border-subtle bg-white/80 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-light focus:ring-2 focus:ring-brand-light/40 focus:ring-offset-2 focus:ring-offset-bg-main',
          error && 'border-red-300 focus:border-red-400 focus:ring-red-200',
          className
        )}
        {...props}
      />
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  ); 
}); 
