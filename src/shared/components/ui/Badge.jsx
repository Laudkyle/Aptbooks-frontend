import React from 'react';
import clsx from 'clsx';

const tones = {
  default: 'bg-slate-100 text-slate-800',
  muted: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-800',
  danger: 'bg-red-100 text-red-800',
  error: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-800',
  info: 'bg-blue-100 text-blue-800',
  primary: 'bg-brand-primary/10 text-brand-deep',
  brand: 'bg-brand-primary/10 text-brand-deep'
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1 text-sm'
};

export function Badge({ variant = 'default', tone, size = 'sm', className, children }) {
  const normalized = tone ?? variant;
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        tones[normalized] ?? tones.default,
        sizes[size] ?? sizes.sm,
        className
      )}
    >
      {children}
    </span>
  );
}
