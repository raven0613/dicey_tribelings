import { Crown, Shield, Skull } from 'lucide-react';
import type { Enemy } from '../../types/enemy';

export function EnemyVitals({ enemy }: { enemy: Enemy }) {
  const percent = Math.max(0, Math.min(100, enemy.hp / enemy.maxHp * 100));
  return <div className="enemy-vitals">
    <div className="enemy-name-row">
      <h2>{enemy.name}</h2>
      {enemy.isBoss ? <span className="enemy-rank"><Crown className="ui-icon" />BOSS</span>
        : enemy.isElite && <span className="enemy-rank"><Skull className="ui-icon" />菁英</span>}
    </div>
    <div className="enemy-health-track" role="progressbar" aria-label={`${enemy.name}生命`}
      aria-valuenow={enemy.hp} aria-valuemin={0} aria-valuemax={enemy.maxHp}>
      <div className="enemy-health-fill" style={{ width: `${percent}%` }} />
    </div>
    <div className="enemy-health-values"><span>{enemy.hp} / {enemy.maxHp}</span>
      {enemy.shield > 0 && <span className="enemy-shield"><Shield className="ui-icon" />{enemy.shield}</span>}
    </div>
  </div>;
}
