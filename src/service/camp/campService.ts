import { CAMP_BUFFS, CAMP_CONFIG } from '../../configs/campConfig';
import type { CampBuffId, CampChoice } from '../../types/camp';

export function drawCampBuff(current: CampBuffId | null = null, random = Math.random): CampBuffId {
  const candidates = (Object.keys(CAMP_BUFFS) as CampBuffId[]).filter(id => id !== current);
  return candidates[Math.floor(random() * candidates.length)];
}

export function resolveCampChoice(choice: CampChoice,
  state: { playerHp: number; maxHp: number; gold: number; campOffer: CampBuffId | null }) {
  if (choice === 'buff') return state.campOffer ? { campBuff: state.campOffer } : null;
  if (state.playerHp >= state.maxHp) return null;
  if (choice === 'fullHeal') return state.gold >= CAMP_CONFIG.fullHealCost
    ? { playerHp: state.maxHp, gold: state.gold - CAMP_CONFIG.fullHealCost } : null;
  return { playerHp: Math.min(state.maxHp, state.playerHp + CAMP_CONFIG.healAmount) };
}
