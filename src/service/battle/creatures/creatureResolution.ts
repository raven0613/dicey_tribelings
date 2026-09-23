import { resolveMaterials } from './materialResolution';
import type { ResolutionContext } from './resolutionContext';
import { resolveIdentities } from './identityResolution';
import { resolveFoodAndBonuses, resolveSupport, resolveSupportMultipliers } from './supportResolution';
import { resolveFinalAttacks, resolveRobbery } from './attackResolution';

export function resolveCreatures(context: ResolutionContext) {
  resolveMaterials(context);
  resolveIdentities(context);
  resolveSupport(context);
  resolveFoodAndBonuses(context);
  resolveSupportMultipliers(context);
  const captures = resolveRobbery(context);
  resolveFinalAttacks(context);
  return { captures };
}
