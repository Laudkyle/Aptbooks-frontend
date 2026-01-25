import React from 'react'; 
import { Link, useNavigate } from 'react-router-dom'; 
import { LogOut, Search, Menu } from 'lucide-react'; 
import { ROUTES } from '../../../app/constants/routes.js'; 
import { uiStore } from '../../../app/store/ui.store.js'; 
import { useAuth } from '../../hooks/useAuth.js'; 
import { Button } from '../ui/Button.jsx'; 
import { OrgSwitcher } from '../../../features/foundation/organizations/components/OrgSwitcher.jsx'; 

export function TopNav() {
  const { user, logout } = useAuth(); 
  const toggleSidebar = uiStore((s) => s.toggleSidebar); 
  const navigate = useNavigate(); 

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface-1 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="subtle" size="sm" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <Menu className="h-4 w-4" />
          </Button>
          <Link to={ROUTES.dashboard} className="text-sm font-semibold text-brand-deep">
            AptBooks
          </Link>
        </div>

        <div className="hidden flex-1 px-4 md:block">
          <button
            type="button"
            onClick={() => navigate(ROUTES.search)}
            className="flex w-full max-w-xl items-center gap-2 rounded-xl border border-border-subtle bg-white/70 px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:bg-white"
          >
            <Search className="h-4 w-4 text-slate-500" />
            <span className="truncate">Search partners, accounts, journals, documents…</span>
            <span className="ml-auto hidden rounded-md bg-slate-900/5 px-2 py-0.5 text-[11px] text-slate-500 lg:inline">
              Ctrl K
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <OrgSwitcher />
          <Button variant="subtle" size="sm" onClick={() => navigate(ROUTES.search)} title="Search" className="md:hidden">
            <Search className="h-4 w-4" />
          </Button>
          <Link to={ROUTES.me} className="group flex items-center gap-2 rounded-xl border border-border-subtle bg-white/60 px-3 py-1.5 text-sm text-slate-700 shadow-sm transition hover:bg-white">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary/15 text-xs font-semibold text-brand-deep">
              {(user?.email ?? 'A').slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden max-w-[220px] truncate sm:inline">{user?.email ?? 'Account'}</span>
          </Link>
          <Button variant="subtle" size="sm" onClick={logout} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  ); 
}
