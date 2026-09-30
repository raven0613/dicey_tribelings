import type { Dice, Equipment, FaceSticker } from '../../types/game';
import type { CreatureBattleState } from '../../types/creatures';
import type { BattleComboSummary, BattleContext } from '../../types/battle';
import { isArrowFace } from '../../configs/directionalStickerConfig';
import { calculateRollResolution } from '../battle/battleEngine';
import { describeBattleSkills } from '../battle/battleSkillDescription';
import { getConfigurationInputs } from '../battle/creatures/configurationInputs';
import { refreshImposterTargets } from '../battle/creatures/imposterResolution';
import { getEffectiveFace } from './diceFaces';
import { getPreviewSourceFace } from './facePreview';
import { getArrowConfigurationError } from './directionalFaces';

interface FaceSkillPreviewInput {
  dice: Dice;
  dicePool: Dice[];
  faceIndex: number;
  sticker?: FaceSticker;
  state: CreatureBattleState;
  combat?: { rolledIndices: number[]; equipments: Equipment[]; battle: BattleContext };
}

export function describeFaceSkillPreview({ dice, dicePool, faceIndex, sticker, state, combat }: FaceSkillPreviewInput) {
  const die = { ...dice, faces: dice.faces.map((face, index) => index === faceIndex ? getPreviewSourceFace(face, sticker) : face) };
  const pool = dicePool.some(item => item.id === die.id)
    ? dicePool.map(item => item.id === die.id ? die : item) : [die];
  const index = pool.findIndex(item => item.id === die.id);
  const creature = getEffectiveFace(die.faces[faceIndex]).creature;
  const configurationInputs = creature === 'priest' ? { count: state.altars[die.id] ?? 0 }
    : getConfigurationInputs(pool, index, faceIndex, creature);
  let summary: BattleComboSummary | null = null;
  if (combat && !isArrowFace(creature) && !getArrowConfigurationError(pool)) {
    const rolled = combat.rolledIndices.map((value, i) => i === index ? faceIndex : value);
    state = refreshImposterTargets(pool, rolled, state);
    summary = calculateRollResolution(pool, rolled, combat.equipments, state, combat.battle);
  }
  return describeBattleSkills({ die, faceIndex, creature, state, summary, configurationInputs }).lines
    .map(line => ({ ...line, achieved: line.achieved === true ? true : undefined }));
}
