import { ceilDamage } from '../damageValue';
import type { Enemy } from '../../../types/enemy';
import { applyEnemyDamage, currentIntent, type EnemyIntentResult } from './enemyIntent';
export function resolvePlayerHit(source: Enemy, damage: number) {
  const armor = source.armor ?? 0;
  const multiplier = (armor > 0 ? source.traits?.hitArmor?.multiplier ?? 1 : 1)
    * (source.exposure ?? 1) * (currentIntent(source).mitigation ?? 1);
  const value = ceilDamage(Math.max(0, damage) * multiplier);
  const hit = applyEnemyDamage(source, value);
  if (hit.damageTaken <= 0) return { ...hit, value };
  return { enemy: { ...hit.enemy, armor: Math.max(0, armor - 1), armorStun: source.armorStun || armor === 1,
    hitsTaken: (source.hitsTaken ?? 0) + 1, roundDamage: (source.roundDamage ?? 0) + hit.damageTaken }, value, damageTaken: hit.damageTaken };
}
/** 公開的當輪招式保持不變；防守露隙、怒氣與半血階段在回合交界生效。 */
export function finishEnemyRound(source: Enemy, result: EnemyIntentResult, blocked: boolean, manualRerolls: number): Enemy {
  const intent = currentIntent(source), furyRule = source.traits?.rerollFury;
  const fury = source.furyPending ? 0 : (source.fury ?? 0) + manualRerolls;
  const actionsTaken = (source.actionsTaken ?? 0) + 1;
  let enemy: Enemy = { ...source, shield: source.shield + result.shieldGain,
    strength: 0, exposure: !result.cancelled && result.hits > 0 && blocked ? intent.exposeOnBlock : undefined,
    currentIntentIndex: result.nextIntentIndex, hitsTaken: 0, roundDamage: 0, armorStun: false,
    sealedDie: undefined, grapple: undefined, actionsTaken, fury,
    furyPending: !!furyRule && !source.furyPending && fury >= furyRule.threshold,
    prizeLost: source.prizeLost || (!!source.traits?.contraband && actionsTaken >= source.traits.contraband.deadline) };
  for (const [index, phase] of (source.phases ?? []).entries()) {
    if (index + 1 > (enemy.phase ?? 0) && enemy.hp / enemy.maxHp <= phase.below)
      enemy = { ...enemy, phase: index + 1, intents: structuredClone([...phase.intents]) as Enemy['intents'], currentIntentIndex: 0 };
  }
  return enemy;
}
