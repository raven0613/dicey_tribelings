import { useGameViewport } from '../layout/GameViewportContext';
import type { CSSProperties, ReactNode } from 'react';
import { BATTLE_PRESENTATION } from '../../configs/battleConfig';
import { useGameStore } from '../../store/gameStore';
import { EquipmentBar } from '../equipment/EquipmentBar';
import { PlayerImpact } from './PlayerImpact';
import { PLAYER_BOARD_PRESENTATION as board } from '../../configs/dicePresentationConfig';
import { INITIAL_PLAYER_STATS } from '../../configs/gameConfig';
import { getDiceTrayMetrics } from '../../service/dice/diceTrayLayout';
import { useDiceSize } from './useDiceSize';

export function PlayerBoard({ children, isCombat }: { children: ReactNode; isCombat: boolean }) {
  const enemyAttack = useGameStore((state) => state.enemyAttack);
  const isHit = isCombat && (enemyAttack?.stage === 'impact' || enemyAttack?.stage === 'recoil');
  const { minimumFontSize } = useGameViewport();
  const size = useDiceSize();
  const trayHeight = getDiceTrayMetrics(size, minimumFontSize).height;
  const equipmentHeight = INITIAL_PLAYER_STATS.maxEquipmentSlots * board.equipmentSlotSize
    + (INITIAL_PLAYER_STATS.maxEquipmentSlots - 1) * board.equipmentSlotGap;

  return <section id="battle-player-target"
    className={`dice-board ${isCombat ? '' : 'is-event'} ${isHit ? 'is-hit' : ''} ${enemyAttack?.heavy ? 'heavy-hit' : ''} ${enemyAttack?.healthDamage === 0 ? 'shield-hit' : ''}`}
    style={{
      '--player-impact-duration': `${BATTLE_PRESENTATION.enemyImpactMs + BATTLE_PRESENTATION.enemyRecoilMs}ms`,
      '--board-body-height': `${Math.max(trayHeight + board.scrollbarSpace, equipmentHeight)}px`,
      '--equipment-slot-size': `${board.equipmentSlotSize}px`,
      '--equipment-slot-gap': `${board.equipmentSlotGap}px`,
      '--tray-scrollbar-size': `${board.scrollbarSpace}px`,
    } as CSSProperties}>
    {isCombat && <PlayerImpact />}
    <div className="board-body">
      <EquipmentBar />
      <div className="board-content">{children}</div>
    </div>
  </section>;
}
