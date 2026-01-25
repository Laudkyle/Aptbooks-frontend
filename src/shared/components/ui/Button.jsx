import React from 'react'; 
import clsx from 'clsx'; 
import { Loader2 } from 'lucide-react'; 

const variants = {
  primary:
    'bg-brand-primary text-white hover:bg-brand-light shadow-sm shadow-brand-primary/20 ring-1 ring-brand-primary/20',
  outline:
    'border border-border-subtle bg-white/70 text-slate-900 hover:bg-slate-900/5 shadow-sm',
  ghost: 'bg-transparent text-slate-900 hover:bg-slate-900/5',
  subtle: 'bg-slate-900/5 text-slate-900 hover:bg-slate-900/10',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-500/20 ring-1 ring-red-500/20'
}; 

const sizes = {
  sm: 'h-9 px-3 text-sm rounded-xl',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-11 px-5 text-sm rounded-2xl'
}; 

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className,
  children,
  ...props
}) {
  const isDisabled = disabled || loading; 
  return (
    <button
      disabled={isDisabled}
      className={clsx(
        'flex flex-row items-center justify-center gap-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/30 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : LeftIcon ? <LeftIcon className="h-4 w-4" /> : null}
      <span className="truncate">{children}</span>
      {!loading && RightIcon ? <RightIcon className="h-4 w-4" /> : null}
    </button>
  ); 
}
