import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../app/constants/routes.js';

export default function NotFound() {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-6">
      <div className="text-xl font-semibold text-text-strong">Page not found</div>
      <div className="mt-1 text-sm text-text-muted">The page you requested does not exist.</div>
      <Link className="mt-4 inline-block text-brand-primary hover:underline" to={ROUTES.dashboard}>
        Go to dashboard
      </Link>
    </div>
  );
}
