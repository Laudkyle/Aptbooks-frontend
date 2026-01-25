import { create } from 'zustand';

const STORAGE_KEY = 'aptbooks.ui.v1';

export const uiStore = create((set, get) => ({
  sidebarOpen: true,
  theme: 'light',

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setTheme: (theme) => set({ theme }),

  hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      set({
        sidebarOpen: parsed.sidebarOpen ?? true,
        theme: parsed.theme ?? 'light'
      });
    } catch {
      // ignore
    }
  },

  persist: () => {
    const s = get();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sidebarOpen: s.sidebarOpen, theme: s.theme })
    );
  }
}));

uiStore.subscribe(() => {
  try {
    uiStore.getState().persist();
  } catch {
    // ignore
  }
});
