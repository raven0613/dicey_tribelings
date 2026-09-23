import { retainPlayerShield } from '../playerShield';
import { commitMaterialRound } from '../creatures/materialResolution';
import { restoreTemporaryStickers } from '../../inventory/inventoryService';
import { MATERIAL_BALANCE } from '../../../configs/materials/materialConfig';
import { BATTLE_LIMIT } from '../../../configs/battleConfig';
import type { Dice, Equipment, PermanentSticker, StickerItem } from '../../../types/game';
import { INITIAL_DICE_POOL, INITIAL_PLAYER_STATS } from '../../../configs/gameConfig';
import { INITIAL_MAP_NODES } from '../../../configs/regions/mapConfig';
import { RUN_SIMULATION_CONFIG as config } from '../../../configs/regions/runSimulationConfig';
import { ALL_EQUIPMENT_CATALOG, EQUIPMENT_BALANCE, hasEquipment } from '../../../configs/equipment/equipmentConfig';
import { CREATURE_BALANCE } from '../../../configs/creatures/creatureBalanceConfig';
import { createPermanentSticker } from '../../../configs/creatures/creatureStickerConfig';
import { STICKER_PACKS_CATALOG } from '../../../configs/stickerPacksConfig';
import { SHOP_CONFIG } from '../../../configs/shopConfig';
import { COMBAT_GOLD } from '../../../configs/battleConfig';
import { REWARD_CONFIG } from '../../../configs/rewardConfig';
import { generateBattleRewardOptions, generateChestRewardOptions, getBattleRewardCount } from '../../rewards/rewardService';
import { openStickerPack, checkProgressionDiceReward } from '../../stickers/packService';
import { calculateHealPurchase } from '../../shop/shopService';
import { computeMaxControl, generateShopStock } from '../nodeService';
import { createEnemy } from '../enemies/enemyFactory';
import { resolveEnemyRound } from '../enemies/enemyRound';
import { chapterPath } from '../../regions/routeService';
import { calculateRollResolution } from '../battleEngine';
import { createCreatureBattleState } from '../creatures/creatureState';
import { performStartBattleRoll, performControlReroll, teacherTargets } from '../rollService';
import { chooseEquipment, chooseUpgrade, evaluateBuild, seededRandom } from './buildPolicy';

