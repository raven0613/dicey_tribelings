import { commitMaterialRound } from './creatures/materialResolution';
import { MATERIAL_BALANCE } from '../../configs/materials/materialConfig';
import { BATTLE_LIMIT } from '../../configs/battleConfig';
import { resolveEnemyRound } from './enemies/enemyRound';
import { getAttackEmphases } from './attackPresentation';
import { EQUIPMENT_BALANCE, hasEquipment } from '../../configs/equipment/equipmentConfig';
import { combatNumber } from './creatures/creatureState';
import type { DamagePop } from '../../types/game';
import type { GameState } from '../../store/gameStore.types';
import { soundService } from '../audio/soundService';
import { REWARD_CONFIG } from '../../configs/rewardConfig';
import { BATTLE_PRESENTATION as timing, COMBAT_GOLD } from '../../configs/battleConfig';
import { generateBattleRewardOptions, getBattleRewardCount } from '../rewards/rewardService';
import { restoreTemporaryStickers } from '../inventory/inventoryService';
import { createCreatureBattleState } from './creatures/creatureState';
import { animateAttack, animateCalculatedNumbers, waitForAnimation } from './settlementAnimation';
import { animateEnemyAttack } from './enemyAttackAnimation';

export type WaitForAttackMotion = (index: number, bonus: boolean, isCurrent: () => boolean) => Promise<boolean>;

export interface BattleStoreMethods {
  get: () => GameState;
  set: (partial: Partial<GameState>) => void;
  triggerScreenShake: (intensity?: number) => void;
  startBattleRoll: () => void;
  addDamagePop: (pop: Omit<DamagePop, 'id'>) => void;
  waitForAttackMotion: WaitForAttackMotion;
}

export async function runBattleSettlement(methods: BattleStoreMethods): Promise<void> {
  const { get, set, startBattleRoll } = methods;
  const initial = get();
  const { comboSummary: summary, currentEnemy, dicePool } = initial;
  if (initial.combatPhase !== 'CONTROL_PHASE' || initial.activeRerollingIndex !== null
    || initial.pendingPaidRerollDiceId || initial.diceAction !== 'reroll' || !summary || !currentEnemy) return;
  const isCurrent = () => get().comboSummary === summary;
  set({ combatPhase: 'RESOLVING_CALCULATION', visibleBonusIds: [], bonusSlotStates: {},
    creatureBattleState: { ...initial.creatureBattleState, storedFood: { ...summary.nextStoredFood },
      echoUsed: summary.nextEchoUsed, gildedFaces: summary.nextGildedFaces },
    playerHpDisplay: initial.playerHp,
    playerHp: Math.min(initial.maxHp, initial.playerHp + summary.healing),
    playerShield: combatNumber(initial.playerShield + summary.totalShield),
    gold: initial.gold + summary.goldGranted,
  });
  await animateCalculatedNumbers(methods, summary, initial.playerShield, initial.creatureBattleState.storedFood);
  if (!isCurrent()) return;
  await waitForAnimation(timing.beforeAttackMs);
  if (!isCurrent()) return;
  set({ combatPhase: 'RESOLVING_ATTACK' });

  const forecast = resolveEnemyRound(currentEnemy, summary, initial.equipments,
    { hp: get().playerHp, shield: get().playerShield }, initial.creatureBattleState);
  const attacks = forecast.events.flatMap((event) => event.attack ? [event.attack] : []);
  const emphases = getAttackEmphases(attacks);
  let position = 0;
  for (const event of forecast.events) {
    if (!isCurrent()) return;
    if (event.kind === 'player' && event.attack) {
      set({ combatPhase: 'RESOLVING_ATTACK' });
      const attack = event.attack;
      const completed = await animateAttack(methods, attack.index, attack.bonus,
        { value: event.damage, creature: attack.creature, label: attack.label || undefined },
        () => { if (isCurrent()) set({ currentEnemy: event.enemy }); }, isCurrent, emphases[position++]);
      if (!completed) return;
    } else if (event.kind === 'enemy') {
      set({ combatPhase: 'ENEMY_TURN' });
      await waitForAnimation(timing.enemyThinkMs);
      if (!isCurrent()) return;
      await animateEnemyAttack(methods, event, Boolean(event.heavy), isCurrent);
    } else {
      set({ currentEnemy: event.enemy });
      methods.addDamagePop({ value: event.damage, label: '鏡面反射' });
    }
    if (!isCurrent()) return;
    set({ currentEnemy: event.enemy, playerHp: event.hp, playerShield: event.shield });
  }
  const activeEnemy = forecast.enemy;
  set({ currentEnemy: activeEnemy, playerHp: forecast.hp, playerShield: forecast.shield });
  if (forecast.hp <= 0) {
    set({ combatPhase: 'DEFEAT', dicePool: restoreTemporaryStickers(dicePool),
      creatureBattleState: { ...createCreatureBattleState(), round: initial.creatureBattleState.round } });
    return;
  }

  const finishVictory = async () => {
    await waitForAnimation(timing.victoryMs);
    if (!isCurrent()) return;
    soundService.playVictory();
    const state = get();
    const rank = currentEnemy.isBoss ? currentEnemy.region === 6 ? 'final_boss' : 'boss'
      : currentEnemy.isElite ? 'elite' : 'normal';
    const battleRewardOptions = generateBattleRewardOptions(currentEnemy.region, rank);
    const earnedGold = currentEnemy.isBoss ? COMBAT_GOLD.boss : currentEnemy.isElite ? COMBAT_GOLD.elite : COMBAT_GOLD.normal;
    set({ combatPhase: 'VICTORY', gold: state.gold + earnedGold + summary.nextGildedFaces.length * MATERIAL_BALANCE.gilded, battleRewardOptions,
      battleRewardPickCount: getBattleRewardCount(rank),
      battleRecovery: Math.min(state.maxHp - state.playerHp, rank === 'boss' ? REWARD_CONFIG.bossHeal : 0),
      playerHp: Math.min(state.maxHp, state.playerHp + (rank === 'boss' ? REWARD_CONFIG.bossHeal : 0)),
      dicePool: restoreTemporaryStickers(dicePool), creatureBattleState: { ...createCreatureBattleState(), round: initial.creatureBattleState.round },
      storedRations: hasEquipment(initial.equipments, 'RATIONS') ? summary.leftoverFood : 0 });
    return;
  };
  if (activeEnemy.hp <= 0) { await finishVictory(); return; }

  if (initial.creatureBattleState.round >= BATTLE_LIMIT.rounds) {
    set({ combatPhase: 'DEFEAT', dicePool: restoreTemporaryStickers(dicePool),
      creatureBattleState: { ...createCreatureBattleState(), round: initial.creatureBattleState.round } });
    return;
  }
  set({ dicePool: commitMaterialRound(dicePool, initial.rolledIndices) });
  set({ currentEnemy: activeEnemy });
  await waitForAnimation(timing.nextRoundMs);
  if (!isCurrent()) return;
  set({ control: Math.min(initial.maxControl + EQUIPMENT_BALANCE.controlHeadroom, get().control + summary.bonusControlGranted) });
  startBattleRoll();
}
