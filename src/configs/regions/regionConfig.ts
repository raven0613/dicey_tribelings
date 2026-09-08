import type { RegionId } from '../../types/enemy';

export const REGION_CONFIG = {
  1: { name: '沼澤邊', stickerBonus: 2, entryDamage: 11, bossDamage: 23 },
  2: { name: '蘆葦水道', stickerBonus: 5, entryDamage: 25, bossDamage: 42 },
  3: { name: '水底城門', stickerBonus: 8, entryDamage: 44, bossDamage: 70 },
  4: { name: '地下兵營', stickerBonus: 11, entryDamage: 72, bossDamage: 95 },
  5: { name: '地牢', stickerBonus: 14, entryDamage: 98, bossDamage: 128 },
  6: { name: '深牢', stickerBonus: 17, entryDamage: 132, bossDamage: 155 },
} satisfies Record<RegionId, { name: string; stickerBonus: number; entryDamage: number; bossDamage: number }>;
export const REGION_IDS = Object.keys(REGION_CONFIG).map(Number) as RegionId[];
