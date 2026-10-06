import test from 'node:test';
import assert from 'node:assert/strict';
import { ROAD_DICE_RECIPES, DICE_DRAFT_CONFIG } from '../../configs/creatures/diceRecipeConfig';
import { INITIAL_DICE_POOL } from '../../configs/creatures/initialDiceConfig';
import { D6_FACE_VALUES } from '../../configs/creatures/diceValueConfig';
import { drawDiceRecipes, instantiateRecipe } from './diceDraft';
import { createBossRewardDice } from './diceFactory';
import { getOppositeFace } from '../battle/rollService';
import { getRefreshCost } from '../rewards/refreshService';

test('drafts exclude current offers, guarantee an independent recipe and allow repeated acquisitions', () => {
  const a = drawDiceRecipes([], () => 0);
  const b = drawDiceRecipes(a.map(x => x.id), () => 0);
  assert.equal(a.length, DICE_DRAFT_CONFIG.optionCount);
  assert.equal(b.length, DICE_DRAFT_CONFIG.optionCount);
  assert.ok(b.every(x => !a.some(y => y.id === x.id)));
  assert.ok(a.some(x => x.selfStarting));
  assert.ok(b.some(x => x.selfStarting));
  const first = instantiateRecipe(a[0]), second = instantiateRecipe(a[0]);
  assert.notEqual(first.id, second.id);
  assert.ok(first.faces.every(f => !second.faces.some(s => s.id === f.id)));
});

test('starter, blank boss rewards and recipe dice preserve six unique pips and opposite pairs in every region', () => {
  for (const region of [1, 2, 3] as const) {
    const road = ROAD_DICE_RECIPES.map(recipe => instantiateRecipe(recipe, `r${region}-${recipe.id}`));
    const blank = createBossRewardDice(`r${region}-blank`);
    assert.ok(blank.faces.every(face => face.creature === 'blank' && !face.material));
    assert.notEqual(createBossRewardDice().id, createBossRewardDice().id);
    for (const die of [...INITIAL_DICE_POOL, ...road, blank]) {
      assert.deepEqual(die.faces.map(face => face.baseValue), [...D6_FACE_VALUES]);
      die.faces.forEach((face, i) => assert.equal(face.baseValue + die.faces[getOppositeFace(die, i)!].baseValue, 7));
      assert.ok(die.faces.every(face => face.creature !== 'princess'));
    }
    assert.ok(road.every(die => die.faces.filter(face => face.creature === 'blank').length === 3));
  }
  assert.ok(INITIAL_DICE_POOL.every(die => die.faces.filter(face => face.creature === 'blank').length === 4));
});

test('refresh prices rise independently by category', () => {
  for (const kind of ['dice', 'loot', 'shop', 'camp'] as const) {
    assert.ok(getRefreshCost(kind, 1) > getRefreshCost(kind, 0));
    assert.equal(getRefreshCost(kind, 2), getRefreshCost(kind, 0) * 3);
  }
});
