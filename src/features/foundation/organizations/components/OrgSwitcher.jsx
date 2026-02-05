import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useOrg } from '../../../../shared/hooks/useOrg.js';
import { Button } from '../../../../shared/components/ui/Button.jsx';

export function OrgSwitcher() {
  const { organizations, currentOrg, switchOrganization } = useOrg();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef(null);
  
  const items = useMemo(() => organizations ?? [], [organizations]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open]);

  const handleSwitch = async (org) => {
    if (org.id === currentOrg?.id) {
      setOpen(false);
      return;
    }

    setSwitching(true);
    try {
      await switchOrganization(org.id);
      setOpen(false);
    } catch (error) {
      console.error('Failed to switch organization:', error);
    } finally {
      setSwitching(false);
    }
  };

  if (!items.length) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={switching}
        className={`
          group relative flex items-center gap-2 px-3 py-2 rounded-lg 
          border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300
          transition-all duration-200 shadow-sm hover:shadow
          ${open ? 'ring-2 ring-brand-light border-brand-light' : ''}
          ${switching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {/* Organization Icon */}
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gradient-to-br from-brand-500 to-brand-600 text-white font-semibold text-sm flex-shrink-0">
          {currentOrg?.name?.charAt(0).toUpperCase() || 'O'}
        </div>

        {/* Organization Name */}
        <div className="flex flex-col items-start min-w-0">
          <span className="text-xs font-medium text-slate-500">Organization</span>
          <span className="text-sm font-semibold text-slate-900 truncate max-w-[12rem]">
            {currentOrg?.name || 'Select Organization'}
          </span>
        </div>

        {/* Chevron Icon */}
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Switch Organization</h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {items.length} organization{items.length !== 1 ? 's' : ''} available
            </p>
          </div>

          {/* Organization List */}
          <div className="max-h-96 overflow-y-auto py-1">
            {items.map((org) => {
              const isCurrent = org.id === currentOrg?.id;
              
              return (
                <button
                  key={org.id}
                  onClick={() => handleSwitch(org)}
                  disabled={switching}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left
                    transition-colors duration-150
                    ${isCurrent 
                      ? 'bg-brand-50 hover:bg-brand-100' 
                      : 'hover:bg-slate-50'
                    }
                    ${switching ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                  `}
                >
                  {/* Organization Avatar */}
                  <div
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-lg font-semibold text-sm flex-shrink-0
                      ${isCurrent
                        ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white'
                        : 'bg-gradient-to-br from-slate-400 to-slate-500 text-white'
                      }
                    `}
                  >
                    {org.name?.charAt(0).toUpperCase() || 'O'}
                  </div>

                  {/* Organization Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`
                          text-sm font-medium truncate
                          ${isCurrent ? 'text-brand-900' : 'text-slate-900'}
                        `}
                      >
                        {org.name}
                      </span>
                      {isCurrent && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800 flex-shrink-0">
                          Current
                        </span>
                      )}
                    </div>
                    {org.description && (
                      <p className="text-xs text-slate-600 truncate mt-0.5">
                        {org.description}
                      </p>
                    )}
                  </div>

                  {/* Check Icon for Current Org */}
                  {isCurrent && (
                    <svg
                      className="w-5 h-5 text-brand-600 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer (optional - add if there's a manage orgs link) */}
          {/* 
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
            
              href="/settings/organizations"
              className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Manage Organizations
            </a>
          </div>
          */}
        </div>
      )}

      {/* Loading Overlay */}
      {switching && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-900">Switching organization...</p>
          </div>
        </div>
      )}
    </div>
  );
}