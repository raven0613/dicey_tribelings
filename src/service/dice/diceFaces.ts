import type { DiceFace } from '../../types/game';
import type { CreatureId, CreatureTag } from '../../types/creatures';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';

export const getEffectiveFace = (face: DiceFace) => face.temporarySticker ?? face;
export const hasCreatureTag = (creature: CreatureId, tag: CreatureTag) => CREATURE_CONFIG[creature].tags.includes(tag);
