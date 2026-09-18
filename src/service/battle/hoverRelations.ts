import type { BattleComboSummary, SkillEvent } from '../../types/battle';
import { HOVER_PRESENTATION as presentation } from '../../configs/skillPresentationConfig';
import { ceilDamage } from './damageValue';

export interface HoverLink {
  id: string;
  from: string;
  to: string;
  kind: 'adjacent' | 'robbery' | 'attack';
  color: string;
  loss: number;
}
export interface HoverRelations { diceIds: string[]; links: HoverLink[] }

/** 僅讀取既定事件；同一接力隊列可由任一成員檢視。 */
export function getHoverRelations(summary: BattleComboSummary | null, hoveredId: string | null): HoverRelations {
  if (!summary || !hoveredId) return { diceIds: [], links: [] };
  const isFood = summary.items.find((item) => item.diceId === hoveredId)?.tags.includes('food');
  const events = summary.events.filter((event) => event.equipmentId === hoveredId || event.sourceDiceId === hoveredId
    || event.bonusIds.includes(hoveredId)
    || ((event.skill === 'porter' || (isFood && (event.skill === 'farmer' || event.skill === 'glutton')))
      && event.participantDiceIds.includes(hoveredId)));
  const diceIds = new Set<string>();
  const links = new Map<string, HoverLink>();
  const addLink = (event: SkillEvent, kind: HoverLink['kind'], from: string, to: string) => {
    const loss = kind === 'robbery' ? event.changes.filter((change) => change.kind === 'attack' && change.targetId === to)
      .reduce((sum, change) => sum + Math.max(0, ceilDamage(change.before) - ceilDamage(change.after)), 0) : 0;
    const color = kind === 'adjacent' && event.changes.some((change) => change.kind === 'shield')
      ? presentation.colors.shield : presentation.colors[kind];
    const id = `${kind}:${from}:${to}:${color}`;
    links.set(id, { id, from, to, kind, color, loss: (links.get(id)?.loss ?? 0) + loss });
  };
  for (const event of events) {
    const affected = event.equipmentId ? [...event.changes.map((change) => change.targetId),
      ...event.identities.map((identity) => identity.diceId)] : event.participantDiceIds;
    for (const id of [...affected, ...event.bonusIds]) {
      diceIds.add(id);
      if (event.equipmentId) {
        const source = summary.bonusDice.find((bonus) => bonus.id === id)?.source;
        if (source?.kind === 'creature') diceIds.add(source.diceId);
      }
    }
    if (event.relation === 'support') continue;
    const participants = summary.items.filter((item) => event.participantDiceIds.includes(item.diceId));
    if (event.relation === 'adjacent') {
      if (event.identities.length && event.sourceDiceId) {
        for (const identity of event.identities) addLink(event, event.relation, event.sourceDiceId, identity.diceId);
      } else {
        for (let index = 1; index < summary.items.length; index++) {
          const left = summary.items[index - 1], right = summary.items[index];
          if (participants.includes(left) && participants.includes(right)) addLink(event, event.relation, left.diceId, right.diceId);
        }
      }
    } else if (event.sourceDiceId) {
      for (const target of participants) if (target.diceId !== event.sourceDiceId) addLink(event, event.relation, event.sourceDiceId, target.diceId);
    }
  }
  return { diceIds: [...diceIds], links: [...links.values()] };
}

/** 共用既有關係判定，涵蓋發動者與接受者；常駐提示將同一條線合併。 */
export function getBoardRelations(summary: BattleComboSummary | null): HoverRelations {
  const diceIds = new Set<string>();
  const links = new Map<string, HoverLink>();
  const sources = new Set([
    ...(summary?.items.map((item) => item.diceId) ?? []),
    ...(summary?.bonusDice.map((item) => item.id) ?? []),
    ...(summary?.events.flatMap((event) => event.equipmentId ? [event.equipmentId] : []) ?? []),
  ]);
  for (const source of sources) {
    const relations = getHoverRelations(summary, source);
    relations.diceIds.forEach((id) => diceIds.add(id));
    for (const link of relations.links) {
      const endpoints = link.kind === 'adjacent' ? [link.from, link.to].sort() : [link.from, link.to];
      const key = `${link.kind}:${endpoints.join(':')}`;
      if (!links.has(key)) links.set(key, { ...link, id: key });
    }
  }
  return { diceIds: [...diceIds], links: [...links.values()] };
}

export function getRerollFeedbackDice(before: BattleComboSummary | null, after: BattleComboSummary, diceId: string): string[] {
  const signature = ({ id: _id, ...event }: SkillEvent) => JSON.stringify(event);
  const previous = new Set(before?.events.map(signature));
  const changed = after.events.filter((event) => !previous.has(signature(event))
    || event.sourceDiceId === diceId || (event.equipmentId
      ? event.changes.some((change) => change.targetId === diceId)
        || event.identities.some((identity) => identity.diceId === diceId)
      : event.participantDiceIds.includes(diceId)));
  const affected = getBoardRelations({ ...after, events: changed }).diceIds;
  return [...new Set([diceId, ...affected])];
}
