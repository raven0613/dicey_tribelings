import { EQUIPMENT_BALANCE, hasEquipment } from '../../configs/equipment/equipmentConfig';
import { Enemy, MapNode, Equipment, StickerItem } from '../../types/game';
import {
  INITIAL_PLAYER_STATS,
  ALL_STICKERS_CATALOG,
  ALL_EQUIPMENT_CATALOG,
} from '../../configs/gameConfig';
import { createEnemy } from './enemies/enemyFactory';

export function getEnemyForNode(node: MapNode, nodeIndex: number): Enemy {
  if (!node.enemyId) throw new Error(`Missing monster for node ${nodeIndex}`);
  return createEnemy(node.enemyId);
}

function takeRandom<T>(pool: T[], count: number, random: () => number): T[] {
  const available = [...pool];
  const result: T[] = [];
  while (result.length < count && available.length > 0) {
    const index = Math.min(available.length - 1, Math.floor(random() * available.length));
    result.push(available.splice(index, 1)[0]);
  }
  return result;
}

export function generateShopStock(equipments: Equipment[], random: () => number = Math.random): {
  shopStickers: StickerItem[];
  shopEquipments: Equipment[];
} {
  const shopStickers = takeRandom(
    ALL_STICKERS_CATALOG.filter((sticker) => sticker.isDisposable),
    4,
    random
  );
  const shopEquipments = takeRandom(
    ALL_EQUIPMENT_CATALOG.filter((equipment) => !equipments.some((owned) => owned.id === equipment.id)),
    3,
    random
  );
  return { shopStickers, shopEquipments };
}

export function computeMaxControl(equipments: Equipment[], gold = 0): number {
  const pipe = hasEquipment(equipments, 'PIPE') ? EQUIPMENT_BALANCE.pipeControl : 0;
  const piggy = hasEquipment(equipments, 'PIGGY')
    ? EQUIPMENT_BALANCE.goldThresholds.filter((threshold) => gold > threshold).length : 0;
  return INITIAL_PLAYER_STATS.maxControl + pipe + piggy;
}
