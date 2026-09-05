import type { Enemy } from '../../../types/enemy';
import { applyEnemyDamage, resolveEnemyIntent } from './enemyIntent';

export function describeEnemyIntent(enemy: Enemy): string {
  const intent = enemy.intents[enemy.currentIntentIndex];
  if (intent.type === 'rest') return `${intent.name}：本次休息。`;
  if (intent.type === 'charge') {
    const next = enemy.intents[(enemy.currentIntentIndex + 1) % enemy.intents.length];
    return `${intent.name}：本次蓄力，下回合造成 ${'value' in next ? next.value : 0} 傷害。`;
  }
  const effect = intent.type === 'defend' ? `獲得 ${intent.value} 護盾` : `造成 ${intent.value} 傷害`;
  if (!intent.counter) return `${intent.name}：${effect}。`;
  const condition = intent.counter.type === 'damage_taken'
    ? `本回合受傷達 ${intent.counter.threshold}` : '護盾耗盡';
  const outcome = intent.counter.effect === 'cancel' ? '取消' : `降至 ${Math.ceil(intent.value / 2)}`;
  return `${intent.name}：${effect}；${condition}則${outcome}。`;
}

/** Control 的目前骰況預覽；與實際結算共用護盾與門檻判定。 */
export function previewEnemyIntent(enemy: Enemy, playerDamage: number): string {
  const projected = applyEnemyDamage(enemy, playerDamage);
  if (projected.enemy.hp <= 0) return '可擊殺';
  const intent = enemy.intents[enemy.currentIntentIndex];
  if (!('counter' in intent) || !intent.counter) return '';
  const result = resolveEnemyIntent(projected.enemy, projected.damageTaken);
  if (result.counterTriggered) {
    return intent.counter.effect === 'cancel' ? '可打斷' : `可削弱至 ${result.damage} 傷害`;
  }
  const remaining = intent.counter.type === 'damage_taken'
    ? intent.counter.threshold - projected.damageTaken : projected.enemy.shield;
  return `尚差 ${remaining}`;
}
