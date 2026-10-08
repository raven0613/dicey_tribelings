export const INVENTORY_CONFIG = {
  consumableCapacity: 3,
  permanentCapacity: 60,
} as const;

export const BACKPACK_PRESENTATION = {
  transferMs: 460,
  layoutSeconds: 0.28,
  dragThreshold: 7,
  menuWidth: 200,
  transferSize: 64,
  cardHeight: 174,
  gridGap: 10,
  defaultSort: 'time',
  fullMessage: '永久貼紙背包已滿，請先放棄貼紙騰出空間。',
} as const;
