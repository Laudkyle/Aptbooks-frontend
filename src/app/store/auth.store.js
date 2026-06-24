import { create } from 'zustand';

const STORAGE_KEY = 'aptbooks.auth.v1';
let shouldPersistTokens = true;

export function configureAuthPersistence({ persistTokens = true } = {}) {
  shouldPersistTokens = Boolean(persistTokens);
}

export const authStore = create((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  roles: [],
  permissions: [],

  setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
  setIdentity: ({ user, roles, permissions }) => set({ user, roles: roles ?? [], permissions: permissions ?? [] }),
  clear: () => set({ accessToken: null, refreshToken: null, user: null, roles: [], permissions: [] }),

  hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      set({
        accessToken: shouldPersistTokens ? parsed.accessToken ?? null : null,
        refreshToken: shouldPersistTokens ? parsed.refreshToken ?? null : null,
        user: parsed.user ?? null,
        roles: parsed.roles ?? [],
        permissions: parsed.permissions ?? []
      });
    } catch {
      // ignore
    }
  },

  persist: () => {
    const s = get();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: shouldPersistTokens ? s.accessToken : null,
        refreshToken: shouldPersistTokens ? s.refreshToken : null,
        user: s.user,
        roles: s.roles,
        permissions: s.permissions
      })
    );
  }
}));

// Persist on any update
authStore.subscribe(() => {
  try {
    authStore.getState().persist();
  } catch {
    // ignore
  }
});
