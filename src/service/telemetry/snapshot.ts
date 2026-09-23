import { REGION_CONFIG } from '../../configs/regions/regionConfig';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { MATERIAL_CONFIG } from '../../configs/materials/materialConfig';
import { getEffectiveFace } from '../dice/diceFaces';
import { getRoundFace } from '../battle/creatures/imposterResolution';
import { compositionOf } from './analytics';
import type { BuildSnapshot, CombatSnapshot, RunLocation, TelemetryState } from './types';

export function locationOf(state: TelemetryState): RunLocation {
  const node = state.mapNodes[state.currentNodeIndex];
  return { nodeId: node.id, title: node.title, region: node.region, regionName: REGION_CONFIG[node.region].name,
    type: node.type, route: node.route };
}

export function combatOf(state: TelemetryState): CombatSnapshot {
  return structuredClone({ hp: state.playerHp, maxHp: state.maxHp, shield: state.playerShield,
    gold: state.gold, control: state.control, phase: state.combatPhase,
    rolledIndices: state.rolledIndices, creatureState: state.creatureBattleState, enemy: state.currentEnemy });
}

export function buildOf(state: TelemetryState, metadata: Pick<BuildSnapshot, 'id' | 'at' | 'elapsedMs' | 'activeMs' | 'reason'>): BuildSnapshot {
  return structuredClone({ ...metadata, location: locationOf(state), combat: combatOf(state),
    equipments: state.equipments, consumables: state.consumableStickers, composition: compositionOf(state.dicePool),
    dice: state.dicePool.map((die, position) => ({ ...die, position, faces: die.faces.map((face, index) => {
      const effective = state.rolledIndices[position] === index
        ? getRoundFace(die, index, state.creatureBattleState) : getEffectiveFace(face);
      return { ...face, index, name: CREATURE_CONFIG[face.creature].name,
        materialName: face.material ? MATERIAL_CONFIG[face.material].name : null,
        effectiveCreature: effective.creature, effectiveName: CREATURE_CONFIG[effective.creature].name, effectiveBaseValue: effective.baseValue };
    }) })) });
}

export function buildChanged(state: TelemetryState, previous: TelemetryState): boolean {
  const shape = (value: TelemetryState) => ({
    dice: value.dicePool.map((die) => ({ id: die.id, type: die.dieType,
      faces: die.faces.map(({ materialDecay: _decay, ...face }) => face) })),
    equipment: value.equipments, consumables: value.consumableStickers,
  });
  if (state.dicePool === previous.dicePool && state.equipments === previous.equipments
    && state.consumableStickers === previous.consumableStickers) return false;
  return JSON.stringify(shape(state)) !== JSON.stringify(shape(previous));
}
