import axios from 'axios'; 
import { authStore } from '../../app/store/auth.store.js'; 
import { generateRequestId } from './request-id.js'; 
import { createAuthRefresher } from './auth-refresh.js'; 

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
    if (isProtected && token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`; 
    }
    return config; 
  }); 

  http.interceptors.response.use(
    (res) => res,
    async (error) => {
      const status = error.response?.status; 
      const original = error.config; 

      if (status === 401 && !original?._retry) {
        original._retry = true; 
        try {
          const newAccessToken = await refresh(); 
          original.headers = original.headers ?? {}; 
          original.headers.Authorization = `Bearer ${newAccessToken}`; 
          return http.request(original); 
        } catch (e) {
          authStore.getState().clear(); 
          throw e; 
        }
      }
      throw error; 
    }
  ); 

  return http; 
}
