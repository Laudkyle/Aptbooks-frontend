import clsx from "clsx";

export function Label({ children, htmlFor, className }) {
  return (
    <label
      htmlFor={htmlFor}
      className={clsx(
        "text-xs font-medium text-muted-foreground",
        className
      )}
    >
      {children}
    </label>
  );
}
