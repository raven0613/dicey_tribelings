import type { Enemy } from '../../types/enemy';
import { resolvePlayerHit } from './enemies/enemyMechanics';
import type { BattleComboSummary } from '../../types/battle';
import type { Equipment } from '../../types/game';
import { EQUIPMENT_BALANCE, hasEquipment } from '../../configs/equipment/equipmentConfig';
import { ceilDamage } from './damageValue';
import { combatNumber } from './creatures/creatureState';

export function buildRawAttackPlan(summary: Pick<BattleComboSummary, 'items' | 'bonusDice' | 'repeatAttacks'>) {
  return [
    ...summary.items.flatMap((item, index) => item.finalDamage > 0
      ? [{ index, bonus: false, value: item.finalDamage, creature: item.creature, label: '' }] : []),
    ...summary.bonusDice.flatMap((bonus, index) => bonus.bonusDamage > 0
      ? [{ index, bonus: true, value: bonus.bonusDamage, creature: bonus.creature, label: bonus.label }] : []),
    ...summary.repeatAttacks.map((attack) => {
      const index = summary.items.findIndex((item) => item.diceId === attack.diceId);
      return { index, bonus: false, value: attack.damage, creature: summary.items[index].creature, label: attack.label ?? '公主命令' };
    }),
  ];
}

export function resolveAttack(attack: ReturnType<typeof buildRawAttackPlan>[number], enemy: Enemy, equipment: Equipment[]) {
  const hammer = hasEquipment(equipment, 'WARHAMMER') && enemy.shield > 0;
  const hit = resolvePlayerHit(enemy, ceilDamage(attack.value * (hammer ? EQUIPMENT_BALANCE.shieldDamageMultiplier : 1)), attack.bonus);
  return { ...attack, label: enemy.hp <= 0 ? '追擊!' : attack.label, value: hit.value, enemy: hit.enemy, retaliation: hit.retaliation };
}

export function buildAttackPlan(summary: Pick<BattleComboSummary, 'items' | 'bonusDice' | 'repeatAttacks'>,
  target: number | Enemy, equipment: Equipment[]) {
  let enemy = typeof target === 'number' ? undefined : structuredClone(target);
  let shield = typeof target === 'number' ? target : target.shield;
  return buildRawAttackPlan(summary).map((attack) => {
    if (enemy) {
      const result = resolveAttack(attack, enemy, equipment);
      enemy = result.enemy;
      return result;
    }
    const value = ceilDamage(attack.value * (hasEquipment(equipment, 'WARHAMMER') && shield > 0
      ? EQUIPMENT_BALANCE.shieldDamageMultiplier : 1));
    shield = combatNumber(Math.max(0, shield - value));
    return { ...attack, value, enemy, retaliation: 0 };
  });
}
