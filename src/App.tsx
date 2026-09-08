import { MainMenu } from './components/common/MainMenu';
import { StoryOverlay } from './components/story/StoryOverlay';
import { STORY_SCENES } from './configs/story/storyScenes';
import { GameScreen } from './components/GameScreen';
import { useStoryStore } from './store/storyStore';

export default function App() {
  const { screen, queue } = useStoryStore();
  const scene = queue[0] ? STORY_SCENES[queue[0]] : null;
  const blocking = !!scene && !scene.automatic;
  return <>
    <div className="app-shell" inert={blocking}>
      {screen === 'menu' ? <MainMenu /> : scene?.cinematic
        ? <div className="story-backdrop" /> : <GameScreen />}
    </div>
    <StoryOverlay />
  </>;
}
