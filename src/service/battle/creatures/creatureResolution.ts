import type { ResolutionContext } from './resolutionContext';
import { resolveIdentities } from './identityResolution';
import { resolveFoodAndBonuses, resolveSupport } from './supportResolution';
import { resolveFinalAttacks, resolveRobbery } from './attackResolution';

export function resolveCreatures(context: ResolutionContext) {
  resolveIdentities(context);
  resolveSupport(context);
  resolveFoodAndBonuses(context);
  const captures = resolveRobbery(context);
  resolveFinalAttacks(context);
  return { captures };
}
