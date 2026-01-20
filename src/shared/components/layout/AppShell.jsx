import React from 'react';
import { Outlet } from 'react-router-dom';
import { SideNav } from './SideNav.jsx';
import { TopNav } from './TopNav.jsx';
import { uiStore } from '../../../app/store/ui.store.js';

export function AppShell() {
  const sidebarOpen = uiStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-full">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        <main className="min-w-0 flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
