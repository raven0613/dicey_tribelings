import { combatNumber } from '../creatures/creatureState';
import type { Enemy } from '../../../types/enemy';

/** 各段傷害先消耗護盾；累計值採實際扣除量，包含擊破護盾的傷害。 */
export function applyEnemyDamage(enemy: Enemy, damage: number): { enemy: Enemy; damageTaken: number } {
  if (enemy.hp <= 0) return { enemy: { ...enemy }, damageTaken: 0 };
  const incoming = Math.max(0, damage);
  const shieldLoss = Math.min(enemy.shield, incoming);
  const hpLoss = Math.min(enemy.hp, combatNumber(incoming - shieldLoss));
  return {
    enemy: { ...enemy, hp: combatNumber(enemy.hp - hpLoss), shield: combatNumber(enemy.shield - shieldLoss) },
    damageTaken: combatNumber(shieldLoss + hpLoss),
  };
}

export interface EnemyIntentResult {
  damage: number;
  hits: number;
  shieldGain: number;
  healing: number;
  shieldCost: number;
  strengthGain: number;
  counterTriggered: boolean;
  nextIntentIndex: number;
  cancelled: boolean;
}

/** 條件讀取本輪逐段紀錄；玩家護盾條件由每次攻擊前的狀態判斷。 */
export function resolveEnemyIntent(enemy: Enemy, damageTaken = enemy.roundDamage ?? 0,
  playerShield = 0, tagCount = 0, hitMultiplier = 1): EnemyIntentResult {
  const result: EnemyIntentResult = { damage: 0, hits: 0, shieldGain: 0, healing: 0,
    shieldCost: 0, strengthGain: 0, counterTriggered: false, cancelled: false, nextIntentIndex: enemy.currentIntentIndex };
  if (enemy.hp <= 0) return result;
  const intent = enemy.intents[enemy.currentIntentIndex];
  result.nextIntentIndex = (enemy.currentIntentIndex + 1) % enemy.intents.length;
  const counter = 'counter' in intent ? intent.counter : undefined;
  result.counterTriggered = counter?.type === 'damage_taken'
    ? damageTaken >= Math.max(0, counter.threshold - (enemy.bonusHits ?? 0) * (counter.bonusReduction ?? 0))
    : counter?.type === 'shield_depleted' && enemy.shield === 0;
  result.cancelled = Boolean((result.counterTriggered && counter?.effect === 'cancel')
    || (intent.stunOnBreak && enemy.shieldBroken));
  if (result.cancelled) return result;
  if (intent.heal && (enemy.healsUsed?.[intent.name] ?? 0) < intent.heal.uses) {
    result.healing = Math.min(enemy.maxHp - enemy.hp, intent.heal.amount,
      intent.heal.consumeShield ? enemy.shield : Infinity);
    result.shieldCost = intent.heal.consumeShield ? result.healing : 0;
  }
  result.strengthGain = intent.strength ?? 0;
  if (intent.type === 'charge' || intent.type === 'rest') return result;
  if (intent.type === 'defend') { result.shieldGain = intent.value; return result; }
  const power = enemy.traits?.missingHpPower;
  let value = intent.value + (enemy.strength ?? 0)
    + (power ? Math.floor((1 - enemy.hp / enemy.maxHp + Number.EPSILON) / power.fraction) * power.damage : 0);
  if (playerShield === 0) value += intent.unshieldedBonus ?? 0;
  if (enemy.shield > 0) value *= intent.shieldMultiplier ?? 1;
  const weakened = (result.counterTriggered && counter?.effect === 'halve')
    || (intent.singleHitThreshold !== undefined && (enemy.largestHit ?? 0) >= intent.singleHitThreshold)
    || (intent.diverseTags !== undefined && tagCount >= intent.diverseTags);
  result.counterTriggered ||= Boolean(weakened);
  result.damage = Math.floor(combatNumber(value * (weakened ? 0.5 : 1) * hitMultiplier));
  result.hits = intent.hits ?? 1;
  return result;
}
