import { Enemy, Dice, DamagePop, AttackStage, StickerItem } from '../../types/game';
import { soundService } from '../audio/soundService';
import { ALL_STICKERS_CATALOG } from '../../configs/gameConfig';
import { STICKER_PACKS_CATALOG } from '../../configs/stickerPacksConfig';

export interface BattleStoreMethods {
  get: () => any;
  set: (partial: any) => void;
  triggerScreenShake: (intensity?: number) => void;
  startBattleRoll: () => void;
  addDamagePop: (pop: Omit<DamagePop, 'id'>) => void;
}

/**
 * Handles the complete resolution of combat when player locks results.
 * Features:
 * 1. Visual number pumping
 * 2. Sequential forward-dash dice rush attacks
 * 3. Accurate enemy HP & shield deduction without state reset bugs
 * 4. Disposable sticker consumption
 * 5. Victory check & enemy counterattack
 */
/**
 * Calculate sequential slot wheel display number for tick t out of totalTicks.
 * Rules requested by user:
 * 1. If target is single-digit (<= 9), NEVER show double digits; cycle strictly in 0~9 order.
 * 2. Progression must be strictly in 0~9 sequential order (no random jumping).
 * 3. Preceding tick smoothly leads right up to the final target number.
 */
function getSlotWheelNumber(targetVal: number, tick: number, totalTicks: number): number {
  const tens = Math.floor(targetVal / 10);
  const units = targetVal % 10;
  const spinningUnits = (units - (totalTicks - tick) + 1000) % 10;
  return tens > 0 ? tens * 10 + spinningUnits : spinningUnits;
}

