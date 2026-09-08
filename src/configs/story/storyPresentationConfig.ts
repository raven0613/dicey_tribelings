import type { StoryIllustrationId, StorySpeaker, StoryVisual } from '../../types/story';

export const STORY_PRESENTATION = {
  characterMs: 18,
  automaticHoldMs: 1800,
  viewportMargin: 16,
  toolbarSpace: 72,
  footerSpace: 72,
  centralSpread: 0.6,
  arrowSize: 48,
  arrowGap: 8,
  spikyOutline: { inset: 3, cornerRadius: 36, pitch: 32, depth: 14, maxDepthRatio: 0.4 },
};

// Roles without a playable die borrow an existing die symbol until character art arrives.
export const STORY_VISUALS: Record<StorySpeaker, StoryVisual> = {
  tribeling: { name: '土人', creature: 'family' },
  player: { name: '玩家', creature: 'imposter' },
  princess: { name: '小公主', creature: 'princess' },
  prince: { name: '王子', creature: 'authority' },
  crocodile: { name: '鱷魚人', creature: 'bully' },
  narrator: { name: '旁白', creature: 'priest' },
};

export const STORY_ILLUSTRATIONS: Record<StoryIllustrationId, { label: string; image?: string; actors: StorySpeaker[] }> = {
  crownGift: { label: '王子送王冠', actors: ['prince', 'player'] },
  crownHeld: { label: '手拿王冠', actors: ['player', 'prince'] },
};
