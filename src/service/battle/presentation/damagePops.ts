import { DAMAGE_POP_PRESENTATION as config } from '../../../configs/numberFeedbackConfig';
import type { DamagePop, DamagePopInput } from '../../../types/game';

export function appendDamagePop(existing: readonly DamagePop[], input: DamagePopInput, id: number, now: number): DamagePop[] {
  return [...existing.filter((pop) => now - pop.startedAt < config.lifetimeMs), { ...input, id, startedAt: now }];
}

export interface PopSlot { x: number; y: number; width: number; height: number }
interface Size { width: number; height: number }
interface Point { x: number; y: number }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function overlap(a: PopSlot, b: PopSlot): number {
  return Math.max(0, Math.min(a.x + a.width + config.slotGap, b.x + b.width + config.slotGap) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.height + config.slotGap, b.y + b.height + config.slotGap) - Math.max(a.y, b.y));
}

/** Reserve the complete peak-and-rise footprint. Existing slots keep their birth coordinates. */
export function findDamagePopSlot(size: Size, anchor: Point, viewport: Size, occupied: readonly PopSlot[]): PopSlot {
  const edge = config.edgeMargin;
  const maxX = Math.max(edge, viewport.width - edge - size.width);
  const maxY = Math.max(edge, viewport.height - edge - size.height);
  const origin = { x: clamp(anchor.x - size.width / 2, edge, maxX),
    y: clamp(anchor.y - config.anchorGap - size.height, edge, maxY) };
  const candidates: PopSlot[] = [];
  const radius = Math.min(config.spreadWidth, viewport.width) / 2;
  const rows = Math.ceil(viewport.height / config.searchStep);
  const columns = Math.ceil(radius / config.searchStep);
  for (let row = -rows; row <= rows; row++) for (let column = -columns; column <= columns; column++) {
    candidates.push({ ...size, x: clamp(origin.x + column * config.searchStep, edge, maxX),
      y: clamp(origin.y + row * config.searchStep, edge, maxY) });
  }
  candidates.sort((a, b) => Math.abs(a.x - origin.x) + Math.abs(a.y - origin.y) * 2
    - Math.abs(b.x - origin.x) - Math.abs(b.y - origin.y) * 2);
  let best = candidates[0], leastOverlap = Infinity;
  for (const candidate of candidates) {
    const area = occupied.reduce((total, old) => total + overlap(candidate, old), 0);
    if (area === 0) return candidate;
    if (area < leastOverlap) { best = candidate; leastOverlap = area; }
  }
  return best;
}
