import type { BattleComboSummary } from '../../types/battle';
import type { Equipment } from '../../types/game';
import { EQUIPMENT_BALANCE, hasEquipment } from '../../configs/equipment/equipmentConfig';
import { ceilDamage } from './damageValue';
import { combatNumber } from './creatures/creatureState';

export function buildAttackPlan(summary: Pick<BattleComboSummary, 'items' | 'bonusDice' | 'repeatAttacks'>,
  shield: number, equipment: Equipment[]) {
  const attacks = [
    ...summary.items.flatMap((item, index) => item.finalDamage > 0
      ? [{ index, bonus: false, value: item.finalDamage, creature: item.creature, label: '' }] : []),
    ...summary.bonusDice.flatMap((bonus, index) => bonus.bonusDamage > 0
      ? [{ index, bonus: true, value: bonus.bonusDamage, creature: bonus.creature, label: bonus.label }] : []),
    ...summary.repeatAttacks.map((attack) => {
      const index = summary.items.findIndex((item) => item.diceId === attack.diceId);
      return { index, bonus: false, value: attack.damage, creature: summary.items[index].creature, label: '公主命令' };
    }),
  ];
  const hammer = hasEquipment(equipment, 'WARHAMMER');
  return attacks.map((attack) => {
    const value = ceilDamage(attack.value * (hammer && shield > 0 ? EQUIPMENT_BALANCE.shieldDamageMultiplier : 1));
    shield = combatNumber(Math.max(0, shield - value));
    return { ...attack, value };
  });
}
