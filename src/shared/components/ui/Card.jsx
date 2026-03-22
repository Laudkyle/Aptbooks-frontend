export function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-surface-1 border border-border-subtle rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }) {
  return (
    <div
      className={`px-6 py-4 border-b border-border-subtle flex flex-col gap-1 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }) {
  return (
    <h3 className="text-base font-semibold text-text-strong">
      {children}
    </h3>
  );
}

export function CardDescription({ children }) {
  return (
    <p className="text-sm text-text-muted">
      {children}
    </p>
  );
}

export function CardContent({ children, className = "" }) {
  return (
    <div className={`px-6 py-5 ${className}`}>
      {children}
    </div>
  );
}