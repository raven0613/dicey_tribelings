import type { CampBuffId } from '../types/camp';

export const CAMP_CONFIG = {
  title: '營火', healAmount: 25, fullHealCost: 20,
} as const;

export const CAMP_BUFFS = {
  sharpen: { name: '磨刃', rounds: 2, attack: 2,
    description: '前兩回合，每顆有普通攻擊的骰子攻擊 +2；追加與再攻擊維持原值。' },
  initiative: { name: '先攻', rounds: 1, multiplier: 1.3,
    description: '第一回合，普通攻擊 ×1.3；追加與再攻擊維持原值。' },
  ward: { name: '護身', rounds: 2, shield: 5,
    description: '前兩回合，每回合獲得 5 點團隊護盾，計入當回合新生護盾。' },
  focus: { name: '凝神', control: 2,
    description: '起始 Control 與上限 +2。' },
} as const satisfies Record<CampBuffId, { name: string; description: string; rounds?: number; attack?: number; multiplier?: number; shield?: number; control?: number }>;
