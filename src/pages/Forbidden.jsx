import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../app/constants/routes.js';

export default function Forbidden() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="text-xl font-semibold text-slate-900">Access denied</div>
      <div className="mt-1 text-sm text-slate-600">You do not have permission to access this resource.</div>
      <div className="mt-4"><Link className="text-brand-primary hover:underline" to={ROUTES.dashboard}>Back to dashboard</Link></div>
    </div>
  );
}
