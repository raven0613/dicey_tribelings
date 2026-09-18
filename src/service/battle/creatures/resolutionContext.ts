import { lockImposterTargets, getRoundFace } from './imposterResolution';
import type { Dice, Equipment, BonusAttackDice } from '../../../types/game';
import type { CreatureBattleState, CreatureId } from '../../../types/creatures';
import type { BattleContext, CalculatedRollItem, SkillEvent, RepeatAttack } from '../../../types/battle';
import { CREATURE_CONFIG } from '../../../configs/creatures/creatureConfig';
import { getEffectiveFace, getFaceTags } from '../../dice/diceFaces';
import { getDiceGeometry } from '../../dice/diceGeometry';
import { ceilDamage } from '../damageValue';
import { combatNumber } from './creatureState';
import { findPranksterTargets, findTeacherTargets } from './rerollTargets';

export function createResolutionContext(dice: Dice[], indices: number[], equipment: Equipment[],
  state: CreatureBattleState, battle: BattleContext) {
  state = lockImposterTargets(dice, indices, state);
  const echoUsed = new Set(state.echoUsed);
  const materials = { healing: 0, reflection: 0, gildedFaces: new Set(state.gildedFaces) };
  const faces = dice.map((die) => die.faces.map(getEffectiveFace));
  const items: CalculatedRollItem[] = dice.map((die, index) => {
    const rolled = faces[index][indices[index]];
    const face = getRoundFace(die, indices[index], state);
    faces[index][indices[index]] = face;
    return { diceId: die.id, diceName: die.name, faceId: face.id, material: face.material, faceIndex: indices[index],
      rolledCreature: rolled.creature, rolledBaseValue: face.baseValue, creature: face.creature,
      baseValue: face.baseValue, finalDamage: face.baseValue, tags: getFaceTags(face),
      bonusTags: [], shieldGranted: 0, skillInputs: {} };
  });
  const events: SkillEvent[] = [];
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
  const teamShield = { value: 0 };
  const foodValues = Object.fromEntries(items.map((item) => [item.diceId, item.baseValue]));
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
  const echoMultiplier = (e: SkillEvent): number => {
    if (e.echoed) return 2;
    const source = items.find((item) => item.diceId === e.sourceDiceId);
    const faceId = e.sourceFaceId;
    const original = dice.flatMap((die) => die.faces).find((face) => face.id === faceId);
    if (!source || !faceId || original?.material !== 'echo' || echoUsed.has(faceId)
      || e.skill === 'material' || e.skill === 'equipment' || e.skill === 'storage'
      || e.skill === 'imposter' || e.skill === 'princessReady' || e.skill === 'coward' || e.skill === 'teacher') return 1;
    echoUsed.add(faceId); e.echoed = true; e.ability += '・迴響';
    return 2;
  };
  const attack = (e: SkillEvent, item: CalculatedRollItem, value: number, label?: string) => {
    if (combatNumber(value) === item.finalDamage) return;
    const multiplier = value > item.finalDamage || e.skill === 'glutton' ? echoMultiplier(e) : 1;
    const after = combatNumber(Math.max(0, item.finalDamage + (value - item.finalDamage) * multiplier));
    const delta = ceilDamage(after) - ceilDamage(item.finalDamage);
    const changeLabel = label ?? (after === 0 ? '歸零' : `${delta > 0 ? '+' : ''}${delta}`);
    e.changes.push({ kind: 'attack', targetId: item.diceId, before: item.finalDamage, after });
    item.finalDamage = after;
    item.bonusTags.push(`${e.ability} ${changeLabel}`);
  };
  const shield = (e: SkillEvent, item: CalculatedRollItem, amount: number) => {
    if (amount <= 0) return;
    amount *= echoMultiplier(e);
    const before = item.shieldGranted;
    item.shieldGranted = combatNumber(before + amount);
    e.changes.push({ kind: 'shield', targetId: item.diceId, before, after: item.shieldGranted });
    item.bonusTags.push(`${e.ability} 護盾 +${amount}`);
  };
  const bonus = (e: SkillEvent, source: CalculatedRollItem, amount: number, creature: CreatureId = source.creature) => {
    if (amount <= 0) return;
    const copies = echoMultiplier(e);
    for (let copy = 0; copy < copies; copy++) {
      const value = combatNumber(amount);
      const id = `bonus-${bonusDice.length}`;
      bonusDice.push({ id, creature, source: { kind: 'creature', diceId: source.diceId, faceId: e.sourceFaceId, ability: e.ability },
        sourceName: CREATURE_CONFIG[creature].name, bonusDamage: value, label: e.ability, description: `追加攻擊 ${ceilDamage(value)}` });
      e.bonusIds.push(id);
      e.changes.push({ kind: 'bonus', targetId: id, before: 0, after: value });
      source.bonusTags.push(`${e.ability} 追傷 +${ceilDamage(value)}`);
    }
  };
  const identify = (e: SkillEvent, item: CalculatedRollItem) => {
    echoMultiplier(e);
    e.identities.push({ diceId: item.diceId, creature: item.creature, tags: [...item.tags] });
  };
  const countParticipants = (predicate: (item: Pick<CalculatedRollItem, 'creature' | 'tags'>) => boolean) => items.filter(predicate);
  const speciesCount = (creature: CreatureId) => items.filter((item) => item.creature === creature).length;
  const tagCount = (tag: CalculatedRollItem['tags'][number]) => items.filter((item) => item.tags.includes(tag)).length;
  const neighbors = (index: number) => items.filter((_, other) => Math.abs(index - other) === 1);
  const faceCount = (index: number, creature: CreatureId) => faces[index].filter((face) => face.creature === creature).length;
  const adjacentFaces = (index: number) => getDiceGeometry(dice[index].dieType)[items[index].faceIndex].neighbors.map((neighbor) => faces[index][neighbor]);
  return { teamShield, foodValues, dice, items, faces, equipment, state, battle, events, bonusDice, repeatAttacks, nextStoredFood, echoUsed, echoMultiplier, materials, virtualFood: state.virtualFood,
    countParticipants, triggeredEquipmentIds, event, equipmentEvent, attack, shield, bonus,
    identify, speciesCount, tagCount, neighbors, faceCount, adjacentFaces };
}
export type ResolutionContext = ReturnType<typeof createResolutionContext>;
