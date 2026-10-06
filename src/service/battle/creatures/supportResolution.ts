import { getConfigurationInputs } from './configurationInputs';
import { storeRoundFood } from './foodResolution';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { CREATURE_CONFIG } from '../../../configs/creatures/creatureConfig';
import { EQUIPMENT_BALANCE as eq } from '../../../configs/equipment/equipmentConfig';
import { getFaceTags } from '../../dice/diceFaces';
import { getDiceGeometry } from '../../dice/diceGeometry';
import { choose } from './creatureState';
import type { ResolutionContext } from './resolutionContext';
import { resolveFoodBoost } from './identityResolution';
import { splitInteger } from './splitInteger';

export function resolveSupport(c: ResolutionContext) {
  resolveFoodBoost(c);
  const slots = c.equipment.find(item => item.ruleId === 'SLOTS');
  if (slots) {
    const counts = new Map<number, number>();
    c.items.forEach(item => counts.set(item.baseValue, (counts.get(item.baseValue) ?? 0) + 1));
    const max = Math.max(...counts.values());
    const value = choose([...counts].filter(([, count]) => count === max).map(([value]) => value), c.state.seed, 'slots');
    const targets = c.items.filter(item => item.baseValue === value);
    const e = c.equipmentEvent(4, slots, targets);
    for (const item of targets) c.attack(e, item, item.finalDamage + item.baseValue * (eq.matchedMultiplier - 1));
  }
  for (const [index, item] of c.items.entries()) {
    const e = c.event(4, item);
    if (item.creature === 'elder') for (const [i, target] of c.items.entries()) {
      if (target === item || !target.tags.length) continue;
      const count = c.faceCount(i, target.creature);
      c.attack(e, target, target.finalDamage + count * b.elder.bonusPerFace);
      e.participantDiceIds.push(target.diceId);
    }
    if (item.creature === 'glutton') {
      const foods = c.items.filter(target => target.tags.includes('food'));
      const amount = foods.reduce((sum, food) => sum + c.faces[c.items.indexOf(food)].filter(face => getFaceTags(face).includes('food')).reduce((total, face) => total + face.baseValue, 0), 0);
      item.skillInputs = { count: foods.length, value: amount, before: item.finalDamage };
      c.attack(e, item, item.finalDamage + amount, undefined, false);
      item.skillInputs.after = item.finalDamage;
    }
    if (item.creature === 'guard') {
      const targets = c.items.filter(target => target.tags.includes('common') || target.tags.includes('noble'));
      const count = c.faceCount(index, 'guard');
      item.skillInputs = { count: targets.length, secondaryCount: count };
      e.participantDiceIds.push(...targets.map(target => target.diceId));
      c.shield(e, item, targets.length * count);
    }
    if (item.creature === 'artisan') {
      const indices = getDiceGeometry(c.dice[index].dieType)[item.faceIndex].neighbors;
      const crafts = indices.filter(i => getFaceTags(c.faces[index][i]).includes('craftsman'));
      const amount = crafts.reduce((sum, i) => sum + b.artisan.shield + (c.faces[index][i].creature === 'artisan' ? c.dice[index].faces[i].baseValue : 0), 0);
      item.skillInputs = { count: crafts.length, value: amount };
      c.shield(e, item, amount);
    }
    const coward = c.state.cowardShields[item.diceId] ?? 0;
    if (coward) c.shield(c.event(4, item, CREATURE_CONFIG.coward.ability, [], 'support', 'coward'), item, coward);
    for (const [values, skill] of [[c.state.teacherBonuses, 'teacher'], [c.state.inheritance, 'prankster']] as const) {
      const gain = values[item.diceId] ?? 0;
      if (gain) c.attack({ ...c.event(4, item, CREATURE_CONFIG[skill].ability, [], 'support', skill), echoed: true }, item, item.finalDamage + gain, undefined, true);
    }
    for (const [rule, gain] of [['REROLL_MEMORY', c.state.firstRerollMemory[item.diceId] ?? 0], ['PATIENT', c.state.chargeLayers[item.diceId] ?? 0]] as const) {
      const equipment = c.equipment.find(entry => entry.ruleId === rule);
      if (equipment && gain) c.attack(c.equipmentEvent(4, equipment, [item]), item, item.finalDamage + gain);
    }
  }
  // Cheer is established before warrior/follower snapshots; its bonus dice copy the delivered gain.
  for (const [index, source] of c.items.entries()) if (source.creature === 'cheerleader') {
    const count = c.faceCount(index, 'cheerleader');
    const warriors = c.items.filter(item => item.tags.includes('warrior'));
    source.skillInputs = { count, secondaryCount: warriors.length };
    const e = c.event(4, source, undefined, warriors);
    const replay = c.echoEvent(e);
    for (const pass of replay ? [e, replay] : [e]) for (const target of warriors) {
      const before = target.finalDamage;
      // Each echo pass is explicit so attack and extra-die creation each occur once.
      const single = { ...pass, echoed: true };
      c.attack(single, target, before + count);
      c.bonus(single, source, target.finalDamage - before);
    }
  }
  for (const [index, warrior] of c.items.entries()) if (warrior.creature === 'warrior') {
    const count = getConfigurationInputs(c.dice, index, warrior.faceIndex, 'warrior', c.faces)!.count!;
    const facing = c.neighbors(index).filter(item => item.creature === 'follower').length;
    const e = c.event(4, warrior, undefined, c.neighbors(index), 'adjacent');
    warrior.skillInputs = { count, secondaryCount: facing };
    c.attack(e, warrior, (warrior.finalDamage + count * b.warrior.bonusPerFollower) * (1 + facing * b.warrior.perFacingFollower), undefined, false);
  }
  for (const [index, follower] of c.items.entries()) if (follower.creature === 'follower') {
    const warriors = c.neighbors(index).filter(item => item.creature === 'warrior');
    const highest = Math.max(0, ...warriors.map(item => item.finalDamage));
    const ratio = b.follower.fraction + (c.faceCount(index, 'follower') - 1) * b.follower.perFace;
    follower.skillInputs = { count: warriors.length, value: highest, secondaryCount: c.faceCount(index, 'follower') };
    c.attack(c.event(4, follower, undefined, warriors, 'adjacent'), follower, follower.finalDamage + highest * ratio, undefined, false);
  }
  let preceding = 0;
  for (const item of c.items) {
    if (item.creature !== 'porter') { preceding = 0; continue; }
    item.skillInputs = { value: preceding };
    c.attack(c.event(4, item), item, item.finalDamage + preceding, undefined, false);
    preceding += item.finalDamage;
  }
  const wall = c.equipment.find(item => item.ruleId === 'BARRICADE');
  if (wall) {
    const e = c.equipmentEvent(4, wall, []);
    const before = c.teamShield.value;
    c.teamShield.value += eq.barricadeShield; c.teamShield.events++;
    c.log.change(e, { kind: 'shield', targetId: 'player', before, after: c.teamShield.value });
  }
  const controlShield = c.equipment.find(item => item.ruleId === 'CONTROL_SHIELD');
  if (controlShield) for (const paid of c.state.controlPayments) {
    const e = c.equipmentEvent(4, controlShield, []);
    const before = c.teamShield.value;
    c.teamShield.value += paid * eq.controlShield; c.teamShield.events++;
    c.log.change(e, { kind: 'shield', targetId: 'player', before, after: c.teamShield.value });
  }
}

