import React from 'react';
import { Link } from 'react-router-dom';

export function Breadcrumbs({ items }) {
  if (!items?.length) return null;
  return (
    <nav className="mb-4 text-xs text-slate-600">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, idx) => (
          <li key={idx} className="flex items-center gap-1">
            {it.to ? <Link className="hover:underline" to={it.to}>{it.label}</Link> : <span>{it.label}</span>}
            {idx < items.length - 1 ? <span className="text-slate-400">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
