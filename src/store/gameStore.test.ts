import { CAMP_CONFIG, CAMP_BUFFS } from '../configs/campConfig';
import { computeMaxControl } from '../service/battle/nodeService';
import { SHOP_CONFIG } from '../configs/shopConfig';
import { getArrowTarget } from '../service/dice/directionalFaces';
import { getEffectiveFace } from '../service/dice/diceFaces';
import { REWARD_CONFIG } from '../configs/rewardConfig';
import { getPaidRerollCost } from '../service/battle/rerollCost';
import { EQUIPMENT_BALANCE } from '../configs/equipment/equipmentConfig';
import { INITIAL_MAP_NODES, CHAPTER_END_NODE } from '../configs/regions/mapConfig';
import { createBossRewardDice } from '../service/dice/diceFactory';
import { drawDiceRecipes } from '../service/dice/diceDraft';
import { getRefreshCost, rewardKey } from '../service/rewards/refreshService';
import { REGION_IDS } from '../configs/regions/regionConfig';
import { chapterPath } from '../service/regions/routeService';
import { generateBattleRewardOptions } from '../service/rewards/rewardService';
import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_EQUIPMENT_CATALOG } from '../configs/gameConfig';
import { createConsumableSticker } from '../service/inventory/inventoryService';
import { DISPOSABLE_STICKERS } from '../configs/creatures/creatureStickerConfig';
import { CREATURE_BALANCE } from '../configs/creatures/creatureBalanceConfig';
import { useGameStore } from './gameStore';
test('combat nodes wait for preparation confirmation before the first roll', () => {
  useGameStore.getState().restartGame();
  assert.equal(useGameStore.getState().combatPhase, 'PREPARATION');
  useGameStore.getState().confirmBattlePreparation([]);
  assert.equal(useGameStore.getState().combatPhase, 'ROLLING');
});
test('cancelling a full chest equipment replacement returns to the same choices', () => {
  useGameStore.getState().restartGame();
  const option = {
    id: `equipment:${ALL_EQUIPMENT_CATALOG[5].id}`,
    kind: 'equipment' as const,
    equipment: ALL_EQUIPMENT_CATALOG[5],
  };
  const goldBefore = useGameStore.getState().gold;
  useGameStore.setState({
    currentNodeIndex: 2,
    equipments: ALL_EQUIPMENT_CATALOG.slice(0, 5),
    chestRewardOptions: [option],
  });

  useGameStore.getState().claimChestReward(option);
  assert.equal(useGameStore.getState().pendingEquipment?.source, 'chest');
  assert.equal(useGameStore.getState().gold, goldBefore);

  useGameStore.getState().cancelPendingEquipment();
  assert.equal(useGameStore.getState().pendingEquipment, null);
  assert.deepEqual(useGameStore.getState().chestRewardOptions, [option]);
});

test('a full shop consumable purchase charges only after one instance is replaced', () => {
  useGameStore.getState().restartGame();
  const incoming = DISPOSABLE_STICKERS[0];
  const existing = DISPOSABLE_STICKERS.slice(1, 4)
    .map((sticker, index) => createConsumableSticker(sticker, `existing-${index}`));
  useGameStore.setState({ gold: 100, shopStickers: [incoming], consumableStickers: existing });

  useGameStore.getState().buyShopSticker(incoming.id);
  assert.equal(useGameStore.getState().gold, 100);
  useGameStore.getState().replaceShopSticker(existing[1].instanceId);

  const result = useGameStore.getState();
  assert.equal(result.gold, 100 - (incoming.cost ?? 20));
  assert.equal(result.consumableStickers.length, 3);
  assert.equal(result.consumableStickers[0].instanceId, existing[0].instanceId);
  assert.equal(result.consumableStickers[2].instanceId, existing[2].instanceId);
  assert.equal(result.consumableStickers[1].stickerId, incoming.id);
});

