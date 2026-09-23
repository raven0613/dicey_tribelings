import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import type { CreatureId } from '../../../types/creatures';
import type { Dice } from '../../../types/game';
import { getAdjacentFaces, getEffectiveFace } from '../../dice/diceFaces';

/** Maximum simultaneous bonuses per source, including roles available to imposters. */
export function getBonusCapacities(dice: Dice[]): number[] {
  const faces = dice.map((die) => die.faces.map(getEffectiveFace));
  const available = [...new Set(faces.flatMap((entries) => entries.map((face) => face.creature)))].filter((role) => role !== 'imposter');
  const roles = (role: CreatureId) => role === 'imposter' ? available : [role];
  const robberies = faces.map((entries, index) => Math.max(0, ...entries.flatMap((face) => roles(face.creature).map((role) =>
    role === 'boss' ? 1 : role === 'bully' ? Number(index > 0) + Number(index < dice.length - 1) : 0))));
  return faces.map((entries, index) => Math.max(1, ...entries.map((face, faceIndex) => {
    const quantity = Math.max(0, ...roles(face.creature).map((role) => {
      if (role === 'gang') {
        const count = getAdjacentFaces(dice[index], faceIndex).filter((neighbor) => neighbor.creature === 'gang').length;
        return count * (count >= b.gang.doubleAt ? b.gang.copies : 1);
      }
      if (role === 'priest') return 2;
      if (role === 'thief') return robberies.reduce((sum, count, other) => sum + (other === index ? 0 : count), 0);
      return Number(['chef', 'bulwark', 'cheerleader'].includes(role));
    }));
    return quantity * (face.material === 'echo' ? 2 : 1) + Number(face.material === 'shock');
  })));
}
