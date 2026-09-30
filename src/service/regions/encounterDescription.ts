import type { EnemyDefinition, EnemyRank } from '../../types/enemy';
import { MONSTER_COLLECTIVE_NAMES, type MonsterFeatureId } from '../../configs/monsters/monsterPresentationConfig';

/** Summarize names and features without changing the individual combatants. */
export function describeEncounter(enemies: readonly EnemyDefinition[]) {
  const grouped = new Map<string, { count: number; rank: EnemyRank; features: Set<MonsterFeatureId> }>();
  for (const enemy of enemies) {
    const group = grouped.get(enemy.name) ?? { count: 0, rank: enemy.rank, features: new Set<MonsterFeatureId>() };
    group.count++;
    for (const feature of enemy.mapFeatures) group.features.add(feature);
    grouped.set(enemy.name, group);
  }
  const groups = [...grouped].map(([name, group]) => ({
    name: group.count > 1 && !MONSTER_COLLECTIVE_NAMES.includes(name) ? `${name} x ${group.count}` : name,
    rank: group.rank,
    features: [...group.features],
  }));
  return { title: groups.map(group => group.name).join('＋'), groups };
}
