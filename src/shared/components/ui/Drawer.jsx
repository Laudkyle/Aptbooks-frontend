import React from 'react'; 
import { X } from 'lucide-react'; 
import { Button } from './Button.jsx'; 

export function Drawer({ open, title, onClose, children, footer, side = 'right' }) {
  if (!open) return null; 
  const sideClasses = side === 'left' ? 'left-0' : 'right-0'; 
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className={`absolute top-0 ${sideClasses} h-full w-full max-w-xl border-l border-slate-200 bg-white shadow-xl`}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="h-[calc(100%-8rem)] overflow-auto p-4">{children}</div>
        {footer ? <div className="border-t border-slate-200 p-4">{footer}</div> : null}
      </div>
    </div>
  ); 
}
