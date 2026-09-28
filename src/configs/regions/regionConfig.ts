import type { RegionId } from '../../types/enemy';
export const REGION_CONFIG = {
  1: { name: '沼澤泥道', stickerBonus: 2, entryDamage: 15, bossDamage: 28 },
  2: { name: '沈水荒地', stickerBonus: 5, entryDamage: 32, bossDamage: 51 },
  3: { name: '鱷魚人地城', stickerBonus: 8, entryDamage: 60, bossDamage: 85 },
} satisfies Record<RegionId, { name: string; stickerBonus: number; entryDamage: number; bossDamage: number }>;
export const REGION_IDS = Object.keys(REGION_CONFIG).map(Number) as RegionId[];
