import assert from 'node:assert/strict';
import test from 'node:test';
import { ARROW_IDS, ARROW_CONFIG } from '../../configs/directionalStickerConfig';
import { SHOP_CONFIG } from '../../configs/shopConfig';
import { ALL_STICKERS_CATALOG, DIRECTIONAL_STICKER_ITEM, createPermanentSticker } from '../../configs/creatures/creatureStickerConfig';
import { getStickerOffer } from '../shop/shopService';
import { configuredDice } from './diceFactory';
import { getDiceGeometry } from './diceGeometry';
import { getDiceNet } from './diceNet';
import { getArrowTarget, getArrowConfigurationError, resolveLandingFace } from './directionalFaces';
import { getEffectiveFace, getFaceTags } from './diceFaces';
import { applyTemporaryPlacements, createConsumableSticker, restoreTemporaryStickers, validateTemporaryPlacements } from '../inventory/inventoryService';
import { calculateRollResolution } from '../battle/battleEngine';
import { createCreatureBattleState } from '../battle/creatures/creatureState';
import type { ArrowId } from '../../types/creatures';

const makeDie = () => configuredDice('a', 'A', 'd6', 'amber', Array.from({ length: 6 }, () => ['family', createPermanentSticker('family', 1).baseValue]));
const owned = (id = 'arrow') => createConsumableSticker(DIRECTIONAL_STICKER_ITEM, id);

test('each direction chooses the adjacent cube face across that edge of the fixed net', () => {
  const die = makeDie();
  getDiceGeometry('d6').forEach((face, index) => {
    const targets = ARROW_IDS.map((arrow) => getArrowTarget(die, index, arrow));
    assert.deepEqual([...targets].sort(), [...face.neighbors].sort());
    targets.forEach((target, direction) => {
      const vector = ARROW_CONFIG[ARROW_IDS[direction]].vector;
      // Find the shared physical edge, then inspect its actual position in the unfolded polygon.
      const normal = getDiceGeometry('d6')[target].normal;
      const edgeVertices = face.points.flatMap(([x, y], vertex) => {
        const world = face.center.map((value, axis) => value + face.right[axis] * x + face.up[axis] * y);
        return Math.abs(world.reduce((sum, value, axis) => sum + value * normal[axis], 0) - 1) < 1e-7
          ? [getDiceNet('d6').faces[index].points[vertex]] : [];
      });
      assert.equal(edgeVertices.length, 2);
      const bounds = getDiceNet('d6').faces[index].bounds;
      const edgeDirection = [
        (edgeVertices[0][0] + edgeVertices[1][0]) / 2 - (bounds.x + bounds.width / 2),
        (edgeVertices[0][1] + edgeVertices[1][1]) / 2 - (bounds.y + bounds.height / 2),
      ];
      assert.ok(edgeDirection.every((value, axis) => Math.abs(value - vector[axis]) < 1e-7));
    });
  });
});

test('one freely directional item has its own price and stays outside permanent rewards', () => {
  const item = DIRECTIONAL_STICKER_ITEM;
  assert.equal(item.cost, SHOP_CONFIG.directionalCost);
  assert.equal(getStickerOffer([item], item.id, SHOP_CONFIG.directionalCost - 1), null);
  assert.equal(getStickerOffer([item], item.id, SHOP_CONFIG.directionalCost)?.cost, SHOP_CONFIG.directionalCost);
  const entries = ALL_STICKERS_CATALOG.filter((entry) => entry.creature === 'directional');
  assert.deepEqual(entries, [item]);
  assert.equal(item.isDisposable, true);
});

test('temporary arrows remove source role, base and coating contributions and restore exactly', () => {
  const die = makeDie(); die.faces[0].material = 'iridescent';
  const arrow = owned('arrowRight');
  const pool = applyTemporaryPlacements([die], [{ diceId: die.id, faceIndex: 0, consumable: arrow, direction: 'arrowRight' }]);
  const face = getEffectiveFace(pool[0].faces[0]);
  assert.equal(face.baseValue, 0);
  assert.equal(face.material, undefined);
  assert.deepEqual(getFaceTags(face), []);
  assert.deepEqual(restoreTemporaryStickers(pool), [die]);
  const target = getArrowTarget(die, 0, 'arrowRight');
  assert.equal(resolveLandingFace(pool[0], 0), target);
  assert.equal(resolveLandingFace(pool[0], target), target);
  const summary = calculateRollResolution(pool, [target], [], createCreatureBattleState());
  assert.equal(summary.items[0].skillInputs.count, die.faces.length - 1);
});