test('rations become initial stock once and remain across rounds', () => {
  useGameStore.getState().restartGame();
  const dicePool = useGameStore.getState().dicePool.map(die => ({ ...die, faces: die.faces.map(face => ({ ...face, creature: 'chef' as const })) }));
  useGameStore.setState({ dicePool, storedRations: 9, equipments: ALL_EQUIPMENT_CATALOG.filter(item => item.ruleId === 'RATIONS') });
  useGameStore.getState().confirmBattlePreparation([]);
  const stock = Object.fromEntries(dicePool.map(die => [die.id, 9 / dicePool.length]));
  assert.deepEqual(useGameStore.getState().creatureBattleState.storedFood, stock);
  assert.equal(useGameStore.getState().storedRations, 0);
  useGameStore.getState().startBattleRoll();
  assert.deepEqual(useGameStore.getState().creatureBattleState.storedFood, stock);
  assert.deepEqual(useGameStore.getState().creatureBattleState.initialRations, {});
});

test('guaranteed princess is offered once before advancing its milestone', () => {
  useGameStore.getState().restartGame();
  useGameStore.setState({ currentNodeIndex: CREATURE_BALANCE.princess.guaranteedNode });
  useGameStore.getState().advanceToNextNode();
  assert.equal(useGameStore.getState().stickerFlow?.items[0].creature, 'princess');
  assert.equal(useGameStore.getState().princessGuaranteed, true);
  useGameStore.getState().skipStickerFlow();
  assert.deepEqual(useGameStore.getState().routeChoices, INITIAL_MAP_NODES[CREATURE_BALANCE.princess.guaranteedNode].next);
  assert.equal(useGameStore.getState().stickerFlow, null);
});

test('shop purchases with space settle immediately and cannot buy the same offer twice', () => {
  useGameStore.getState().restartGame();
  const sticker = DISPOSABLE_STICKERS[0];
  useGameStore.setState({ shopStickers: [sticker], gold: sticker.cost! });
  const gold = useGameStore.getState().gold;
  assert.equal(useGameStore.getState().buyShopSticker(sticker.id), true);
  assert.equal(useGameStore.getState().pendingShopSticker, null);
  assert.equal(useGameStore.getState().consumableStickers[0].stickerId, sticker.id);
  assert.equal(useGameStore.getState().gold, gold - sticker.cost!);
  assert.equal(useGameStore.getState().buyShopSticker(sticker.id), false);
});

test('bundle rewards reveal together, apply in any order and retain the receiving pips', () => {
  useGameStore.getState().restartGame();
  const fight = INITIAL_MAP_NODES.find(node => node.type === 'fight')!;
  useGameStore.getState().startNode(fight.id);
  const options = generateBattleRewardOptions('normal', () => 0.5);
  useGameStore.setState({ combatPhase: 'VICTORY', battleRewardOptions: options, battleRewardPickCount: 1 });
  const before = useGameStore.getState(), die = before.dicePool[0];
  before.claimBattleReward('missing');
  assert.equal(useGameStore.getState().battleRewardOptions, options);
  before.claimBattleReward(options[0].id);
  const claimed = useGameStore.getState();
  assert.equal(claimed.stickerFlow?.items.length, 1 + REWARD_CONFIG.normalHiddenStickerCount);
  assert.equal(claimed.battleRewardPickCount, 0);
  assert.deepEqual(claimed.battleRewardOptions, []);
  const chosen = claimed.stickerFlow!.items.at(-1)!;
  claimed.chooseFlowSticker(claimed.stickerFlow!.items.length - 1);
  useGameStore.getState().applyCurrentSticker(die.id, die.faces.length);
  assert.equal(useGameStore.getState().dicePool, before.dicePool);
  useGameStore.getState().applyCurrentSticker(die.id, 0);
  const applied = useGameStore.getState();
  assert.equal(applied.stickerFlow?.items.length, REWARD_CONFIG.normalHiddenStickerCount);
  assert.equal(applied.stickerFlow?.index, -1);
  assert.equal(applied.dicePool[0].faces[0].creature, chosen.creature);
  assert.equal(applied.dicePool[0].faces[0].baseValue, die.faces[0].baseValue);
  applied.skipStickerFlow();
  assert.equal(useGameStore.getState().gold, before.gold);
});

