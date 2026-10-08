import { ALL_EQUIPMENT_CATALOG, INITIAL_PLAYER_STATS } from '../../configs/gameConfig';
import assert from 'node:assert/strict';
import test from 'node:test';
import { useGameStore } from '../../store/gameStore';
import { SHOP_CONFIG } from '../../configs/shopConfig';
import { REWARD_CONFIG } from '../../configs/rewardConfig';
import { CAMP_CONFIG } from '../../configs/campConfig';
import {
  createPermanentSticker,
  DISPOSABLE_STICKERS,
} from '../../configs/creatures/creatureStickerConfig';
import { STICKER_PACKS_CATALOG } from '../../configs/stickerPacksConfig';
import { getBattleRewardStickers, generateBattleRewardOptions } from '../rewards/rewardService';
import { RunRecorder } from './recorder';
import { getRefreshCost } from '../rewards/refreshService';
import { createOwnedSticker } from '../inventory/stickerInstances';

function recording() {
  useGameStore.getState().restartGame();
  let time = 0;
  const recorder = new RunRecorder('test', useGameStore.getState(), time, 'test', true);
  const unsubscribe = useGameStore.subscribe((state, previous) =>
    recorder.observe(state, previous, ++time),
  );
  return { recorder, unsubscribe };
}
const state = () => useGameStore.getState();
function shop() {
  state().startNode(state().mapNodes.findIndex((node) => node.type === 'shop'));
}

test('shop records offered prices, successful purchases and hidden pack reveals; rejection records nothing', () => {
  const { recorder, unsubscribe } = recording();
  try {
    shop();
    const offer = recorder.record.offers!.at(-1)!;
    assert.equal(offer.source, 'shop');
    assert.ok(
      offer.options.some(
        (option) => option.price === SHOP_CONFIG.packCost && option.hiddenCount > 0,
      ),
    );
    const pack = state().shopPacks[0];
    useGameStore.setState({ gold: SHOP_CONFIG.packCost });
    assert.equal(state().buyShopPack(pack.id), true);
    const [purchase, reveal] = recorder.record.decisions!.slice(-2);
    assert.equal(purchase.kind, 'purchase');
    assert.equal(purchase.offerId, offer.id);
    assert.equal(
      purchase.resources.gold.before - purchase.resources.gold.after,
      SHOP_CONFIG.packCost,
    );
    assert.equal(reveal.kind, 'pack');
    assert.deepEqual(reveal.items, state().openedPackResult!.stickers);
    assert.equal(
      reveal.items!.length,
      STICKER_PACKS_CATALOG.find((item) => item.id === pack.id)!.slots.length,
    );
    const count = recorder.record.decisions!.length;
    assert.equal(state().buyShopPack(pack.id), false);
    assert.equal(recorder.record.decisions!.length, count);
  } finally {
    unsubscribe();
  }
});

test('battle rewards retain visible candidates and only reveal the chosen hidden contents', () => {
  const { recorder, unsubscribe } = recording();
  try {
    const options = generateBattleRewardOptions('normal', () => 0);
    useGameStore.setState({
      combatPhase: 'VICTORY',
      battleRewardOptions: options,
      battleRewardPickCount: REWARD_CONFIG.normalFightPickCount,
    });
    const offer = recorder.record.offers!.at(-1)!;
    assert.equal(offer.options.length, options.length);
    assert.deepEqual(
      offer.options[0].visibleItems,
      options[0].kind === 'bundle' ? [options[0].sticker] : [],
    );
    assert.equal(offer.options[0].hiddenCount, REWARD_CONFIG.normalHiddenStickerCount);
    state().claimBattleReward(options[0].id);
    const decision = recorder.record.decisions!.at(-1)!;
    assert.equal(decision.offerId, offer.id);
    assert.deepEqual(
      decision.items!.map((item) => item.id),
      getBattleRewardStickers(options[0]).map((item) => item.id),
    );
    assert.ok(decision.items!.every((item) => item.instanceId));
    const gold = state().gold;
    state().skipStickerFlow();
    const skipped = recorder.record.decisions!.at(-1)!;
    assert.equal(skipped.kind, 'skip');
    assert.equal(skipped.resources.gold.after - gold, REWARD_CONFIG.skipGold.normal);
    assert.ok(skipped.changes.every((change) => change.to === null));
  } finally {
    unsubscribe();
  }
});

test('inventory-only changes create snapshots and transfers preserve sticker identities', () => {
  const { recorder, unsubscribe } = recording();
  try {
    const item = createOwnedSticker(createPermanentSticker('warrior'));
    useGameStore.setState({ stickerFlow: { items: [item], index: -1, completion: 'stay' } });
    state().storeFlowSticker(0);
    assert.equal(
      recorder.record.snapshots.at(-1)!.permanentStickers![0].instanceId,
      item.instanceId,
    );
    const die = state().dicePool[0],
      index = die.faces.findIndex((face) => face.creature !== 'blank');
    state().placeInventorySticker(item.instanceId, die.id, index);
    const changes = recorder.record.decisions!.at(-1)!.changes;
    assert.ok(
      changes.some(
        (change) =>
          change.item.instanceId === item.instanceId &&
          change.from?.kind === 'permanentBag' &&
          change.to?.faceIndex === index,
      ),
    );
    assert.ok(
      changes.some((change) => change.from?.kind === 'face' && change.to?.kind === 'permanentBag'),
    );
    state().takeFaceSticker(die.id, index);
    assert.ok(
      recorder.record
        .decisions!.at(-1)!
        .changes.some(
          (change) =>
            change.item.instanceId === item.instanceId && change.to?.kind === 'permanentBag',
        ),
    );
  } finally {
    unsubscribe();
  }
});

