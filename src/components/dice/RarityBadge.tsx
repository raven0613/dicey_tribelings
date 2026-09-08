import type { EquipmentRarity } from '../../types/game';
const names: Record<EquipmentRarity, string> = { common: 'R', rare: 'SR', legendary: 'SSR' };
export function RarityBadge({ rarity }: { rarity: EquipmentRarity }) {
  return <span className={`rarity-badge rarity-${rarity}`}>{names[rarity]}</span>;
}
