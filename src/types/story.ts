import type { CreatureId } from './creatures';

export type StoryId = 'intro' | 'battle' | 'control' | 'chest' | 'temporary' | 'princess' | 'ending';
export type StoryIllustrationId = 'crownGift' | 'crownHeld';
export type StorySpeaker = 'tribeling' | 'player' | 'princess' | 'prince' | 'crocodile' | 'narrator';
export interface StoryVisual {
  name: string;
  creature: CreatureId;
  image?: string;
}
export interface StoryLine {
  speaker: StorySpeaker;
  text: string;
  shape?: 'round' | 'spiky';
  retainPrevious?: boolean;
  illustration?: StoryIllustrationId;
}
export interface StoryScene {
  title: string;
  lines: StoryLine[];
  cinematic?: boolean;
  automatic?: boolean;
  anchor?: 'control';
}
