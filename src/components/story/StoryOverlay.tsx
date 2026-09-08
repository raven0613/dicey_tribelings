import { createPortal } from 'react-dom';
import { useStoryStore } from '../../store/storyStore';
import { StoryPlayer } from './StoryPlayer';

export function StoryOverlay() {
  const id = useStoryStore((state) => state.queue[0]);
  if (!id || id === 'chest') return null;
  return createPortal(<StoryPlayer key={id} id={id} />, document.body);
}
