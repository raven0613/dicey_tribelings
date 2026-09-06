import { buildAttackPlan } from './attackPlan';
import { EQUIPMENT_BALANCE, hasEquipment } from '../../configs/equipment/equipmentConfig';
import { combatNumber } from './creatures/creatureState';
import type { DamagePop } from '../../types/game';
import type { GameState } from '../../store/gameStore.types';
import { soundService } from '../audio/soundService';
import { ALL_STICKERS_CATALOG } from '../../configs/gameConfig';
import { STICKER_PACKS_CATALOG } from '../../configs/stickerPacksConfig';
import { BATTLE_PRESENTATION as timing, COMBAT_GOLD } from '../../configs/battleConfig';
import { generateBattleRewardOptions, getRewardTier } from '../rewards/rewardService';
import { restoreTemporaryStickers } from '../inventory/inventoryService';
import { createCreatureBattleState } from './creatures/creatureState';
import { applyEnemyDamage, resolveEnemyIntent } from './enemies/enemyIntent';
import { animateAttack, animateCalculatedNumbers, waitForAnimation } from './settlementAnimation';

export interface BattleStoreMethods {
  get: () => GameState;
  set: (partial: Partial<GameState>) => void;
  triggerScreenShake: (intensity?: number) => void;
  startBattleRoll: () => void;
  addDamagePop: (pop: Omit<DamagePop, 'id'>) => void;
}

export async function runBattleSettlement(methods: BattleStoreMethods): Promise<void> {
  const { get, set, startBattleRoll, triggerScreenShake } = methods;
  const initial = get();
  const { comboSummary: summary, currentEnemy, dicePool } = initial;
  if (initial.combatPhase !== 'CONTROL_PHASE' || initial.activeRerollingIndex !== null || !summary || !currentEnemy) return;
  let activeEnemy = structuredClone(currentEnemy);
  let damageTaken = 0;
  const isCurrent = () => get().comboSummary === summary;
  set({ combatPhase: 'RESOLVING_CALCULATION', visibleBonusIds: [], bonusSlotStates: {},
    creatureBattleState: { ...initial.creatureBattleState, storedFood: { ...summary.nextStoredFood } },
    playerShield: combatNumber(initial.playerShield + summary.totalShield),
    gold: initial.gold + summary.goldGranted,
  });
  await animateCalculatedNumbers(methods, summary, initial.playerShield, initial.creatureBattleState.storedFood);
  if (!isCurrent()) return;
  await waitForAnimation(timing.beforeAttackMs);
  if (!isCurrent()) return;
  set({ combatPhase: 'RESOLVING_ATTACK' });

  const applyDamage = (damage: number) => {
    const result = applyEnemyDamage(activeEnemy, damage);
    activeEnemy = result.enemy;
    damageTaken = combatNumber(damageTaken + result.damageTaken);
    set({ currentEnemy: activeEnemy });
  };
  const attacks = buildAttackPlan(summary, currentEnemy.shield, initial.equipments);
  for (const attack of attacks) {
    if (!isCurrent()) return;
    const defeated = activeEnemy.hp <= 0;
    await animateAttack(methods, attack.index, attack.bonus,
      { value: attack.value, creature: attack.creature, label: defeated ? '追擊!' : attack.label || undefined },
      () => { if (isCurrent()) applyDamage(attack.value); }, isCurrent);
  }
  if (!isCurrent()) return;

  if (activeEnemy.hp <= 0) {
    await waitForAnimation(timing.victoryMs);
    if (!isCurrent()) return;
    soundService.playVictory();
    const state = get();
    const tier = getRewardTier(state.currentNodeIndex, state.mapNodes.length);
    const battleRewardOptions = currentEnemy.isBoss ? [] : generateBattleRewardOptions(
      ALL_STICKERS_CATALOG, STICKER_PACKS_CATALOG, tier, Math.random, !currentEnemy.isElite);
    const earnedGold = currentEnemy.isBoss ? COMBAT_GOLD.boss : currentEnemy.isElite ? COMBAT_GOLD.elite : COMBAT_GOLD.normal;
    set({ combatPhase: 'VICTORY', gold: state.gold + earnedGold, battleRewardOptions,
      dicePool: restoreTemporaryStickers(dicePool), creatureBattleState: createCreatureBattleState(),
      storedRations: hasEquipment(initial.equipments, 'RATIONS') ? summary.leftoverFood : 0 });
    return;
  }

  set({ combatPhase: 'ENEMY_TURN' });
  await waitForAnimation(timing.enemyThinkMs);
  if (!isCurrent()) return;
  const intent = activeEnemy.intents[activeEnemy.currentIntentIndex];
  const resolution = resolveEnemyIntent(activeEnemy, damageTaken);
  activeEnemy = { ...activeEnemy, currentIntentIndex: resolution.nextIntentIndex, shield: activeEnemy.shield + resolution.shieldGain };
  set({ currentEnemy: activeEnemy });
  if (resolution.damage > 0) {
    soundService.playEnemyHit(intent.type === 'heavy_attack');
    triggerScreenShake(intent.type === 'heavy_attack' ? timing.heavyShake : timing.lightShake);
    const state = get();
    const absorbed = Math.min(state.playerShield, resolution.damage);
    const playerHp = combatNumber(Math.max(0, state.playerHp - (resolution.damage - absorbed)));
    set({ playerShield: combatNumber(state.playerShield - absorbed), playerHp });
    if (playerHp <= 0) {
      set({ combatPhase: 'DEFEAT', dicePool: restoreTemporaryStickers(dicePool), creatureBattleState: createCreatureBattleState() });
      return;
    }
  }
  await waitForAnimation(timing.nextRoundMs);
  if (!isCurrent()) return;
  set({ control: Math.min(initial.maxControl + EQUIPMENT_BALANCE.controlHeadroom, get().control + summary.bonusControlGranted) });
  startBattleRoll();
}
