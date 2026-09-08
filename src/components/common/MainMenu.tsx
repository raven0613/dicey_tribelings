import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useStoryStore } from '../../store/storyStore';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';

export function MainMenu() {
  const start = useGameStore((state) => state.restartGame);
  const reset = useStoryStore((state) => state.resetRecords);
  const preview = useStoryStore((state) => state.previewEnding);
  const [resetMessage, setResetMessage] = useState('');
  return <main className="main-menu">
    <div className="main-menu-art" aria-hidden="true">{CREATURE_CONFIG.family.emoji}　{CREATURE_CONFIG.princess.emoji}</div>
    <p className="main-menu-eyebrow">DICEY TRIBELINGS</p>
    <h1>骰骰土人</h1>
    <div className="main-menu-actions">
      <button type="button" className="menu-start" onClick={start}>開始遊戲</button>
      <button type="button" onClick={() => { reset(); setResetMessage('紀錄已重置'); }}
        onContextMenu={(event) => { event.preventDefault(); preview(); }}>重置紀錄</button>
    </div>
    <p className="main-menu-status" role="status">{resetMessage}</p>
  </main>;
}
