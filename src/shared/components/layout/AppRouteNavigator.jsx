import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Home } from 'lucide-react';
import { buildRouteNavigation, getBackFallback } from '../../../app/navigation/route-navigation.mjs';

export function AppRouteNavigator() {
  const location = useLocation();
  const navigate = useNavigate();
  const items = useMemo(() => buildRouteNavigation(location.pathname), [location.pathname]);
  const fallback = getBackFallback(items);

  const goBack = () => {
    const historyIndex = window.history?.state?.idx;
    if (Number.isInteger(historyIndex) && historyIndex > 0) {
      navigate(-1);
      return;
    }
    navigate(fallback);
  };

  return (
    <div className="mb-4 flex min-h-11 items-center gap-2 rounded-2xl border border-border-subtle bg-white/70 px-2.5 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60 sm:px-3">
      <button
        type="button"
        onClick={goBack}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-primary/30 hover:bg-brand-primary/5 hover:text-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        aria-label="Go back"
        title="Go back"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <div className="h-5 w-px shrink-0 bg-slate-200" aria-hidden />

      <nav aria-label="Page navigation" className="min-w-0 flex-1 overflow-x-auto">
        <ol className="flex min-w-max items-center gap-1 text-sm">
          <li className="flex items-center">
            <Link
              to="/"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-deep"
              title="Dashboard"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </li>

          {items.map((item, index) => (
            <React.Fragment key={`${item.to}-${item.label}`}>
              <li aria-hidden className="flex items-center text-slate-300">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li className="flex items-center">
                <Link
                  to={item.to}
                  aria-current={item.current ? 'page' : undefined}
                  className={[
                    'inline-flex h-8 items-center rounded-lg px-2.5 font-medium transition',
                    item.current
                      ? 'bg-brand-primary/10 text-brand-deep'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-brand-deep',
                  ].join(' ')}
                  title={item.label}
                >
                  {item.label}
                </Link>
              </li>
            </React.Fragment>
          ))}
        </ol>
      </nav>
    </div>
  );
}
