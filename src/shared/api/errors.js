const STATUS_MESSAGES = {
  400: 'Please review the information entered and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested item could not be found.',
  409: 'This action could not be completed because the record conflicts with existing data.',
  422: 'Some of the information provided is invalid. Please correct it and try again.',
  429: 'Too many requests were made. Please wait a moment and try again.',
  500: 'Something went wrong on our side. Please try again.',
  502: 'The service is temporarily unavailable. Please try again.',
  503: 'The service is temporarily unavailable. Please try again.',
  504: 'The request took too long to complete. Please try again.'
};

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function extractBackendMessage(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.message === 'string') return data.message;
  if (typeof data?.error?.message === 'string') return data.error.message;
  if (typeof data?.details?.message === 'string') return data.details.message;
  return '';
}

function extractBackendCode(data, err) {
  if (!data) return err?.code || 'UNKNOWN_ERROR';
  return data?.code || data?.error?.code || err?.code || 'UNKNOWN_ERROR';
}

function extractDetails(data) {
  if (!data || typeof data !== 'object') return null;
  return data?.details || data?.error?.details || null;
}

function looksLikeGenericTransportMessage(message) {
  if (!message) return true;
  const normalized = String(message).trim().toLowerCase();
  return (
    normalized === 'network error' ||
    normalized === 'failed to fetch' ||
    normalized.startsWith('request failed with status code') ||
    normalized === 'timeout of 30000ms exceeded' ||
    normalized === 'canceled' ||
    normalized === 'cancelled' ||
    normalized === 'something went wrong.'
  );
}

function humanizeNetworkError(err) {
  if (err?.code === 'ECONNABORTED') return 'The request took too long to complete. Please try again.';
  if (err?.message === 'Network Error' || !err?.response) {
    return 'We could not reach the server. Please check your internet connection and try again.';
  }
  return '';
}

export function normalizeError(err) {
  const response = err?.response;
  const status = response?.status ?? err?.status ?? 0;
  const data = response?.data ?? err?.data ?? null;
  const backendMessage = extractBackendMessage(data);
  const backendCode = extractBackendCode(data, err);
  const details = extractDetails(data);
  const transportMessage = typeof err?.message === 'string' ? err.message : '';
  const networkMessage = humanizeNetworkError(err);
  const statusMessage = STATUS_MESSAGES[status] || '';

  const message = firstNonEmpty(
    looksLikeGenericTransportMessage(backendMessage) ? '' : backendMessage,
    looksLikeGenericTransportMessage(transportMessage) ? '' : transportMessage,
    networkMessage,
    statusMessage,
    'Something went wrong. Please try again.'
  );

  return {
    status,
    code: backendCode,
    message,
    details,
    requestId: data?.requestId || data?.error?.requestId || err?.requestId || null,
    raw: data
  };
}

export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const normalized = normalizeError(err);
  return normalized.message || fallback;
}

export function toUserFacingError(err, fallback) {
  const normalized = normalizeError(err);
  const wrapped = new Error(normalized.message || fallback || 'Something went wrong. Please try again.');
  wrapped.name = err?.name || 'AppError';
  wrapped.status = normalized.status;
  wrapped.code = normalized.code;
  wrapped.details = normalized.details;
  wrapped.requestId = normalized.requestId;
  wrapped.response = err?.response;
  wrapped.config = err?.config;
  wrapped.cause = err;
  wrapped.normalized = normalized;
  wrapped.isUserFacing = true;
  return wrapped;
}