test('temporary placement is recorded before battle entry and consumed once', () => {
  const { recorder, unsubscribe } = recording();
  try {
    const sticker = DISPOSABLE_STICKERS[0];
    useGameStore.setState({ shopStickers: [sticker], gold: sticker.cost! });
    state().buyShopSticker(sticker.id);
    state().storeFlowSticker(0);
    const die = state().dicePool[0],
      index = die.faces.findIndex((face) => face.creature !== 'blank');
    state().placeInventorySticker(state().consumableStickers[0].instanceId, die.id, index);
    assert.equal(recorder.record.snapshots.at(-1)!.temporaryPlacements!.length, 1);
    state().confirmBattlePreparation();
    state().confirmBattlePreparation();
    const consumes = recorder.record.decisions!.filter((item) => item.kind === 'consume');
    assert.equal(consumes.length, 1);
    assert.equal(consumes[0].items![0].id, sticker.id);
    assert.equal(consumes[0].changes[0].from?.kind, 'temporaryFace');
    assert.equal(consumes[0].changes[0].to, null);
  } finally {
    unsubscribe();
  }
});

test('healing and refreshing capture effective resource deltas and camp commits before travel', () => {
  const { recorder, unsubscribe } = recording();
  try {
    shop();
    useGameStore.setState({ gold: SHOP_CONFIG.healCost, playerHp: state().maxHp - 1 });
    state().buyHeal();
    const heal = recorder.record.decisions!.at(-1)!;
    assert.equal(heal.resources.hp.after - heal.resources.hp.before, 1);
    assert.equal(heal.resources.gold.before - heal.resources.gold.after, SHOP_CONFIG.healCost);
    const refreshCost = getRefreshCost('shop', state().shopRefreshes);
    useGameStore.setState({ gold: refreshCost });
    const offersBefore = recorder.record.offers!.length;
    state().refreshShop();
    assert.equal(recorder.record.offers!.length, offersBefore + 1);
    assert.equal(
      recorder.record.decisions!.at(-1)!.resources.gold.before -
        recorder.record.decisions!.at(-1)!.resources.gold.after,
      refreshCost,
    );
    const campIndex = state().mapNodes.findIndex((node) => node.type === 'camp');
    state().startNode(campIndex);
    useGameStore.setState({ playerHp: state().maxHp - CAMP_CONFIG.healAmount });
    state().chooseCamp('heal');
    const camp = recorder.record.decisions!.at(-1)!;
    assert.equal(camp.location.nodeId, state().mapNodes[campIndex].id);
    assert.equal(camp.resources.hp.after - camp.resources.hp.before, CAMP_CONFIG.healAmount);
  } finally {
    unsubscribe();
  }
});

test('equipment replacement charges only on confirmation and links the original offer', () => {
  const { recorder, unsubscribe } = recording();
  try {
    shop();
    const equipment = state().shopEquipments[0];
    const offer = recorder.record.offers!.at(-1)!;
    useGameStore.setState({
      gold: SHOP_CONFIG.equipmentCost,
      equipments: ALL_EQUIPMENT_CATALOG.filter((item) => item.id !== equipment.id).slice(
        0,
        INITIAL_PLAYER_STATS.maxEquipmentSlots,
      ),
    });
    const count = recorder.record.decisions!.length;
    state().buyShopEquipment(equipment.id);
    assert.equal(recorder.record.decisions!.length, count);
    assert.equal(state().gold, SHOP_CONFIG.equipmentCost);
    state().cancelPendingEquipment();
    assert.equal(recorder.record.decisions!.length, count);
    state().buyShopEquipment(equipment.id);
    const replaced = state().equipments[0];
    state().replacePendingEquipment(replaced.id);
    const decision = recorder.record.decisions!.at(-1)!;
    assert.equal(decision.offerId, offer.id);
    assert.equal(decision.items![0].id, equipment.id);
    assert.equal(
      decision.resources.gold.before - decision.resources.gold.after,
      SHOP_CONFIG.equipmentCost,
    );
    assert.equal(
      recorder.record.equipmentHistory.find((item) => item.equipmentId === replaced.id)!
        .replacementId,
      equipment.id,
    );
  } finally {
    unsubscribe();
  }
});

test('chest selection remains attached to its original node after automatically advancing', () => {
  const { recorder, unsubscribe } = recording();
  try {
    const index = state().mapNodes.findIndex((node) => node.type === 'chest');
    state().startNode(index);
    useGameStore.setState({ equipments: [] });
    state().openChest();
    const option = state().chestRewardOptions[0];
    const offer = recorder.record.offers!.at(-1)!;
    state().claimChestReward(option);
    const decision = recorder.record.decisions!.at(-1)!;
    assert.equal(decision.kind, 'equip');
    assert.equal(decision.location.nodeId, state().mapNodes[index].id);
    assert.equal(decision.choiceId, option.id);
    assert.equal(decision.offerId, offer.id);
    assert.deepEqual(decision.items, [option.equipment]);
  } finally {
    unsubscribe();
  }
});