test('revealing and skipping a whole unused bundle pays exactly once', () => {
  useGameStore.getState().restartGame();
  const options = generateBattleRewardOptions('normal', () => 0.5);
  useGameStore.setState({ combatPhase: 'VICTORY', battleRewardOptions: options, battleRewardPickCount: 1 });
  const gold = useGameStore.getState().gold;
  useGameStore.getState().claimBattleReward(options[0].id);
  useGameStore.getState().skipStickerFlow();
  assert.equal(useGameStore.getState().gold, gold + REWARD_CONFIG.skipGold.normal);
  useGameStore.getState().skipStickerFlow();
  useGameStore.getState().skipBattleReward();
  assert.equal(useGameStore.getState().gold, gold + REWARD_CONFIG.skipGold.normal);
});

for (const route of ['safe', 'challenge'] as const) test(`${route} route presents a blank die at each boss before advancing`, () => {
  useGameStore.getState().restartGame();
  const initialCount = useGameStore.getState().dicePool.length;
  for (const node of chapterPath(INITIAL_MAP_NODES, route).slice(0, -1)) {
    assert.equal(useGameStore.getState().mapNodes[useGameStore.getState().currentNodeIndex].id, node.id);
    if (node.type === 'boss') {
      const die = createBossRewardDice();
      useGameStore.setState({ combatPhase: 'VICTORY', receivedRewardDice: die, dicePool: [...useGameStore.getState().dicePool, die] });
      useGameStore.getState().advanceToNextNode();
      assert.equal(useGameStore.getState().currentNodeIndex, node.id);
      useGameStore.getState().acknowledgeRewardDice();
    }
    if (useGameStore.getState().openedPackResult) useGameStore.getState().beginOpenedPack();
    else useGameStore.getState().advanceToNextNode();
    while (useGameStore.getState().stickerFlow) useGameStore.getState().skipStickerFlow();
    const choices = useGameStore.getState().routeChoices;
    if (choices.length) {
      const selected = INITIAL_MAP_NODES.find((candidate) => choices.includes(candidate.id) && (candidate.route === route || candidate.route === 'combat'))!;
      useGameStore.getState().chooseRoute(selected.id);
      const before = useGameStore.getState().currentNodeIndex;
      useGameStore.getState().chooseRoute(choices.find((id) => id !== selected.id)!);
      assert.equal(useGameStore.getState().currentNodeIndex, before);
    }
  }
  const state = useGameStore.getState();
  assert.equal(state.mapNodes[state.currentNodeIndex].id, CHAPTER_END_NODE);
  assert.equal(state.dicePool.length, initialCount + REGION_IDS.length - 1);
  assert.equal(new Set(state.dicePool.map((die) => die.id)).size, state.dicePool.length);
  assert.ok(state.princessGuaranteed);
});

test('one consumable can cover only one existing face and commit preserves the target base', () => {
  useGameStore.getState().restartGame();
  const sticker = createConsumableSticker(DISPOSABLE_STICKERS[0], 'owned');
  const die = useGameStore.getState().dicePool[0];
  useGameStore.setState({ consumableStickers: [sticker] });
  const placement = { consumable: sticker, diceId: die.id, faceIndex: 0 };
  useGameStore.getState().confirmBattlePreparation([placement, { ...placement, faceIndex: 1 }]);
  assert.equal(useGameStore.getState().combatPhase, 'PREPARATION');
  useGameStore.getState().confirmBattlePreparation([placement]);
  assert.equal(useGameStore.getState().consumableStickers.length, 0);
  assert.equal(useGameStore.getState().dicePool[0].faces[0].baseValue, die.faces[0].baseValue);
  assert.equal(useGameStore.getState().combatPhase, 'ROLLING');
});


