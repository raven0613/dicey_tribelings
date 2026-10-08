import { recordDecision } from '../telemetry/commit';
import { enemyActionDetails } from '../telemetry/combatDetails';
import { attackTarget } from './attackPlan';
import { createBossRewardDice } from '../dice/diceFactory';
import { commitMaterialRound } from './creatures/materialResolution';
import { MATERIAL_BALANCE } from '../../configs/materials/materialConfig';
import { BATTLE_LIMIT } from '../../configs/battleConfig';
import { resolveEnemyRound } from './enemies/enemyRound';
import { getAttackEmphases } from './attackPresentation';
import { EQUIPMENT_BALANCE, hasEquipment } from '../../configs/equipment/equipmentConfig';
import { combatNumber } from './creatures/creatureState';
import type { DamagePopInput } from '../../types/game';
import type { GameState } from '../../store/gameStore.types';
import { soundService } from '../audio/soundService';
import { BATTLE_PRESENTATION as timing, COMBAT_GOLD } from '../../configs/battleConfig';
import {
  generateBattleRewardOptions,
  getBattleRewardCount,
  generateContrabandPrize,
} from '../rewards/rewardService';
import { restoreTemporaryStickers } from '../inventory/inventoryService';
import { createCreatureBattleState } from './creatures/creatureState';
import { animateAttack, animateCalculatedNumbers, waitForAnimation } from './settlementAnimation';
import { animateEnemyAttack } from './enemyAttackAnimation';

export type WaitForAttackMotion = (
  index: number,
  bonus: boolean,
  isCurrent: () => boolean,
) => Promise<boolean>;

export type WaitForEnemyAttackMotion = (isCurrent: () => boolean) => Promise<boolean>;

export interface BattleStoreMethods {
  get: () => GameState;
  set: (partial: Partial<GameState>) => void;
  startBattleRoll: () => void;
  addDamagePop: (pop: DamagePopInput) => void;
  waitForAttackMotion: WaitForAttackMotion;
  waitForEnemyMotion?: WaitForEnemyAttackMotion;
}

