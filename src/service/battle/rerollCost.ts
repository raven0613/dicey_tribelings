import { PAID_REROLL_CONFIG } from '../../configs/controlConfig';
import { EQUIPMENT_BALANCE, hasEquipment } from '../../configs/equipment/equipmentConfig';
import type { Equipment } from '../../types/game';

export function getPaidRerollCost(paidRerolls: number, equipments: Equipment[]): number {
  const multiplier = hasEquipment(equipments, 'COUNTERWEIGHT') ? EQUIPMENT_BALANCE.paidRerollMultiplier : 1;
  return Math.ceil(PAID_REROLL_CONFIG.goldStep * (paidRerolls + 1) * multiplier);
}
