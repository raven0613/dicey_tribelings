import { CREATURE_BALANCE } from '../../../configs/creatures/creatureBalanceConfig';
import type { CreatureId } from '../../../types/creatures';
import type { Dice, DiceFace } from '../../../types/game';
import type { SkillInputs } from '../../../types/battle';
import { getEffectiveFace, getFaceTags } from '../../dice/diceFaces';
import { getDiceGeometry } from '../../dice/diceGeometry';

/** Configuration counters shared by settlement and face inspection. */
export function getConfigurationInputs(dice: Dice[], index: number, faceIndex: number, creature: CreatureId,
  faces: DiceFace[][] = dice.map(die => die.faces.map(getEffectiveFace))): SkillInputs | undefined {
  const own = faces[index];
  const count = (role: CreatureId) => own.filter(face => face.creature === role).length;
  const adjacent = () => getDiceGeometry(dice[index].dieType)[faceIndex].neighbors.map(i => own[i]);
  switch (creature) {
    case 'family': case 'twins': case 'loner': return { count: count(creature) };
    case 'gang': return { count: adjacent().filter(face => face.creature === 'gang').length };
    case 'artisan': return { count: adjacent().filter(face => getFaceTags(face).includes('craftsman')).length };
    case 'royalGuard': return { count: own.filter((face, i) => i !== faceIndex && getFaceTags(face).includes('noble')).length };
    case 'warrior': return { count: faces.flatMap((row, i) => Math.abs(i - index) === 1 ? row : [])
      .filter(face => face.creature === 'follower').length };
    case 'follower': {
      const neighbors = faces.filter((_, i) => Math.abs(i - index) === CREATURE_BALANCE.follower.range);
      const warriors = neighbors.flat().filter(face => face.creature === 'warrior');
      return { count: warriors.length, value: Math.max(0, ...warriors.map(face => face.baseValue)),
        secondaryCount: neighbors.filter(row => row.some(face => face.creature === 'warrior')).length };
    }
    default: return undefined;
  }
}
