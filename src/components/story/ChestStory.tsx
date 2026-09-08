import { useState } from 'react';
import { STORY_SCENES } from '../../configs/story/storyScenes';
import { useStoryStore } from '../../store/storyStore';
import { StoryBubble } from './StoryBubble';
import { StoryPlayer } from './StoryPlayer';

export function ChestStory() {
  const queue = useStoryStore((state) => state.queue);
  // Reserve the largest dialogue group for this chest, even after its timer finishes.
  const [reserveSpace] = useState(() => queue.includes('chest'));
  if (!reserveSpace) return null;
  const lines = STORY_SCENES.chest.lines;
  return <div className="story-chest-slot">
    {lines.map((line, index) => <div key={index} className="story-passive story-size-reservation" aria-hidden="true">
      <div className="story-group">
        {line.retainPrevious && <StoryBubble line={lines[index - 1]} displayedText={lines[index - 1].text} />}
        <StoryBubble line={line} displayedText={line.text} echo={line.retainPrevious} />
      </div>
    </div>)}
    {queue[0] === 'chest' && <StoryPlayer id="chest" />}
  </div>;
}
