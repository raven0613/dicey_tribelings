import { isArrowFace } from '../../../configs/directionalStickerConfig';
import { resolveLandingFace } from '../../dice/directionalFaces';
import type { Dice } from '../../../types/game';
import type { CreatureBattleState, CreatureId } from '../../../types/creatures';
import { getEffectiveFace } from '../../dice/diceFaces';
import { choose } from './creatureState';

/** One untransformed board determines every newly encountered imposter. */
export function lockImposterTargets(dice: Dice[], indices: number[], state: CreatureBattleState): CreatureBattleState {
  const faces = dice.map((die, i) => getEffectiveFace(die.faces[resolveLandingFace(die, indices[i])]));
  const counts = new Map<CreatureId, number>();
  for (const face of faces) if (face.creature !== 'imposter') counts.set(face.creature, (counts.get(face.creature) ?? 0) + 1);
  const maximum = Math.max(0, ...counts.values());
  const candidates = [...counts].filter(([, n]) => n === maximum).map(([role]) => role);
  const imposterTargets = { ...state.imposterTargets };
  faces.forEach((face, i) => {
    const id = dice[i].id;
    if (face.creature !== 'imposter' || imposterTargets[id] !== undefined) return;
    const local = new Map<CreatureId, number>();
    for (const original of dice[i].faces.map(getEffectiveFace)) if (original.creature !== 'imposter' && !isArrowFace(original.creature)) local.set(original.creature, (local.get(original.creature) ?? 0) + 1);
    const localMax = Math.max(0, ...local.values());
    const choices = maximum > 1 ? candidates : localMax > 1 ? [...local].filter(([, n]) => n === localMax).map(([role]) => role) : [];
    imposterTargets[id] = choose(choices, state.seed, `imposter:${id}`) ?? 'imposter';
  });
  return { ...state, imposterTargets };
}

export function getRoundFace(die: Dice, index: number, state: CreatureBattleState) {
  const face = getEffectiveFace(die.faces[resolveLandingFace(die, index)]);
  return face.creature === 'imposter' ? { ...face, creature: state.imposterTargets[die.id] ?? 'imposter' } : face;
}
