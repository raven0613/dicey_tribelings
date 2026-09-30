import type { GrassMotion } from '../../../types/foregroundMotion';

const unit = (value: number) => Math.max(0, Math.min(1, value));

/** All leaves sample the same clump-local field; the complete bottom edge stays pinned. */
export function grassWeight(x: number, heightFromRoot: number, height: number, motion: GrassMotion) {
  const vertical = unit((heightFromRoot / height - motion.rootBand) / (1 - motion.rootBand));
  const side = Math.max(0, Math.abs(x - motion.rootX) - motion.rootRadius) / height;
  const distance = (1 - motion.spread) * vertical + motion.spread * unit(Math.hypot(vertical, side));
  return vertical * distance;
}

/** Rotate about the visible attachment, then add curvature increasing towards the free end. */
export function deformHanging(output: Float32Array, offset: number, x: number, y: number,
  pivotX: number, height: number, bend: number, swing: number) {
  const angle = -bend / height * swing;
  const cos = Math.cos(angle), sin = Math.sin(angle), dx = x - pivotX;
  output[offset] = pivotX + dx * cos - y * sin + bend * (1 - swing) * (y / height) ** 2;
  output[offset + 1] = dx * sin + y * cos;
}
