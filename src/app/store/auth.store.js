import { create } from 'zustand';

const STORAGE_KEY = 'aptbooks.auth.v1';

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
        accessToken: parsed.accessToken ?? null,
        refreshToken: parsed.refreshToken ?? null,
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
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
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
