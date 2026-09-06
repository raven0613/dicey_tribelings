import type { Dice } from '../../types/game';
import type { CreatureId } from '../../types/creatures';

export function configuredDice(id: string, name: string, dieType: Dice['dieType'], colorTheme: string,
  faces: readonly (readonly [CreatureId, number])[]): Dice {
  return { id, name, dieType, colorTheme,
    faces: faces.map(([creature, baseValue], index) => ({ id: `${id}-face-${index}`, creature, baseValue })) };
}

