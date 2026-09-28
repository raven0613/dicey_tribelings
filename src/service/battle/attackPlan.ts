import type { Enemy } from '../../types/enemy';
import { resolvePlayerHit } from './enemies/enemyMechanics';
import type { BattleComboSummary } from '../../types/battle';
import type { Equipment } from '../../types/game';
import type { CreatureBattleState } from '../../types/creatures';
import { EQUIPMENT_BALANCE, hasEquipment } from '../../configs/equipment/equipmentConfig';
import { ceilDamage } from './damageValue';
export function buildRawAttackPlan(summary: Pick<BattleComboSummary, 'items' | 'bonusDice' | 'repeatAttacks'>) {
  return [
    ...summary.items.flatMap((item, index) => item.finalDamage > 0
      ? [{ index, diceId: item.diceId, kind: 'normal' as const, bonus: false, value: item.finalDamage, creature: item.creature, label: '' }] : []),
    ...summary.bonusDice.flatMap((bonus, index) => bonus.bonusDamage > 0
      ? [{ index, diceId: '', kind: 'bonus' as const, bonus: true, value: bonus.bonusDamage, creature: bonus.creature, label: bonus.label }] : []),
    ...summary.repeatAttacks.map((attack) => {
      const index = summary.items.findIndex(item => item.diceId === attack.diceId);
      return { index, diceId: attack.diceId, kind: 'repeat' as const, bonus: false, value: attack.damage, creature: summary.items[index].creature, label: attack.label ?? '公主命令' };
    }),
  ];
}
export function resolveAttack(attack: ReturnType<typeof buildRawAttackPlan>[number], enemy: Enemy, equipment: Equipment[], multiplier = 1) {
  const hammer = hasEquipment(equipment, 'WARHAMMER') && enemy.shield > 0;
  const hit = resolvePlayerHit(enemy, attack.value * multiplier * (hammer ? EQUIPMENT_BALANCE.shieldDamageMultiplier : 1));
  return { ...attack, value: hit.value, enemy: hit.enemy };
}
export function attackTarget(enemies: readonly Enemy[], selectedId?: string | null): Enemy | undefined {
  return enemies.find(enemy => enemy.id === selectedId && enemy.hp > 0) ?? enemies.find(enemy => enemy.hp > 0);
}
/** 逐筆轉向存活目標；全滅後保留最後擊敗的目標，完整計算並演出剩餘攻擊。 */
export function buildAttackPlan(summary: Pick<BattleComboSummary, 'items' | 'bonusDice' | 'repeatAttacks'>,
  targets: readonly Enemy[] | number, equipment: Equipment[], selectedId?: string | null,
  round?: Pick<CreatureBattleState, 'watchedDieId'>) {
  const raw = buildRawAttackPlan(summary);
  if (typeof targets === 'number') {
    let shield = targets;
    return raw.map(attack => {
      const value = ceilDamage(attack.value * (hasEquipment(equipment, 'WARHAMMER') && shield > 0 ? EQUIPMENT_BALANCE.shieldDamageMultiplier : 1));
      shield = Math.max(0, shield - value);
      return { ...attack, value, enemy: undefined as Enemy | undefined, enemies: [] as Enemy[] };
    });
  }
  let enemies = structuredClone([...targets]);
  const attacks: (ReturnType<typeof resolveAttack> & { enemies: Enemy[] })[] = [];
  let enemy = attackTarget(enemies, selectedId);
  if (!enemy) return attacks;
  for (const rawAttack of raw) {
    enemy = attackTarget(enemies, selectedId) ?? enemy;
    const watchers = enemies.filter(target => target.hp > 0 && target.traits?.watch);
    const multiplier = rawAttack.kind === 'normal' && rawAttack.diceId === round?.watchedDieId
      ? watchers.reduce((m, target) => m * target.traits!.watch!.multiplier, 1) : 1;
    const attack = resolveAttack(rawAttack, enemy, equipment, multiplier);
    enemies = enemies.map(item => item.id === enemy.id ? attack.enemy : item);
    enemy = attack.enemy;
    attacks.push({ ...attack, enemies });
  }
  return attacks;
}
