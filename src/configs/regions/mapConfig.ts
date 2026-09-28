import { CAMP_CONFIG } from '../campConfig';
import type { MapNode } from '../../types/game';
import type { RegionId } from '../../types/enemy';
import { MONSTER_CONFIG } from '../monsters/monsterConfig';
import { REGION_CONFIG } from './regionConfig';

type Stop = 'chest' | 'shop' | readonly string[];
const routes: Record<RegionId, readonly Stop[]> = {
  1: [['patrol'], ['harpoon'], 'chest', ['boat'], 'shop', ['slinger', 'grunt'], ['boss', 'grunt', 'grunt']],
  2: [['iron'], ['club'], 'chest', ['market'], 'shop', ['chief', 'blades', 'blades'], ['first', 'second']],
  3: [['prisoner'], 'chest', ['jailer', 'guard', 'guard'], 'shop', ['black', 'guard', 'guard'], ['boss']],
};
function makeNode(id: number, region: RegionId, regionNode: number, stop: Stop): MapNode {
  const common = { id, region, regionNode, completed: false, current: id === 0, next: [id + 1] };
  if (typeof stop === 'string') {
    const title = stop === 'chest' ? '補給寶箱' : '土人商店';
    return { ...common, type: stop, title, description: `${REGION_CONFIG[region].name}・${title}` };
  }
  const enemies = stop.map(key => MONSTER_CONFIG.find(enemy => enemy.id === `r${region}_${key}`)!);
  const rank = enemies[0].rank;
  const title = enemies.map(enemy => enemy.name).join('＋');
  return { ...common, type: rank === 'normal' ? 'fight' : rank === 'elite' ? 'elite' : 'boss',
    enemyIds: enemies.map(enemy => enemy.id), title, description: `${REGION_CONFIG[region].name}・${title}` };
}
const mainNodes: MapNode[] = [];
for (const region of [1, 2, 3] as const) routes[region].forEach((stop, index) => mainNodes.push(makeNode(mainNodes.length, region, index, stop)));
mainNodes.at(-1)!.next = [];
const alternatives = ([['ronin', 3], ['captain', 10], ['warden', 16]] as const).map(([key, mainId], index) => {
  const safe = mainNodes[mainId], id = mainNodes.length + index;
  safe.route = 'safe';
  mainNodes[mainId - 1].next = [safe.id, id];
  return { ...makeNode(id, safe.region, safe.regionNode, [key]), route: 'challenge' as const, next: [...safe.next] };
});
const camps: MapNode[] = ([7, 14] as const).map((mainId, index) => {
  const combat = mainNodes[mainId], id = mainNodes.length + alternatives.length + index;
  combat.route = 'combat';
  mainNodes[mainId - 1].next = [combat.id, id];
  return { id, region: combat.region, regionNode: combat.regionNode, type: 'camp', route: 'camp',
    title: CAMP_CONFIG.title, description: '休息、付費回滿或領取單場祝福，三選一。',
    next: [...combat.next], completed: false, current: false };
});
export const INITIAL_MAP_NODES: MapNode[] = [...mainNodes, ...alternatives, ...camps];
export const CHAPTER_END_NODE = mainNodes.at(-1)!.id;
export const ROUTE_CONFIG = { choose: '選擇接下來的路線', chapterTitle: '鱷魚人篇完成！', chapterDescription: '你擊敗鱷文並救回王子！' } as const;
