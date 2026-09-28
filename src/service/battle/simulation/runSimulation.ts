import { drawCampBuff, resolveCampChoice } from '../../camp/campService';
import type { CampBuffId } from '../../../types/camp';
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
import { SHOP_CONFIG } from '../../../configs/shopConfig';
import { COMBAT_GOLD } from '../../../configs/battleConfig';
import { generateBattleRewardOptions, generateChestRewardOptions, getBattleRewardCount, generateContrabandPrize } from '../../rewards/rewardService';
import { openStickerPack } from '../../stickers/packService';
import { calculateHealPurchase } from '../../shop/shopService';
import { computeMaxControl, getEnemiesForNode } from '../nodeService';
import { generateShopStock } from '../../shop/shopStock';
import { drawDiceRecipes, instantiateRecipe } from '../../dice/diceDraft';
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
export function simulateRun(seed: number, commonRewards = false, useRerolls = true, route: 'safe' | 'challenge' = 'challenge', entry: 'combat' | 'camp' = 'combat'): RunSample {
  const random = seededRandom(seed);
  let campBuff: CampBuffId | null = null;
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
  for (const node of chapterPath(INITIAL_MAP_NODES, route, entry)) {
    report.lastNode = node.id;
    const policySeed = seed + node.id * 997;
    if (node.type === 'camp') {
      const offer = drawCampBuff(null, random);
      const choice = resolveCampChoice(hp < INITIAL_PLAYER_STATS.maxHp ? 'heal' : 'buff',
        { playerHp: hp, maxHp: INITIAL_PLAYER_STATS.maxHp, gold, campOffer: offer })!;
      hp = choice.playerHp ?? hp; campBuff = choice.campBuff ?? campBuff;
    } else if (node.type === 'shop') {
      while (hp < config.healBelow) {
        const healing = calculateHealPurchase(gold, hp, INITIAL_PLAYER_STATS.maxHp);
        if (!healing) break;
        hp = healing.playerHp; gold = healing.gold;
      }
      const stock = generateShopStock(gear, node.region, random);
      if (gold >= SHOP_CONFIG.equipmentCost) {
        const result = chooseEquipment(pool, gear, stock.shopEquipments, policySeed);
        if (result.equipmentId) { gear = result.gear; gold -= SHOP_CONFIG.equipmentCost; }
      }
    } else if (node.type === 'chest') {
      const choices = generateChestRewardOptions(ALL_EQUIPMENT_CATALOG.filter((item) => !gear.some((owned) => owned.id === item.id)), random);
      const result = chooseEquipment(pool, gear, choices.flatMap((item) => item.kind === 'equipment' ? [item.equipment] : []), policySeed);
      if (result.equipmentId) gear = result.gear;
    }
    else {
      if (node.type === 'boss') report.checkpoints.push({ region: node.region, damage: evaluateBuild(pool, gear, seed + 1777).damage, dice: pool.length });
      let enemies = getEnemiesForNode(node), shield = 0, round = createCreatureBattleState(), turns = 0;
      const startingHp = hp;
      let rerolls = 0, heavyActions = 0;
      // 戰鬥亂數與獎勵分離；額外重骰不會直接改抽下一場的獎勵。
      const battleRandom = seededRandom(policySeed);
      const maxControl = computeMaxControl(gear, gold, campBuff);
      let control = maxControl;
      while (enemies.some(enemy => enemy.hp > 0) && hp > 0 && turns < BATTLE_LIMIT.rounds) {
        turns++;
        const rolled = performStartBattleRoll(pool, gear, round, { control, maxControl, gold, enemies, campBuff }, rations, battleRandom);
        rations = 0;
        let state = { dicePool: pool, equipments: gear, rolledIndices: rolled.rolledIndices, creatureBattleState: rolled.creatureBattleState,
          combatPhase: 'CONTROL_PHASE' as const, control, maxControl, gold, enemies, campBuff };
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
          const projected = resolveEnemyRound(enemies, value, gear,
            { hp: Math.min(INITIAL_PLAYER_STATS.maxHp, hp + value.healing), shield: shield + value.totalShield }, candidateRound);
          const hpLoss = Math.max(0, hp - projected.hp);
          return enemies.reduce((sum, enemy) => sum + enemy.hp + enemy.shield, 0) - projected.enemies.reduce((sum, enemy) => sum + enemy.hp + enemy.shield, 0) - hpLoss * config.healthLossWeight;
        };
        let target = -1, best = score(summary) + config.rerollGain;
        if (useRerolls && summary.totalDamage < enemies.reduce((sum, enemy) => sum + enemy.hp + enemy.shield, 0)) pool.forEach((_, index) => {
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
        const resolution = resolveEnemyRound(enemies, summary, gear, { hp, shield }, state.creatureBattleState);
        heavyActions += resolution.events.filter((event) => event.kind === 'enemy' && event.heavy).length;
        enemies = resolution.enemies; hp = resolution.hp; shield = retainPlayerShield(resolution.shield, gear);
        if (enemies.every(enemy => enemy.hp <= 0) && hp > 0) rations = hasEquipment(gear, 'RATIONS') ? summary.leftoverFood : 0;
        control = Math.min(maxControl + EQUIPMENT_BALANCE.controlHeadroom, control + summary.bonusControlGranted);
      }
      campBuff = null;
      report.encounters.push({ node: node.id, turns, hp, hpLost: startingHp - hp, rerolls, heavyActions });
      if (hp === 0 || enemies.some(enemy => enemy.hp > 0)) break;
      pool = restoreTemporaryStickers(pool);
      gold += round.gildedFaces.length * MATERIAL_BALANCE.gilded;
      const rank = node.type === 'fight' ? 'normal' : node.type === 'elite' ? 'elite' : node.region === 3 ? 'final_boss' : 'boss';
      gold += rank === 'normal' ? COMBAT_GOLD.normal : rank === 'elite' ? COMBAT_GOLD.elite : COMBAT_GOLD.boss;
      if (node.type === 'boss') {
        const drafts = drawDiceRecipes([], random).map(recipe => instantiateRecipe(recipe, node.region, `simulation-${node.id}-${recipe.id}`));
        const best = drafts.reduce((best, die) => evaluateBuild([...pool, die], gear, policySeed).score > evaluateBuild([...pool, best], gear, policySeed).score ? die : best);
        pool = [...pool, best];
      }
      const choices = generateBattleRewardOptions(node.region, rank, random);
      if (enemies.some(enemy => enemy.traits?.contraband && !enemy.prizeLost))
        grant([generateContrabandPrize(node.region, random)], 1, policySeed);
      const upgrade = chooseUpgrade(pool, gear, allowed(choices.flatMap((item) => item.kind === 'sticker' ? [item.sticker] : [])), policySeed);
      const packOption = choices.find((item) => item.kind === 'stickerPack');
      if (!upgrade.stickerId && packOption?.kind === 'stickerPack') pack(packOption.pack.id, node.region, policySeed);
      else grant(choices.flatMap((item) => item.kind === 'sticker' ? [item.sticker] : []), getBattleRewardCount(rank), policySeed);
      if (rank === 'final_boss') report.chapterCompleted = true;
    }
    if (node.id === CREATURE_BALANCE.princess.guaranteedNode) grant([createPermanentSticker('princess', node.region)], 1, policySeed);
  }
  return { ...report, hp, gold, diceCount: pool.length };
}
