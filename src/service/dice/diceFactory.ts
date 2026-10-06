import { D6_FACE_VALUES } from '../../configs/creatures/diceValueConfig';
import { BOSS_DICE_REWARD } from '../../configs/creatures/diceRecipeConfig';
import type { Dice } from '../../types/game';
import type { CreatureId } from '../../types/creatures';

export function configuredDice(id: string, name: string, dieType: Dice['dieType'], colorTheme: string,
  faces: readonly (readonly [CreatureId, number])[]): Dice {
  return { id, name, dieType, colorTheme,
    faces: faces.map(([creature, baseValue], index) => ({ id: `${id}-face-${index}`, creature, baseValue })) };
}

export function fixedDice(id: string, name: string, color: string, roles: Partial<Record<number, CreatureId>>): Dice {
  return configuredDice(id, name, 'd6', color, D6_FACE_VALUES.map(value => [roles[value] ?? 'blank', value]));
}

export function createBossRewardDice(id = `dice-${crypto.randomUUID()}`): Dice {
  return fixedDice(id, BOSS_DICE_REWARD.name, BOSS_DICE_REWARD.colorTheme, {});
}
