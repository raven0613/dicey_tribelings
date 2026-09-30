import crocodileImage from '../../assets/enemy/01.png';

/** Asset filenames belong here; gameplay and components use stable appearance IDs. */
export const ENEMY_APPEARANCES = {
  crocodile: { src: crocodileImage, width: 1035, height: 790 },
} as const;
type AppearanceId = keyof typeof ENEMY_APPEARANCES;
export const ENEMY_APPEARANCE_CONFIG: {
  defaultId: AppearanceId;
  byDefinition: Partial<Record<string, AppearanceId>>;
} = { defaultId: 'crocodile', byDefinition: {} };

export function getEnemyAppearance(definitionId: string) {
  return ENEMY_APPEARANCES[ENEMY_APPEARANCE_CONFIG.byDefinition[definitionId] ?? ENEMY_APPEARANCE_CONFIG.defaultId];
}
