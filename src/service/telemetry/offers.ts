import { SHOP_CONFIG } from '../../configs/shopConfig';
import { CAMP_CONFIG, CAMP_BUFFS } from '../../configs/campConfig';
import { locationOf } from './snapshot';
import type { OfferOption, OfferRecord, OfferSource } from './decisionTypes';
import type { TelemetryState } from './types';

/** Only data visible before choosing belongs in an offer; hidden draws live in decisions. */
export function collectOffers(
  state: TelemetryState,
  previous: TelemetryState | null,
  now: number,
  activeMs: number,
  nextId: number,
): OfferRecord[] {
  const offers: OfferRecord[] = [];
  const add = (source: OfferSource, options: OfferOption[]) => {
    if (options.length)
      offers.push({
        id: nextId + offers.length,
        at: now,
        activeMs,
        location: locationOf(state),
        source,
        options,
      });
  };
  const nodeChanged = !previous || locationOf(state).nodeId !== locationOf(previous).nodeId;
  if (
    locationOf(state).type === 'shop' &&
    (nodeChanged || state.shopRefreshes !== previous?.shopRefreshes)
  ) {
    add('shop', [
      ...(state.shopStickers ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        price:
          item.cost ?? (item.isDisposable ? SHOP_CONFIG.disposableCost : SHOP_CONFIG.permanentCost),
        visibleItems: [item],
        hiddenCount: 0,
      })),
      ...(state.shopPacks ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        price: SHOP_CONFIG.packCost,
        visibleItems: [],
        hiddenCount: item.slots.length,
      })),
      ...(state.shopEquipments ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        price: SHOP_CONFIG.equipmentCost,
        visibleItems: [item],
        hiddenCount: 0,
      })),
      {
        id: 'heal',
        name: '恢復生命',
        price: SHOP_CONFIG.healCost,
        visibleItems: [],
        hiddenCount: 0,
      },
    ]);
  }
  if (state.battleRewardOptions !== previous?.battleRewardOptions)
    add(
      'reward',
      (state.battleRewardOptions ?? []).map((option) =>
        option.kind === 'bundle'
          ? {
              id: option.id,
              name: option.sticker.name,
              visibleItems: [option.sticker],
              hiddenCount: option.hidden.length,
            }
          : {
              id: option.id,
              name: option.pack.name,
              visibleItems: [],
              hiddenCount: option.stickers.length,
            },
      ),
    );
  if (state.chestRewardOptions !== previous?.chestRewardOptions)
    add(
      'chest',
      (state.chestRewardOptions ?? []).map((option) => ({
        id: option.id,
        name: option.equipment.name,
        visibleItems: [option.equipment],
        hiddenCount: 0,
      })),
    );
  if (state.diceRewardOptions !== previous?.diceRewardOptions)
    add(
      'dice',
      (state.diceRewardOptions ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        visibleItems: [item],
        hiddenCount: 0,
      })),
    );
  if (
    state.campOffer &&
    (nodeChanged ||
      state.campOffer !== previous?.campOffer ||
      state.campRefreshes !== previous?.campRefreshes)
  ) {
    add('camp', [
      {
        id: 'heal',
        name: `恢復 ${CAMP_CONFIG.healAmount} 生命`,
        price: 0,
        visibleItems: [],
        hiddenCount: 0,
      },
      {
        id: 'fullHeal',
        name: '恢復全部生命',
        price: CAMP_CONFIG.fullHealCost,
        visibleItems: [],
        hiddenCount: 0,
      },
      {
        id: 'buff',
        name: CAMP_BUFFS[state.campOffer].name,
        price: 0,
        visibleItems: [{ id: state.campOffer, ...CAMP_BUFFS[state.campOffer] }],
        hiddenCount: 0,
      },
    ]);
  }
  return offers;
}
