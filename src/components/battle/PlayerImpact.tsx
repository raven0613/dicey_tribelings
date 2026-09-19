import { Heart, Shield } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

export function PlayerImpact() {
  const enemyAttack = useGameStore((state) => state.enemyAttack);
  if (!enemyAttack || (enemyAttack.stage !== 'impact' && enemyAttack.stage !== 'recoil')) return null;
  return <div className="player-impact" aria-live="polite">
    <div className="player-impact-ring" />
    <div className="player-impact-values">
      {enemyAttack.shieldDamage > 0 && <span className="shield-loss"><Shield size={22} />護盾 −{enemyAttack.shieldDamage}</span>}
      {enemyAttack.healthDamage > 0
        ? <span className="health-loss"><Heart size={24} />生命 −{enemyAttack.healthDamage}</span>
        : <span className="shield-loss">完全格擋</span>}
    </div>
  </div>;
}
