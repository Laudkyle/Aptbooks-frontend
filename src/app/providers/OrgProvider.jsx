import React, { createContext, useCallback, useEffect, useMemo } from 'react'; 
import { useQuery, useQueryClient } from '@tanstack/react-query'; 
import { ApiContext } from './AppProviders.jsx'; 
import { authStore } from '../store/auth.store.js'; 
import { orgStore } from '../store/org.store.js'; 
import { qk } from '../../shared/query/keys.js'; 
import { endpoints } from '../../shared/api/endpoints.js'; 

export const OrgContext = createContext(null); 

export function OrgProvider({ children }) {
  const { http } = React.useContext(ApiContext); 
  const qc = useQueryClient(); 
  const isAuthed = authStore((s) => Boolean(s.accessToken)); 
  const organizations = orgStore((s) => s.organizations); 
  const currentOrg = orgStore((s) => s.currentOrg); 

  const orgsQuery = useQuery({
    queryKey: qk.meOrganizations,
    queryFn: async () => {
      const res = await http.get(endpoints.core.users.meOrganizations); 
      return res.data; 
    },
    enabled: isAuthed,
    staleTime: 30_000
  }); 

  useEffect(() => {
    const list = orgsQuery.data?.organizations ?? []; 
    if (list.length) {
      orgStore.getState().setOrganizations(list); 
      const current = list.find((o) => o.is_current) ?? list[0]; 
      orgStore.getState().setCurrentOrg(current); 
    }
  }, [orgsQuery.data]); 

  const switchOrganization = useCallback(
    async (organizationId) => {
      const res = await http.post(endpoints.core.users.switchOrganization, { organizationId }); 
      const tokens = res.data?.tokens; 
      if (tokens?.accessToken) {
        authStore.getState().setTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }); 
      }
      // Rebootstrap identity and org list
      await qc.invalidateQueries({ queryKey: qk.me }); 
      await qc.invalidateQueries({ queryKey: qk.meOrganizations }); 
      return res.data; 
    },
    [http, qc]
  ); 

  const value = useMemo(
    () => ({ organizations, currentOrg, orgsQuery, switchOrganization }),
    [organizations, currentOrg, orgsQuery, switchOrganization]
  ); 

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>; 
}
