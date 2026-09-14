import type { Dice } from '../../../types/game';
import type { CreatureBattleState, CreatureId } from '../../../types/creatures';
import { getEffectiveFace } from '../../dice/diceFaces';
import { choose } from './creatureState';

/** One untransformed board determines every newly encountered imposter. */
export function lockImposterTargets(dice: Dice[], indices: number[], state: CreatureBattleState): CreatureBattleState {
  const faces = dice.map((die, i) => getEffectiveFace(die.faces[indices[i]]));
  const counts = new Map<CreatureId, number>();
  for (const face of faces) if (face.creature !== 'imposter') counts.set(face.creature, (counts.get(face.creature) ?? 0) + 1);
  const maximum = Math.max(0, ...counts.values());
  const candidates = [...counts].filter(([, n]) => n === maximum).map(([role]) => role);
  const imposterTargets = { ...state.imposterTargets };
  faces.forEach((face, i) => {
    const id = dice[i].id;
    if (face.creature === 'imposter' && imposterTargets[id] === undefined)
      imposterTargets[id] = choose(candidates, state.seed, `imposter:${id}`) ?? 'imposter';
  });
  return { ...state, imposterTargets };
}

export function getRoundFace(die: Dice, index: number, state: CreatureBattleState) {
  const face = getEffectiveFace(die.faces[index]);
  return face.creature === 'imposter' ? { ...face, creature: state.imposterTargets[die.id] ?? 'imposter' } : face;
}
