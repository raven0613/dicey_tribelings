import type { EnemyRank } from '../../types/enemy';
import { REGION_CONFIG } from '../regions/regionConfig';
import { INITIAL_MAP_NODES } from '../regions/mapConfig';

/** 節點輸出由入區至 Boss 的目標插值，單位為整池傷害／玩家回合。 */
export function getEncounterDamageBudget(monsterId: string): number {
  const node = INITIAL_MAP_NODES.find((item) => item.enemyId === monsterId)!;
  const region = REGION_CONFIG[node.region];
  const progress = (node.region === 6 ? [0, 0, 0.65, 0, 1] : [0, 0.2, 0, 0.55, 0, 0.95, 1])[node.regionNode];
  return region.entryDamage + (region.bossDamage - region.entryDamage) * progress;
}
export const MONSTER_BALANCE_CONFIG = {
  diceCountByRegion: { 1: 3, 2: 4, 3: 5, 4: 6, 5: 7, 6: 7 },
  playerHp: 100000,
  turnTargets: { normal: [1, 3], elite: [3, 4], boss: [4, 5], final_boss: [5, 6] } satisfies Record<EnemyRank, readonly [number, number]>,
  scenarios: { weak: 0.7, typical: 1, strong: 1.4 }, weakExtraTurns: 2,
  rollRange: [0.7, 1.3] as const, seed: 20260907, runsPerScenario: 512, maxTurns: 40,
} as const;
