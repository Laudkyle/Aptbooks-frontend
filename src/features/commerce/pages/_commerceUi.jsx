/** @jsx jsx */
export function rowsOf(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export function firstValue(obj, keys, fallback = '') {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

export function money(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(value);
}

export function dateish(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export function statusClass(status) {
  const s = String(status ?? '').toLowerCase();
  if (['posted', 'completed', 'paid', 'approved', 'active', 'ready'].includes(s)) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (['draft', 'pending', 'open', 'processing'].includes(s)) return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (['voided', 'cancelled', 'canceled', 'rejected', 'failed'].includes(s)) return 'bg-rose-50 text-rose-700 ring-rose-200';
  return 'bg-slate-50 text-slate-700 ring-slate-200';
}

export function Badge({ children }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusClass(children)}`}>{children || '—'}</span>;
}

export function Panel({ title, subtitle, children, actions }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function Empty({ children = 'No records found.' }) {
  return <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{children}</div>;
}

export function SimpleTable({ columns, rows, keyOf }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>{columns.map((c) => <th key={c.key} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length ? rows.map((row, idx) => (
            <tr key={keyOf ? keyOf(row, idx) : row.id ?? idx}>
              {columns.map((c) => <td key={c.key} className="px-3 py-2 align-top text-slate-700">{c.render ? c.render(row) : row[c.key] ?? '—'}</td>)}
            </tr>
          )) : (
            <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={columns.length}>No records found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
