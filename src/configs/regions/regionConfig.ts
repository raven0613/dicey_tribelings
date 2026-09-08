import type { RegionId } from '../../types/enemy';

export const REGION_CONFIG = {
  1: { name: '沼澤邊', stickerBonus: 2, entryDamage: 11, bossDamage: 20 },
  2: { name: '蘆葦水道', stickerBonus: 5, entryDamage: 22, bossDamage: 36 },
  3: { name: '水底城門', stickerBonus: 8, entryDamage: 43, bossDamage: 62 },
  4: { name: '地下兵營', stickerBonus: 11, entryDamage: 65, bossDamage: 85 },
  5: { name: '地牢', stickerBonus: 14, entryDamage: 88, bossDamage: 110 },
  6: { name: '深牢', stickerBonus: 17, entryDamage: 113, bossDamage: 130 },
} satisfies Record<RegionId, { name: string; stickerBonus: number; entryDamage: number; bossDamage: number }>;
export const REGION_IDS = Object.keys(REGION_CONFIG).map(Number) as RegionId[];
