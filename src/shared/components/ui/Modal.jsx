import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button.jsx';

export function Modal({ open, title, onClose, children, footer }) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement;
      
      // Scroll to the modal position
      if (modalRef.current) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          modalRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        }, 100);
      }
      
      // Focus the modal container for keyboard navigation
      modalRef.current?.focus();
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Restore focus to previous element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }

    // Cleanup
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50  min-h-screen overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 rounded-2xl h-screen bg-slate-900/40 backdrop-blur-sm" 
        onClick={onClose} 
        aria-hidden="true"
      />
      
      {/* Modal container - positioned at top with margin for scrolling */}
      <div className="flex min-h-screen rounded-2xl items-start justify-center p-4 pt-16">
        {/* Modal content */}
        <div
          ref={modalRef}
          tabIndex={-1}
          className="relative w-full max-w-2xl rounded-2xl border border-border-subtle  bg-white shadow-lift outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="flex items-start justify-between rounded-2xl gap-3 border-border-subtle bg-white/70 p-4 backdrop-blur">
            <div>
              <div id="modal-title" className="text-sm font-semibold text-brand-deep">
                {title}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-4 max-h-[calc(100vh-12rem)] rounded-2xl overflow-y-auto">
            {children}
          </div>
          
          {footer && (
            <div className=" border-border-subtle rounded-2xl bg-white/60 p-4 backdrop-blur">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}