import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface PreferencesState {
  hidePaidRerollPrompt: boolean;
  dismissPaidRerollPrompt: () => void;
  resetPreferences: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(persist((set) => ({
  hidePaidRerollPrompt: false,
  dismissPaidRerollPrompt: () => set({ hidePaidRerollPrompt: true }),
  resetPreferences: () => set({ hidePaidRerollPrompt: false }),
}), {
  name: 'tribelings-preferences',
  storage: createJSONStorage(() => localStorage),
  partialize: ({ hidePaidRerollPrompt }) => ({ hidePaidRerollPrompt }),
}));
