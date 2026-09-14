import { BATTLE_LIMIT } from '../../configs/battleConfig';
import { FOOD_CAPACITY } from '../../configs/materials/materialConfig';
import { Heart, Shield } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

export function PlayerVitals() {
  const { playerHp, maxHp, playerShield, playerShieldDisplay, creatureBattleState } = useGameStore();
  const round = Math.max(1, creatureBattleState.round);
  const remaining = BATTLE_LIMIT.rounds - round + 1;
  const stored = Object.values(creatureBattleState.storedFood).reduce((sum, value) => sum + value, 0);
  const shield = playerShieldDisplay ?? playerShield;
  return <div className="player-vitals" aria-label="玩家生命與護盾">
    <span className={`battle-round ${remaining <= BATTLE_LIMIT.warningRemaining ? 'is-warning' : ''}`} role="status">回合 {round}／{BATTLE_LIMIT.rounds}{remaining <= BATTLE_LIMIT.warningRemaining && `・剩 ${remaining} 回合`}</span>
    <Heart size={22} />
    <strong className="player-health-value">{playerHp} / {maxHp}</strong>
    <div className="player-health-track" role="progressbar" aria-label="生命"
      aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={playerHp}>
      <div style={{ width: `${playerHp / maxHp * 100}%` }} />
    </div>
    <span className="player-shield-value"><Shield size={20} />護盾 <strong>{shield}</strong></span>
    <span className="food-capacity">儲糧 {stored}／{FOOD_CAPACITY.crocodile}</span>
  </div>;
}