test('next round expires player shields or preserves the configured share as existing shield', () => {
  for (const retain of [false, true]) {
    useGameStore.getState().restartGame();
    const shield = useGameStore.getState().maxHp;
    useGameStore.setState({ playerShield: shield,
      equipments: retain ? ALL_EQUIPMENT_CATALOG.filter((item) => item.ruleId === 'SHIELD_RETENTION') : [] });
    useGameStore.getState().startBattleRoll();
    assert.equal(useGameStore.getState().playerShield, retain ? Math.ceil(shield * EQUIPMENT_BALANCE.shieldRetention) : 0);
    assert.deepEqual(useGameStore.getState().creatureBattleState.cowardShields, {});
  }
});

test('each paid reroll awaits confirmation before charging, including retries after cancellation', () => {
  const store = useGameStore;
  store.getState().restartGame();
  store.getState().confirmBattlePreparation([]);
  store.getState().finishRollAnimation();
  store.setState({ control: 0, gold: getPaidRerollCost(0, []) + getPaidRerollCost(1, []) });
  const initial = store.getState();
  const cost = getPaidRerollCost(initial.creatureBattleState.paidRerolls, initial.equipments);
  store.getState().useControlReroll(0);
  assert.equal(store.getState().pendingPaidRerollDiceId, initial.dicePool[0].id);
  assert.equal(store.getState().gold, initial.gold);
  store.getState().cancelPaidReroll();
  assert.equal(store.getState().gold, initial.gold);
  assert.equal(store.getState().creatureBattleState.paidRerolls, 0);
  store.getState().useControlReroll(0);
  store.getState().confirmPaidReroll(false);
  assert.equal(store.getState().gold, initial.gold - cost);
  assert.equal(store.getState().creatureBattleState.paidRerolls, 1);
  assert.equal(store.getState().pendingPaidRerollDiceId, null);
  store.getState().confirmPaidReroll(false);
  assert.equal(store.getState().gold, initial.gold - cost);
  while (store.getState().activeRerollingIndex !== null) {
    store.getState().finishRerollAnimation(store.getState().activeRerollingIndex!);
  }
  const second = store.getState();
  const nextCost = getPaidRerollCost(second.creatureBattleState.paidRerolls, second.equipments);
  store.getState().useControlReroll(0);
  assert.equal(store.getState().pendingPaidRerollDiceId, initial.dicePool[0].id);
  assert.equal(store.getState().gold, second.gold);
  assert.equal(store.getState().creatureBattleState.paidRerolls, second.creatureBattleState.paidRerolls);
  store.getState().cancelPaidReroll();
  assert.equal(store.getState().gold, second.gold);
  store.getState().useControlReroll(0);
  assert.equal(store.getState().pendingPaidRerollDiceId, initial.dicePool[0].id);
  store.getState().confirmPaidReroll(false);
  assert.equal(store.getState().gold, second.gold - nextCost);
  assert.equal(store.getState().creatureBattleState.paidRerolls, second.creatureBattleState.paidRerolls + 1);
  store.getState().startNode(initial.currentNodeIndex);
  assert.equal(store.getState().creatureBattleState.paidRerolls, 0);
});

test('dice order commits immediately and cannot be changed after the first roll', () => {
  useGameStore.getState().restartGame();
  const pool = useGameStore.getState().dicePool;
  useGameStore.getState().moveDice(pool[0].id, pool.length - 1);
  assert.equal(useGameStore.getState().dicePool.at(-1)!.id, pool[0].id);
  const reordered = useGameStore.getState().dicePool;
  useGameStore.setState({ combatPhase: 'CONTROL_PHASE' });
  useGameStore.getState().moveDice(pool[0].id, 0);
  assert.equal(useGameStore.getState().dicePool, reordered);
  useGameStore.setState({ combatPhase: 'VICTORY' });
  useGameStore.getState().moveDice(pool[0].id, 0);
  assert.deepEqual(useGameStore.getState().dicePool, pool);
});

