import { authStore } from '../../app/store/auth.store.js';
import { normalizeError } from './errors.js';

let inflight = null;

export function createAuthRefresher({ http, cookieRefreshMode }) {
  return async function refreshAccessToken() {
    if (inflight) return inflight;

    inflight = (async () => {
      const { refreshToken } = authStore.getState();
      if (!cookieRefreshMode && !refreshToken) {
        throw new Error('No refresh token available');
      }

      try {
        const res = await http.post('/auth/refresh', cookieRefreshMode ? undefined : { refreshToken });
        const { accessToken, refreshToken: nextRefreshToken } = res.data ?? {};
        if (!accessToken) throw new Error('Refresh did not return an access token');
        authStore.getState().setTokens({ accessToken, refreshToken: nextRefreshToken ?? refreshToken });
        return accessToken;
      } catch (e) {
        const ne = normalizeError(e);
        const err = new Error(ne.message);
        err.name = 'RefreshFailed';
        err.normalized = ne;
        throw err;
      } finally {
        inflight = null;
      }
    })();

    return inflight;
  };
}
