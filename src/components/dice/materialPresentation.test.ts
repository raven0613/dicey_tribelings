import { describeBattleSkills } from '../../service/battle/battleSkillDescription';
import { SkillText } from '../common/SkillText';
import { SKILL_KEYWORD_COLORS } from '../../configs/skillPresentationConfig';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BattleDie } from '../battle/BattleDie';
import { MaterialBadge } from './MaterialBadge';
import { MATERIAL_CONFIG } from '../../configs/materials/materialConfig';
import type { FaceMaterial } from '../../types/materials';
import { configuredDice } from '../../service/dice/diceFactory';
import { getEffectiveFace, getFaceTags } from '../../service/dice/diceFaces';
import { ceilDamage } from '../../service/battle/damageValue';
import { calculateRollResolution } from '../../service/battle/battleEngine';
import { createCreatureBattleState } from '../../service/battle/creatures/creatureState';

for (const material of Object.keys(MATERIAL_CONFIG) as FaceMaterial[]) test(`${material} has visible name, unique surface and accessible battle identity`, () => {
  const dice = configuredDice('a', '測試', 'd6', 'amber', Array.from({ length: 6 }, () => ['food', 4]));
  dice.faces[0].material = material;
  const face = getEffectiveFace(dice.faces[0]);
  const props = {
    dice, faceIndex: 0, size: 100, rotation: 0, motionRef: { current: null }, rolling: false, unrolled: false,
    value: ceilDamage(face.baseValue), effectiveCreature: face.creature, effectiveTags: getFaceTags(face),
    numberScale: 1, protectedDie: false, spinning: false, buffed: false, locked: false, canReroll: false,
    onReroll: () => { }, onInspect: () => { }
  };
  const markup = renderToStaticMarkup(createElement(BattleDie, props));
  assert.ok(markup.includes(`data-material="${material}"`));
  assert.ok(markup.includes('<pattern'));
  assert.ok(markup.includes(MATERIAL_CONFIG[material].name));
  const badge = renderToStaticMarkup(createElement(MaterialBadge, { material, description: true }));
  assert.ok(badge.includes(MATERIAL_CONFIG[material].description));
  const hidden = renderToStaticMarkup(createElement(BattleDie, { ...props, unrolled: true }));
  assert.ok(!hidden.includes('data-material='));
  assert.ok(!hidden.includes(MATERIAL_CONFIG[material].name));
  const neighbors = ['left', 'right'].map((id) => configuredDice(id, id, 'd6', 'amber', Array.from({ length: 6 }, () => ['food', 4])));
  const pool = [neighbors[0], dice, neighbors[1]];
  for (const used of [false, true]) {
    const state = createCreatureBattleState();
    if (used) state.echoUsed.push(dice.faces[0].id);
    const summary = calculateRollResolution(pool, [0, 0, 0], [], state);
    for (const preview of [summary, null]) {
      const { description, abilities } = describeBattleSkills({ die: dice, faceIndex: 0, creature: 'food', summary: preview, state });
      const expected = `${MATERIAL_CONFIG[material].name}：${MATERIAL_CONFIG[material].description}`
        + (material === 'echo' ? used ? '已發動' : '尚未發動' : '');
      assert.equal(description.split('\n').filter((line) => line === expected).length, 1);
      assert.equal(description.split(MATERIAL_CONFIG[material].description).length - 1, 1);
      if (preview && ['resonance', 'shock', 'ripple'].includes(material)) assert.ok(abilities.includes(MATERIAL_CONFIG[material].name));
      if (material === 'echo') {
        const status = used ? '已發動' : '尚未發動';
        const rendered = renderToStaticMarkup(createElement(SkillText, { text: description }));
        assert.ok(rendered.includes(`style="color:${SKILL_KEYWORD_COLORS[status]}">${status}</span>`));
        assert.equal(description.split(status).length - 1, 1);
      }
    }
  }

});

test('net preview preserves temporary materials and shows incoming permanent coating', async () => {
  const { DiceNetFace } = await import('./DiceNetFace');
  const { getDiceNet } = await import('../../service/dice/diceNet');
  const { createPermanentSticker, DISPOSABLE_STICKERS } = await import('../../configs/creatures/creatureStickerConfig');
  const face = { id: 'face', baseValue: 4, creature: 'food' as const, material: 'negative' as const };
  const props = {
    face, index: 0, geometry: getDiceNet('d6').faces[0], scale: 180, relation: 'current' as const,
    neighbors: [1, 2, 3, 4], onHover: () => { }, onFocus: () => { }, previewing: true
  };
  const { resolveTemporarySticker } = await import('../../service/inventory/inventoryService');
  const temporary = renderToStaticMarkup(createElement(DiceNetFace, { ...props, sticker: { ...DISPOSABLE_STICKERS[0], ...resolveTemporarySticker(DISPOSABLE_STICKERS[0]) } }));
  assert.ok(temporary.includes('data-material="negative"'));
  assert.ok(temporary.includes('9（沿用）'));
  const permanent = renderToStaticMarkup(createElement(DiceNetFace, { ...props, sticker: { ...createPermanentSticker('family', 1), material: 'foil' } }));
  assert.ok(permanent.includes('data-material="foil"'));
  const ordinary = renderToStaticMarkup(createElement(DiceNetFace, { ...props, sticker: createPermanentSticker('family', 1) }));
  assert.ok(!ordinary.includes('data-material='));
});
