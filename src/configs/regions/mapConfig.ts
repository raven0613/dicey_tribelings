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
const mainNodes: MapNode[] = REGION_IDS.flatMap((region) => routes[region].map((key, regionNode) => {
  const id = (region - 1) * 7 + regionNode;
  const common = { id, region, regionNode, completed: false, current: id === 0, next: [id + 1] };
  if (key === 'chest' || key === 'shop' || key === 'pack') {
    const title = key === 'chest' ? '補給寶箱' : key === 'shop' ? '土人商店' : '深牢補給';
    return {
      ...common, type: key, title, packId: key === 'pack' ? 'pack_final' : undefined,
      description: `${REGION_CONFIG[region].name}・${title}`
    };
  }
  const enemyId = `r${region}_${key}`;
  const enemy = MONSTER_CONFIG.find((item) => item.id === enemyId);
  if (!enemy) throw new Error(`Missing monster configuration: ${enemyId} for node ${id}`);
  const type: MapNodeType = enemy.rank === 'normal' ? 'fight' : enemy.rank === 'elite' ? 'elite' : 'boss';
  return {
    ...common, type, title: enemy.name, enemyId,
    description: `${REGION_CONFIG[region].name}・${enemy.name}`
  };
}));

export const ROUTE_CONFIG = {
  choose: '選擇接下來的路線',
  chapterTitle: '鱷魚人篇完成！',
  chapterDescription: '你擊敗鱷文並救回王子！',
} as const;
mainNodes[mainNodes.length - 1].next = [];
const alternatives: MapNode[] = REGION_IDS.map((region, index) => {
  const elite = mainNodes.find((node) => node.region === region && node.type === 'elite')!;
  const previous = mainNodes.find((node) => node.next.includes(elite.id))!;
  const normal = mainNodes.find((node) => node.region === region && node.type === 'fight')!;
  const id = mainNodes.length + index;
  elite.route = 'challenge';
  previous.next = [id, elite.id];
  return { ...normal, id, regionNode: elite.regionNode, current: false, next: [...elite.next], route: 'safe' };
});
export const INITIAL_MAP_NODES: MapNode[] = [...mainNodes, ...alternatives];
export const CHAPTER_END_NODE = mainNodes[mainNodes.length - 1].id;
