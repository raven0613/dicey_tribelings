import type { Enemy } from '../../../types/enemy';
import { describeEnemyIntent } from '../../../service/battle/enemies/enemyDescription';
import { SkillText } from '../../common/SkillText';

export function PreparationEnemyActions({ enemy }: { enemy: Enemy }) {
  const actions = (intents: Enemy['intents']) => <ol>{intents.map((_, index) => <li key={index}>
    <SkillText text={describeEnemyIntent({ ...enemy, intents, currentIntentIndex: index }, 0, 'sequence')} />
  </li>)}</ol>;
  return <>
    <strong>{enemy.name}・行動順序</strong>
    {actions(enemy.intents)}
    {enemy.phases?.map(phase => <section key={phase.below}>
      <strong>生命低於 {phase.below * 100}%</strong>
      {actions([...phase.intents])}
    </section>)}
  </>;
}
