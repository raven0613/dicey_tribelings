import type { BattleRewardOption, Dice, Equipment, PermanentSticker } from '../../../types/game';
import { INITIAL_PLAYER_STATS } from '../../../configs/gameConfig';
import { RUN_SIMULATION_CONFIG as config } from '../../../configs/regions/runSimulationConfig';
import { applyPermanentSticker } from '../../inventory/inventoryService';
import { performStartBattleRoll } from '../rollService';
import { commitMaterialRound } from '../creatures/materialResolution';
import { createCreatureBattleState } from '../creatures/creatureState';
import { createPermanentSticker } from '../../../configs/creatures/creatureStickerConfig';
import { REWARD_CONFIG } from '../../../configs/rewardConfig';

export function seededRandom(initial: number) {
  let state = initial >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 0x100000000);
}
/** Compare the same short-battle samples, carrying food and other battle resources between rounds. */
export function evaluateBuild(pool: Dice[], gear: Equipment[], seed: number) {
  const random = seededRandom(seed);
  let damage = 0, shield = 0;
  for (let sample = 0; sample < config.evaluationSamples; sample++) {
    let state = createCreatureBattleState(sample + seed), dice = pool;
    for (let turn = 0; turn < config.evaluationRounds; turn++) {
      const rolled = performStartBattleRoll(dice, gear, state,
        { control: 1, maxControl: INITIAL_PLAYER_STATS.maxControl, gold: 0 }, 0, random);
      const summary = rolled.comboSummary;
      damage += summary.totalDamage; shield += summary.totalShield;
      state = { ...rolled.creatureBattleState, storedFood: summary.nextStoredFood, altars: summary.nextAltars,
        firstBonusUsed: summary.nextFirstBonusUsed, chargeLayers: summary.nextChargeLayers,
        echoUsed: summary.nextEchoUsed, gildedFaces: summary.nextGildedFaces };
      dice = commitMaterialRound(dice, rolled.rolledIndices);
    }
  }
  const rounds = config.evaluationSamples * config.evaluationRounds;
  return { damage: damage / rounds, score: (damage + shield * config.shieldScore) / rounds };
}

export function chooseUpgrade(pool: Dice[], gear: Equipment[], choices: PermanentSticker[], seed: number) {
  let best = { pool, score: evaluateBuild(pool, gear, seed).score, stickerId: '' };
  const faces = pool.flatMap((die) => die.faces.map((face, index) => ({ die, face, index })));
  for (const sticker of choices) {
    const targets = faces.filter(entry => entry.face.creature !== sticker.creature || entry.face.material !== sticker.material);
    for (const target of targets) {
      const next = applyPermanentSticker(pool, target.die.id, target.index, sticker);
      const score = evaluateBuild(next, gear, seed).score;
      if (score > best.score) best = { pool: next, score, stickerId: sticker.id };
    }
  }
  return best;
}

/** Score the published pack slots; the generated hidden contents remain unknown to the policy. */
export function chooseBattleReward(pool: Dice[], gear: Equipment[], choices: BattleRewardOption[], seed: number, commonOnly: boolean) {
  const base = evaluateBuild(pool, gear, seed).score;
  const candidates = choices.map(option => {
    const slots = option.kind === 'bundle' ? [[option.sticker]] : option.pack.slots.map(slot => slot.map(createPermanentSticker));
    let guaranteedPool = pool, guaranteedScore = base, expectedGain = 0;
    for (const slot of slots) {
      const outcomes = slot.map(sticker => ({
        weight: REWARD_CONFIG.creatureWeights[sticker.rarity],
        upgrade: chooseUpgrade(guaranteedPool, gear, commonOnly && sticker.rarity !== 'common' ? [] : [sticker], seed),
      }));
      if (outcomes.length === 1) {
        guaranteedPool = outcomes[0].upgrade.pool;
        guaranteedScore = outcomes[0].upgrade.score;
      } else {
        const weight = outcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        expectedGain += outcomes.reduce((sum, outcome) => sum + (outcome.upgrade.score - guaranteedScore) * outcome.weight, 0) / weight;
      }
    }
    return { option, score: guaranteedScore + expectedGain };
  });
  return candidates.reduce((best, item) => item.score > best.score ? item : best).option;
}

export function chooseEquipment(pool: Dice[], gear: Equipment[], choices: Equipment[], seed: number) {
  let best = { gear, score: evaluateBuild(pool, gear, seed).score, equipmentId: '' };
  for (const item of choices) {
    const candidates = gear.length < INITIAL_PLAYER_STATS.maxEquipmentSlots ? [[...gear, item]] : gear.map((_, index) => gear.map((owned, slot) => slot === index ? item : owned));
    for (const next of candidates) {
      const score = evaluateBuild(pool, next, seed).score;
      if (score > best.score) best = { gear: next, score, equipmentId: item.id };
    }
  }
  return best;
}
