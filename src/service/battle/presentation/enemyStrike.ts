import { ENEMY_STRIKE as config } from '../../../configs/monsters/enemyStrikeConfig';

/** Use resolved damage before shield absorption and HP caps, once for each strike. */
export function getEnemyStrikeStrength(definitionId: string, damage: number, heavy: boolean) {
  const role = config.roles.byDefinition[definitionId] ?? config.roles.defaultRole;
  const damageGain = Math.sqrt(Math.max(0, damage) / config.strength.referenceDamage);
  const strength = (config.strength.base + damageGain * config.strength.damageGain)
    * config.roles.gain[role]
    * (heavy ? config.strength.heavyGain : 1);
  return Math.max(config.strength.min, Math.min(config.strength.max, strength));
}
