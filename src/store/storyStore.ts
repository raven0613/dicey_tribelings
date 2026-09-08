import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StoryId } from '../types/story';

interface StoryState {
  screen: 'menu' | 'game';
  seen: Partial<Record<StoryId, boolean>>;
  temporaryUnlocked: boolean;
  queue: StoryId[];
  preview: boolean;
  enqueue: (id: StoryId) => void;
  finish: () => void;
  leaveChest: () => void;
  unlockTemporary: () => void;
  beginRun: () => void;
  previewEnding: () => void;
  resetRecords: () => void;
}

export const useStoryStore = create<StoryState>()(persist((set, get) => ({
  screen: 'menu', seen: {}, temporaryUnlocked: false, queue: [], preview: false,
  enqueue: (id) => {
    const { seen, queue, preview } = get();
    if (preview || seen[id] || queue.includes(id)) return;
    set({ queue: [...queue, id] });
  },
  finish: () => {
    const { queue, seen, preview } = get();
    const [id, ...remaining] = queue;
    if (!id) return;
    if (preview) set({ queue: [], preview: false, screen: 'menu' });
    else set({ queue: remaining, seen: { ...seen, [id]: true } });
  },
  leaveChest: () => {
    const { queue, seen } = get();
    if (queue.includes('chest')) set({ queue: queue.filter((id) => id !== 'chest'), seen: { ...seen, chest: true } });
  },
  unlockTemporary: () => {
    if (!get().temporaryUnlocked) set({ temporaryUnlocked: true });
    get().enqueue('temporary');
  },
  beginRun: () => {
    set({ screen: 'game', queue: [], preview: false });
    get().enqueue('intro');
  },
  previewEnding: () => set({ screen: 'menu', queue: ['ending'], preview: true }),
  resetRecords: () => set({ screen: 'menu', seen: {}, temporaryUnlocked: false, queue: [], preview: false }),
}), {
  name: 'tribelings-story-progress',
  storage: createJSONStorage(() => localStorage),
  partialize: ({ seen, temporaryUnlocked }) => ({ seen, temporaryUnlocked }),
}));
