import { Dice, DiceFace, Equipment, ElementType, SpecialEffect, BonusEquipmentDice } from '../../types/game';

export interface CalculatedRollItem {
  diceId: string;
  diceName: string;
  faceIndex: number;
  originalFace: DiceFace;
  // Effective face properties
  baseValue: number;
  element: ElementType;
  special: SpecialEffect;
  isDisposable: boolean;
  disposableName?: string;
  // Progressive step values for visual number pumping (e.g. 3 -> 5 -> 8 -> 14)
  stepValues: number[];
  finalDamage: number;
  bonusTags: string[];
  shieldGranted: number;
}

export interface BattleComboSummary {
  items: CalculatedRollItem[];
  bonusDice: BonusEquipmentDice[];
  triggeredEquipmentIds: string[];
  totalDamage: number;
  totalShield: number;
  bonusControlGranted: number;
  activeCombos: { title: string; description: string; bonusValue: number }[];
  multiplier: number;
}

/**
 * Pre-determines random roll result indices for all dice in the pool
 */
export function predetermineRollResults(dicePool: Dice[]): number[] {
  return dicePool.map((die) => Math.floor(Math.random() * die.faces.length));
}

/**
 * Calculates all equipment modifications, element synergies, combos, and progressive step values
 */
export function calculateRollResolution(
  dicePool: Dice[],
  rolledIndices: number[],
  equipments: Equipment[]
): BattleComboSummary {
  const activeCombos: { title: string; description: string; bonusValue: number }[] = [];
  const bonusDice: BonusEquipmentDice[] = [];
  const triggeredEquipmentIds: string[] = [];
  let totalMultiplier = 1.0;
  let bonusControl = 0;

  // 1. Extract base rolled face states
  const rolledFaces = dicePool.map((die, idx) => {
    const faceIndex = rolledIndices[idx] ?? 0;
    const face = die.faces[faceIndex] || die.faces[0];
    const temp = face.temporarySticker;

    return {
      diceId: die.id,
      diceName: die.name,
      faceIndex,
      originalFace: face,
      baseValue: temp ? temp.baseValue : face.baseValue,
      element: temp ? temp.element : face.element,
      special: (temp ? temp.special : face.special) || 'none',
      isDisposable: !!temp,
      disposableName: temp?.name,
    };
  });

  // Check global equipment rules
  const globalFireBonus = equipments.filter((e) => e.ruleId === 'GLOBAL_FIRE_BOOST').reduce((acc, e) => acc + (e.value || 2), 0);
  const globalStormBonus = equipments.filter((e) => e.ruleId === 'GLOBAL_STORM_BOOST').reduce((acc, e) => acc + (e.value || 1), 0);
  const highRollBonus = equipments.filter((e) => e.ruleId === 'HIGH_ROLL_BOOST').reduce((acc, e) => acc + (e.value || 3), 0);

  // Check Pattern Equipment Rules
  // Rule: FIRE_3_5_COMBO (Fire 3 + Fire 5)
  const hasFire3 = rolledFaces.some((f) => (f.element === 'fire' || f.special === 'wild') && f.baseValue === 3);
  const hasFire5 = rolledFaces.some((f) => (f.element === 'fire' || f.special === 'wild') && f.baseValue === 5);
  const firePairEq = equipments.find((e) => e.ruleId === 'FIRE_3_5_COMBO');
  let fireComboBonus = 0;
  if (firePairEq && hasFire3 && hasFire5) {
    triggeredEquipmentIds.push(firePairEq.id);
    fireComboBonus = firePairEq.value || 15;
    activeCombos.push({
      title: '雙炎共鳴 (Pyro Resonance)',
      description: '同時擲出火3與火5！+15 火焰爆發傷害',
      bonusValue: fireComboBonus,
    });
    bonusDice.push({
      id: `bonus_fire_${firePairEq.id}`,
      sourceEquipmentId: firePairEq.id,
      sourceEquipmentName: firePairEq.name,
      element: 'fire',
      bonusDamage: fireComboBonus,
      label: '雙炎共鳴',
      description: '火3+火5爆發火焰追加傷害',
    });
  }

  // Rule: DUAL_SIX_OVERLOAD (Two or more 6s)
  const sixCount = rolledFaces.filter((f) => f.baseValue === 6).length;
  const dualSixEq = equipments.find((e) => e.ruleId === 'DUAL_SIX_OVERLOAD');
  let dualSixBonus = 0;
  if (dualSixEq && sixCount >= 2) {
    triggeredEquipmentIds.push(dualSixEq.id);
    dualSixBonus = dualSixEq.value || 12;
    bonusControl += 1;
    activeCombos.push({
      title: '超載雙六核 (Dual 6 Overload)',
      description: '骰出兩顆 6 點！+12 雷擊傷害 & 恢復 1 Control',
      bonusValue: dualSixBonus,
    });
    bonusDice.push({
      id: `bonus_thunder_${dualSixEq.id}`,
      sourceEquipmentId: dualSixEq.id,
      sourceEquipmentName: dualSixEq.name,
      element: 'thunder',
      bonusDamage: dualSixBonus,
      label: '超載雙六',
      description: '雙6點超載雷擊追加傷害',
    });
  }

  // Rule: TRI_ELEMENT_HARMONY (Fire + Wind + Thunder)
  const elementsPresent = new Set(rolledFaces.map((f) => f.element));
  const hasWild = rolledFaces.some((f) => f.special === 'wild');
  const hasFire = elementsPresent.has('fire') || hasWild;
  const hasWind = elementsPresent.has('wind') || hasWild;
  const hasThunder = elementsPresent.has('thunder') || hasWild;
  const triElemEq = equipments.find((e) => e.ruleId === 'TRI_ELEMENT_HARMONY');
  if (triElemEq && hasFire && hasWind && hasThunder) {
    triggeredEquipmentIds.push(triElemEq.id);
    totalMultiplier += (triElemEq.value || 30) / 100;
    activeCombos.push({
      title: '三相元素交響 (Tri-Element Symphony)',
      description: '火、風、雷三相聚首！總結算傷害提升 +30%',
      bonusValue: 0,
    });
  }

  // Rule: ODD_STREAK (>= 3 odd numbers)
  const oddCount = rolledFaces.filter((f) => f.baseValue % 2 !== 0).length;
  const oddEq = equipments.find((e) => e.ruleId === 'ODD_STREAK');
  let oddBonus = 0;
  if (oddEq && oddCount >= 3) {
    triggeredEquipmentIds.push(oddEq.id);
    oddBonus = oddEq.value || 8;
    activeCombos.push({
      title: '奇數狂潮 (Odd Surge)',
      description: '出現 3 顆以上奇數！+8 狂潮暴擊傷害',
      bonusValue: oddBonus,
    });
    bonusDice.push({
      id: `bonus_wind_${oddEq.id}`,
      sourceEquipmentId: oddEq.id,
      sourceEquipmentName: oddEq.name,
      element: 'wind',
      bonusDamage: oddBonus,
      label: '奇數狂潮',
      description: '三奇數狂潮暴擊追加傷害',
    });
  }

  // Check Chain Special effects
  const chainCount = rolledFaces.filter((f) => f.special === 'chain').length;
  const chainBonus = chainCount * 2;
  if (chainCount > 0) {
    activeCombos.push({
      title: `連鎖引爆 x${chainCount}`,
      description: '觸發 Chain 效果，所有骰子 +2 點傷害',
      bonusValue: chainBonus,
    });
  }

  let runningPreviousDamage = 0;
  let accumulatedShield = 0;

  // 2. Compute individual die values & progressive steps
  const calculatedItems: CalculatedRollItem[] = rolledFaces.map((rf, idx) => {
    const steps: number[] = [];
    const bonusTags: string[] = [];

    // Step 0: Base
    let currentVal = rf.baseValue;
    steps.push(currentVal);

    // Step 1: Element & Global buffs
    if (rf.element === 'fire' && globalFireBonus > 0) {
      currentVal += globalFireBonus;
      bonusTags.push(`烈焰+${globalFireBonus}`);
    } else if ((rf.element === 'wind' || rf.element === 'thunder') && globalStormBonus > 0) {
      currentVal += globalStormBonus;
      bonusTags.push(`風雷+${globalStormBonus}`);
    }

    if (rf.baseValue >= 5 && highRollBonus > 0) {
      currentVal += highRollBonus;
      bonusTags.push(`重磅+${highRollBonus}`);
    }
    if (steps[steps.length - 1] !== currentVal) {
      steps.push(currentVal);
    }

    // Step 2: Combos & Specials
    if (chainBonus > 0) {
      currentVal += chainBonus;
      bonusTags.push(`連鎖+${chainBonus}`);
    }

    if (rf.special === 'echo' && idx > 0) {
      currentVal += runningPreviousDamage;
      bonusTags.push(`迴響+${runningPreviousDamage}`);
    }

    if (rf.special === 'crit') {
      currentVal = Math.round(currentVal * 1.5);
      bonusTags.push('暴擊 x1.5');
    }

    let shieldGranted = 0;
    if (rf.special === 'shield') {
      shieldGranted = currentVal;
      accumulatedShield += shieldGranted;
      bonusTags.push(`護盾+${shieldGranted}`);
    }

    if (steps[steps.length - 1] !== currentVal) {
      steps.push(currentVal);
    }

    // Step 3: Global Multipliers (e.g. Tri-Element Harmony)
    if (totalMultiplier > 1) {
      currentVal = Math.round(currentVal * totalMultiplier);
      const percentStr = Math.round((totalMultiplier - 1) * 100);
      bonusTags.push(`交響+${percentStr}%`);
      if (steps[steps.length - 1] !== currentVal) {
        steps.push(currentVal);
      }
    }

    runningPreviousDamage = currentVal;

    return {
      diceId: rf.diceId,
      diceName: rf.diceName,
      faceIndex: rf.faceIndex,
      originalFace: rf.originalFace,
      baseValue: rf.baseValue,
      element: rf.element,
      special: rf.special,
      isDisposable: rf.isDisposable,
      disposableName: rf.disposableName,
      stepValues: steps,
      finalDamage: currentVal,
      bonusTags,
      shieldGranted,
    };
  });

  // Flat combo additions from bonusDice
  const rawSum = calculatedItems.reduce((acc, item) => acc + item.finalDamage, 0);
  const flatComboSum = (bonusDice || []).reduce((acc, b) => acc + b.bonusDamage, 0);
  const totalDamage = rawSum + flatComboSum;

  return {
    items: calculatedItems,
    bonusDice,
    triggeredEquipmentIds,
    totalDamage,
    totalShield: accumulatedShield,
    bonusControlGranted: bonusControl,
    activeCombos,
    multiplier: totalMultiplier,
  };
}