export async function runBattleSettlement(
  methods: BattleStoreMethods,
  onStepProgress?: (step: number) => void
): Promise<void> {
  const { get, set, triggerScreenShake, startBattleRoll, addDamagePop } = methods;
  const { comboSummary, currentEnemy, dicePool, rolledIndices, playerShield } = get();
  if (!comboSummary || !currentEnemy) return;

  // Maintain activeEnemy directly so closures NEVER revert HP/Shield!
  const activeEnemy: Enemy = JSON.parse(JSON.stringify(currentEnemy));
  let remainingEnemyHp = activeEnemy.hp;
  let remainingEnemyShield = activeEnemy.shield;

  // Step 1: Base Dice Slot-Machine Upgrade (0~9 sequential wheel spin & punchy lock-in)
  // Bonus dice MUST NOT be shown yet during base dice resolution!
  set({
    combatPhase: 'RESOLVING_CALCULATION',
    showBonusDice: false,
    bonusSlotStates: {},
  });

  // Initialize initial values for all base dice
  const initialDiceSlots: Record<number, { displayValue: number; isSpinning: boolean; isLocked: boolean; isBuffed: boolean }> = {};
  comboSummary.items.forEach((item: any, idx: number) => {
    initialDiceSlots[idx] = {
      displayValue: item.baseValue,
      isSpinning: false,
      isLocked: true,
      isBuffed: false,
    };
  });
  set({ diceSlotStates: initialDiceSlots });

  const buffedDice = comboSummary.items
    .map((item: any, idx: number) => ({ item, idx }))
    .filter(({ item }: any) => item.finalDamage > item.baseValue);

  if (buffedDice.length > 0) {
    soundService.playComboTrigger();
    await new Promise((res) => setTimeout(res, 80));

    // Animate snappy sequential 0~9 slot-machine wheel ticker for each buffed die
    for (const { item, idx } of buffedDice) {
      const totalTicks = 6;
      for (let t = 0; t < totalTicks; t++) {
        const displayVal = getSlotWheelNumber(item.finalDamage, t, totalTicks);
        soundService.playSlotTick();

        const currentSlots = { ...get().diceSlotStates };
        currentSlots[idx] = {
          displayValue: displayVal,
          isSpinning: true,
          isLocked: false,
          isBuffed: true,
        };
        set({ diceSlotStates: currentSlots });

        const tickDelay = t < 4 ? 24 : 36;
        await new Promise((res) => setTimeout(res, tickDelay));
      }

      // Dramatic punch lock on final damage with scale-up-and-down punch (die itself flashes gold)!
      soundService.playSlotLock();

      const finalSlots = { ...get().diceSlotStates };
      finalSlots[idx] = {
        displayValue: item.finalDamage,
        isSpinning: false,
        isLocked: true,
        isBuffed: true,
      };
      set({ diceSlotStates: finalSlots });

      // Short, crisp interval between dice for a brisk and exciting cascade effect
      await new Promise((res) => setTimeout(res, 90));
    }
  } else {
    // If no dice buffed, brief step preview
    const maxSteps = Math.max(...comboSummary.items.map((i: any) => i.stepValues.length), 1);
    for (let s = 0; s < maxSteps; s++) {
      soundService.playNumberPump(s);
      if (onStepProgress) onStepProgress(s);
      await new Promise((res) => setTimeout(res, 90));
    }
  }

  // Step 2: All Base Dice number resolution is finished!
  // NOW, and ONLY NOW, spawn the equipment bonus phantom dice on the board!
  if (comboSummary.bonusDice && comboSummary.bonusDice.length > 0) {
    // Materialize bonus dice on board with entrance pop
    set({ showBonusDice: true });
    soundService.playComboTrigger();
    await new Promise((res) => setTimeout(res, 120));

    // Rapid sequential 0~9 slot-machine wheel spin & lock-in for bonus dice
    for (const bDie of comboSummary.bonusDice) {
      const totalTicks = 6;
      for (let t = 0; t < totalTicks; t++) {
        const displayVal = getSlotWheelNumber(bDie.bonusDamage, t, totalTicks);
        soundService.playSlotTick();

        const updatedSlots = { ...get().bonusSlotStates };
        updatedSlots[bDie.id] = {
          displayValue: displayVal,
          isSpinning: true,
          isLocked: false,
        };
        set({ bonusSlotStates: updatedSlots });

        const tickDelay = t < 4 ? 24 : 36;
        await new Promise((res) => setTimeout(res, tickDelay));
      }

      // Dramatic impact lock on target bonus damage!
      soundService.playSlotLock();

      const finalSlots = { ...get().bonusSlotStates };
      finalSlots[bDie.id] = {
        displayValue: bDie.bonusDamage,
        isSpinning: false,
        isLocked: true,
      };
      set({ bonusSlotStates: finalSlots });
      // Short, crisp interval between bonus dice
      await new Promise((res) => setTimeout(res, 90));
    }
  } else if (comboSummary.activeCombos.length > 0) {
    soundService.playComboTrigger();
    await new Promise((res) => setTimeout(res, 100));
  }

  // Brief beat after all numbers settle before starting attacks
  await new Promise((res) => setTimeout(res, 100));

  // Step 3: ALL numbers (base dice + bonus dice) are completely resolved and locked!
  // NOW start the physical collision attack sequence against the monster!
  set({ combatPhase: 'RESOLVING_ATTACK' });

  for (let i = 0; i < comboSummary.items.length; i++) {
    const wasAlreadyZeroHp = remainingEnemyHp <= 0;
    const item = comboSummary.items[i];
    const isHeavy = item.finalDamage >= 6;

    // Stage 2.1: Windup (Pull back, charge aura)
    set({
      attackingDieIndex: i,
      attackingBonusIndex: null,
      attackingStage: 'windup' as AttackStage,
    });
    await new Promise((res) => setTimeout(res, 25));

    // Stage 2.2: Forward Dash (Rocket forward/upwards toward monster)
    soundService.playDiceDash();
    set({
      attackingStage: 'dash' as AttackStage,
    });
    await new Promise((res) => setTimeout(res, 50));

    // Stage 2.3: Impact! (Smack monster, shake screen, damage popup, flinch)
    soundService.playEnemyHit(isHeavy);
    triggerScreenShake(isHeavy ? 14 : 7);

    let damageToHp = 0;
    if (remainingEnemyShield > 0) {
      if (remainingEnemyShield >= item.finalDamage) {
        remainingEnemyShield -= item.finalDamage;
      } else {
        damageToHp = item.finalDamage - remainingEnemyShield;
        remainingEnemyShield = 0;
        remainingEnemyHp = Math.max(0, remainingEnemyHp - damageToHp);
      }
    } else {
      damageToHp = item.finalDamage;
      remainingEnemyHp = Math.max(0, remainingEnemyHp - damageToHp);
    }

    activeEnemy.hp = remainingEnemyHp;
    activeEnemy.shield = remainingEnemyShield;

    addDamagePop({
      value: item.finalDamage,
      element: item.element,
      isCrit: item.special === 'crit',
      label: item.special === 'crit' ? '暴擊!' : wasAlreadyZeroHp ? '追擊!' : undefined,
    });

    set({
      attackingStage: 'impact' as AttackStage,
      currentEnemy: { ...activeEnemy },
    });
    await new Promise((res) => setTimeout(res, 70));

    // Stage 2.4: Recoil & Return to tray
    set({
      attackingStage: 'recoil' as AttackStage,
    });
    await new Promise((res) => setTimeout(res, 35));

    // Idle before next die - snappy minimal interval
    set({
      attackingDieIndex: null,
      attackingBonusIndex: null,
      attackingStage: 'idle' as AttackStage,
    });
    await new Promise((res) => setTimeout(res, 15));
  }

  // Step 2.2: Bonus Equipment Dice Slam Attack Sequence!
  if (comboSummary.bonusDice && comboSummary.bonusDice.length > 0) {
    for (let b = 0; b < comboSummary.bonusDice.length; b++) {
      const bDie = comboSummary.bonusDice[b];
      const wasAlreadyZeroHp = remainingEnemyHp <= 0;

      // Stage 2.1: Windup
      set({
        attackingDieIndex: null,
        attackingBonusIndex: b,
        attackingStage: 'windup' as AttackStage,
      });
      await new Promise((res) => setTimeout(res, 30));

      // Stage 2.2: Forward Dash
      soundService.playDiceDash();
      set({
        attackingStage: 'dash' as AttackStage,
      });
      await new Promise((res) => setTimeout(res, 50));

      // Stage 2.3: Impact!
      soundService.playEnemyHit(true);
      triggerScreenShake(14);

      let damageToHp = 0;
      if (remainingEnemyShield > 0) {
        if (remainingEnemyShield >= bDie.bonusDamage) {
          remainingEnemyShield -= bDie.bonusDamage;
        } else {
          damageToHp = bDie.bonusDamage - remainingEnemyShield;
          remainingEnemyShield = 0;
          remainingEnemyHp = Math.max(0, remainingEnemyHp - damageToHp);
        }
      } else {
        damageToHp = bDie.bonusDamage;
        remainingEnemyHp = Math.max(0, remainingEnemyHp - damageToHp);
      }

      activeEnemy.hp = remainingEnemyHp;
      activeEnemy.shield = remainingEnemyShield;

      addDamagePop({
        value: bDie.bonusDamage,
        element: bDie.element,
        isCrit: true,
        label: wasAlreadyZeroHp ? '追擊!' : `${bDie.label}!`,
      });

      set({
        attackingStage: 'impact' as AttackStage,
        currentEnemy: { ...activeEnemy },
      });
      await new Promise((res) => setTimeout(res, 75));

      // Stage 2.4: Recoil
      set({
        attackingStage: 'recoil' as AttackStage,
      });
      await new Promise((res) => setTimeout(res, 35));

      // Idle
      set({
        attackingBonusIndex: null,
        attackingStage: 'idle' as AttackStage,
      });
      await new Promise((res) => setTimeout(res, 20));
    }
  }

  // Apply any remaining flat combo extra damage if not in bonusDice
  const itemsSum = comboSummary.items.reduce((a: number, b: any) => a + b.finalDamage, 0);
  const bonusSum = (comboSummary.bonusDice || []).reduce((a: number, b: any) => a + b.bonusDamage, 0);
  const flatDmg = comboSummary.totalDamage - (itemsSum + bonusSum);
  if (flatDmg > 0) {
    soundService.playEnemyHit(true);
    triggerScreenShake(14);
    remainingEnemyHp = Math.max(0, remainingEnemyHp - flatDmg);
    activeEnemy.hp = remainingEnemyHp;

    addDamagePop({
      value: flatDmg,
      element: 'fire',
      isCrit: true,
      label: '共鳴爆發!',
    });

    set({
      currentEnemy: { ...activeEnemy },
    });
    await new Promise((res) => setTimeout(res, 300));
  }

  // Add granted player shield & control
  if (comboSummary.totalShield > 0) {
    set({ playerShield: playerShield + comboSummary.totalShield });
  }
  if (comboSummary.bonusControlGranted > 0) {
    set({ control: Math.min(get().maxControl, get().control + comboSummary.bonusControlGranted) });
  }

  // Step 3: Disposable stickers remain active for the ENTIRE battle!
  // (Do not burn them per roll; they persist across turns until victory/battle concludes)

  // Step 4: Check if Enemy Defeated
  if (remainingEnemyHp <= 0) {
    // Wait for the final die attack recoil animation to settle smoothly
    await new Promise((res) => setTimeout(res, 350));
    soundService.playVictory();

    // Battle concluded: restore temporary stickers on all dice faces to original!
    const restoredDicePool = (dicePool as Dice[]).map((die) => ({
      ...die,
      faces: die.faces.map((f) => ({ ...f, temporarySticker: null })),
    }));

    // General fight rewards: ONLY Permanent Stickers (breakthrough 7~15+ values) + very low chance (~10%) of Sticker Booster Pack!
    const permStickers = ALL_STICKERS_CATALOG.filter((s) => !s.isDisposable);
    const shuffledPerm = [...permStickers].sort(() => Math.random() - 0.5);
    const rewardOptions: StickerItem[] = shuffledPerm.slice(0, 3);

    // Low chance (~10%) to replace third option with a Mystery Sticker Pack
    if (Math.random() < 0.10) {
      const pack = STICKER_PACKS_CATALOG[Math.floor(Math.random() * STICKER_PACKS_CATALOG.length)];
      rewardOptions[2] = {
        id: `pack_reward_${Date.now()}`,
        name: pack.name,
        isDisposable: false,
        baseValue: pack.stickerCount,
        element: 'normal',
        description: pack.description,
        rarity: pack.rarity,
        isPack: true,
        packId: pack.id,
      };
    }

    const earnedGold = currentEnemy.isBoss ? 50 : currentEnemy.isElite ? 30 : 15;

    set({
      combatPhase: 'VICTORY',
      gold: get().gold + earnedGold,
      dicePool: restoredDicePool,
      rewardStickerOptions: rewardOptions,
      victoryRewardClaimed: false,
      attackingDieIndex: null,
      attackingStage: 'idle' as AttackStage,
    });
    return;
  }

  // Step 5: Enemy Turn Counterattack - ENEMY HP IS STRICTLY PRESERVED!
  set({ combatPhase: 'ENEMY_TURN' });
  await new Promise((res) => setTimeout(res, 600));

  const intent = activeEnemy.intents[activeEnemy.currentIntentIndex] || activeEnemy.intents[0];
  const nextIntentIdx = (activeEnemy.currentIntentIndex + 1) % activeEnemy.intents.length;
  activeEnemy.currentIntentIndex = nextIntentIdx;

  if (intent.type === 'attack' || intent.type === 'heavy_attack') {
    const incoming = intent.value;
    let currentPShield = get().playerShield;
    let currentPHp = get().playerHp;

    soundService.playEnemyHit(intent.type === 'heavy_attack');
    triggerScreenShake(intent.type === 'heavy_attack' ? 14 : 8);

    if (currentPShield >= incoming) {
      currentPShield -= incoming;
    } else {
      const leftover = incoming - currentPShield;
      currentPShield = 0;
      currentPHp = Math.max(0, currentPHp - leftover);
    }

    set({
      playerShield: currentPShield,
      playerHp: currentPHp,
      currentEnemy: { ...activeEnemy }, // Strictly preserved!
    });

    if (currentPHp <= 0) {
      soundService.playEnemyHit(true);
      set({ combatPhase: 'DEFEAT' });
      return;
    }
  } else if (intent.type === 'defend') {
    activeEnemy.shield += intent.value;
    set({
      currentEnemy: { ...activeEnemy }, // Strictly preserved!
    });
  } else if (intent.type === 'buff') {
    activeEnemy.attackPower += intent.value;
    set({
      currentEnemy: { ...activeEnemy }, // Strictly preserved!
    });
  }

  await new Promise((res) => setTimeout(res, 600));

  // Reset for next turn roll - enemy keeps current HP and shield!
  startBattleRoll();
}