test('shop and chest nodes allow direct ordering without a battle', () => {
  for (const type of ['shop', 'chest']) {
    useGameStore.getState().restartGame();
    const state = useGameStore.getState();
    const index = state.mapNodes.findIndex((node) => node.type === type);
    state.startNode(index);
    const pool = useGameStore.getState().dicePool;
    assert.deepEqual(useGameStore.getState().enemies, []);
    useGameStore.getState().moveDice(pool[0].id, pool.length - 1);
    assert.equal(useGameStore.getState().dicePool.at(-1), pool[0]);
  }
});


test('arrow shop purchases charge their configured price and enter the normal consumable inventory', () => {
  useGameStore.getState().restartGame();
  const sticker = DISPOSABLE_STICKERS.find((item) => item.creature === 'directional')!;
  useGameStore.setState({ shopStickers: [sticker], gold: SHOP_CONFIG.directionalCost });
  assert.equal(useGameStore.getState().buyShopSticker(sticker.id), true);
  assert.equal(useGameStore.getState().gold, 0);
  assert.equal(useGameStore.getState().consumableStickers[0].creature, sticker.creature);
});

test('invalid arrow destinations never consume inventory; valid preparation commits the owned arrow', () => {
  useGameStore.getState().restartGame();
  const die = useGameStore.getState().dicePool[0];
  const first = createConsumableSticker(DISPOSABLE_STICKERS.find((item) => item.creature === 'directional')!, 'first');
  const second = createConsumableSticker(DISPOSABLE_STICKERS.find((item) => item.creature === 'directional')!, 'second');
  const source = { diceId: die.id, faceIndex: 0, consumable: first, direction: 'arrowRight' as const };
  const destination = { diceId: die.id, faceIndex: getArrowTarget(die, 0, 'arrowRight'), consumable: second, direction: 'arrowUp' as const };
  useGameStore.setState({ consumableStickers: [first, second] });
  useGameStore.getState().confirmBattlePreparation([source, destination]);
  assert.equal(useGameStore.getState().combatPhase, 'PREPARATION');
  assert.equal(useGameStore.getState().consumableStickers.length, 2);
  assert.equal(useGameStore.getState().dicePool[0], die);
  useGameStore.getState().confirmBattlePreparation([source]);
  const state = useGameStore.getState();
  assert.equal(state.combatPhase, 'ROLLING');
  assert.deepEqual(state.consumableStickers, [second]);
  assert.equal(getEffectiveFace(state.dicePool[0].faces[0]).creature, source.direction);
  assert.notEqual(state.rolledIndices[0], 0);
});

