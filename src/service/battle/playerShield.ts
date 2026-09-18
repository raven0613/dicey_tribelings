import type { Equipment } from '../../types/game';
import { EQUIPMENT_BALANCE, hasEquipment } from '../../configs/equipment/equipmentConfig';
import { combatNumber } from './creatures/creatureState';

/** 於下一回合開始時套用；保留量屬既有盾，不計入本回合新獲得的盾。 */
export function retainPlayerShield(remaining: number, equipment: Equipment[]): number {
  return hasEquipment(equipment, 'SHIELD_RETENTION')
    ? combatNumber(remaining * EQUIPMENT_BALANCE.shieldRetention) : 0;
}
