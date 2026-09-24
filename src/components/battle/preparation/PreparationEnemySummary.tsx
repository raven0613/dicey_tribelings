import { Heart, Shield } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { describeEnemyIntent } from '../../../service/battle/enemies/enemyDescription';
import { SkillText } from '../../common/SkillText';

export function PreparationEnemySummary() {
  const enemy = useGameStore((state) => state.currentEnemy)!;
  return <section className="preparation-enemy" aria-label="下一場敵人">
    <div className="preparation-enemy-heading">
      <span aria-hidden="true">{enemy.avatar}</span><strong>{enemy.name}</strong>
      <span><Heart className="ui-icon" /> {enemy.hp}／{enemy.maxHp}</span>
      <span><Shield className="ui-icon" /> {enemy.shield}</span>
      {enemy.isBoss && <span>BOSS</span>}{enemy.isElite && <span>菁英</span>}
    </div>
    <p><SkillText text={describeEnemyIntent(enemy)} /></p>
    <details><summary>查看完整行動與階段</summary>
      <ol>{enemy.intents.map((_, index) => <li key={index}>
        <SkillText text={describeEnemyIntent({ ...enemy, currentIntentIndex: index })} />
      </li>)}</ol>
      {enemy.phases?.map((phase) => <div key={phase.below}>
        <strong>生命低於 {phase.below * 100}%</strong>
        <ol>{phase.intents.map((_, index) => <li key={index}><SkillText text={describeEnemyIntent({
          ...enemy, intents: [...phase.intents], currentIntentIndex: index,
        })} /></li>)}</ol>
      </div>)}
    </details>
  </section>;
}
