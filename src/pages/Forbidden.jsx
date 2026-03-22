import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../app/constants/routes.js';

export default function Forbidden() {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-6">
      <div className="text-xl font-semibold text-text-strong">Access denied</div>
      <div className="mt-1 text-sm text-text-muted">You do not have permission to access this resource.</div>
      <div className="mt-4"><Link className="text-brand-primary hover:underline" to={ROUTES.dashboard}>Back to dashboard</Link></div>
    </div>
  );
}
