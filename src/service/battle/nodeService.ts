import { CAMP_BUFFS } from '../../configs/campConfig';
import type { CampBuffId } from '../../types/camp';
import type { MapNode, Equipment } from '../../types/game';
import { INITIAL_PLAYER_STATS } from '../../configs/gameConfig';
import { EQUIPMENT_BALANCE, hasEquipment } from '../../configs/equipment/equipmentConfig';
import { createEnemy } from './enemies/enemyFactory';
export function getEnemiesForNode(node: MapNode) {
  return (node.enemyIds ?? []).map((id, index) => createEnemy(id, `node-${node.id}-enemy-${index}`));
}
export function computeMaxControl(equipments: Equipment[], gold = 0, campBuff: CampBuffId | null = null): number {
  const pipe = hasEquipment(equipments, 'PIPE') ? EQUIPMENT_BALANCE.pipeControl : 0;
  const piggy = hasEquipment(equipments, 'PIGGY')
    ? EQUIPMENT_BALANCE.goldThresholds.filter((threshold) => gold > threshold).length : 0;
  return INITIAL_PLAYER_STATS.maxControl + pipe + piggy + (campBuff === 'focus' ? CAMP_BUFFS.focus.control : 0);
}
