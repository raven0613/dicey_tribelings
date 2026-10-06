import { createSkillEventLog } from './skillEventLog';
import { createEchoResolution } from './echoResolution';
import { refreshImposterTargets, getRoundFace } from './imposterResolution';
import type { Dice, Equipment, BonusAttackDice } from '../../../types/game';
import type { CreatureBattleState, CreatureId } from '../../../types/creatures';
import type { BattleContext, CalculatedRollItem, SkillEvent, RepeatAttack } from '../../../types/battle';
import { CREATURE_CONFIG } from '../../../configs/creatures/creatureConfig';
import { getEffectiveFace, getFaceTags } from '../../dice/diceFaces';
import { ceilDamage } from '../damageValue';
import { combatNumber } from './creatureState';
import { findPranksterTargets, findTeacherTargets } from './rerollTargets';

export function createResolutionContext(dice: Dice[], indices: number[], equipment: Equipment[],
  state: CreatureBattleState, battle: BattleContext) {
  state = refreshImposterTargets(dice, indices, state);
  const echoUsed = new Set(state.echoUsed);
  const materials = { healing: 0, reflection: 0, gildedFaces: new Set(state.gildedFaces) };
  const faces = dice.map((die) => die.faces.map(getEffectiveFace));
  const items: CalculatedRollItem[] = dice.map((die, index) => {
    const rolled = faces[index][indices[index]];
    const face = getRoundFace(die, indices[index], state);
    faces[index][indices[index]] = face;
    return { diceId: die.id, diceName: die.name, faceId: face.id, material: face.material, faceIndex: indices[index],
      rolledCreature: rolled.creature, rolledBaseValue: face.baseValue, creature: face.creature,
      baseValue: face.baseValue, pipValue: die.faces[indices[index]].baseValue, finalDamage: face.baseValue, tags: getFaceTags(face),
      bonusTags: [], shieldGranted: 0, skillInputs: {} };
  });
  const events: SkillEvent[] = [];
  const log = createSkillEventLog();
  for (const [index, item] of items.entries()) {
    if (item.creature === 'teacher') {
      const targets = findTeacherTargets(items, state, item.diceId);
      item.skillInputs = { count: targets.length, value: targets.length ? items[targets[0]].baseValue : 0 };
    }
    if (item.creature === 'prankster') item.skillInputs = {
      count: state.prankstersUsed.includes(item.diceId) ? 0 : findPranksterTargets(items, state, index).length,
    };
  }
  const bonusDice: BonusAttackDice[] = [];
  const repeatAttacks: RepeatAttack[] = [];
  const teamShield = { value: 0, events: 0 };
  const batchState = { firstUsed: state.firstBonusUsed, processed: new Set<string>() };
  const nextAltars = { ...state.altars };
  const repeatFactors = new Map<string, number[]>();
  const nextStoredFood = { ...state.storedFood };
  const triggeredEquipmentIds = new Set<string>();
  const event = (stage: number, source: CalculatedRollItem | undefined, ability?: string, participants: CalculatedRollItem[] = [],
    relation: SkillEvent['relation'] = 'support', skill: SkillEvent['skill'] = source?.creature ?? 'equipment') => {
    const result: SkillEvent = { id: `skill-${events.length}`, stage, relation, skill, activated: false, sourceDiceId: source?.diceId, sourceFaceId: source?.faceId,
      ability: ability ?? (source ? CREATURE_CONFIG[source.creature].ability : ''),
      participantDiceIds: [...new Set([...(source ? [source.diceId] : []), ...participants.map((item) => item.diceId)])],
      changes: [], identities: [], bonusIds: [], repeatDiceIds: [] };
    events.push(result);
    return result;
  };
  const equipmentEvent = (stage: number, eq: Equipment, participants: CalculatedRollItem[] = items) => {
    const result = event(stage, undefined, eq.name, participants);
    result.equipmentId = eq.id;
    triggeredEquipmentIds.add(eq.id);
    return result;
  };
  const echoEvent = createEchoResolution(dice, items, events, echoUsed);
  const echoMultiplier = (e: SkillEvent) => echoEvent(e) ? 2 : 1;
  const applyAttack = (e: SkillEvent, item: CalculatedRollItem, amount: number, label?: string) => {
    if (item.attackTransferred && amount > 0) return;
    const before = item.finalDamage;
    const after = combatNumber(Math.max(0, before + amount));
    if (before === after) return;
    log.change(e, { kind: 'attack', targetId: item.diceId, before, after });
    item.finalDamage = after;
    const delta = ceilDamage(after) - ceilDamage(before);
    item.bonusTags.push(`${e.ability} ${label ?? (after === 0 ? '歸零' : `${delta > 0 ? '+' : ''}${delta}`)}`);
  };
  const externalAttack = (e: SkillEvent, item: CalculatedRollItem, amount: number, label?: string) => {
    if (item.attackTransferred) return;
    applyAttack(e, item, amount, label);
    if (amount <= 0) return;
    item.externalGain = true;
    const row = faces[items.indexOf(item)];
    const copies = item.creature === 'family' ? row.filter((face, index) => index !== item.faceIndex && face.creature === 'family').length
      : item.creature === 'royalGuard' ? row.filter((face, index) => index !== item.faceIndex && getFaceTags(face).includes('noble')).length : 0;
    const sisters = item.creature === 'sisters' ? items.filter(other => other !== item && other.creature === 'sisters') : [];
    if (!copies && !sisters.length) return;
    const transfer = event(e.stage, item, undefined, sisters.length ? sisters : [item]);
    const replay = echoEvent(transfer);
    for (const pass of replay ? [transfer, replay] : [transfer]) {
      if (copies) applyAttack(pass, item, amount * copies);
      for (const sister of sisters) {
        applyAttack(pass, sister, amount);
        sister.externalGain = true;
      }
    }
  };
  const attack = (e: SkillEvent, item: CalculatedRollItem, value: number, label?: string,
    external = e.skill !== 'camp' && (e.sourceDiceId !== item.diceId || e.skill === 'equipment')) => {
    const amount = combatNumber(value - item.finalDamage);
    if (!amount) return;
    const replay = amount > 0 ? echoEvent(e) : undefined;
    for (const pass of replay ? [e, replay] : [e]) {
      if (external && amount > 0) externalAttack(pass, item, amount, label);
      else applyAttack(pass, item, amount, label);
    }
  };
  const shield = (e: SkillEvent, item: CalculatedRollItem, amount: number) => {
    if (amount <= 0) return;
    const replay = echoEvent(e);
    teamShield.events += replay ? 2 : 1;
    const total = Math.ceil(combatNumber(amount * (replay ? 2 : 1)));
    for (const [index, event] of (replay ? [e, replay] : [e]).entries()) {
      const gain = index ? total - Math.ceil(amount) : Math.ceil(amount);
      const before = item.shieldGranted;
      item.shieldGranted = combatNumber(before + gain);
      log.change(event, { kind: 'shield', targetId: item.diceId, before, after: item.shieldGranted });
      item.bonusTags.push(`${event.ability} 護盾 +${gain}`);
    }
  };
  const bonus = (e: SkillEvent, source: CalculatedRollItem, amount: number, creature: CreatureId = source.creature) => {
    if (amount <= 0) return;
    const replay = echoEvent(e);
    for (const event of replay ? [e, replay] : [e]) {
      const value = combatNumber(amount);
      const id = `bonus-${bonusDice.length}`;
      bonusDice.push({ id, creature, source: { kind: 'creature', diceId: source.diceId, faceId: e.sourceFaceId, ability: event.ability },
        sourceName: CREATURE_CONFIG[creature].name, bonusDamage: value, originalDamage: value, label: event.ability, description: `追加攻擊 ${ceilDamage(value)}` });
      event.bonusIds.push(id);
      log.change(event, { kind: 'bonus', targetId: id, before: 0, after: value });
      source.bonusTags.push(`${event.ability} 追傷 +${ceilDamage(value)}`);
    }
  };
  const identityTags = new Map(dice.map((die, index) => [die.id, getFaceTags(getEffectiveFace(die.faces[indices[index]])).sort().join(',')]));
  const identityState = { changes: state.identityChanges };
  const identify = (e: SkillEvent, item: CalculatedRollItem) => {
    const tags = [...item.tags].sort().join(',');
    if (!Object.hasOwn(state.identitySnapshot, item.diceId) && identityTags.get(item.diceId) !== tags) identityState.changes++;
    identityTags.set(item.diceId, tags);
    log.identity(e, { diceId: item.diceId, creature: item.creature, tags: [...item.tags] });
  };
  const countParticipants = (predicate: (item: Pick<CalculatedRollItem, 'creature' | 'tags'>) => boolean) => items.filter(predicate);
  const speciesCount = (creature: CreatureId) => items.filter((item) => item.creature === creature).length;
  const tagCount = (tag: CalculatedRollItem['tags'][number]) => items.filter((item) => item.tags.includes(tag)).length;
  const neighbors = (index: number) => items.filter((_, other) => Math.abs(index - other) === 1);
  const faceCount = (index: number, creature: CreatureId) => faces[index].filter((face) => face.creature === creature).length;
  return { log, teamShield, identityState, dice, items, faces, equipment, state, battle, events, bonusDice, repeatAttacks, repeatFactors, batchState, nextAltars, nextStoredFood, echoUsed, echoMultiplier, echoEvent, materials,
    countParticipants, triggeredEquipmentIds, event, equipmentEvent, attack, shield, bonus,
    identify, speciesCount, tagCount, neighbors, faceCount };
}
export type ResolutionContext = ReturnType<typeof createResolutionContext>;