test('recipe choice gates loot, duplicate recipes create independent dice and refresh is affordable and local', () => {
  useGameStore.getState().restartGame();
  const boss = INITIAL_MAP_NODES.find(node => node.type === 'boss')!;
  useGameStore.getState().startNode(boss.id);
  const drafts = drawDiceRecipes([], () => 0), loot = generateBattleRewardOptions('boss', () => 0.5);
  useGameStore.setState({ combatPhase: 'VICTORY', diceRewardOptions: drafts, battleRewardOptions: loot,
    battleRewardPickCount: REWARD_CONFIG.advancedPickCount, gold: 0 });
  const before = useGameStore.getState();
  before.skipBattleReward(); before.advanceToNextNode(); before.refreshDiceReward(); before.refreshBattleRewards();
  assert.equal(useGameStore.getState().currentNodeIndex, boss.id);
  assert.equal(useGameStore.getState().diceRewardOptions, drafts);
  assert.equal(useGameStore.getState().battleRewardPickCount, REWARD_CONFIG.advancedPickCount);
  useGameStore.setState({ gold: getRefreshCost('dice', 0) });
  useGameStore.getState().refreshDiceReward();
  const refreshed = useGameStore.getState();
  assert.equal(refreshed.gold, 0); assert.equal(refreshed.diceRefreshes, 1);
  assert.equal(refreshed.lootRefreshes, 0); assert.equal(refreshed.shopRefreshes, 0);
  assert.ok(refreshed.diceRewardOptions.every(item => !drafts.some(old => old.id === item.id)));
  const chosen = refreshed.diceRewardOptions[0];
  refreshed.chooseRewardDice(chosen.id);
  const first = useGameStore.getState().dicePool.at(-1)!;
  assert.equal(useGameStore.getState().battleRewardOptions, loot);
  useGameStore.getState().chooseRewardDice(chosen.id);
  assert.equal(useGameStore.getState().dicePool.length, before.dicePool.length + 1);
  useGameStore.setState({ diceRewardOptions: [chosen] });
  useGameStore.getState().chooseRewardDice(chosen.id);
  const second = useGameStore.getState().dicePool.at(-1)!;
  assert.equal(first.recipeId, second.recipeId); assert.notEqual(first.id, second.id);
  const reward = loot[0];
  useGameStore.getState().claimBattleReward(reward.id);
  useGameStore.getState().chooseFlowSticker(0);
  useGameStore.getState().applyCurrentSticker(second.id, 0);
  assert.equal(useGameStore.getState().battleRewardPickCount, REWARD_CONFIG.advancedPickCount - 1);
  assert.deepEqual(useGameStore.getState().dicePool.find(die => die.id === first.id), first);
});

test('loot refresh preserves dice and excludes the current page until a bundle is claimed', () => {
  useGameStore.getState().restartGame();
  const boss = INITIAL_MAP_NODES.find(node => node.type === 'boss')!;
  useGameStore.getState().startNode(boss.id);
  const options = generateBattleRewardOptions('boss', () => 0.5);
  useGameStore.setState({ combatPhase: 'VICTORY', battleRewardOptions: options, battleRewardPickCount: REWARD_CONFIG.advancedPickCount,
    gold: getRefreshCost('loot', 0) });
  const die = useGameStore.getState().dicePool[0];
  const before = useGameStore.getState();
  before.refreshBattleRewards();
  const after = useGameStore.getState();
  assert.equal(after.gold, 0); assert.equal(after.lootRefreshes, 1);
  assert.equal(after.battleRewardPickCount, before.battleRewardPickCount);
  assert.equal(after.battleRewardOptions.length, before.battleRewardOptions.length);
  assert.equal(after.dicePool, before.dicePool);
  assert.ok(after.battleRewardOptions.every(item => !before.battleRewardOptions.some(old => rewardKey(old) === rewardKey(item))));
  after.refreshBattleRewards();
  assert.equal(useGameStore.getState().battleRewardOptions, after.battleRewardOptions);
  useGameStore.getState().startNode(INITIAL_MAP_NODES.find(node => node.region === 2 && node.type === 'fight')!.id);
  assert.equal(useGameStore.getState().lootRefreshes, 0);
  const a = generateBattleRewardOptions('boss', () => 0);
  const b = generateBattleRewardOptions('boss', () => 0, a.map(rewardKey));
  const c = generateBattleRewardOptions('boss', () => 0, b.map(rewardKey));
  assert.deepEqual(c.map(rewardKey), a.map(rewardKey));
});

