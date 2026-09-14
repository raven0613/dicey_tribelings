import type { StickerItem } from '../../types/game';
import type { MaterialTier } from '../../types/materials';
import { MATERIAL_CHANCES, SPECIAL_MATERIALS, ULTRA_MATERIALS } from '../../configs/materials/materialConfig';

export function rollMaterialTier(random: () => number): MaterialTier {
  const roll = random();
  return roll < MATERIAL_CHANCES.ordinary ? 'ordinary'
    : roll < MATERIAL_CHANCES.ordinary + MATERIAL_CHANCES.special ? 'special' : 'ultra';
}

export function assignRewardMaterial(stickers: StickerItem[], tier: MaterialTier, random: () => number): StickerItem[] {
  if (tier === 'ordinary') return stickers;
  const candidates = stickers.flatMap((item, index) => item.isDisposable ? [] : [index]);
  if (!candidates.length) return stickers;
  const target = candidates[Math.floor(random() * candidates.length)];
  const materials = tier === 'special' ? SPECIAL_MATERIALS : ULTRA_MATERIALS;
  const material = materials[Math.floor(random() * materials.length)];
  return stickers.map((item, index) => index === target && item.isDisposable === false ? { ...item, material } : item);
}
