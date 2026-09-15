import type { Enemy } from '../../../types/enemy';
import { applyEnemyDamage, type EnemyIntentResult } from './enemyIntent';

/** 每筆有效攻擊消耗一次甲，追加命中與最大單擊各自記錄。 */
export function resolvePlayerHit(source: Enemy, damage: number, bonus: boolean) {
  const armor = source.armor ?? 0;
  const multiplier = (armor > 0 ? source.traits?.hitArmor?.multiplier ?? 1 : 1)
    * (source.exposure ?? 1) * (1 + (source.hitsTaken ?? 0) * (source.traits?.comboVulnerability ?? 0));
  const value = Math.ceil(Math.max(0, damage) * multiplier);
  const hit = applyEnemyDamage(source, value);
  if (hit.damageTaken <= 0) return { ...hit, value, retaliation: 0 };
  const enemy: Enemy = { ...hit.enemy, armor: Math.max(0, armor - 1),
    hitsTaken: (source.hitsTaken ?? 0) + 1, bonusHits: (source.bonusHits ?? 0) + Number(bonus),
    roundDamage: (source.roundDamage ?? 0) + hit.damageTaken,
    largestHit: Math.max(source.largestHit ?? 0, hit.damageTaken),
    shieldBroken: source.shieldBroken || (source.shield > 0 && hit.enemy.shield === 0) };
  const counter = enemy.intents[enemy.currentIntentIndex].retaliate;
  const retaliation = enemy.hp > 0 && !enemy.retaliated && counter && enemy.hitsTaken! >= counter.hits ? counter.damage : 0;
  if (retaliation > 0) enemy.retaliated = true;
  return { enemy, value, damageTaken: hit.damageTaken, retaliation };
}

/** 一輪結束才更換階段，已公開的當輪招式不會中途改變。 */
export function finishEnemyRound(source: Enemy, result: EnemyIntentResult, hpHits: number): Enemy {
  const intent = source.intents[source.currentIntentIndex];
  let enemy: Enemy = { ...source, hp: Math.min(source.maxHp, source.hp + result.healing),
    shield: source.shield - result.shieldCost + result.shieldGain,
    strength: (source.strength ?? 0) + result.strengthGain + hpHits * (source.traits?.onHpHit ?? 0),
    exposure: !result.cancelled ? intent.expose : undefined,
    healsUsed: { ...source.healsUsed, ...(result.healing > 0 ? { [intent.name]: (source.healsUsed?.[intent.name] ?? 0) + 1 } : {}) },
    currentIntentIndex: result.nextIntentIndex, hitsTaken: 0, bonusHits: 0, roundDamage: 0,
    largestHit: 0, shieldBroken: false, retaliated: false, sealedDie: undefined, grapple: undefined };
  for (const [index, phase] of (source.phases ?? []).entries()) {
    if (index + 1 > (enemy.phase ?? 0) && enemy.hp / enemy.maxHp <= phase.below) {
      enemy = { ...enemy, phase: index + 1, intents: structuredClone([...phase.intents]) as Enemy['intents'], currentIntentIndex: 0 };
    }
  }
  return enemy;
}
