export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-xl border bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }) {
  return (
    <div className={`p-4 border-b ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}

export function CardDescription({ children }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

export function CardContent({ children, className = "" }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
