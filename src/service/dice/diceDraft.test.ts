import { CREATURE_BALANCE } from '../../configs/creatures/creatureBalanceConfig';
import test from 'node:test';
import assert from 'node:assert/strict';
import { ROAD_DICE_RECIPES } from '../../configs/creatures/diceRecipeConfig';
import { drawDiceRecipes, instantiateRecipe } from './diceDraft';
import { getRefreshCost } from '../rewards/refreshService';

test('recipe drafts exclude only the current offer and allow repeated acquisitions', () => {
  const a = drawDiceRecipes([], () => 0);
  const b = drawDiceRecipes(a.map(x => x.id), () => 0);
  assert.equal(a.length, 3);
  assert.equal(b.length, 3);
  assert.ok(b.every(x => !a.some(y => y.id === x.id)));
  const c = drawDiceRecipes(b.map(x => x.id), () => 0);
  assert.deepEqual(c, a);
  const first = instantiateRecipe(a[0], 1), second = instantiateRecipe(a[0], 1);
  assert.notEqual(first.id, second.id);
  assert.ok(first.faces.every(f => !second.faces.some(s => s.id === f.id)));
  first.faces[0].baseValue++;
  assert.notEqual(first.faces[0].baseValue, second.faces[0].baseValue);
});
test('road recipes cover every permanent role except the special princess source', () => {
  assert.equal(ROAD_DICE_RECIPES.length, 18);
  assert.ok(ROAD_DICE_RECIPES.every(x => x.faces.length === 6));
  const roles = new Set(ROAD_DICE_RECIPES.flatMap(x => x.faces.map(f => f[0])));
  assert.equal(roles.size, 31);
  assert.ok(!roles.has('princess'));
  assert.ok(ROAD_DICE_RECIPES.filter(x => x.faces.some(f => f[0] === 'porter')).length >= 6);
});
test('refresh prices rise independently by category', () => {
  for (const kind of ['dice', 'loot', 'shop', 'camp'] as const) {
    assert.ok(getRefreshCost(kind, 1) > getRefreshCost(kind, 0));
    assert.equal(getRefreshCost(kind, 2), getRefreshCost(kind, 0) * 3);
  }
});

test('starter artisans keep partial shield synergy and regional grants keep road recipe geometry', async () => {
  const { INITIAL_DICE_POOL } = await import('../../configs/creatures/initialDiceConfig');
  const { CREATURE_CONFIG } = await import('../../configs/creatures/creatureConfig');
  const { DICE_DRAFT_CONFIG } = await import('../../configs/creatures/diceRecipeConfig');
  const { getDiceGeometry } = await import('./diceGeometry');
  const geometry = getDiceGeometry('d6');
  const support = INITIAL_DICE_POOL[2];
  const craftCounts = support.faces.flatMap((face, index) => face.creature === 'artisan'
    ? [geometry[index].neighbors.filter(n => CREATURE_CONFIG[support.faces[n].creature].tags.includes('craftsman')).length] : []);
  assert.ok(craftCounts.length > 0);
  assert.ok(craftCounts.every(count => count > 0 && count < CREATURE_BALANCE.artisan.threshold));
  for (const [index, face] of support.faces.entries()) {
    const same = support.faces.findIndex((other, otherIndex) => otherIndex !== index && other.creature === face.creature);
    assert.ok(same >= 0 && !geometry[index].neighbors.includes(same));
  }
  const gang = ROAD_DICE_RECIPES.find(recipe => recipe.id === 'gang')!;
  const gangFaces = gang.faces.flatMap(([creature], index) => creature === 'gang' ? [index] : []);
  assert.ok(gangFaces.every(index => gangFaces.every(other => other === index || geometry[index].neighbors.includes(other))));
  for (const recipe of ROAD_DICE_RECIPES) {
    assert.ok(!INITIAL_DICE_POOL.some(die => JSON.stringify(die.faces.map(face => [face.creature, face.baseValue])) === JSON.stringify(recipe.faces)));
    const die = instantiateRecipe(recipe, 3);
    die.faces.forEach((face, index) => {
      assert.equal(face.creature, recipe.faces[index][0]);
      assert.equal(face.baseValue, recipe.faces[index][1] + DICE_DRAFT_CONFIG.regionBonus[3]);
    });
  }
});
