import { create } from 'zustand';

const STORAGE_KEY = 'aptbooks.org.v1';

export const orgStore = create((set, get) => ({
  currentOrg: null,
  organizations: [],

  setOrganizations: (organizations) => set({ organizations: organizations ?? [] }),
  setCurrentOrg: (org) => set({ currentOrg: org }),
  clear: () => set({ currentOrg: null, organizations: [] }),

  hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      set({
        currentOrg: parsed.currentOrg ?? null,
        organizations: parsed.organizations ?? []
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
        currentOrg: s.currentOrg,
        organizations: s.organizations
      })
    );
  }
}));

orgStore.subscribe(() => {
  try {
    orgStore.getState().persist();
  } catch {
    // ignore
  }
});
