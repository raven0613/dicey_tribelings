import { CREATURE_CONFIG } from './creatures/creatureConfig';

export const SKILL_KEYWORD_COLORS: Record<string, string> = {
  ...Object.fromEntries(Object.values(CREATURE_CONFIG).map((role) => [role.name, role.color])),
  搶奪: '#fb9988', 護盾: '#93c5fd',
  尚未發動: '#2dd4bf', 已發動: '#94a3b8',
};

export const HOVER_PRESENTATION = {
  colors: { support: '#fbbf24', adjacent: '#79d8c7', shield: '#93c5fd', robbery: '#fb9988', attack: '#d5b4ff' },
  passiveOpacity: 0.3,
  fadeMs: 160, lineMs: 220, flowMs: 900, nameRise: 5,
  lineWidth: 3.5, glowWidth: 8, glowBlur: 5,
  ease: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
} as const;
