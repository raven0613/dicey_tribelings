import type { MapNode, MapNodeType } from '../../types/game';
import { MONSTER_CONFIG } from '../monsters/monsterConfig';
import { REGION_CONFIG, REGION_IDS } from './regionConfig';

const routes = {
  1: ['patrol', 'slinger', 'chest', 'elite', 'shop', 'veteran', 'boss'],
  2: ['boat', 'harpoon', 'chest', 'elite', 'shop', 'veteran', 'waterway_bully'],
  3: ['shield', 'spear', 'chest', 'elite', 'shop', 'veteran', 'boss'],
  4: ['blades', 'axe', 'chest', 'elite', 'shop', 'veteran', 'boss'],
  5: ['jailer', 'armored', 'chest', 'elite', 'shop', 'veteran', 'boss'],
  6: ['blackguard', 'pack', 'elite', 'shop', 'boss'],
};
export const INITIAL_MAP_NODES: MapNode[] = REGION_IDS.flatMap((region) => routes[region].map((key, regionNode) => {
  const id = (region - 1) * 7 + regionNode;
  const common = { id, region, regionNode, completed: false, current: id === 0 };
  if (key === 'chest' || key === 'shop' || key === 'pack') {
    const title = key === 'chest' ? '補給寶箱' : key === 'shop' ? '土人商店' : '深牢補給';
    return { ...common, type: key, title, packId: key === 'pack' ? 'pack_final' : undefined,
      description: `${REGION_CONFIG[region].name}・${title}` };
  }
  const enemyId = `r${region}_${key}`;
  const enemy = MONSTER_CONFIG.find((item) => item.id === enemyId);
  if (!enemy) throw new Error(`Missing monster configuration: ${enemyId} for node ${id}`);
  const type: MapNodeType = enemy.rank === 'normal' ? 'fight' : enemy.rank === 'elite' ? 'elite' : 'boss';
  return { ...common, type, title: enemy.name, enemyId,
    description: `${REGION_CONFIG[region].name}・${enemy.name}` };
}));
