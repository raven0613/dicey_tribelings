import { ceilDamage } from '../damageValue';
export function splitInteger(value: number, parts: number): number[] {
  const total = ceilDamage(value);
  const count = Math.min(total, parts);
  if (count <= 0) return [];
  const share = Math.floor(total / count), remainder = total % count;
  return Array.from({ length: count }, (_, i) => share + Number(i < remainder));
}
