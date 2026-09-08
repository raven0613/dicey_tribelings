import type { Dice, Equipment, PermanentSticker } from '../../../types/game';
import { INITIAL_PLAYER_STATS } from '../../../configs/gameConfig';
import { RUN_SIMULATION_CONFIG as config } from '../../../configs/regions/runSimulationConfig';
import { applyPermanentSticker } from '../../inventory/inventoryService';
import { calculateRollResolution, predetermineRollResults } from '../battleEngine';
import { createCreatureBattleState } from '../creatures/creatureState';

export function seededRandom(initial: number) {
  let state = initial >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 0x100000000);
}
/** 相同樣本比較候選，只讀取已知骰面與裝備，和戰鬥亂數獨立。 */
export function evaluateBuild(pool: Dice[], gear: Equipment[], seed: number) {
  const random = seededRandom(seed);
  let damage = 0, shield = 0;
  for (let sample = 0; sample < config.evaluationSamples; sample++) {
    const summary = calculateRollResolution(pool, predetermineRollResults(pool, random), gear,
      { ...createCreatureBattleState(), seed: sample + seed }, { control: 1, maxControl: 3, gold: 0 });
    damage += summary.totalDamage; shield += summary.totalShield;
  }
  return { damage: damage / config.evaluationSamples, score: (damage + shield * config.shieldScore) / config.evaluationSamples };
}

export function chooseUpgrade(pool: Dice[], gear: Equipment[], choices: PermanentSticker[], seed: number) {
  let best = { pool, score: evaluateBuild(pool, gear, seed).score, stickerId: '' };
  const faces = pool.flatMap((die) => die.faces.map((face, index) => ({ die, face, index })));
  for (const sticker of choices) {
    const targets = [...faces].sort((a, b) => a.face.baseValue - b.face.baseValue).slice(0, config.candidateFaces);
    for (const die of pool) {
      // 同角色可直接提高品質，同骰同類角色可補足數量關係。
      const same = faces.filter((entry) => entry.die.id === die.id && entry.face.creature === sticker.creature)
        .sort((a, b) => a.face.baseValue - b.face.baseValue)[0];
      const weakest = faces.filter((entry) => entry.die.id === die.id).sort((a, b) => a.face.baseValue - b.face.baseValue)[0];
      if (same && !targets.includes(same)) targets.push(same);
      if (same && !targets.includes(weakest)) targets.push(weakest);
    }
    for (const target of targets) {
      const next = applyPermanentSticker(pool, target.die.id, target.index, sticker);
      const score = evaluateBuild(next, gear, seed).score;
      if (score > best.score) best = { pool: next, score, stickerId: sticker.id };
    }
  }
  return best;
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
