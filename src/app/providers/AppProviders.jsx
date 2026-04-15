import React, { createContext, useEffect, useMemo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { bootstrap } from '../bootstrap/init.js';
import { makeQueryClient } from '../../shared/query/queryClient.js';
import { createHttpClient } from '../../shared/api/http.js';
import { AuthProvider } from './AuthProvider.jsx';
import { OrgProvider } from './OrgProvider.jsx';
import { AbilityProvider } from './AbilityProvider.jsx';
import { ToastProvider } from '../../shared/components/ui/Toast.jsx';
import { uiStore } from '../store/ui.store.js';
import { ValidationEffects } from '../../shared/forms/ValidationEffects.jsx';

export const ConfigContext = createContext(null);
export const ApiContext = createContext(null);

const config = bootstrap();
const queryClient = makeQueryClient();

function ThemeSync({ children }) {
  const theme = uiStore((s) => s.theme);

  useEffect(() => {
    uiStore.getState().hydrate();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const resolvedTheme = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
  }, [theme]);

  return children;
}

export function AppProviders({ children }) {
  const api = useMemo(() => {
    return {
      http: createHttpClient({ baseURL: config.apiUrl, cookieRefreshMode: config.cookieRefreshMode }),
      config
    };
  }, []);

  return (
    <ConfigContext.Provider value={config}>
      <ApiContext.Provider value={api}>
        <QueryClientProvider client={queryClient}>
          <ThemeSync>
            <ToastProvider>
              <ValidationEffects />
              <AuthProvider>
                <OrgProvider>
                  <AbilityProvider>{children}</AbilityProvider>
                </OrgProvider>
              </AuthProvider>
            </ToastProvider>
          </ThemeSync>
        </QueryClientProvider>
      </ApiContext.Provider>
    </ConfigContext.Provider>
  );
}
