import { create } from 'zustand';

interface TelemetryStatus {
  storageError: string | null;
  setStorageError: (message: string | null) => void;
}

export const useTelemetryStore = create<TelemetryStatus>((set) => ({
  storageError: null,
  setStorageError: (storageError) => set({ storageError }),
}));
