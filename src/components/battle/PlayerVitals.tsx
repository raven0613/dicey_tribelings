import { useShallow } from 'zustand/react/shallow';
import { RationsBadge } from './BattleStatusBadges';
import { BATTLE_LIMIT } from '../../configs/battleConfig';
import { FOOD_CAPACITY } from '../../configs/materials/materialConfig';
import { Heart, Shield } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

export function PlayerVitals() {
  const { playerHp, playerHpDisplay, maxHp, playerShield, playerShieldDisplay, creatureBattleState, hoveredEquipmentId, equipments, combatPhase } = useGameStore(useShallow((state) => ({
    playerHp: state.playerHp,
    playerHpDisplay: state.playerHpDisplay,
    maxHp: state.maxHp,
    playerShield: state.playerShield,
    playerShieldDisplay: state.playerShieldDisplay,
    creatureBattleState: state.creatureBattleState,
    hoveredEquipmentId: state.hoveredEquipmentId,
    equipments: state.equipments,
    combatPhase: state.combatPhase,
  })));
  const round = Math.max(1, creatureBattleState.round);
  const remaining = BATTLE_LIMIT.rounds - round + 1;
  const stored = Object.values(creatureBattleState.storedFood).reduce((sum, value) => sum + value, 0);
  const highlightShield = combatPhase === 'CONTROL_PHASE' && equipments.some((equipment) => equipment.id === hoveredEquipmentId && equipment.ruleId === 'SHIELD_RETENTION');
  const hp = playerHpDisplay ?? playerHp;
  const shield = playerShieldDisplay ?? playerShield;
  return <div className="player-vitals" aria-label="玩家生命與護盾">
    <span className={`battle-round ${remaining <= BATTLE_LIMIT.warningRemaining ? 'is-warning' : ''}`} role="status">回合 {round}／{BATTLE_LIMIT.rounds}{remaining <= BATTLE_LIMIT.warningRemaining && `・剩 ${remaining} 回合`}</span>
    <Heart className="ui-icon" />
    <strong className="player-health-value">{hp} / {maxHp}</strong>
    <div className="player-health-track" role="progressbar" aria-label="生命"
      aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hp}>
      <div style={{ width: `${hp / maxHp * 100}%` }} />
    </div>
    <span className={`player-shield-value ${highlightShield ? 'is-highlighted' : ''}`}><Shield className="ui-icon" />護盾 <strong>{shield}</strong></span>
    <RationsBadge />
    <span className="food-capacity">存糧 {stored}／{FOOD_CAPACITY.crocodile}</span>
  </div>;
}
