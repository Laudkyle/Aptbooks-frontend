const isDev = Boolean(import.meta.env?.DEV);

function errorMeta(error) {
  if (!error) return undefined;
  if (error instanceof Error) return { name: error.name, message: error.message };
  if (typeof error === "string") return { message: error };
  return { message: "Client operation failed" };
}

// Keep browser diagnostics structured and intentionally free of business payloads,
// tokens, idempotency keys, tax profiles, or financial document contents.
export const clientLogger = {
  debug(message, meta) {
    if (isDev) console.debug(message, meta || "");
  },
  warn(message, error) {
    console.warn(message, errorMeta(error));
  },
  error(message, error) {
    console.error(message, errorMeta(error));
  },
};