export async function runBattleSettlement(methods: BattleStoreMethods): Promise<void> {
  const { get, set, startBattleRoll } = methods;
  const initial = get();
  const { comboSummary: summary, enemies, dicePool } = initial;
  if (
    initial.combatPhase !== 'CONTROL_PHASE' ||
    initial.activeRerollingIndex !== null ||
    initial.pendingPaidRerollDiceId ||
    initial.diceAction !== 'reroll' ||
    !summary ||
    !enemies.length
  )
    return;
  const isCurrent = () => get().comboSummary === summary;
  set({
    combatPhase: 'RESOLVING_CALCULATION',
    visibleBonusIds: [],
    bonusSlotStates: {},
    creatureBattleState: {
      ...initial.creatureBattleState,
      storedFood: { ...summary.nextStoredFood },
      altars: { ...summary.nextAltars },
      firstBonusUsed: summary.nextFirstBonusUsed,
      chargeLayers: summary.nextChargeLayers,
      echoUsed: summary.nextEchoUsed,
      gildedFaces: summary.nextGildedFaces,
    },
    playerHpDisplay: initial.playerHp,
    playerHp: Math.min(initial.maxHp, initial.playerHp + summary.healing),
    playerShield: combatNumber(initial.playerShield + summary.totalShield),
    gold: initial.gold + summary.goldGranted,
  });
  if (summary.goldGranted || summary.healing)
    recordDecision(set, initial, get(), {
      kind: 'income',
      source: 'battle',
      label: '土人與裝備回合收益',
    });
  await animateCalculatedNumbers(
    methods,
    summary,
    initial.playerShield,
    initial.creatureBattleState.storedFood,
  );
  if (!isCurrent()) return;
  await waitForAnimation(timing.beforeAttackMs);
  if (!isCurrent()) return;
  set({ combatPhase: 'RESOLVING_ATTACK' });

  const playerBeforeAttacks = { hp: get().playerHp, shield: get().playerShield };
  const forecast = resolveEnemyRound(
    enemies,
    summary,
    initial.equipments,
    { hp: get().playerHp, shield: get().playerShield },
    initial.creatureBattleState,
    initial.selectedEnemyId,
  );
  const attacks = forecast.events.flatMap((event) => (event.attack ? [event.attack] : []));
  const emphases = getAttackEmphases(attacks);
  let position = 0;
  for (const [eventIndex, event] of forecast.events.entries()) {
    if (!isCurrent()) return;
    if (event.kind === 'player' && event.attack) {
      set({ combatPhase: 'RESOLVING_ATTACK', activeEnemyId: event.enemy.id });
      const attack = event.attack;
      const completed = await animateAttack(
        methods,
        attack.index,
        attack.bonus,
        { value: event.damage, creature: attack.creature, enemyId: event.enemy.id },
        () => {
          if (isCurrent()) set({ enemies: event.enemies, combatImpact: { kind: 'player' } });
        },
        isCurrent,
        emphases[position++],
      );
      if (!completed) return;
    } else if (event.kind === 'enemy') {
      set({ combatPhase: 'ENEMY_TURN', activeEnemyId: event.enemy.id });
      await waitForAnimation(timing.enemyThinkMs);
      if (!isCurrent()) return;
      if (
        !(await animateEnemyAttack(methods, event, Boolean(event.heavy), isCurrent, () => {
          set({
            telemetryEnemyActions: enemyActionDetails(
              forecast.events.slice(0, eventIndex + 1),
              forecast.actionEnemies,
              forecast.resolutions,
              playerBeforeAttacks,
              false,
            ),
          });
        }))
      )
        return;
    } else {
      set({ enemies: event.enemies, combatImpact: { kind: 'reflection' } });
      methods.addDamagePop({ value: event.damage, enemyId: event.enemy.id });
    }
    if (!isCurrent()) return;
    set({
      enemies: event.enemies,
      playerHp: event.hp,
      playerShield: event.shield,
    });
  }
  set({
    telemetryEnemyActions: enemyActionDetails(
      forecast.events,
      forecast.actionEnemies,
      forecast.resolutions,
      playerBeforeAttacks,
      true,
    ),
  });
  const activeEnemies = forecast.enemies;
  set({
    enemies: activeEnemies,
    activeEnemyId: null,
    selectedEnemyId: attackTarget(activeEnemies, initial.selectedEnemyId)?.id ?? null,
    playerHp: forecast.hp,
    playerShield: forecast.shield,
  });
  if (forecast.hp <= 0) {
    set({
      combatPhase: 'DEFEAT',
      campBuff: null,
      dicePool: restoreTemporaryStickers(dicePool),
      creatureBattleState: {
        ...createCreatureBattleState(),
        round: initial.creatureBattleState.round,
      },
    });
    return;
  }

  const finishVictory = async () => {
    await waitForAnimation(timing.victoryMs);
    if (!isCurrent()) return;
    soundService.playVictory();
    const state = get();
    const leader = enemies[0],
      rank = leader.rank;
    const battleRewardOptions = generateBattleRewardOptions(
      rank,
      Math.random,
      [],
      undefined,
      state.princessPackCount,
    );
    const earnedGold = leader.isBoss
      ? COMBAT_GOLD.boss
      : leader.isElite
        ? COMBAT_GOLD.elite
        : COMBAT_GOLD.normal;
    const extraReward = activeEnemies.some((enemy) => enemy.traits?.contraband && !enemy.prizeLost)
      ? generateContrabandPrize()
      : null;
    const receivedRewardDice = leader.isBoss ? createBossRewardDice() : null;
    const permanentDice = restoreTemporaryStickers(dicePool);
    set({
      combatPhase: 'VICTORY',
      campBuff: null,
      gold: state.gold + earnedGold + summary.nextGildedFaces.length * MATERIAL_BALANCE.gilded,
      battleRewardOptions,
      battleRewardPickCount: getBattleRewardCount(rank),
      receivedRewardDice,
      diceRewardOptions: [],
      diceRefreshes: 0,
      lootRefreshes: 0,
      extraReward,
      dicePool: receivedRewardDice ? [...permanentDice, receivedRewardDice] : permanentDice,
      creatureBattleState: {
        ...createCreatureBattleState(),
        round: initial.creatureBattleState.round,
      },
      storedRations: hasEquipment(initial.equipments, 'RATIONS')
        ? Object.values(summary.nextStoredFood).reduce((sum, amount) => sum + amount, 0)
        : 0,
    });
    recordDecision(set, state, get(), {
      kind: 'income',
      source: 'battle',
      label: '勝利金幣與鍍金收益',
      items: receivedRewardDice ? [receivedRewardDice] : [],
    });
    return;
  };
  if (activeEnemies.every((enemy) => enemy.hp <= 0)) {
    await finishVictory();
    return;
  }

  if (initial.creatureBattleState.round >= BATTLE_LIMIT.rounds) {
    set({
      combatPhase: 'DEFEAT',
      campBuff: null,
      dicePool: restoreTemporaryStickers(dicePool),
      creatureBattleState: {
        ...createCreatureBattleState(),
        round: initial.creatureBattleState.round,
      },
    });
    return;
  }
  set({ dicePool: commitMaterialRound(dicePool, initial.rolledIndices) });
  set({ enemies: activeEnemies });
  await waitForAnimation(timing.nextRoundMs);
  if (!isCurrent()) return;
  set({
    control: Math.min(
      initial.maxControl + EQUIPMENT_BALANCE.controlHeadroom,
      get().control + summary.bonusControlGranted,
    ),
  });
  startBattleRoll();
}