test('shop permanent purchases and refresh spend once and keep modified dice', () => {
  useGameStore.getState().restartGame();
  const shops = INITIAL_MAP_NODES.filter(node => node.type === 'shop');
  useGameStore.getState().startNode(shops[0].id);
  const sticker = useGameStore.getState().shopStickers.find(item => !item.isDisposable)!;
  const cost = sticker.cost!, gold = cost + getRefreshCost('shop', 0);
  useGameStore.setState({ gold });
  assert.equal(useGameStore.getState().buyShopSticker(sticker.id), true);
  assert.equal(useGameStore.getState().gold, gold - cost);
  useGameStore.getState().refreshShop();
  assert.equal(useGameStore.getState().shopRefreshes, 0, 'pending placement keeps shop locked');
  const die = useGameStore.getState().dicePool[0];
  useGameStore.getState().chooseFlowSticker(0);
  useGameStore.getState().applyCurrentSticker(die.id, 0);
  useGameStore.getState().returnToStickerSelection();
  const before = useGameStore.getState();
  before.refreshShop();
  assert.equal(useGameStore.getState().gold, 0);
  assert.equal(useGameStore.getState().dicePool, before.dicePool);
  assert.equal(useGameStore.getState().shopRefreshes, 1);
  useGameStore.getState().startNode(shops[1].id);
  assert.equal(useGameStore.getState().shopRefreshes, 0);
});

test('target switching updates preview before settlement and rejects dead or late targets', () => {
  useGameStore.getState().restartGame();
  const node = INITIAL_MAP_NODES.find(node => node.enemyIds && node.enemyIds.length > 1)!;
  useGameStore.getState().startNode(node.id);
  useGameStore.getState().confirmBattlePreparation([]);
  useGameStore.getState().finishRollAnimation();
  const before = useGameStore.getState(), target = before.enemies[1].id;
  before.selectEnemy(target);
  assert.equal(useGameStore.getState().selectedEnemyId, target);
  assert.notEqual(useGameStore.getState().comboSummary, before.comboSummary);
  useGameStore.setState({ combatPhase: 'RESOLVING_CALCULATION' });
  useGameStore.getState().selectEnemy(before.enemies[0].id);
  assert.equal(useGameStore.getState().selectedEnemyId, target);
  useGameStore.setState({ combatPhase: 'CONTROL_PHASE', enemies: before.enemies.map(enemy => ({ ...enemy, hp: 0 })) });
  useGameStore.getState().selectEnemy(before.enemies[0].id);
  assert.equal(useGameStore.getState().selectedEnemyId, target);
});

test('chapter completion waits for final die and final loot processing', () => {
  useGameStore.getState().restartGame();
  const final = INITIAL_MAP_NODES.find(node => node.id === CHAPTER_END_NODE)!;
  useGameStore.getState().startNode(final.id);
  const die = createBossRewardDice();
  useGameStore.setState({ combatPhase: 'VICTORY', receivedRewardDice: die, dicePool: [...useGameStore.getState().dicePool, die],
    battleRewardOptions: generateBattleRewardOptions('final_boss'), battleRewardPickCount: REWARD_CONFIG.advancedPickCount });
  useGameStore.getState().skipBattleReward();
  assert.equal(useGameStore.getState().mapNodes[final.id].completed, false);
  const before = useGameStore.getState();
  before.claimBattleReward(before.battleRewardOptions[0].id);
  before.refreshBattleRewards();
  assert.equal(useGameStore.getState(), before);
  before.acknowledgeRewardDice();
  useGameStore.getState().acknowledgeRewardDice();
  assert.equal(useGameStore.getState().dicePool, before.dicePool);
  assert.equal(useGameStore.getState().mapNodes[final.id].completed, false);
  useGameStore.getState().skipBattleReward();
  assert.equal(useGameStore.getState().mapNodes[final.id].completed, true);
  assert.equal(useGameStore.getState().battleRewardPickCount, 0);
  assert.equal(useGameStore.getState().dicePool.at(-1), die);
  assert.ok(die.faces.every(face => face.creature === 'blank'));
});

