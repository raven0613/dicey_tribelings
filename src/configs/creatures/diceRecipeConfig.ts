import type { PermanentCreatureId } from '../../types/creatures';

export interface DiceRecipe { id: string; name: string; colorTheme: string; faces: readonly (readonly [PermanentCreatureId, number])[] }
export const DICE_DRAFT_CONFIG = { optionCount: 3, regionBonus: { 1: 0, 2: 2, 3: 4 } } as const;
export const ROAD_DICE_RECIPES: readonly DiceRecipe[] = [
  { id: 'clan', name: '宗族骰', colorTheme: 'emerald', faces: [['family', 3], ['family', 3], ['family', 3], ['sisters', 3], ['sisters', 3], ['knight', 3]] },
  { id: 'combo', name: '連擊骰', colorTheme: 'ruby', faces: [['twins', 3], ['twins', 3], ['twins', 3], ['family', 3], ['family', 3], ['guard', 3]] },
  { id: 'gang', name: '混混骰', colorTheme: 'obsidian', faces: [['gang', 2], ['boss', 3], ['gang', 2], ['thief', 2], ['gang', 2], ['coward', 3]] },
  { id: 'alliance', name: '同盟骰', colorTheme: 'emerald', faces: [['sisters', 3], ['sisters', 3], ['sisters', 3], ['porter', 3], ['porter', 3], ['guard', 3]] },
  { id: 'porter', name: '搬運骰', colorTheme: 'amber', faces: [['artisan', 3], ['porter', 3], ['porter', 3], ['porter', 3], ['follower', 2], ['coward', 3]] },
  { id: 'valor', name: '勇武骰', colorTheme: 'ruby', faces: [['warrior', 3], ['warrior', 3], ['follower', 2], ['follower', 2], ['knight', 3], ['cheerleader', 2]] },
  { id: 'guard', name: '護衛骰', colorTheme: 'sapphire', faces: [['guard', 3], ['guard', 3], ['coward', 3], ['coward', 3], ['bulwark', 2], ['knight', 3]] },
  { id: 'works', name: '工事骰', colorTheme: 'amber', faces: [['artisan', 3], ['artisan', 3], ['porter', 3], ['teacher', 3], ['sisters', 3], ['coward', 3]] },
  { id: 'kitchen', name: '廚房骰', colorTheme: 'amber', faces: [['chef', 4], ['chef', 4], ['food', 6], ['fruit', 2], ['farmer', 3], ['porter', 3]] },
  { id: 'feast', name: '宴席骰', colorTheme: 'amber', faces: [['glutton', 3], ['glutton', 3], ['farmer', 3], ['farmer', 3], ['food', 6], ['fruit', 2]] },
  { id: 'tactics', name: '調度骰', colorTheme: 'sapphire', faces: [['teacher', 3], ['teacher', 3], ['prankster', 3], ['prankster', 3], ['coward', 3], ['priest', 2]] },
  { id: 'altar', name: '祭壇骰', colorTheme: 'obsidian', faces: [['priest', 2], ['priest', 2], ['coward', 3], ['coward', 3], ['teacher', 3], ['elder', 2]] },
  { id: 'robbery', name: '搶奪骰', colorTheme: 'ruby', faces: [['boss', 3], ['boss', 3], ['bully', 3], ['family', 3], ['family', 3], ['prankster', 3]] },
  { id: 'thief', name: '趁火骰', colorTheme: 'obsidian', faces: [['thief', 2], ['thief', 2], ['boss', 3], ['sisters', 3], ['porter', 3], ['coward', 3]] },
  { id: 'detective', name: '辦案骰', colorTheme: 'sapphire', faces: [['detective', 3], ['detective', 3], ['teacher', 3], ['porter', 3], ['boss', 3], ['guard', 3]] },
  { id: 'court', name: '宮廷骰', colorTheme: 'gold', faces: [['royalGuard', 3], ['elder', 2], ['authority', 2], ['knight', 3], ['guard', 3], ['sisters', 3]] },
  { id: 'herald', name: '號令骰', colorTheme: 'gold', faces: [['herald', 2], ['herald', 2], ['cheerleader', 2], ['bulwark', 2], ['warrior', 3], ['sisters', 3]] },
  { id: 'versatile', name: '百變骰', colorTheme: 'obsidian', faces: [['imposter', 2], ['elder', 2], ['loner', 3], ['sisters', 3], ['family', 3], ['family', 3]] },
];
