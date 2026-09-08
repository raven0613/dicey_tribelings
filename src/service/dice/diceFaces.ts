import type { Dice, DiceFace } from '../../types/game';
import type { CreatureId, CreatureTag } from '../../types/creatures';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { getDiceGeometry } from './diceGeometry';

export const getEffectiveFace = (face: DiceFace) => face.temporarySticker ? { ...face, creature: face.temporarySticker.creature } : face;
export const getAdjacentFaces = (die: Dice, faceIndex: number) => getDiceGeometry(die.dieType)[faceIndex].neighbors
  .map((index) => getEffectiveFace(die.faces[index]));
export const hasCreatureTag = (creature: CreatureId, tag: CreatureTag) => CREATURE_CONFIG[creature].tags.includes(tag);
