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
import { applyEnemyDamage, resolveEnemyIntent } from '../enemies/enemyIntent';
import { calculateRollResolution } from '../battleEngine';
import { createCreatureBattleState } from '../creatures/creatureState';
import { performStartBattleRoll, performControlReroll, teacherTargets } from '../rollService';
import { chooseEquipment, chooseUpgrade, evaluateBuild, seededRandom } from './buildPolicy';

export interface RunSample {
  seed: number; won: boolean; lastNode: number; hp: number; gold: number; diceCount: number;
  encounters: { node: number; turns: number; hp: number }[];
  checkpoints: { region: number; damage: number; dice: number }[];
}
/** 有限生命與沿途獎勵模型。策略以短期攻防期望選擇永久構築，實戰與評估亂數分離。 */
export function simulateRun(seed: number, commonRewards = false): RunSample {
  const random = seededRandom(seed);
  let pool: Dice[] = structuredClone(INITIAL_DICE_POOL), gear: Equipment[] = [];
  let hp = INITIAL_PLAYER_STATS.hp, gold = INITIAL_PLAYER_STATS.gold, rations = 0, princesses = 0;
  const report: RunSample = { seed, won: false, lastNode: 0, hp, gold, diceCount: pool.length, encounters: [], checkpoints: [] };
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
  for (const node of INITIAL_MAP_NODES) {
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
      const maxControl = computeMaxControl(gear, gold);
      let control = maxControl;
      while (enemy.hp > 0 && hp > 0 && turns < config.maxBattleTurns) {
        turns++;
        const rolled = performStartBattleRoll(pool, gear, round, { control, maxControl, gold }, rations, random);
        rations = 0;
        let state = { dicePool: pool, equipments: gear, rolledIndices: rolled.rolledIndices, creatureBattleState: rolled.creatureBattleState,
          combatPhase: 'CONTROL_PHASE' as const, control, maxControl, gold, currentEnemy: enemy };
        const recalculate = () => calculateRollResolution(pool, state.rolledIndices, gear, state.creatureBattleState, state);
        let summary = recalculate();
        // 使用已出現的老師，及每回合最多一次期望收益為正的主動重骰。
        for (const teacherId of [...state.creatureBattleState.teachersAvailable]) {
          const target = teacherTargets(state, teacherId)[0];
          if (target === undefined) continue;
          const reroll = performControlReroll(target, state, random, teacherId);
          if (reroll) {
            const last = reroll.steps.at(-1)!;
            state = { ...state, rolledIndices: last.rolledIndices, creatureBattleState: last.state, control: reroll.control, gold: reroll.gold };
            summary = recalculate();
          }
        }
        const score = (value: typeof summary) => Math.min(value.totalDamage, enemy.hp + enemy.shield)
          + Math.min(value.totalShield, Math.max(0, resolveEnemyIntent(applyEnemyDamage(enemy, value.totalDamage).enemy, value.totalDamage).damage - shield)) * config.shieldScore;
        let target = -1, best = score(summary) + config.rerollGain;
        if (state.control > 0 && summary.totalDamage < enemy.hp + enemy.shield) pool.forEach((die, index) => {
          let expected = 0;
          for (let face = 0; face < die.faces.length; face++) {
            const indices = [...state.rolledIndices]; indices[index] = face;
            const candidate = calculateRollResolution(pool, indices, gear,
              { ...state.creatureBattleState, controlSpent: state.creatureBattleState.controlSpent + 1 }, { ...state, control: state.control - 1 });
            expected += score(candidate) / die.faces.length;
          }
          if (expected > best) { best = expected; target = index; }
        });
        if (target >= 0) {
          const reroll = performControlReroll(target, state, random)!;
          const last = reroll.steps.at(-1)!;
          state = { ...state, rolledIndices: last.rolledIndices, creatureBattleState: last.state, control: reroll.control, gold: reroll.gold };
          summary = recalculate();
        }
        control = state.control; gold = state.gold + summary.goldGranted;
        shield += summary.totalShield;
        round = { ...state.creatureBattleState, storedFood: summary.nextStoredFood };
        const hit = applyEnemyDamage(enemy, summary.totalDamage); enemy = hit.enemy;
        if (enemy.hp <= 0) {
          rations = hasEquipment(gear, 'RATIONS') ? summary.leftoverFood : 0;
          break;
        }
        const intent = resolveEnemyIntent(enemy, hit.damageTaken);
        enemy.shield += intent.shieldGain; enemy.currentIntentIndex = intent.nextIntentIndex;
        const absorbed = Math.min(shield, intent.damage); shield -= absorbed; hp = Math.max(0, hp - (intent.damage - absorbed));
        control = Math.min(maxControl + EQUIPMENT_BALANCE.controlHeadroom, control + summary.bonusControlGranted);
      }
      report.encounters.push({ node: node.id, turns, hp });
      if (hp === 0 || enemy.hp > 0) break;
      const rank = node.type === 'fight' ? 'normal' : node.type === 'elite' ? 'elite' : node.region === 6 ? 'final_boss' : 'boss';
      gold += rank === 'normal' ? COMBAT_GOLD.normal : rank === 'elite' ? COMBAT_GOLD.elite : COMBAT_GOLD.boss;
      if (rank === 'boss') hp = Math.min(INITIAL_PLAYER_STATS.maxHp, hp + REWARD_CONFIG.bossHeal);
      const choices = generateBattleRewardOptions(node.region, rank, random);
      const upgrade = chooseUpgrade(pool, gear, allowed(choices.flatMap((item) => item.kind === 'sticker' ? [item.sticker] : [])), policySeed);
      const packOption = choices.find((item) => item.kind === 'stickerPack');
      if (!upgrade.stickerId && packOption?.kind === 'stickerPack') pack(packOption.pack.id, node.region, policySeed);
      else grant(choices.flatMap((item) => item.kind === 'sticker' ? [item.sticker] : []), getBattleRewardCount(rank), policySeed);
      if (node.id === CREATURE_BALANCE.princess.guaranteedNode) grant([createPermanentSticker('princess', node.region)], 1, policySeed);
      if (rank === 'final_boss') report.won = true;
    }
    const die = checkProgressionDiceReward(node.id, pool);
    if (die) pool = [...pool, die];
  }
  return { ...report, hp, gold, diceCount: pool.length };
}
