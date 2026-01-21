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
  // Visual-only component: keep behaviour stable, improve density and polish.
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all ' +
    'focus:outline-none focus:ring-2 focus:ring-brand-light/60 focus:ring-offset-2 focus:ring-offset-bg-main ' +
    'disabled:pointer-events-none disabled:opacity-50 select-none';
  const variants = {
    primary:
      'bg-brand-primary text-white shadow-sm ring-1 ring-brand-primary/25 ' +
      'hover:bg-brand-light hover:shadow-soft active:translate-y-[0.5px] active:shadow-sm',
    secondary:
      'bg-white/80 text-brand-deep border border-border-subtle shadow-sm ' +
      'hover:bg-white hover:shadow-soft active:translate-y-[0.5px] active:shadow-sm',
    outline:
      'bg-transparent text-brand-deep border border-border-subtle ' +
      'hover:bg-white/70 hover:border-slate-300/70 active:bg-white/80',
    ghost: 'bg-transparent text-brand-deep hover:bg-slate-900/5 active:bg-slate-900/10',
    subtle:
      'bg-slate-900/5 text-brand-deep ring-1 ring-transparent ' +
      'hover:bg-slate-900/10 hover:ring-slate-900/5',
    danger:
      'bg-status-danger text-white shadow-sm ring-1 ring-red-500/30 ' +
      'hover:brightness-110 active:translate-y-[0.5px] active:shadow-sm'
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
