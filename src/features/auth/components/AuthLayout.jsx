import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../app/constants/routes.js';

export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-full bg-bg-main">
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-10">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-center">
            <div className="text-xl font-bold text-brand-deep">AptBooks</div>
            <h1 className="mt-2 text-lg font-semibold text-slate-900">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          <div className="mt-6">{children}</div>
        </div>
        <div className="mt-6 text-center text-xs text-slate-500">
          <Link className="hover:underline" to={ROUTES.login}>
            Sign in
          </Link>
          <span className="px-2">·</span>
          <Link className="hover:underline" to={ROUTES.register}>
            Create org
          </Link>
        </div>
      </div>
    </div>
  );
}
