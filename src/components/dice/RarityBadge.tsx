import type { EquipmentRarity } from '../../types/game';
const names: Record<EquipmentRarity, string> = { common: '一般', rare: '稀有', legendary: '傳說' };
export function RarityBadge({ rarity }: { rarity: EquipmentRarity }) {
  return <span className={`rarity-badge rarity-${rarity}`}>{names[rarity]}</span>;
}
