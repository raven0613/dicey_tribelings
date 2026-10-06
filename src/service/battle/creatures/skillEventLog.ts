import type { SkillChange, SkillEvent } from '../../../types/battle';

/** Preserve the actual order when a source resumes after a nested reaction. */
export function createSkillEventLog() {
  const timeline: SkillEvent[] = [];
  let lastSource: string | undefined;
  const segment = (source: SkillEvent) => {
    if (lastSource === source.id) return timeline[timeline.length - 1];
    const entry: SkillEvent = { ...source, id: `${source.id}:step-${timeline.length}`, activated: true,
      participantDiceIds: source.participantDiceIds, changes: [], identities: [], bonusIds: [], repeatDiceIds: [] };
    timeline.push(entry);
    lastSource = source.id;
    return entry;
  };
  const change = (source: SkillEvent, value: SkillChange) => {
    source.changes.push(value);
    const entry = segment(source);
    entry.changes.push(value);
    if (value.kind === 'bonus' && value.before === 0 && value.after > 0 && source.bonusIds.includes(value.targetId))
      entry.bonusIds.push(value.targetId);
  };
  const identity = (source: SkillEvent, value: SkillEvent['identities'][number]) => {
    source.identities.push(value);
    segment(source).identities.push(value);
  };
  const repeat = (source: SkillEvent, diceId: string) => {
    source.repeatDiceIds.push(diceId);
    segment(source).repeatDiceIds.push(diceId);
  };
  const activate = (source: SkillEvent) => { source.activated = true; segment(source); };
  return { timeline, change, identity, repeat, activate };
}