test('whole configuration rejects both new outgoing and preexisting incoming arrow links', () => {
  const die = makeDie(), first = owned('arrowRight'), second = owned('arrowUp');
  const target = getArrowTarget(die, 0, 'arrowRight');
  const a = { diceId: die.id, faceIndex: 0, consumable: first, direction: 'arrowRight' as const };
  const b = { diceId: die.id, faceIndex: target, consumable: second, direction: 'arrowUp' as const };
  assert.equal(validateTemporaryPlacements([die], [first, second], [a]), true);
  assert.equal(validateTemporaryPlacements([die], [first], [{ ...a, direction: undefined }]), false);
  assert.equal(validateTemporaryPlacements([die], [first], [{ ...a, direction: 'invalid' as ArrowId }]), false);
  for (const direction of ARROW_IDS) {
    const placement = { ...a, direction };
    assert.equal(validateTemporaryPlacements([die], [first], [placement]), true);
    const [prepared] = applyTemporaryPlacements([die], [placement]);
    assert.equal(resolveLandingFace(prepared, a.faceIndex), getArrowTarget(die, a.faceIndex, direction));
  }
  assert.equal(validateTemporaryPlacements([die], [first, second], [a, b]), false);
  assert.equal(validateTemporaryPlacements([die], [first, second], [b, a]), false);
  assert.ok(getArrowConfigurationError(applyTemporaryPlacements([die], [a, b])));
  assert.equal(validateTemporaryPlacements([die], [first, second], [b]), true);
  const forged = { ...b, consumable: { ...second, creature: 'family' as const } };
  assert.equal(validateTemporaryPlacements([die], [first, second], [a, forged]), false);
});

test('multiple arrows may share one ordinary destination', () => {
  const die = makeDie();
  const target = 0;
  const placements = getDiceGeometry('d6')[target].neighbors.slice(0, 3).map((faceIndex, i) => {
    const arrow = ARROW_IDS.find((id) => getArrowTarget(die, faceIndex, id) === target)!;
    return { diceId: die.id, faceIndex, consumable: owned(`arrow-${i}`), direction: arrow };
  });
  assert.equal(validateTemporaryPlacements([die], placements.map((p) => p.consumable), placements), true);
  const [prepared] = applyTemporaryPlacements([die], placements);
  assert.equal(prepared.faces.filter((_, i) => resolveLandingFace(prepared, i) === target).length, placements.length + 1);
});

test('initial rolls resolve arrows before identities and never charge altars', async () => {
  const { performStartBattleRoll } = await import('../battle/rollService');
  const die = makeDie();
  const target = getArrowTarget(die, 0, 'arrowRight');
  die.faces[0].material = 'shock';
  die.faces[target].creature = 'priest';
  die.faces[target].material = 'foil';
  const pool = applyTemporaryPlacements([die], [{ diceId: die.id, faceIndex: 0, consumable: owned(), direction: 'arrowRight' }]);
  const result = performStartBattleRoll(pool, [], undefined, undefined, 0, () => 0);
  assert.deepEqual(result.rolledIndices, [target]);
  assert.equal(result.creatureBattleState.rollOrigins[die.id], 0);
  assert.equal(result.creatureBattleState.rerollCount, 0);
  assert.equal(result.creatureBattleState.altars[die.id], 0);
  assert.equal(result.comboSummary.items[0].baseValue, getEffectiveFace(die.faces[target]).baseValue);
  assert.equal(result.comboSummary.bonusDice.length, 0);
});

