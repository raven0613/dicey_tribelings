import { getEnemyAppearance } from '../../../configs/monsters/enemyAppearanceConfig';
import type { Enemy } from '../../../types/enemy';
import { Heart, Shield } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useSkillTooltip } from '../../common/useSkillTooltip';
import { PreparationEnemyActions } from './PreparationEnemyActions';

export function PreparationEnemySummary() {
  const enemies = useGameStore(state => state.enemies);
  return <div className="preparation-enemies">{enemies.map(enemy => <EnemySummary key={enemy.id} enemy={enemy} />)}</div>;
}
function EnemySummary({ enemy }: { enemy: Enemy }) {
  const { tooltip, tooltipProps, show } = useSkillTooltip(<PreparationEnemyActions enemy={enemy} />, {
    interactive: true, hoverable: true, className: 'preparation-enemy-tooltip', label: `${enemy.name}・完整行動與階段`,
  });
  return <section className="preparation-enemy" aria-label="下一場敵人">
    <button type="button" className="preparation-enemy-heading" {...tooltipProps} onClick={show}>
      <img className="preparation-enemy-image" src={getEnemyAppearance(enemy.definitionId).src} alt="" /><strong>{enemy.name}</strong>
      <span><Heart className="ui-icon" /> {enemy.hp}／{enemy.maxHp}</span>
      <span><Shield className="ui-icon" /> {enemy.shield}</span>
      {enemy.isBoss && <span>BOSS</span>}{enemy.isElite && <span>菁英</span>}
    </button>
    {tooltip}
  </section>;
}
