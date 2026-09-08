import type { MapNode, MapNodeType } from '../../types/game';
import { MONSTER_CONFIG } from '../monsters/monsterConfig';
import { REGION_CONFIG, REGION_IDS } from './regionConfig';

const routes = {
  1: ['patrol', 'slinger', 'chest', 'elite', 'shop', 'veteran', 'boss'],
  2: ['boat', 'harpoon', 'chest', 'elite', 'shop', 'veteran', 'boss'],
  3: ['shield', 'spear', 'chest', 'elite', 'shop', 'veteran', 'boss'],
  4: ['blades', 'axe', 'chest', 'elite', 'shop', 'veteran', 'boss'],
  5: ['jailer', 'armored', 'chest', 'elite', 'shop', 'veteran', 'boss'],
  6: ['blackguard', 'pack', 'elite', 'shop', 'boss'],
};
export const INITIAL_MAP_NODES: MapNode[] = REGION_IDS.flatMap((region) => routes[region].map((key, regionNode) => {
  const id = (region - 1) * 7 + regionNode;
  const enemy = MONSTER_CONFIG.find((item) => item.id === `r${region}_${key}`);
  const type: MapNodeType = enemy ? enemy.rank === 'normal' ? 'fight' : enemy.rank === 'elite' ? 'elite' : 'boss'
    : key as 'chest' | 'shop' | 'pack';
  const title = enemy?.name ?? (type === 'chest' ? '補給寶箱' : type === 'shop' ? '土人商店' : '深牢補給');
  return { id, region, regionNode, type, title, enemyId: enemy?.id,
    packId: type === 'pack' ? 'pack_final' : undefined,
    description: `${REGION_CONFIG[region].name}・${title}`, completed: false, current: id === 0 };
}));
