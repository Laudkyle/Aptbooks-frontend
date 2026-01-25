import React from 'react'; 
import { Outlet } from 'react-router-dom'; 
import { SideNav } from './SideNav.jsx'; 
import { TopNav } from './TopNav.jsx'; 
import { uiStore } from '../../../app/store/ui.store.js'; 

export function AppShell() {
  return (
    <div className="relative flex h-full bg-bg-main">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-brand-light/15 blur-3xl" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-primary/15 blur-3xl" />
        <div className="absolute -bottom-48 left-1/3 h-96 w-96 rounded-full bg-brand-primary/10 blur-3xl" />
      </div>

      <SideNav />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopNav />
        <main className="min-w-0 flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  ); 
}
