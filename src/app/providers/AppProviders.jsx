import React, { createContext, useMemo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { bootstrap } from '../bootstrap/init.js';
import { makeQueryClient } from '../../shared/query/queryClient.js';
import { createHttpClient } from '../../shared/api/http.js';
import { AuthProvider } from './AuthProvider.jsx';
import { OrgProvider } from './OrgProvider.jsx';
import { AbilityProvider } from './AbilityProvider.jsx';
import { ToastProvider } from '../../shared/components/ui/Toast.jsx';

export const ConfigContext = createContext(null);
export const ApiContext = createContext(null);

const config = bootstrap();
const queryClient = makeQueryClient();

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
          <ToastProvider>
            <AuthProvider>
              <OrgProvider>
                <AbilityProvider>{children}</AbilityProvider>
              </OrgProvider>
            </AuthProvider>
          </ToastProvider>
        </QueryClientProvider>
      </ApiContext.Provider>
    </ConfigContext.Provider>
  );
}
