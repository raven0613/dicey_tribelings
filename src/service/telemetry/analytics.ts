import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { TELEMETRY_CONFIG } from '../../configs/telemetryConfig';
import type { Dice } from '../../types/game';
import type { CreatureId } from '../../types/creatures';
import type { BattleRecord, CompositionItem } from './types';

export function compositionOf(dice: readonly Dice[]): CompositionItem[] {
  const counts = new Map<CreatureId, number>();
  const faces = dice.flatMap((die) => die.faces);
  for (const face of faces) counts.set(face.creature, (counts.get(face.creature) ?? 0) + 1);
  return [...counts].map(([creatureId, count]) => ({ creatureId, name: CREATURE_CONFIG[creatureId].name,
    faces: count, totalFaces: faces.length, percent: count / faces.length * 100 }))
    .sort((a, b) => b.faces - a.faces || a.creatureId.localeCompare(b.creatureId));
}

export function rerollSummary(battles: readonly Pick<BattleRecord, 'rerolls' | 'outcome'>[]) {
  const completed = battles.filter((battle) => battle.outcome !== 'incomplete');
  return {
    total: battles.reduce((sum, battle) => sum + battle.rerolls, 0),
    average: completed.length ? completed.reduce((sum, battle) => sum + battle.rerolls, 0) / completed.length : 0,
    completed: completed.length,
  };
}

export function expiredRunIds(runs: readonly { id: string; startedAt: number }[]): string[] {
  return [...runs].sort((a, b) => a.startedAt - b.startedAt || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, runs.length - TELEMETRY_CONFIG.maxRuns)).map((run) => run.id);
}
