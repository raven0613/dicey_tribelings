import { ROAD_DICE_RECIPES, DICE_DRAFT_CONFIG, type DiceRecipe } from '../../configs/creatures/diceRecipeConfig';
import type { RegionId } from '../../types/enemy';
import { configuredDice } from './diceFactory';
import { sampleDistinct } from '../rewards/refreshService';
export function drawDiceRecipes(currentIds: readonly string[] = [], random = Math.random): DiceRecipe[] {
  return sampleDistinct(ROAD_DICE_RECIPES.filter(recipe => !currentIds.includes(recipe.id)), DICE_DRAFT_CONFIG.optionCount, random);
}
export function instantiateRecipe(recipe: DiceRecipe, region: RegionId, instanceId = `dice-${crypto.randomUUID()}`) {
  return { ...configuredDice(instanceId, recipe.name, 'd6', recipe.colorTheme,
    recipe.faces.map(([creature, value]) => [creature, value + DICE_DRAFT_CONFIG.regionBonus[region]])), recipeId: recipe.id };
}
