import { ALL_FACE_TAGS, MATERIAL_BALANCE } from '../../configs/materials/materialConfig';
import type { Dice, DiceFace } from '../../types/game';
import type { CreatureId, CreatureTag } from '../../types/creatures';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { getDiceGeometry } from './diceGeometry';

export const getEffectiveFace = (face: DiceFace): DiceFace => ({ ...face,
  creature: face.temporarySticker?.creature ?? face.creature,
  baseValue: Math.max(0, face.baseValue + (face.material === 'foil' ? MATERIAL_BALANCE.foil
    : face.material === 'negative' ? MATERIAL_BALANCE.negative - (face.materialDecay ?? 0) : 0)),
});
export const getFaceTags = (face: Pick<DiceFace, 'creature' | 'material'>): CreatureTag[] =>
  [...(face.material === 'iridescent' ? ALL_FACE_TAGS : CREATURE_CONFIG[face.creature].tags)];
export const getAdjacentFaces = (die: Dice, faceIndex: number) => getDiceGeometry(die.dieType)[faceIndex].neighbors
  .map((index) => getEffectiveFace(die.faces[index]));
export const hasCreatureTag = (creature: CreatureId, tag: CreatureTag) => CREATURE_CONFIG[creature].tags.includes(tag);