export function resolveFoodAndBonuses(c: ResolutionContext) {
  storeRoundFood(c);
  for (const [index, item] of c.items.entries()) {
    if (item.creature === 'chef') {
      const value = c.nextStoredFood[item.diceId] ?? 0;
      item.skillInputs = { value, count: c.faceCount(index, 'chef') };
      if (value > 0) {
        const e = c.event(5, item);
        for (const amount of splitInteger(value, c.faceCount(index, 'chef'))) c.bonus(e, item, amount);
        const rebate = c.equipment.find(eq => eq.ruleId === 'FOOD_REBATE');
        const remaining = rebate ? Math.floor(value * eq.foodRebate) : 0;
        c.nextStoredFood[item.diceId] = remaining;
        c.log.change(e, { kind: 'food', targetId: item.diceId, before: value, after: 0 });
        if (rebate && remaining) c.log.change(c.equipmentEvent(5, rebate, [item]), { kind: 'food', targetId: item.diceId, before: 0, after: remaining });
      }
    }
    if (item.creature === 'gang') {
      const count = getConfigurationInputs(c.dice, index, item.faceIndex, 'gang', c.faces)!.count!;
      item.skillInputs = { count, value: item.baseValue * b.gang.fraction };
      const e = c.event(5, item);
      for (let i = 0; i < count; i++) c.bonus(e, item, item.baseValue * b.gang.fraction);
    }
    if (item.creature === 'priest') {
      const count = c.nextAltars[item.diceId] ?? 0;
      const priests = c.items.filter(target => target.creature === 'priest');
      item.skillInputs = { count, value: item.pipValue, secondaryCount: priests.length };
      if (count) {
        const e = c.event(5, item, undefined, priests);
        for (let i = 0; i < count * priests.length; i++) c.bonus(e, item, item.pipValue);
        c.nextAltars[item.diceId] = 0;
      }
    }
  }
}
