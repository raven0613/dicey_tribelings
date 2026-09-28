import { REFRESH_CONFIG } from '../../configs/refreshConfig';
import type { BattleRewardOption, StickerItem } from '../../types/game';
export type RefreshKind = keyof typeof REFRESH_CONFIG;
export function getRefreshCost(kind: RefreshKind, completedRefreshes: number): number {
  return REFRESH_CONFIG[kind] * (completedRefreshes + 1);
}
export function stickerKey(sticker: StickerItem): string {
  return `${sticker.isDisposable ? 'temporary' : 'permanent'}:${sticker.creature}`;
}
export function rewardKey(option: BattleRewardOption): string {
  return option.kind === 'sticker' ? stickerKey(option.sticker) : `pack:${option.pack.id}`;
}
export function sampleDistinct<T>(pool: readonly T[], count: number, random = Math.random): T[] {
  const available = [...pool], result: T[] = [];
  while (result.length < count && available.length) result.push(available.splice(Math.floor(random() * available.length), 1)[0]);
  return result;
}