test('teacher compares the final destination and one real reroll charges the altar once', async () => {
  const { performStartBattleRoll, performControlReroll } = await import('../battle/rollService');
  const { CREATURE_BALANCE: b } = await import('../../configs/creatures/creatureBalanceConfig');
  const die = makeDie(), target = getArrowTarget(die, 0, 'arrowRight');
  die.faces[target].creature = 'priest';
  die.faces[target].baseValue = createPermanentSticker('priest', 6).baseValue;
  const teacher = configuredDice('teacher', 'teacher', 'd6', 'amber', Array.from({ length: 6 }, () => ['teacher', die.faces[target].baseValue]));
  const pool = applyTemporaryPlacements([die, teacher], [{ diceId: die.id, faceIndex: 0, consumable: owned(), direction: 'arrowRight' }]);
  const initial = performStartBattleRoll(pool, [], undefined, undefined, 0, () => 0.5);
  initial.creatureBattleState.altars[die.id] = b.priest.splitAt - 1;
  const result = performControlReroll(0, { ...initial, combatPhase: 'CONTROL_PHASE', dicePool: pool,
    equipments: [], control: 0, maxControl: 0, gold: 0 }, () => 0, teacher.id)!;
  assert.ok(result);
  assert.equal(result.steps.length, 1);
  const step = result.steps[0];
  assert.equal(step.rolledIndices[0], target);
  assert.equal(step.state.rerollCount, 1);
  assert.equal(step.state.altars[die.id], b.priest.splitAt);
  assert.equal(step.state.teacherBonuses[die.id], b.teacher.bonus);
  const summary = calculateRollResolution(pool, step.rolledIndices, [], step.state);
  const damage = b.priest.splitAt * b.priest.highDamage;
  assert.deepEqual(summary.bonusDice.map((bonus) => bonus.bonusDamage), [Math.floor(damage / 2), Math.ceil(damage / 2)]);
});

test('a prankster reroll resolves its neighbor arrow within the same finite chain', async () => {
  const { resolveRerollChain } = await import('../battle/creatures/rerollResolution');
  const prankster = makeDie(); prankster.id = 'prankster'; prankster.faces[0].creature = 'prankster';
  const die = makeDie(), target = getArrowTarget(die, 0, 'arrowRight');
  const pool = applyTemporaryPlacements([prankster, die], [{ diceId: die.id, faceIndex: 0, consumable: owned(), direction: 'arrowRight' }]);
  const state = createCreatureBattleState(); state.altars[die.id] = 0;
  const steps = resolveRerollChain(pool, [0, 1], state, 0, [], () => 0);
  assert.equal(steps.length, 2);
  assert.equal(steps[1].rolledIndices[1], target);
  assert.equal(steps[1].state.rerollCount, 2);
  assert.equal(steps[1].state.altars[die.id], 1);
});

test('direct opposite-face actions resolve arrows without becoming rerolls', async () => {
  const { performDiceAction } = await import('../battle/rollService');
  const { ALL_EQUIPMENT_CATALOG, EQUIPMENT_BALANCE } = await import('../../configs/equipment/equipmentConfig');
  const die = makeDie(), target = getArrowTarget(die, 0, 'arrowRight');
  const pool = applyTemporaryPlacements([die], [{ diceId: die.id, faceIndex: 0, consumable: owned(), direction: 'arrowRight' }]);
  const state = createCreatureBattleState(); state.altars[die.id] = 0;
  const result = performDiceAction('flip', 0, { combatPhase: 'CONTROL_PHASE', dicePool: pool, rolledIndices: [1],
    creatureBattleState: state, equipments: ALL_EQUIPMENT_CATALOG.filter((item) => item.ruleId === 'PRISM'),
    control: EQUIPMENT_BALANCE.prismCost, maxControl: EQUIPMENT_BALANCE.prismCost, gold: 0 })!;
  assert.ok(result);
  assert.equal(result.rolledIndices[0], target);
  assert.equal(result.creatureBattleState.rerollCount, 0);
  assert.equal(result.creatureBattleState.altars[die.id], 0);
});

test('imposters never choose arrow configurations as a local majority', async () => {
  const { lockImposterTargets } = await import('../battle/creatures/imposterResolution');
  const die = makeDie(); die.faces[0].creature = 'imposter';
  const pool = applyTemporaryPlacements([die], [2, 3, 4].map((faceIndex, i) => ({ diceId: die.id, faceIndex,
    consumable: owned(`up-${i}`), direction: 'arrowUp' as const })));
  const state = lockImposterTargets(pool, [0], createCreatureBattleState());
  assert.equal(state.imposterTargets[die.id], 'family');
});
