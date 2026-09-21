import { useGameViewport } from '../layout/GameViewportContext';
import { getGameRect } from '../../service/layout/gameViewport';
import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { getStoryPosition, type StoryPoint } from '../../service/story/storyLayout';
import { STORY_PRESENTATION as config } from '../../configs/story/storyPresentationConfig';

export function useStoryPosition(ref: RefObject<HTMLDivElement | null>, groupIndex: number, control: boolean, passive: boolean) {
  const { width, height, scale } = useGameViewport();
  const preferred = useRef<StoryPoint | undefined>(undefined);
  const random = useRef({ index: -1, x: 0.5, y: 0.5 });
  const [layout, setLayout] = useState({ x: 0, y: 0, ready: false, arrowX: 0, arrowY: 0, arrowVisible: false });
  useLayoutEffect(() => {
    if (passive) return;
    if (random.current.index !== groupIndex) {
      random.current = { index: groupIndex, x: Math.random(), y: Math.random() };
      preferred.current = undefined;
    }
    const element = ref.current!;
    const target = control ? document.querySelector<HTMLElement>('[data-story-anchor="control"]') : null;
    if (target) target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const measure = () => {
      const viewport = { x: 0, y: 0, width, height };
      element.style.maxWidth = `${Math.max(1, viewport.width - config.viewportMargin * 2)}px`;
      element.style.maxHeight = `${Math.max(1, viewport.height - config.toolbarSpace - config.footerSpace)}px`;
      const anchor = target ? getGameRect(target) : undefined;
      const position = getStoryPosition(viewport, getGameRect(element), random.current, anchor, preferred.current);
      preferred.current = position;
      setLayout({ ...position, ready: true,
        arrowX: anchor ? Math.max(viewport.x + config.viewportMargin, Math.min(viewport.x + viewport.width - config.arrowSize - config.viewportMargin,
          anchor.left + anchor.width / 2 - config.arrowSize / 2)) : 0,
        arrowY: anchor ? Math.max(viewport.y + config.viewportMargin, Math.min(viewport.y + viewport.height - config.arrowSize - config.viewportMargin,
          anchor.top - config.arrowSize - config.arrowGap)) : 0,
        arrowVisible: !!anchor,
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (target) observer.observe(target);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [ref, groupIndex, control, passive, width, height, scale]);
  return layout;
}
