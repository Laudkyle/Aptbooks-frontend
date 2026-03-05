export function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }) {
  return (
    <div
      className={`px-6 py-4 border-b border-gray-100 flex flex-col gap-1 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }) {
  return (
    <h3 className="text-base font-semibold text-gray-800">
      {children}
    </h3>
  );
}

export function CardDescription({ children }) {
  return (
    <p className="text-sm text-gray-500">
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