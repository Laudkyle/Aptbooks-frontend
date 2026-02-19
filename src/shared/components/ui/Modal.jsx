import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button.jsx';


export function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl animate-slideUp overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-lift">
        <div className="flex items-start justify-between gap-3 border-b border-border-subtle bg-white/70 p-4 backdrop-blur">
          <div>
            <div className="text-sm font-semibold text-brand-deep">{title}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">{children}</div>
        {footer ? <div className="border-t border-border-subtle bg-white/60 p-4 backdrop-blur">{footer}</div> : null}
      </div>
    </div>
  );
}
