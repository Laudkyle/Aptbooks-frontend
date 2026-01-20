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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <Menu className="h-4 w-4" />
          </Button>
          <Link to={ROUTES.dashboard} className="text-sm font-semibold text-brand-deep">
            AptBooks
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <OrgSwitcher />
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.search)} title="Search">
            <Search className="h-4 w-4" />
          </Button>
          <Link to={ROUTES.me} className="rounded-md px-3 py-1 text-sm text-slate-700 hover:bg-slate-100">
            {user?.email ?? 'Account'}
          </Link>
          <Button variant="ghost" size="sm" onClick={logout} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
