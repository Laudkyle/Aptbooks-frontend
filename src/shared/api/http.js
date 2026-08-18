import axios from 'axios';
import { authStore } from '../../app/store/auth.store.js';
import { generateRequestId } from './request-id.js';
import { createAuthRefresher } from './auth-refresh.js';
import { toUserFacingError } from './errors.js';
import { clearValidationErrors, publishValidationErrors } from '../forms/validationStore.js';

function generateOperationId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `op-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function isMutatingMethod(method) {
  return ['post', 'put', 'patch', 'delete'].includes(String(method || 'get').toLowerCase());
}

export function createHttpClient({ baseURL, cookieRefreshMode }) {
  const http = axios.create({
    baseURL,
    withCredentials: cookieRefreshMode,
    timeout: 30000
  });

  const refresh = createAuthRefresher({ http, cookieRefreshMode });

  http.interceptors.request.use((config) => {
    const token = authStore.getState().accessToken;
    const isProtected = !config.url?.startsWith('/healthz') && !config.url?.startsWith('/readyz') && !config.url?.startsWith('/auth');

    config.headers = config.headers ?? {};
    if (!config.headers['x-request-id']) config.headers['x-request-id'] = generateRequestId();
    // A single request intent keeps one operation key through auth/network retries.
    // Endpoints that do not enforce idempotency simply ignore this header.
    if (isMutatingMethod(config.method) && !config.headers['Idempotency-Key']) {
      config.headers['Idempotency-Key'] = generateOperationId();
    }
    if (isProtected && token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  http.interceptors.response.use(
    (res) => {
      clearValidationErrors();
      return res;
    },
    async (error) => {
      const status = error.response?.status;
      const original = error.config;

      const isRefreshRequest = original?.skipAuthRefresh || original?.url?.includes('/auth/refresh');

      if (status === 401 && isRefreshRequest) {
        authStore.getState().clear();
        const normalized = toUserFacingError(error);
        clearValidationErrors();
        throw normalized;
      }

      if (status === 401 && !original?._retry) {
        original._retry = true;
        try {
          const newAccessToken = await refresh();
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${newAccessToken}`;
          return http.request(original);
        } catch (e) {
          authStore.getState().clear();
          throw toUserFacingError(e);
        }
      }
      const normalized = toUserFacingError(error);
      if (normalized?.code === 'validation_error' || normalized?.status === 422 || normalized?.details?.fields) {
        publishValidationErrors(normalized.details || {}, normalized.requestId || null);
      } else {
        clearValidationErrors();
      }
      throw normalized;
    }
  );

  return http;
}
