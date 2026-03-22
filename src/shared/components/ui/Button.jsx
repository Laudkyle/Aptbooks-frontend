import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-brand-primary text-white hover:bg-brand-light shadow-sm shadow-brand-primary/20 ring-1 ring-brand-primary/20',
  outline:
    'border border-border-subtle bg-surface-2 text-text-body hover:bg-gray-200 shadow-sm',
  ghost: 'bg-transparent text-text-strong hover:bg-slate-900/5',
  subtle: 'bg-slate-900/5 text-text-strong hover:bg-slate-900/10',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-500/20 ring-1 ring-red-500/20'
};

const sizes = {
  sm: 'px-3 py-2 text-xs rounded-md',
  md: 'px-4 py-2.5 text-sm rounded-lg',
  lg: 'px-5 py-3 text-base rounded-xl'
};

const variantAliases = {
  secondary: 'outline',
  brand: 'primary'
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  iconOnly = false,
  responsiveText = true,
  className,
  children,
  ...props
}) {
  const normalizedVariant = variantAliases[variant] ?? variant;
  const isDisabled = disabled || loading;
  
  // For icon-only buttons, hide text and adjust padding
  const iconOnlyClasses = iconOnly ? 'px-2 py-2' : '';
  const sizeClasses = iconOnly ? 'h-9 w-9' : sizes[size];
  
  return (
    <button
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/30 disabled:cursor-not-allowed disabled:opacity-60',
        variants[normalizedVariant] ?? variants.primary,
        sizeClasses,
        iconOnlyClasses,
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className={clsx("animate-spin", iconOnly ? "h-4 w-4" : "h-4 w-4 md:h-5 md:w-5")} />
      ) : LeftIcon ? (
        <LeftIcon className={clsx(
          iconOnly ? "h-4 w-4" : "h-4 w-4 md:h-5 md:w-5",
          !iconOnly && children && "mr-1 md:mr-2"
        )} />
      ) : null}
      
      {!iconOnly && children && (
        <span className={clsx(
          "truncate",
          responsiveText && "hidden md:inline"
        )}>
          {children}
        </span>
      )}
      
      {!loading && RightIcon && !iconOnly && (
        <RightIcon className={clsx(
          "h-4 w-4 md:h-5 md:w-5",
          children && "ml-1 md:ml-2"
        )} />
      )}
    </button>
  );
}