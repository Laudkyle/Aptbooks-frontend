// Normalizes backend errors into a predictable shape for UI.
// Expected backend style (from repo conventions):
// { code, message, details? } or { error: { code, message } }

export function normalizeError(err) {
  const fallback = {
    status: 0,
    code: 'UNKNOWN_ERROR',
    message: 'Something went wrong.',
    details: null
  }; 

  if (!err) return fallback; 

  const res = err.response; 
  const status = res?.status ?? 0; 
  const data = res?.data ?? null; 

  const code = data?.code || data?.error?.code || err.code || fallback.code; 
  const message = data?.message || data?.error?.message || err.message || fallback.message; 
  const details = data?.details || data?.error?.details || data || null; 

  return { status, code, message, details }; 
}
