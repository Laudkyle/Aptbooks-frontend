import React, { createContext, useMemo } from 'react';
import { authStore } from '../store/auth.store.js';

export const AbilityContext = createContext({
  can: () => false,
  hasAny: () => false
});

export function AbilityProvider({ children }) {
  const permissions = authStore((s) => s.permissions);

  const ability = useMemo(() => {
    const set = new Set(permissions ?? []);
    return {
      can: (permissionCode) => set.has(permissionCode),
      hasAny: (codes) => (codes ?? []).some((c) => set.has(c))
    };
  }, [permissions]);

  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>;
}