export interface RunSample {
  seed: number; chapterCompleted: boolean; lastNode: number; hp: number; gold: number; diceCount: number;
  encounters: { node: number; turns: number; hp: number; hpLost: number; rerolls: number; heavyActions: number }[];
  checkpoints: { region: number; damage: number; dice: number }[];
}
/** 有限生命與沿途獎勵模型。策略以短期攻防期望選擇永久構築，實戰與評估亂數分離。 */
export function simulateRun(seed: number, commonRewards = false, useRerolls = true, route: 'safe' | 'challenge' = 'challenge'): RunSample {
  const random = seededRandom(seed);
  let pool: Dice[] = structuredClone(INITIAL_DICE_POOL), gear: Equipment[] = [];
  let hp = INITIAL_PLAYER_STATS.hp, gold = INITIAL_PLAYER_STATS.gold, rations = 0, princesses = 0;
  const report: RunSample = { seed, chapterCompleted: false, lastNode: 0, hp, gold, diceCount: pool.length, encounters: [], checkpoints: [] };
  const allowed = (items: StickerItem[]) => items.filter((item): item is PermanentSticker => item.isDisposable === false
    && (!commonRewards || item.rarity === 'common'));
  const grant = (items: StickerItem[], pickCount: number, policySeed: number) => {
    let available = allowed(items);
    for (let pick = 0; pick < pickCount && available.length; pick++) {
      const result = chooseUpgrade(pool, gear, available, policySeed);
      if (!result.stickerId) break;
      pool = result.pool;
      available = available.filter((item) => item.id !== result.stickerId);
    }
  };
  const pack = (id: string, region: Parameters<typeof openStickerPack>[1], policySeed: number) => {
    const opened = openStickerPack(id, region, random, princesses);
    princesses += opened.stickers.filter((item) => item.creature === 'princess').length;
    for (const sticker of opened.stickers) grant([sticker], 1, policySeed);
  };
  for (const node of chapterPath(INITIAL_MAP_NODES, route)) {
    report.lastNode = node.id;
    const policySeed = seed + node.id * 997;
    if (node.type === 'shop') {
      while (hp < config.healBelow) {
        const healing = calculateHealPurchase(gold, hp, INITIAL_PLAYER_STATS.maxHp);
        if (!healing) break;
        hp = healing.playerHp; gold = healing.gold;
      }
      const stock = generateShopStock(gear, random);
      if (gold >= SHOP_CONFIG.equipmentCost) {
        const result = chooseEquipment(pool, gear, stock.shopEquipments, policySeed);
        if (result.equipmentId) { gear = result.gear; gold -= SHOP_CONFIG.equipmentCost; }
      }
    } else if (node.type === 'chest') {
      const choices = generateChestRewardOptions(ALL_EQUIPMENT_CATALOG.filter((item) => !gear.some((owned) => owned.id === item.id)), STICKER_PACKS_CATALOG, random);
      const result = chooseEquipment(pool, gear, choices.flatMap((item) => item.kind === 'equipment' ? [item.equipment] : []), policySeed);
      const fallback = choices.find((item) => item.kind === 'stickerPack');
      if (result.equipmentId) gear = result.gear;
      else if (fallback?.kind === 'stickerPack') pack(fallback.pack.id, node.region, policySeed);
    } else if (node.type === 'pack') pack(node.packId!, node.region, policySeed);
    else {
      if (node.type === 'boss') report.checkpoints.push({ region: node.region, damage: evaluateBuild(pool, gear, seed + 1777).damage, dice: pool.length });
      let enemy = createEnemy(node.enemyId!), shield = 0, round = createCreatureBattleState(), turns = 0;
      const startingHp = hp;
      let rerolls = 0, heavyActions = 0;
      // 戰鬥亂數與獎勵分離；額外重骰不會直接改抽下一場的獎勵。
      const battleRandom = seededRandom(policySeed);
      const maxControl = computeMaxControl(gear, gold);
      let control = maxControl;
      while (enemy.hp > 0 && hp > 0 && turns < BATTLE_LIMIT.rounds) {
        turns++;
        const rolled = performStartBattleRoll(pool, gear, round, { control, maxControl, gold, currentEnemy: enemy }, rations, battleRandom);
        rations = 0;
        let state = { dicePool: pool, equipments: gear, rolledIndices: rolled.rolledIndices, creatureBattleState: rolled.creatureBattleState,
          combatPhase: 'CONTROL_PHASE' as const, control, maxControl, gold, currentEnemy: enemy };
        const recalculate = () => calculateRollResolution(pool, state.rolledIndices, gear, state.creatureBattleState, state);
        let summary = recalculate();
        // 使用已出現的老師，及每回合最多一次期望收益為正的主動重骰。
        for (const teacherId of useRerolls ? [...state.creatureBattleState.teachersAvailable] : []) {
          const target = teacherTargets(state, teacherId)[0];
          if (target === undefined) continue;
          const reroll = performControlReroll(target, state, battleRandom, teacherId);
          if (reroll) {
            const last = reroll.steps.at(-1)!;
            state = { ...state, rolledIndices: last.rolledIndices, creatureBattleState: last.state, control: reroll.control, gold: reroll.gold };
            summary = recalculate();
          }
        }
        // 打斷、破盾及護盾都透過實際避免的 HP 損失計價。
        const score = (value: typeof summary, candidateRound = state.creatureBattleState) => {
          const projected = resolveEnemyRound(enemy, value, gear,
            { hp: Math.min(INITIAL_PLAYER_STATS.maxHp, hp + value.healing), shield: shield + value.totalShield }, candidateRound);
          const hpLoss = Math.max(0, hp - projected.hp);
          return enemy.hp + enemy.shield - projected.enemy.hp - projected.enemy.shield - hpLoss * config.healthLossWeight;
        };
        let target = -1, best = score(summary) + config.rerollGain;
        if (useRerolls && summary.totalDamage < enemy.hp + enemy.shield) pool.forEach((_, index) => {
          let expected = 0;
          const sampleRandom = seededRandom(policySeed + turns * 1777);
          for (let sample = 0; sample < config.rerollSamples; sample++) {
            const candidate = performControlReroll(index, state, sampleRandom);
            if (!candidate) return;
            const last = candidate.steps.at(-1)!;
            const value = calculateRollResolution(pool, last.rolledIndices, gear, last.state,
              { ...state, control: candidate.control, gold: candidate.gold });
            expected += score(value, last.state) / config.rerollSamples;
          }
          if (expected > best) { best = expected; target = index; }
        });
        if (target >= 0) {
          const reroll = performControlReroll(target, state, battleRandom)!;
          const last = reroll.steps.at(-1)!;
          state = { ...state, rolledIndices: last.rolledIndices, creatureBattleState: last.state, control: reroll.control, gold: reroll.gold };
          summary = recalculate();
        }
        control = state.control; gold = state.gold + summary.goldGranted;
        rerolls += state.creatureBattleState.rerollCount;
        shield += summary.totalShield;
        round = { ...state.creatureBattleState, storedFood: summary.nextStoredFood, altars: summary.nextAltars, echoUsed: summary.nextEchoUsed, gildedFaces: summary.nextGildedFaces };
        hp = Math.min(INITIAL_PLAYER_STATS.maxHp, hp + summary.healing);
        pool = commitMaterialRound(pool, state.rolledIndices);
        const resolution = resolveEnemyRound(enemy, summary, gear, { hp, shield }, state.creatureBattleState);
        heavyActions += resolution.events.filter((event) => event.kind === 'enemy' && event.heavy).length;
        enemy = resolution.enemy; hp = resolution.hp; shield = retainPlayerShield(resolution.shield, gear);
        if (enemy.hp <= 0 && hp > 0) rations = hasEquipment(gear, 'RATIONS') ? summary.leftoverFood : 0;
        control = Math.min(maxControl + EQUIPMENT_BALANCE.controlHeadroom, control + summary.bonusControlGranted);
      }
      report.encounters.push({ node: node.id, turns, hp, hpLost: startingHp - hp, rerolls, heavyActions });
      if (hp === 0 || enemy.hp > 0) break;
      pool = restoreTemporaryStickers(pool);
      gold += round.gildedFaces.length * MATERIAL_BALANCE.gilded;
      const rank = node.type === 'fight' ? 'normal' : node.type === 'elite' ? 'elite' : node.region === 6 ? 'final_boss' : 'boss';
      gold += rank === 'normal' ? COMBAT_GOLD.normal : rank === 'elite' ? COMBAT_GOLD.elite : COMBAT_GOLD.boss;
      if (rank === 'boss') hp = Math.min(INITIAL_PLAYER_STATS.maxHp, hp + REWARD_CONFIG.bossHeal);
      const choices = generateBattleRewardOptions(node.region, rank, random);
      const upgrade = chooseUpgrade(pool, gear, allowed(choices.flatMap((item) => item.kind === 'sticker' ? [item.sticker] : [])), policySeed);
      const packOption = choices.find((item) => item.kind === 'stickerPack');
      if (!upgrade.stickerId && packOption?.kind === 'stickerPack') pack(packOption.pack.id, node.region, policySeed);
      else grant(choices.flatMap((item) => item.kind === 'sticker' ? [item.sticker] : []), getBattleRewardCount(rank), policySeed);
      if (rank === 'final_boss') report.chapterCompleted = true;
    }
    if (node.id === CREATURE_BALANCE.princess.guaranteedNode) grant([createPermanentSticker('princess', node.region)], 1, policySeed);
    const die = checkProgressionDiceReward(node.id, pool);
    if (die) pool = [...pool, die];
  }
  return { ...report, hp, gold, diceCount: pool.length };
}
