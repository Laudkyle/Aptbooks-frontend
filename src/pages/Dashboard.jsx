import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../app/constants/routes.js';
import { useAuth } from '../shared/hooks/useAuth.js';
import { ContentCard } from '../shared/components/layout/ContentCard.jsx';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold text-brand-deep">Dashboard</div>
        <div className="text-sm text-slate-600">Signed in as {user?.email}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ContentCard title="Quick links">
          <div className="grid gap-2 text-sm">
            <Link className="text-brand-primary hover:underline" to={ROUTES.search}>Global search</Link>
            <Link className="text-brand-primary hover:underline" to={ROUTES.notifications}>Notifications inbox</Link>
            <Link className="text-brand-primary hover:underline" to={ROUTES.approvalsInbox}>Approvals inbox</Link>
            <Link className="text-brand-primary hover:underline" to={ROUTES.me}>My profile</Link>
          </div>
        </ContentCard>

        <ContentCard title="Admin">
          <div className="grid gap-2 text-sm">
            <Link className="text-brand-primary hover:underline" to={ROUTES.adminOrg}>Organization settings</Link>
            <Link className="text-brand-primary hover:underline" to={ROUTES.adminUsers}>Users</Link>
            <Link className="text-brand-primary hover:underline" to={ROUTES.adminRoles}>Roles & permissions</Link>
            <Link className="text-brand-primary hover:underline" to={ROUTES.adminSettings}>System settings</Link>
          </div>
        </ContentCard>
      </div>
    </div>
  );
}
