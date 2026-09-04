import { Enemy, MapNode, Equipment, StickerItem } from '../../types/game';
import {
  INITIAL_ENEMIES,
  INITIAL_PLAYER_STATS,
  ALL_STICKERS_CATALOG,
  ALL_EQUIPMENT_CATALOG,
} from '../../configs/gameConfig';

export interface NodeSetupResult {
  currentEnemy: Enemy | null;
  control: number;
  maxControl: number;
  combatPhase: 'ROLLING' | 'CONTROL_PHASE';
  shopStickers: StickerItem[];
  shopEquipments: Equipment[];
}

export function getEnemyForNode(node: MapNode, nodeIndex: number): Enemy {
  if (node.type === 'boss') {
    return INITIAL_ENEMIES.find((e) => e.isBoss) || INITIAL_ENEMIES[INITIAL_ENEMIES.length - 1];
  }
  if (node.type === 'elite') {
    return INITIAL_ENEMIES.find((e) => e.isElite) || INITIAL_ENEMIES[3];
  }
  const standardEnemies = INITIAL_ENEMIES.filter((e) => !e.isElite && !e.isBoss);
  const idx = Math.min(nodeIndex, standardEnemies.length - 1);
  return standardEnemies[idx] || standardEnemies[0];
}

export function generateShopStock(equipments: Equipment[]): {
  shopStickers: StickerItem[];
  shopEquipments: Equipment[];
} {
  const shopStickers = [...ALL_STICKERS_CATALOG].sort(() => Math.random() - 0.5).slice(0, 4);
  const shopEquipments = [...ALL_EQUIPMENT_CATALOG]
    .filter((eq) => !equipments.some((e) => e.id === eq.id))
    .slice(0, 3);
  return { shopStickers, shopEquipments };
}

export function computeMaxControl(equipments: Equipment[]): number {
  const extraControl = equipments
    .filter((e) => e.ruleId === 'EXTRA_CONTROL')
    .reduce((acc, e) => acc + (e.value || 1), 0);
  return INITIAL_PLAYER_STATS.maxControl + extraControl;
}
