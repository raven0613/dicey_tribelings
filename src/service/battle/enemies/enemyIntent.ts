import { combatNumber } from '../creatures/creatureState';
import type { Enemy } from '../../../types/enemy';
export function applyEnemyDamage(enemy: Enemy, damage: number): { enemy: Enemy; damageTaken: number } {
  if (enemy.hp <= 0) return { enemy: { ...enemy }, damageTaken: 0 };
  const incoming = Math.max(0, damage), shieldLoss = Math.min(enemy.shield, incoming);
  const hpLoss = Math.min(enemy.hp, combatNumber(incoming - shieldLoss));
  return { enemy: { ...enemy, hp: combatNumber(enemy.hp - hpLoss), shield: combatNumber(enemy.shield - shieldLoss) },
    damageTaken: combatNumber(shieldLoss + hpLoss) };
}
export const currentIntent = (enemy: Enemy) => enemy.furyPending ? enemy.traits!.rerollFury!.intent : enemy.intents[enemy.currentIntentIndex];
export interface EnemyIntentResult {
  damage: number; hits: number; shieldGain: number; counterTriggered: boolean; nextIntentIndex: number; cancelled: boolean;
}
/** 新生護盾條件使用整輪快照，消耗護盾與敵人行動順序不改變條件結果。 */
export function resolveEnemyIntent(enemy: Enemy, damageTaken = enemy.roundDamage ?? 0, generatedShield = 0): EnemyIntentResult {
  const result: EnemyIntentResult = { damage: 0, hits: 0, shieldGain: 0, counterTriggered: false,
    cancelled: false, nextIntentIndex: enemy.currentIntentIndex };
  if (enemy.hp <= 0) return result;
  const intent = currentIntent(enemy);
  result.nextIntentIndex = enemy.furyPending ? enemy.currentIntentIndex : enemy.traits?.fatigue
    ? Math.min(enemy.currentIntentIndex + 1, enemy.intents.length - 1) : (enemy.currentIntentIndex + 1) % enemy.intents.length;
  const counter = intent.counter;
  const condition = counter?.type === 'damage_taken' ? damageTaken >= counter.threshold
    : counter?.type === 'shield_depleted' && enemy.shield === 0;
  result.cancelled = !!enemy.armorStun || !!(condition && counter?.effect === 'cancel');
  result.counterTriggered = !!condition;
  if (result.cancelled) return result;
  result.shieldGain = (intent.type === 'defend' ? intent.value : 0) + (intent.shieldGain ?? 0);
  if (intent.type !== 'attack' && intent.type !== 'heavy_attack') return result;
  const hitWeaken = intent.hitWeaken !== undefined && (enemy.hitsTaken ?? 0) >= intent.hitWeaken;
  const shieldWeaken = intent.shieldWeaken !== undefined && generatedShield >= intent.shieldWeaken;
  const weakened = hitWeaken || (condition && counter?.effect === 'halve');
  result.counterTriggered ||= hitWeaken || shieldWeaken;
  result.damage = Math.floor((intent.value + (enemy.strength ?? 0)) * (enemy.shield > 0 ? intent.shieldMultiplier ?? 1 : 1) * (weakened ? 0.5 : 1));
  result.hits = Math.max(0, (intent.hits ?? 1) - Number(shieldWeaken));
  return result;
}
