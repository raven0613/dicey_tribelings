import { MONSTER_CONFIG } from '../../../configs/monsters/monsterConfig';
import type { Enemy } from '../../../types/enemy';

export function createEnemy(id: string, instanceId = id): Enemy {
  const definition = MONSTER_CONFIG.find((monster) => monster.id === id);
  if (!definition) throw new Error(`Unknown monster: ${id}`);
  return {
    id: instanceId, definitionId: definition.id, rank: definition.rank,
    name: definition.name,
    region: definition.region,
    maxHp: definition.maxHp,
    hp: definition.maxHp,
    shield: definition.initialShield,
    isElite: definition.rank === 'elite',
    isBoss: definition.rank === 'boss' || definition.rank === 'final_boss',
    intents: structuredClone([...definition.intents]) as Enemy['intents'],
    currentIntentIndex: 0,
    traits: structuredClone(definition.traits), phases: structuredClone(definition.phases), phase: 0,
    armor: definition.traits?.hitArmor?.layers ?? 0, strength: 0,
  };
}
