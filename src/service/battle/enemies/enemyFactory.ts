import { MONSTER_CONFIG } from '../../../configs/monsters/monsterConfig';
import type { Enemy } from '../../../types/enemy';

export function createEnemy(id: string): Enemy {
  const definition = MONSTER_CONFIG.find((monster) => monster.id === id);
  if (!definition) throw new Error(`Unknown monster: ${id}`);
  return {
    id: definition.id,
    name: definition.name,
    region: definition.region,
    maxHp: definition.maxHp,
    hp: definition.maxHp,
    shield: definition.initialShield,
    avatar: definition.avatar,
    isElite: definition.rank === 'elite',
    isBoss: definition.rank === 'boss' || definition.rank === 'final_boss',
    intents: structuredClone([...definition.intents]) as Enemy['intents'],
    currentIntentIndex: 0,
  };
}
