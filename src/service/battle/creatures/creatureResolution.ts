import { resolveCampShield, resolveCampAttacks } from '../../camp/campBuff';
import { resolveMaterials } from './materialResolution';
import type { ResolutionContext } from './resolutionContext';
import { resolveRoleBases, resolveIdentities } from './identityResolution';
import { resolveFoodAndBonuses, resolveSupport } from './supportResolution';
import { resolveRobbery } from './attackResolution';
import { resolveBonusConversion } from './bonusResolution';
import { resolveFinalAttacks } from './finalAttackResolution';

export function resolveCreatures(context: ResolutionContext) {
  resolveRoleBases(context);
  resolveMaterials(context);
  resolveIdentities(context);
  resolveSupport(context);
  resolveCampShield(context);
  resolveFoodAndBonuses(context);
  const captures = resolveRobbery(context);
  resolveBonusConversion(context);
  resolveFinalAttacks(context);
  resolveCampAttacks(context);
  return { captures };
}
