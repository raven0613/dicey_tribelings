import type { Dice, Equipment, BonusAttackDice } from '../../../types/game';
import type { CreatureBattleState, CreatureId } from '../../../types/creatures';
import type { BattleContext, CalculatedRollItem, SkillEvent, RepeatAttack } from '../../../types/battle';
import { CREATURE_CONFIG } from '../../../configs/creatures/creatureConfig';
import { getEffectiveFace } from '../../dice/diceFaces';
import { ceilDamage } from '../damageValue';
import { combatNumber } from './creatureState';

export function createResolutionContext(dice: Dice[], indices: number[], equipment: Equipment[],
  state: CreatureBattleState, battle: BattleContext) {
  const faces = dice.map((die) => die.faces.map(getEffectiveFace));
  const items: CalculatedRollItem[] = dice.map((die, index) => {
    const face = faces[index][indices[index]];
    return { diceId: die.id, diceName: die.name, faceIndex: indices[index],
      rolledCreature: face.creature, rolledBaseValue: face.baseValue, creature: face.creature,
      baseValue: face.baseValue, finalDamage: face.baseValue, tags: [...CREATURE_CONFIG[face.creature].tags],
      bonusTags: [], shieldGranted: 0 };
  });
  const events: SkillEvent[] = [];
  const bonusDice: BonusAttackDice[] = [];
  const repeatAttacks: RepeatAttack[] = [];
  const nextStoredFood = { ...state.storedFood };
  const virtualFaces: { sourceDiceId: string; creature: CreatureId; tags: CalculatedRollItem['tags'] }[] = [];
  const triggeredEquipmentIds = new Set<string>();
  const event = (stage: number, source: CalculatedRollItem | undefined, ability?: string, participants: CalculatedRollItem[] = []) => {
    const result: SkillEvent = { id: `skill-${events.length}`, stage, sourceDiceId: source?.diceId,
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
  const attack = (e: SkillEvent, item: CalculatedRollItem, value: number, label?: string) => {
    const after = combatNumber(value);
    if (after === item.finalDamage) return;
    const delta = ceilDamage(after) - ceilDamage(item.finalDamage);
    const changeLabel = label ?? (after === 0 ? '歸零' : `${delta > 0 ? '+' : ''}${delta}`);
    e.changes.push({ kind: 'attack', targetId: item.diceId, before: item.finalDamage, after });
    item.finalDamage = after;
    item.bonusTags.push(`${e.ability} ${changeLabel}`);
  };
  const shield = (e: SkillEvent, item: CalculatedRollItem, amount: number) => {
    if (amount <= 0) return;
    const before = item.shieldGranted;
    item.shieldGranted = combatNumber(before + amount);
    e.changes.push({ kind: 'shield', targetId: item.diceId, before, after: item.shieldGranted });
    item.bonusTags.push(`${e.ability} 護盾 +${amount}`);
  };
  const bonus = (e: SkillEvent, source: CalculatedRollItem, amount: number, creature: CreatureId = source.creature) => {
    if (amount <= 0) return;
    const value = combatNumber(amount);
    const id = `bonus-${bonusDice.length}`;
    bonusDice.push({ id, creature, source: { kind: 'creature', diceId: source.diceId, ability: e.ability },
      sourceName: CREATURE_CONFIG[creature].name, bonusDamage: value, label: e.ability, description: `追加攻擊 ${ceilDamage(value)}` });
    e.bonusIds.push(id);
    e.changes.push({ kind: 'bonus', targetId: id, before: 0, after: value });
    source.bonusTags.push(`${e.ability} 追傷 +${ceilDamage(value)}`);
  };
  const identify = (e: SkillEvent, item: CalculatedRollItem) => e.identities.push({
    diceId: item.diceId, creature: item.creature, tags: [...item.tags],
  });
  const countParticipants = (predicate: (item: Pick<CalculatedRollItem, 'creature' | 'tags'>) => boolean) =>
    items.filter((item) => predicate(item) || virtualFaces.some((face) => face.sourceDiceId === item.diceId && predicate(face)));
  const speciesCount = (creature: CreatureId) => items.filter((item) => item.creature === creature).length
    + virtualFaces.filter((face) => face.creature === creature).length;
  const tagCount = (tag: CalculatedRollItem['tags'][number]) => items.filter((item) => item.tags.includes(tag)).length
    + virtualFaces.filter((face) => face.tags.includes(tag)).length;
  const neighbors = (index: number) => items.filter((_, other) => Math.abs(index - other) === 1);
  const faceCount = (index: number, creature: CreatureId) => faces[index].filter((face) => face.creature === creature).length;
  return { dice, items, faces, equipment, state, battle, events, bonusDice, repeatAttacks, nextStoredFood,
    virtualFaces, countParticipants, triggeredEquipmentIds, event, equipmentEvent, attack, shield, bonus,
    identify, speciesCount, tagCount, neighbors, faceCount };
}
export type ResolutionContext = ReturnType<typeof createResolutionContext>;
