import { ARROW_CONFIG, isArrowFace } from '../../configs/directionalStickerConfig';
import type { ArrowId } from '../../types/creatures';
import type { Dice } from '../../types/game';
import { getDiceNet } from './diceNet';
import { getDiceGeometry } from './diceGeometry';
import { getEffectiveFace } from './diceFaces';

export function getArrowTarget(die: Dice, faceIndex: number, arrow: ArrowId): number {
  const geometry = getDiceGeometry(die.dieType);
  const face = geometry[faceIndex];
  const [screenX, screenY] = ARROW_CONFIG[arrow].vector;
  const angle = getDiceNet(die.dieType).faces[faceIndex].rotation * Math.PI / 180;
  // Invert the unfolding rotation: screen edge -> the physical neighboring face.
  const x = Math.cos(angle) * screenX + Math.sin(angle) * screenY;
  const y = -Math.sin(angle) * screenX + Math.cos(angle) * screenY;
  const normal = face.right.map((n, axis) => n * x + face.up[axis] * y);
  return geometry.findIndex((other) => other.normal.every((n, axis) => Math.abs(n - normal[axis]) < 1e-7));
}

/** Configuration validation guarantees a single transition to a normal face. */
export function resolveLandingFace(die: Dice, faceIndex: number): number {
  const face = getEffectiveFace(die.faces[faceIndex]);
  return isArrowFace(face.creature) ? getArrowTarget(die, faceIndex, face.creature) : faceIndex;
}

export function getArrowConfigurationError(dice: Dice[]): string | null {
  for (const die of dice) for (const [index, face] of die.faces.entries()) {
    const role = getEffectiveFace(face).creature;
    if (!isArrowFace(role)) continue;
    if (die.dieType !== 'd6') return '方向貼紙適用於六面骰。';
    const target = getArrowTarget(die, index, role);
    if (isArrowFace(getEffectiveFace(die.faces[target]).creature)) return `${die.name}第 ${index + 1} 面指向第 ${target + 1} 面：箭頭須指向土人或食物。`;
  }
  return null;
}
