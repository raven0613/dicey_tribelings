import type { CSSProperties, ReactNode } from 'react';
import { BATTLE_PRESENTATION } from '../../configs/battleConfig';
import { useGameStore } from '../../store/gameStore';
import { EquipmentBar } from '../equipment/EquipmentBar';
import { PlayerImpact } from './PlayerImpact';

export function PlayerBoard({ children, isCombat }: { children: ReactNode; isCombat: boolean }) {
  const enemyAttack = useGameStore((state) => state.enemyAttack);
  const isHit = isCombat && (enemyAttack?.stage === 'impact' || enemyAttack?.stage === 'recoil');

  return <section id="battle-player-target"
    className={`dice-board ${isCombat ? '' : 'is-event'} ${isHit ? 'is-hit' : ''} ${enemyAttack?.heavy ? 'heavy-hit' : ''} ${enemyAttack?.healthDamage === 0 ? 'shield-hit' : ''}`}
    style={{ '--player-impact-duration': `${BATTLE_PRESENTATION.enemyImpactMs + BATTLE_PRESENTATION.enemyRecoilMs}ms` } as CSSProperties}>
    {isCombat && <PlayerImpact />}
    <div className="board-body">
      <EquipmentBar />
      <div className="board-content">{children}</div>
    </div>
  </section>;
}
