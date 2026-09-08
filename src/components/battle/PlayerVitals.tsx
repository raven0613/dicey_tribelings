import { Heart, Shield } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

export function PlayerVitals() {
  const { playerHp, maxHp, playerShield, playerShieldDisplay } = useGameStore();
  const shield = playerShieldDisplay ?? playerShield;
  return <div className="player-vitals" aria-label="玩家生命與護盾">
    <Heart size={22} />
    <strong className="player-health-value">{playerHp} / {maxHp}</strong>
    <div className="player-health-track" role="progressbar" aria-label="生命"
      aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={playerHp}>
      <div style={{ width: `${playerHp / maxHp * 100}%` }} />
    </div>
    <span className="player-shield-value"><Shield size={20} />護盾 <strong>{shield}</strong></span>
  </div>;
}
