import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../app/constants/routes.js';

export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="relative min-h-full overflow-hidden bg-bg-main">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-primary/12 blur-3xl" />
        <div className="absolute -right-40 -top-24 h-[520px] w-[520px] rounded-full bg-brand-light/14 blur-3xl" />
        <div className="absolute -bottom-56 left-1/3 h-[640px] w-[640px] rounded-full bg-brand-primary/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-full max-w-6xl grid-cols-1 items-center gap-8 px-4 py-10 lg:grid-cols-2">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-white/70 px-3 py-1 text-xs font-medium text-brand-deep shadow-sm">
              Accounting Suite
              <span className="app-chip">Phase 1–4 UI</span>
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-brand-deep">
              Fast, clean workflows for modern accounting teams.
            </h1>
            <p className="mt-3 text-base text-slate-700">
              Navigate journals, periods, statements, and compliance with a consistent, operator-grade interface.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <div className="app-surface p-4">
                <div className="text-sm font-semibold text-brand-deep">Designed for accuracy</div>
                <div className="mt-1 text-sm text-slate-600">Clear validation cues, structured layouts, and safe confirmations.</div>
              </div>
              <div className="app-surface p-4">
                <div className="text-sm font-semibold text-brand-deep">Built for speed</div>
                <div className="mt-1 text-sm text-slate-600">Search-first navigation, compact controls, and predictable patterns.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="app-card animate-slideUp">
            <div className="app-card-header">
              <div>
                <div className="text-sm font-semibold text-brand-deep">AptBooks</div>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
                {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
              </div>
            </div>
            <div className="app-card-body">{children}</div>
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
        </section>
      </div>
    </div>
  );
}
