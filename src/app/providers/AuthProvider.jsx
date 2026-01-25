import React, { createContext, useCallback, useEffect, useMemo } from 'react'; 
import { useQuery, useQueryClient } from '@tanstack/react-query'; 
import { ApiContext } from './AppProviders.jsx'; 
import { authStore } from '../store/auth.store.js'; 
import { qk } from '../../shared/query/keys.js'; 
import { normalizeError } from '../../shared/api/errors.js'; 
import { endpoints } from '../../shared/api/endpoints.js'; 

export const AuthContext = createContext(null); 

export function AuthProvider({ children }) {
  const { http, config } = React.useContext(ApiContext); 
  const qc = useQueryClient(); 

  const accessToken = authStore((s) => s.accessToken); 
  const refreshToken = authStore((s) => s.refreshToken); 
  const user = authStore((s) => s.user); 

  const meQuery = useQuery({
    queryKey: qk.me,
    queryFn: async () => {
      const res = await http.get(endpoints.core.users.me); 
      return res.data; 
    },
    enabled: Boolean(accessToken),
    staleTime: 10_000
  }); 

  useEffect(() => {
    if (meQuery.data?.user) {
      authStore.getState().setIdentity({
        user: meQuery.data.user,
        roles: meQuery.data.roles,
        permissions: meQuery.data.permissions
      }); 
    }
  }, [meQuery.data]); 

  const login = useCallback(
    async ({ email, password, otp }) => {
      const res = await http.post(endpoints.auth.login, { email, password, ...(otp ? { otp } : {}) }); 
      const { accessToken: at, refreshToken: rt } = res.data ?? {}; 
      if (!at) throw new Error('Login did not return an access token'); 
      authStore.getState().setTokens({ accessToken: at, refreshToken: rt ?? refreshToken }); 
      await qc.invalidateQueries({ queryKey: qk.me }); 
      return res.data; 
    },
    [http, qc, refreshToken]
  ); 

  const register = useCallback(
    async ({ organizationName, baseCurrencyCode, email, password }) => {
      const res = await http.post(endpoints.auth.register, { organizationName, baseCurrencyCode, email, password }); 
      const tokens = res.data?.tokens; 
      if (tokens?.accessToken) {
        authStore.getState().setTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }); 
        await qc.invalidateQueries({ queryKey: qk.me }); 
      }
      return res.data; 
    },
    [http, qc]
  ); 

  const forgotPassword = useCallback(
    async ({ email }) => {
      const res = await http.post(endpoints.auth.forgotPassword, { email }); 
      return res.data; 
    },
    [http]
  ); 

  const resetPassword = useCallback(
    async ({ token, newPassword }) => {
      const res = await http.post(endpoints.auth.resetPassword, { token, newPassword }); 
      return res.data; 
    },
    [http]
  ); 

  const logout = useCallback(
    async () => {
      try {
        if (config.cookieRefreshMode) {
          await http.post(endpoints.auth.logout); 
        } else if (refreshToken) {
          await http.post(endpoints.auth.logout, { refreshToken }); 
        }
      } finally {
        authStore.getState().clear(); 
        qc.clear(); 
      }
    },
    [http, qc, refreshToken, config.cookieRefreshMode]
  ); 

  const logoutAll = useCallback(
    async () => {
      try {
        if (config.cookieRefreshMode) {
          await http.post(endpoints.auth.logoutAll); 
        } else if (refreshToken) {
          await http.post(endpoints.auth.logoutAll, { refreshToken }); 
        }
      } finally {
        authStore.getState().clear(); 
        qc.clear(); 
      }
    },
    [http, qc, refreshToken, config.cookieRefreshMode]
  ); 

  const enroll2fa = useCallback(async () => {
    const res = await http.post(endpoints.auth.twofa.enroll); 
    return res.data; 
  }, [http]); 

  const verify2fa = useCallback(
    async ({ otp }) => {
      const res = await http.post(endpoints.auth.twofa.verify, { otp }); 
      return res.data; 
    },
    [http]
  ); 

  const disable2fa = useCallback(
    async ({ password, otp }) => {
      const res = await http.post(endpoints.auth.twofa.disable, { password, otp }); 
      return res.data; 
    },
    [http]
  ); 

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(accessToken),
      accessToken,
      refreshToken,
      user,
      meQuery,
      login,
      register,
      forgotPassword,
      resetPassword,
      logout,
      logoutAll,
      enroll2fa,
      verify2fa,
      disable2fa,
      error: meQuery.error ? normalizeError(meQuery.error) : null
    }),
    [accessToken, refreshToken, user, meQuery, login, register, forgotPassword, resetPassword, logout, logoutAll, enroll2fa, verify2fa, disable2fa]
  ); 

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>; 
}
