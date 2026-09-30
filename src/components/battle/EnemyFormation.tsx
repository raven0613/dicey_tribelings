import type { CSSProperties } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ENEMY_PRESENTATION as config } from '../../configs/monsters/enemyPresentationConfig';
import { EnemyFigure } from './EnemyFigure';
import { EnemyIntentBubble } from './EnemyIntentBubble';

export function EnemyFormation() {
  const enemies = useGameStore(state => state.enemies);
  return <div className="enemy-formation" style={{
    '--enemy-member-width': `${config.memberWidth}px`, '--enemy-sprite-width': `${config.spriteWidth}px`,
    '--enemy-vitals-gap': `${config.vitalsGap}px`, '--enemy-intent-gap': `${config.intentGap}px`,
    '--enemy-headroom': `${config.formationHeadroom}px`,
  } as CSSProperties}>
    {enemies.map(enemy => <div key={enemy.id} className="enemy-member">
      <EnemyFigure enemy={enemy} /><EnemyIntentBubble enemy={enemy} />
    </div>)}
  </div>;
}
