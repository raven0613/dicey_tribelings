import type { FaceMaterial } from '../../types/materials';
import type { CreatureTag } from '../../types/creatures';
export const MATERIAL_CONFIG = {
  mirror: { name: '鏡面', symbol: '◇', color: '#cbd5e1', surface: '#e2e8f0', description: '敵人造成生命損失後，反射 3 傷害。' },
  resonance: { name: '共鳴', symbol: '◎', color: '#a78bfa', surface: '#ede9fe', description: '左右鄰骰面本回合攻擊力各 +2。' },
  shock: { name: '震盪', symbol: 'ϟ', color: '#fb923c', surface: '#ffedd5', description: '結算產生一顆 2 點追加攻擊骰。' },
  vial: { name: '血瓶', symbol: '♥', color: '#fb7185', surface: '#ffe4e6', description: '結算時回復 2 HP。' },
  ripple: { name: '漣漪', symbol: '≋', color: '#38bdf8', surface: '#e0f2fe', description: '結算獲得 4 護盾。' },
  gilded: { name: '金色脆閃', symbol: '✦', color: '#fbbf24', surface: '#fef3c7', description: '勝利額外 +3 金幣，每面每場一次。' },
  foil: { name: '亮金箔', symbol: '▧', color: '#eab308', surface: '#fef08a', description: '有效基礎攻擊力 +3。' },
  negative: { name: '負片', symbol: '◐', color: '#e2e8f0', surface: '#1e293b', description: '基礎攻擊力 +5；結算後 -2，最低為基礎攻擊力 0，下場戰鬥重置。' },
  iridescent: { name: '虹彩', symbol: '✺', color: '#e879f9', surface: '#fae8ff', description: '本面角色擁有全部標籤。' },
  echo: { name: '迴響', symbol: '◉', color: '#2dd4bf', surface: '#ccfbf1', description: '每場首次成功發動角色能力，額外重現一次效果。' },
} satisfies Record<FaceMaterial, { name: string; symbol: string; color: string; surface: string; description: string }>;
export const SPECIAL_MATERIALS: readonly FaceMaterial[] = ['mirror', 'resonance', 'shock', 'vial', 'ripple', 'gilded', 'foil', 'negative'];
export const ULTRA_MATERIALS: readonly FaceMaterial[] = ['iridescent', 'echo'];
export const MATERIAL_CHANCES = { ordinary: 0.95, special: 0.04, ultra: 0.01 } as const;
export const MATERIAL_BALANCE = { mirror: 3, resonance: 2, shock: 2, vial: 2, ripple: 4, gilded: 3, foil: 3, negative: 5, decay: 2 } as const;
export const ALL_FACE_TAGS: readonly CreatureTag[] = ['common', 'warrior', 'craftsman', 'noble', 'mystery', 'food'];
export const FOOD_CAPACITY = { crocodile: 150, underground: 200 } as const;
