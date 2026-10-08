import { currentIntent } from '../battle/enemies/enemyIntent';
import type { EnemyIntentResult } from '../battle/enemies/enemyIntent';
import type { EnemyRoundEvent } from '../battle/enemies/enemyRound';
import type { Enemy } from '../../types/enemy';
import type { EnemyActionRecord, RerollDetail } from './decisionTypes';
import type { TelemetryState } from './types';
import type { RerollStep } from '../battle/creatures/rerollResolution';
import { getRoundFace } from '../battle/creatures/imposterResolution';
import { combatNumber } from '../battle/creatures/creatureState';

export function rerollDetail(
  before: TelemetryState,
  step: RerollStep,
  reason: RerollDetail['reason'],
  teacherId?: string,
): RerollDetail {
  const die = before.dicePool[step.dieIndex];
  const face = (index: number, state: typeof step.state) => {
    const effective = getRoundFace(die, index, state);
    return { faceIndex: index, creature: effective.creature, baseValue: effective.baseValue };
  };
  return {
    diceId: die.id,
    diceName: die.name,
    reason,
    ...(teacherId ? { teacherId } : {}),
    before: face(before.rolledIndices[step.dieIndex], before.creatureBattleState),
    after: face(step.rolledIndices[step.dieIndex], step.state),
    rolledFaceIndex: step.state.rollOrigins[die.id],
  };
}

/** Uses committed event prefixes so an interrupted animation never records future damage. */
export function enemyActionDetails(
  events: EnemyRoundEvent[],
  enemies: Enemy[],
  resolutions: Record<string, EnemyIntentResult>,
  player: { hp: number; shield: number },
  complete: boolean,
): EnemyActionRecord[] {
  const records = new Map<string, EnemyActionRecord>();
  const entry = (enemy: Enemy, source: 'intent' | 'grapple') => {
    const key = `${enemy.id}:${source}`;
    if (!records.has(key))
      records.set(key, {
        enemyId: enemy.id,
        enemyName: enemy.name,
        intent: currentIntent(enemy).name,
        source,
        hits: 0,
        damage: 0,
        hpLoss: 0,
        absorbed: 0,
        counterTriggered: source === 'intent' && !!resolutions[enemy.id]?.counterTriggered,
        cancelled: source === 'intent' && !!resolutions[enemy.id]?.cancelled,
      });
    return records.get(key)!;
  };
  let { hp, shield } = player;
  for (const event of events) {
    if (event.kind === 'enemy') {
      const record = entry(event.enemy, event.source ?? 'intent');
      record.hits++;
      record.damage = combatNumber(record.damage + event.damage);
      record.hpLoss = combatNumber(record.hpLoss + Math.max(0, hp - event.hp));
      record.absorbed = combatNumber(record.absorbed + Math.max(0, shield - event.shield));
    }
    hp = event.hp;
    shield = event.shield;
  }
  if (complete) for (const enemy of enemies) if (resolutions[enemy.id]) entry(enemy, 'intent');
  return [...records.values()];
}
