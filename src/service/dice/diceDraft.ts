import { ROAD_DICE_RECIPES, DICE_DRAFT_CONFIG, type DiceRecipe } from '../../configs/creatures/diceRecipeConfig';
import { configuredDice } from './diceFactory';
import { sampleDistinct } from '../rewards/refreshService';
export function drawDiceRecipes(currentIds: readonly string[] = [], random = Math.random): DiceRecipe[] {
  const available = ROAD_DICE_RECIPES.filter(recipe => !currentIds.includes(recipe.id));
  const first = sampleDistinct(available.filter(recipe => recipe.selfStarting), 1, random)[0];
  return [first, ...sampleDistinct(available.filter(recipe => recipe !== first), DICE_DRAFT_CONFIG.optionCount - 1, random)];
}
export function instantiateRecipe(recipe: DiceRecipe, instanceId = `dice-${crypto.randomUUID()}`) {
  return { ...configuredDice(instanceId, recipe.name, 'd6', recipe.colorTheme, recipe.faces), recipeId: recipe.id };
}
