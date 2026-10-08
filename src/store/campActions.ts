import { recordDecision } from '../service/telemetry/commit';
import { CAMP_BUFFS } from '../configs/campConfig';
import { getRefreshCost } from '../service/rewards/refreshService';
import type { GameState } from './gameStore.types';
import type { CampChoice } from '../types/camp';
import { drawCampBuff, resolveCampChoice } from '../service/camp/campService';

export function createCampActions(set: (value: Partial<GameState>) => void, get: () => GameState) {
  const isOpen = (state: GameState) =>
    state.mapNodes[state.currentNodeIndex].type === 'camp' &&
    !state.mapNodes[state.currentNodeIndex].completed &&
    state.campOffer !== null;
  return {
    chooseCamp: (choice: CampChoice) => {
      const state = get();
      if (!isOpen(state)) return;
      const result = resolveCampChoice(choice, state);
      if (!result) return;
      set({ ...result, campOffer: null });
      recordDecision(set, state, get(), {
        kind: 'camp',
        source: 'camp',
        choiceId: choice,
        items:
          choice === 'buff' && state.campOffer
            ? [{ id: state.campOffer, ...CAMP_BUFFS[state.campOffer] }]
            : [],
      });
      get().advanceToNextNode();
    },
    refreshCamp: () => {
      const state = get(),
        cost = getRefreshCost('camp', state.campRefreshes);
      if (!isOpen(state) || state.gold < cost) return;
      set({
        gold: state.gold - cost,
        campRefreshes: state.campRefreshes + 1,
        campOffer: drawCampBuff(state.campOffer),
      });
      recordDecision(set, state, get(), { kind: 'refresh', source: 'camp' });
    },
  };
}