test('camp draws on entry, refreshes the current offer, keeps full-health choices open and claims once', () => {
  useGameStore.getState().restartGame();
  const camp = INITIAL_MAP_NODES.find(node => node.type === 'camp')!;
  useGameStore.getState().startNode(camp.id);
  useGameStore.setState({ gold: CAMP_CONFIG.fullHealCost });
  const before = useGameStore.getState();
  assert.ok(before.campOffer);
  before.chooseCamp('heal'); before.chooseCamp('fullHeal');
  assert.equal(useGameStore.getState(), before);
  before.refreshCamp();
  const refreshed = useGameStore.getState();
  assert.notEqual(refreshed.campOffer, before.campOffer);
  assert.equal(refreshed.gold, before.gold - getRefreshCost('camp', before.campRefreshes));
  assert.equal(refreshed.currentNodeIndex, camp.id);
  refreshed.chooseCamp('buff');
  const claimed = useGameStore.getState();
  assert.equal(claimed.campBuff, refreshed.campOffer);
  assert.equal(claimed.currentNodeIndex, camp.next[0]);
  assert.equal(claimed.campOffer, null);
  claimed.chooseCamp('buff');
  assert.equal(useGameStore.getState(), claimed);
});

test('camp focus survives noncombat nodes, starts the next fight with extra Control and resets with a new run', () => {
  useGameStore.getState().restartGame();
  const camp = INITIAL_MAP_NODES.filter(node => node.type === 'camp').at(-1)!;
  useGameStore.getState().startNode(camp.id);
  useGameStore.setState({ campOffer: 'focus' });
  useGameStore.getState().chooseCamp('buff');
  assert.equal(useGameStore.getState().campBuff, 'focus');
  assert.equal(useGameStore.getState().mapNodes[useGameStore.getState().currentNodeIndex].type, 'chest');
  const nextFight = INITIAL_MAP_NODES.find(node => node.region === camp.region && node.enemyIds)!;
  useGameStore.getState().startNode(nextFight.id);
  const state = useGameStore.getState();
  assert.equal(state.control, computeMaxControl(state.equipments, state.gold) + CAMP_BUFFS.focus.control);
  assert.equal(state.maxControl, state.control);
  state.restartGame();
  assert.equal(useGameStore.getState().campBuff, null);
});

test('a shop pack costs once, grants three permanent stickers and leaves a healing budget', () => {
  useGameStore.getState().restartGame();
  useGameStore.getState().startNode(INITIAL_MAP_NODES.find(node => node.type === 'shop')!.id);
  useGameStore.setState({ gold: SHOP_CONFIG.packCost + SHOP_CONFIG.healCost, playerHp: 1 });
  const pack = useGameStore.getState().shopPacks[0];
  assert.equal(useGameStore.getState().buyShopPack(pack.id), true);
  assert.equal(useGameStore.getState().gold, SHOP_CONFIG.healCost);
  assert.equal(useGameStore.getState().openedPackResult?.stickers.length, REWARD_CONFIG.packStickerCount);
  assert.equal(useGameStore.getState().buyShopPack(pack.id), false);
  useGameStore.getState().beginOpenedPack();
  useGameStore.getState().skipStickerFlow();
  assert.equal(useGameStore.getState().gold, SHOP_CONFIG.healCost);
  assert.equal(useGameStore.getState().buyHeal(), true);
  assert.equal(useGameStore.getState().gold, 0);
  assert.equal(useGameStore.getState().playerHp, 1 + SHOP_CONFIG.healAmount);
});

test('discarding all unused reward stickers separately pays one whole-bundle compensation', () => {
  useGameStore.getState().restartGame();
  const options = generateBattleRewardOptions('normal', () => 0.5);
  useGameStore.setState({ combatPhase: 'VICTORY', battleRewardOptions: options, battleRewardPickCount: 1 });
  const gold = useGameStore.getState().gold;
  useGameStore.getState().claimBattleReward(options[0].id);
  for (let i = 0; i < 3; i++) useGameStore.getState().discardStickerAt(0);
  assert.equal(useGameStore.getState().stickerFlow, null);
  assert.equal(useGameStore.getState().gold, gold + REWARD_CONFIG.skipGold.normal);
  useGameStore.getState().discardStickerAt(0);
  assert.equal(useGameStore.getState().gold, gold + REWARD_CONFIG.skipGold.normal);
});
