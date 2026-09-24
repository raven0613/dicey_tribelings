import type { Enemy } from '../../../types/enemy';
import type { BattleComboSummary, EnemyDamageSource } from '../../../types/battle';
import type { CreatureBattleState } from '../../../types/creatures';
import type { Equipment } from '../../../types/game';
import { buildAttackPlan, buildRawAttackPlan, resolveAttack } from '../attackPlan';
import { choose, combatNumber } from '../creatures/creatureState';
import { applyEnemyDamage, resolveEnemyIntent } from './enemyIntent';
import { finishEnemyRound } from './enemyMechanics';

type Attack = ReturnType<typeof buildAttackPlan>[number];
export interface EnemyRoundEvent {
  source?: EnemyDamageSource;
  kind: 'player' | 'enemy' | 'reflection';
  damage: number;
  heavy?: boolean;
  attack?: Attack;
  enemy: Enemy;
  hp: number;
  shield: number;
}

/** 正式結算、Control 預覽及模擬共用；輸入生命與盾為套用土人收益後的值。 */
export function resolveEnemyRound(source: Enemy, summary: BattleComboSummary, equipment: Equipment[],
  player: { hp: number; shield: number }, round: CreatureBattleState) {
  let enemy = structuredClone(source), hp = player.hp, shield = player.shield;
  const events: EnemyRoundEvent[] = [];
  let hpHits = 0;
  const receive = (damage: number, heavy = false, grows = false, source: EnemyDamageSource = 'intent') => {
    damage = Math.floor(combatNumber(damage));
    const absorbed = Math.min(shield, damage);
    shield = combatNumber(shield - absorbed);
    const loss = Math.min(hp, damage - absorbed);
    hp = combatNumber(hp - loss);
    if (loss > 0 && grows) hpHits++;
    events.push({ kind: 'enemy', source, damage, heavy, enemy, hp, shield });
    if (loss > 0 && summary.reflection > 0 && enemy.hp > 0) {
      const reflected = applyEnemyDamage(enemy, summary.reflection);
      enemy = { ...reflected.enemy, roundDamage: (enemy.roundDamage ?? 0) + reflected.damageTaken,
        shieldBroken: enemy.shieldBroken || (enemy.shield > 0 && reflected.enemy.shield === 0) };
      events.push({ kind: 'reflection', damage: summary.reflection, enemy, hp, shield });
    }
    return loss === 0;
  };
  for (const raw of buildRawAttackPlan(summary)) {
    if (hp <= 0) break;
    const attack = resolveAttack(raw, enemy, equipment);
    enemy = attack.enemy;
    events.push({ kind: 'player', damage: attack.value, attack, enemy, hp, shield });
    if (enemy.hp > 0 && attack.retaliation > 0) receive(attack.retaliation, false, false, 'retaliation');
  }
  const actionEnemy = enemy;
  const intent = enemy.intents[enemy.currentIntentIndex];
  const tags = new Set(summary.items.flatMap((item) => item.tags.filter((tag) => tag !== 'food'))).size;
  const resolution = resolveEnemyIntent(enemy, enemy.roundDamage, shield, tags);
  if (enemy.hp > 0 && hp > 0) {
    if (source.grapple && !round.rerolledDice?.includes(source.grapple.diceId)) receive(source.grapple.damage, false, false, 'grapple');
    let firstBlocked = false;
    for (let hit = 0; hit < resolution.hits && enemy.hp > 0 && hp > 0; hit++) {
      const powered = { ...enemy, strength: (enemy.strength ?? 0) + hpHits * (enemy.traits?.onHpHit ?? 0) };
      const current = resolveEnemyIntent(powered, enemy.roundDamage, shield, tags,
        hit > 0 && firstBlocked ? intent.guardedFollowup ?? 1 : 1);
      const blocked = receive(current.damage, intent.type === 'heavy_attack', true);
      if (hit === 0) firstBlocked = blocked;
    }
    if (enemy.hp > 0 && hp > 0) {
      enemy = finishEnemyRound(enemy, resolution, hpHits);
      if (!resolution.cancelled) {
        const target = choose(summary.items.map((item) => item.diceId), round.seed, `enemy:${source.id}:${round.round}`);
        if (target && intent.seal) enemy.sealedDie = target;
        if (target && intent.grapple) enemy.grapple = { diceId: target, damage: intent.grapple };
      }
    }
  }
  return { enemy, hp, shield, events, resolution, actionEnemy };
}
