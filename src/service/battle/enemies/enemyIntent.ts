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
  shieldGain: number;
  counterTriggered: boolean;
  nextIntentIndex: number;
}

/** 傳入整池攻擊後的敵人與本回合實際累計傷害；呼叫端負責套用結果。 */
export function resolveEnemyIntent(enemy: Enemy, damageTaken: number): EnemyIntentResult {
  const result: EnemyIntentResult = {
    damage: 0, shieldGain: 0, counterTriggered: false, nextIntentIndex: enemy.currentIntentIndex,
  };
  if (enemy.hp <= 0) return result;
  const intent = enemy.intents[enemy.currentIntentIndex];
  result.nextIntentIndex = (enemy.currentIntentIndex + 1) % enemy.intents.length;
  if (intent.type === 'charge' || intent.type === 'rest') return result;
  const counter = intent.counter;
  result.counterTriggered = counter?.type === 'damage_taken'
    ? damageTaken >= counter.threshold
    : counter?.type === 'shield_depleted' && enemy.shield === 0;
  if (result.counterTriggered && counter?.effect === 'cancel') return result;
  const value = result.counterTriggered && counter?.effect === 'halve'
    ? Math.ceil(intent.value / 2) : intent.value;
  if (intent.type === 'defend') result.shieldGain = value;
  else result.damage = value;
  return result;
}
