import React from 'react';
import clsx from 'clsx';

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-light/60 focus:ring-offset-2 focus:ring-offset-bg-main disabled:pointer-events-none disabled:opacity-50';
  const variants = {
    primary: 'bg-brand-primary text-white shadow-sm hover:shadow-soft hover:bg-brand-light active:scale-[0.99]',
    secondary: 'bg-white text-brand-deep border border-border-subtle shadow-sm hover:bg-slate-50 active:scale-[0.99]',
    outline: 'bg-transparent text-brand-deep border border-border-subtle hover:bg-white/70',
    ghost: 'bg-transparent text-brand-deep hover:bg-slate-100',
    subtle: 'bg-slate-900/5 text-brand-deep hover:bg-slate-900/10',
    danger: 'bg-status-danger text-white shadow-sm hover:brightness-110 active:scale-[0.99]'
  };
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-5 text-base'
  };
  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
      aria-busy={loading || undefined}
      disabled={loading || props.disabled}
    >
      {loading ? (
        <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : null}
      {children}
    </button>
  );
}
