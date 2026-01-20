import React from 'react';
import clsx from 'clsx';

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-light disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-brand-primary text-white hover:bg-brand-light',
    secondary: 'bg-white text-brand-deep border border-slate-200 hover:bg-slate-50',
    ghost: 'bg-transparent text-brand-deep hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-500'
  };
  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-5 text-base'
  };
  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
