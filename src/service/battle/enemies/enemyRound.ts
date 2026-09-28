import type { Enemy } from '../../../types/enemy';
import type { BattleComboSummary, EnemyDamageSource } from '../../../types/battle';
import type { CreatureBattleState } from '../../../types/creatures';
import type { Equipment } from '../../../types/game';
import { buildAttackPlan } from '../attackPlan';
import { choose, combatNumber } from '../creatures/creatureState';
import { applyEnemyDamage, currentIntent, resolveEnemyIntent, type EnemyIntentResult } from './enemyIntent';
import { finishEnemyRound } from './enemyMechanics';
type Attack = ReturnType<typeof buildAttackPlan>[number];
export interface EnemyRoundEvent {
  source?: EnemyDamageSource; kind: 'player' | 'enemy' | 'reflection'; damage: number; heavy?: boolean;
  attack?: Attack; enemy: Enemy; enemies: Enemy[]; hp: number; shield: number;
}
/** 正式結算、目標切換預覽及模擬共用。生命與盾已套用本輪土人收益。 */
export function resolveEnemyRound(sources: readonly Enemy[], summary: BattleComboSummary, equipment: Equipment[],
  player: { hp: number; shield: number }, round: CreatureBattleState, selectedId?: string | null) {
  let enemies = structuredClone([...sources]), hp = player.hp, shield = player.shield;
  const events: EnemyRoundEvent[] = [], resolutions: Record<string, EnemyIntentResult> = {};
  const commands: { sourceId: string; value: number }[] = [];
  const update = (enemy: Enemy) => { enemies = enemies.map(item => item.id === enemy.id ? enemy : item); };
  for (const attack of buildAttackPlan(summary, enemies, equipment, selectedId, round)) {
    enemies = attack.enemies;
    events.push({ kind: 'player', damage: attack.value, attack, enemy: attack.enemy!, enemies, hp, shield });
  }
  const actionEnemies = enemies;
  for (const original of actionEnemies) {
    let enemy = enemies.find(item => item.id === original.id)!;
    if (enemy.hp <= 0 || hp <= 0) continue;
    const receive = (damage: number, heavy = false, source: EnemyDamageSource = 'intent') => {
      damage = Math.floor(combatNumber(damage));
      const absorbed = Math.min(shield, damage), loss = Math.min(hp, damage - absorbed);
      shield = combatNumber(shield - absorbed); hp = combatNumber(hp - loss);
      events.push({ kind: 'enemy', source, damage, heavy, enemy, enemies, hp, shield });
      if (loss > 0 && summary.reflection > 0 && enemy.hp > 0) {
        enemy = applyEnemyDamage(enemy, summary.reflection).enemy; update(enemy);
        events.push({ kind: 'reflection', damage: summary.reflection, enemy, enemies, hp, shield });
      }
      return loss === 0;
    };
    const intent = currentIntent(enemy);
    const result = resolveEnemyIntent(enemy, enemy.roundDamage, summary.totalShield);
    resolutions[enemy.id] = result;
    const grapple = enemy.grapple;
    if (grapple && !round.rerolledDice?.includes(grapple.diceId) && (enemy.roundDamage ?? 0) < grapple.breakDamage)
      receive(grapple.damage, false, 'grapple');
    let fullyBlocked = true;
    for (let hit = 0; hit < result.hits && enemy.hp > 0 && hp > 0; hit++)
      fullyBlocked = receive(result.damage, intent.type === 'heavy_attack') && fullyBlocked;
    if (enemy.hp <= 0 || hp <= 0) continue;
    enemy = finishEnemyRound(enemy, result, fullyBlocked, round.manualRerolls);
    if (!result.cancelled) {
      const target = choose(summary.items.map(item => item.diceId), round.seed, `enemy:${enemy.id}:${round.round}`);
      if (target && intent.seal) enemy.sealedDie = target;
      if (target && intent.grapple && !fullyBlocked) enemy.grapple = { diceId: target, ...intent.grapple };
      if (intent.command) commands.push({ sourceId: enemy.id, value: intent.command });
    }
    update(enemy);
  }
  // 號令在所有當輪行動完成後給存活同伴，僅影響下一輪。
  for (const command of commands) enemies = enemies.map(enemy => enemy.hp > 0 && enemy.id !== command.sourceId
    ? { ...enemy, strength: Math.max(enemy.strength ?? 0, command.value) } : enemy);
  return { enemies, hp, shield, events, resolutions, actionEnemies };
}
