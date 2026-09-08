import { useLayoutEffect, useRef, useState } from 'react';
import type { StoryLine } from '../../types/story';
import { STORY_ILLUSTRATIONS, STORY_VISUALS } from '../../configs/story/storyPresentationConfig';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { getSpikyOutline } from '../../service/story/storyBubbleOutline';

export function StoryBubble({ line, displayedText, echo = false }: {
  line: StoryLine; displayedText: string; echo?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current!;
    const measure = () => setSize({ width: element.offsetWidth, height: element.offsetHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);
  const visual = STORY_VISUALS[line.speaker];
  const symbol = CREATURE_CONFIG[visual.creature].emoji;
  const illustration = line.illustration ? STORY_ILLUSTRATIONS[line.illustration] : null;
  return <article ref={ref} className={`story-bubble ${line.shape ?? 'round'} ${echo ? 'is-echo' : ''}`}>
    <svg className="story-bubble-outline" width="100%" height="100%" viewBox={`0 0 ${size.width || 1} ${size.height || 1}`} aria-hidden="true">
      {line.shape === 'spiky'
        ? <polygon points={getSpikyOutline(size.width, size.height)} />
        : <rect x="3" y="3" width={Math.max(0, size.width - 6)} height={Math.max(0, size.height - 6)} rx="30" />}
    </svg>
    <div className="story-bubble-content">
      <header><span className="story-avatar" aria-hidden="true">
        {visual.image ? <img src={visual.image} alt="" /> : symbol}
      </span><span>{visual.name}</span></header>
      {illustration && <div className="story-illustration" aria-label={illustration.label}>
        {illustration.image ? <img src={illustration.image} alt={illustration.label} />
          : <span aria-hidden="true">{illustration.actors.map((actor) => CREATURE_CONFIG[STORY_VISUALS[actor].creature].emoji).join('　')}</span>}
      </div>}
      <p className="story-text" aria-label={line.text}>
        <span className="story-text-measure" aria-hidden="true">{line.text}</span>
        <span className="story-text-visible" aria-hidden="true">{displayedText}</span>
      </p>
    </div>
  </article>;
}
