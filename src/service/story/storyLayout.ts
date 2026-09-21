import { STORY_PRESENTATION as config } from '../../configs/story/storyPresentationConfig';

export interface StorySize { width: number; height: number }
export interface StoryPoint { x: number; y: number }
export interface StoryBounds extends StoryPoint, StorySize {}

export function getStoryPosition(viewport: StoryBounds, size: StorySize, random: StoryPoint, anchor?: { left: number; top: number }, preferred?: StoryPoint): StoryPoint {
  const left = viewport.x + config.viewportMargin;
  const top = viewport.y + config.toolbarSpace;
  const availableX = Math.max(0, viewport.width - size.width - config.viewportMargin * 2);
  const availableY = Math.max(0, viewport.height - size.height - config.toolbarSpace - config.footerSpace);
  const centerRandom = (value: number) => 0.5 + (value - 0.5) * config.centralSpread;
  const x = anchor ? anchor.left : preferred?.x ?? left + availableX * centerRandom(random.x);
  const y = anchor ? anchor.top - size.height - config.arrowSize - config.arrowGap * 2
    : preferred?.y ?? top + availableY * centerRandom(random.y);
  return { x: Math.min(left + availableX, Math.max(left, x)), y: Math.min(top + availableY, Math.max(top, y)) };
}
