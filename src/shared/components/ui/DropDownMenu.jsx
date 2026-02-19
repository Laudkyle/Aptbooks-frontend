// src/shared/components/ui/DropdownMenu.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Context for managing dropdown state
const DropdownContext = createContext();

export function DropdownMenu({ children }) {
  const [open, setOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState(null);
  const triggerRef = useRef(null);

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef, triggerRect, setTriggerRect }}>
      {children}
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, asChild, className = '', ...props }) {
  const { open, setOpen, triggerRef, setTriggerRect } = useContext(DropdownContext);

  const handleClick = (e) => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setTriggerRect(rect);
    }
    setOpen(!open);
  };

  // If asChild is true, clone the child element with our handlers
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: triggerRef,
      onClick: handleClick,
      'aria-expanded': open,
      'aria-haspopup': true,
      ...props,
    });
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center ${className}`}
      aria-expanded={open}
      aria-haspopup="true"
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({ 
  children, 
  align = 'end', 
  className = '',
  sideOffset = 4,
  ...props 
}) {
  const { open, setOpen, triggerRect } = useContext(DropdownContext);
  const [mounted, setMounted] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle click outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (contentRef.current && !contentRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, setOpen]);

  if (!open || !triggerRect || !mounted) return null;

  // Calculate position based on align
  const getPositionStyles = () => {
    const styles = {
      position: 'absolute',
      zIndex: 50,
    };

    // Calculate left position based on align
    if (align === 'start') {
      styles.left = triggerRect.left;
    } else if (align === 'center') {
      styles.left = triggerRect.left + (triggerRect.width / 2);
    } else { // end
      styles.left = triggerRect.right;
    }

    // Position below the trigger with offset
    styles.top = triggerRect.bottom + sideOffset;

    return styles;
  };

  return createPortal(
    <div
      ref={contentRef}
      className={`min-w-[8rem] overflow-hidden rounded-md border border-slate-200 bg-white p-1 shadow-md animate-in fade-in-0 zoom-in-95 ${className}`}
      style={getPositionStyles()}
      role="menu"
      aria-orientation="vertical"
      tabIndex="-1"
      {...props}
    >
      {children}
    </div>,
    document.body
  );
}

export function DropdownMenuItem({ 
  children, 
  onClick, 
  className = '',
  disabled = false,
  asChild,
  ...props 
}) {
  const { setOpen } = useContext(DropdownContext);

  const handleClick = (e) => {
    if (disabled) return;
    
    if (onClick) {
      onClick(e);
    }
    
    // Close dropdown after clicking (unless prevented)
    if (!e.defaultPrevented) {
      setOpen(false);
    }
  };

  // If asChild is true and it's a valid element (like Link from react-router-dom)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
      className: `relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className}`,
      role: 'menuitem',
      tabIndex: -1,
      'data-disabled': disabled ? '' : undefined,
      ...props,
    });
  }

  return (
    <button
      type="button"
      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 disabled:pointer-events-none disabled:opacity-50 ${className}`}
      onClick={handleClick}
      disabled={disabled}
      role="menuitem"
      tabIndex={-1}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ children, className = '', ...props }) {
  return (
    <div
      className={`px-2 py-1.5 text-sm font-semibold text-slate-900 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({ className = '', ...props }) {
  return (
    <div
      className={`-mx-1 my-1 h-px bg-slate-200 ${className}`}
      {...props}
    />
  );
}

export function DropdownMenuGroup({ children, ...props }) {
  return (
    <div role="group" {...props}>
      {children}
    </div>
  );
}

// Optional: Add a sub-component for radio items
export function DropdownMenuRadioGroup({ children, value, onValueChange, ...props }) {
  return (
    <div role="group" {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            checked: child.props.value === value,
            onSelect: () => onValueChange?.(child.props.value),
          });
        }
        return child;
      })}
    </div>
  );
}

export function DropdownMenuRadioItem({ children, value, checked, onSelect, ...props }) {
  return (
    <DropdownMenuItem onSelect={onSelect} {...props}>
      <span className="mr-2 h-4 w-4">
        {checked && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
        )}
      </span>
      {children}
    </DropdownMenuItem>
  );
}

// Optional: Add a sub-component for checkbox items
export function DropdownMenuCheckboxItem({ children, checked, onCheckedChange, ...props }) {
  const handleClick = (e) => {
    onCheckedChange?.(!checked);
  };

  return (
    <DropdownMenuItem onClick={handleClick} {...props}>
      <span className="mr-2 h-4 w-4">
        {checked && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      {children}
    </DropdownMenuItem>
  );
}

// Optional: Add a sub-component for sub-menu
export function DropdownMenuSub({ children }) {
  const [open, setOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState(null);
  const triggerRef = useRef(null);

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef, triggerRect, setTriggerRect, isSub: true }}>
      {children}
    </DropdownContext.Provider>
  );
}

export function DropdownMenuSubTrigger({ children, className = '', ...props }) {
  const { open, setOpen, triggerRef, setTriggerRect } = useContext(DropdownContext);

  const handleMouseEnter = (e) => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setTriggerRect(rect);
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    // Small delay to allow moving to sub-menu
    setTimeout(() => {
      setOpen(false);
    }, 100);
  };

  return (
    <div
      ref={triggerRef}
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-auto h-4 w-4"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
}

export function DropdownMenuSubContent({ children, className = '', ...props }) {
  const { open, triggerRect } = useContext(DropdownContext);

  if (!open || !triggerRect) return null;

  // Position to the right of the trigger
  const styles = {
    position: 'absolute',
    left: triggerRect.right + 4,
    top: triggerRect.top,
    zIndex: 60,
  };

  return createPortal(
    <div
      className={`min-w-[8rem] overflow-hidden rounded-md border border-slate-200 bg-white p-1 shadow-md ${className}`}
      style={styles}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
}