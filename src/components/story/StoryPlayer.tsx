import { useEffect, useMemo, useRef, useState } from 'react';
import { STORY_SCENES } from '../../configs/story/storyScenes';
import { STORY_PRESENTATION } from '../../configs/story/storyPresentationConfig';
import type { StoryId } from '../../types/story';
import { useStoryStore } from '../../store/storyStore';
import { StoryBubble } from './StoryBubble';
import { useStoryPosition } from './useStoryPosition';

const segmenter = new Intl.Segmenter('zh-Hant', { granularity: 'grapheme' });

export function StoryPlayer({ id }: { id: StoryId }) {
  const scene = STORY_SCENES[id];
  const finish = useStoryStore((state) => state.finish);
  const [{ index, count }, setPlayback] = useState({ index: 0, count: 0 });
  const line = scene.lines[index];
  const characters = useMemo(() => Array.from(segmenter.segment(line.text), (part) => part.segment), [line.text]);
  const complete = count >= characters.length;
  const groupRef = useRef<HTMLDivElement>(null);
  const advanceRef = useRef<HTMLButtonElement>(null);
  const echo = !!line.retainPrevious;
  const groupIndex = echo ? index - 1 : index;
  const layout = useStoryPosition(groupRef, groupIndex, scene.anchor === 'control', !!scene.automatic);
  const advance = () => {
    if (!complete) setPlayback({ index, count: characters.length });
    else if (index + 1 < scene.lines.length) setPlayback({ index: index + 1, count: 0 });
    else finish();
  };

  useEffect(() => {
    if (complete && !scene.automatic) return;
    const timeout = window.setTimeout(() => {
      if (!complete) setPlayback({ index, count: count + 1 });
      else if (index + 1 < scene.lines.length) setPlayback({ index: index + 1, count: 0 });
      else finish();
    }, complete ? STORY_PRESENTATION.automaticHoldMs : STORY_PRESENTATION.characterMs);
    return () => window.clearTimeout(timeout);
  }, [index, count, complete, scene, finish]);

  useEffect(() => {
    if (scene.automatic) return;
    const previous = document.activeElement as HTMLElement | null;
    advanceRef.current?.focus({ preventScroll: true });
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [scene.automatic]);

  const group = <div ref={groupRef} className={`story-group ${echo ? 'has-echo' : ''}`}
    style={scene.automatic ? undefined : { left: layout.x, top: layout.y, visibility: layout.ready ? 'visible' : 'hidden' }}>
    <StoryBubble key={groupIndex} line={scene.lines[groupIndex]}
      displayedText={echo ? scene.lines[groupIndex].text : characters.slice(0, count).join('')} />
    {echo && <StoryBubble key={index} line={line} displayedText={characters.slice(0, count).join('')} echo />}
  </div>;

  if (scene.automatic) return <aside className="story-passive" aria-label={scene.title}>{group}</aside>;
  return <section className={`story-overlay ${scene.cinematic ? 'is-cinematic' : ''}`} role="dialog"
    aria-modal="true" aria-label={scene.title} onClick={advance}
    onKeyDown={(event) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button');
        const next = document.activeElement === buttons[0] ? buttons[1] : buttons[0];
        next?.focus();
      }
    }}>
    <div className="story-toolbar"><span>{scene.title}</span>
      <button type="button" onClick={(event) => { event.stopPropagation(); finish(); }}>Skip 跳過</button>
    </div>
    {group}
    {layout.arrowVisible && <img className="story-control-arrow" src="/arrow.png" alt="戰術 Control 在這裡"
      style={{ left: layout.arrowX, top: layout.arrowY, width: STORY_PRESENTATION.arrowSize }} />}
    <button ref={advanceRef} type="button" className="story-advance"
      onClick={(event) => { event.stopPropagation(); advance(); }}>
      {complete ? '點一下繼續 ▸' : '點一下顯示完整對白'}
    </button>
  </section>;
}
