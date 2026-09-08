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
  const isFood = summary.items.find((item) => item.diceId === hoveredId)?.rolledCreature === 'food';
  const events = summary.events.filter((event) => event.sourceDiceId === hoveredId
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
    for (const id of [...event.participantDiceIds, ...event.bonusIds]) diceIds.add(id);
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
