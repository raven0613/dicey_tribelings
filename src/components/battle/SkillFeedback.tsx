import { SkillText } from '../common/SkillText';
import React from 'react';
import type { SkillChange, SkillFeedback as Feedback } from '../../types/battle';
import { BATTLE_PRESENTATION as timing } from '../../configs/battleConfig';
import { CREATURE_CONFIG, CREATURE_TAG_NAMES } from '../../configs/creatures/creatureConfig';
import { ceilDamage } from '../../service/battle/damageValue';
import { combatNumber } from '../../service/battle/creatures/creatureState';

function changeText(change: SkillChange): string {
  const attack = change.kind === 'attack' || change.kind === 'bonus';
  const delta = attack ? ceilDamage(change.after) - ceilDamage(change.before) : combatNumber(change.after - change.before);
  if (delta === 0) return '';
  const icon = change.kind === 'shield' ? '🛡 ' : change.kind === 'food' ? '🍖 ' : '';
  return `${icon}${delta > 0 ? '+' : ''}${delta}`;
}

export function SkillFeedback({ diceId, feedback }: { diceId: string; feedback: Feedback[] }) {
  const related = feedback.filter(({ event }) => event.participantDiceIds.includes(diceId)
    || event.equipmentId === diceId || event.changes.some((change) => change.targetId === diceId));
  return <div className="skill-feedback" aria-hidden="true">
    {related.map(({ event }) => {
      const source = event.sourceDiceId === diceId || event.equipmentId === diceId;
      const ownChanges = event.changes.filter((change) => change.targetId === diceId
        || (source && change.targetId === 'virtual-food'));
      const spawned = source ? event.changes.filter((change) => event.bonusIds.includes(change.targetId)) : [];
      const changes = spawned.length ? [...ownChanges.filter((change) => change.kind !== 'food'), ...spawned] : ownChanges;
      const labels = changes.map(changeText).filter(Boolean);
      const identity = event.identities.find((item) => item.diceId === diceId);
      if (identity) labels.push(identity.creature === 'food' ? CREATURE_CONFIG.food.name
        : identity.tags.map((tag) => CREATURE_TAG_NAMES[tag]).join('／'));
      if (event.repeatDiceIds.includes(diceId)) labels.push('再攻擊');
      const style = {
        '--pulse-ms': `${timing.pulseMs}ms`, '--name-delay': `${timing.nameDelayMs}ms`,
        '--name-ms': `${timing.nameFadeInMs + timing.nameHoldMs + timing.nameFadeOutMs}ms`,
        '--name-rise': `${timing.nameRisePx}px`, '--name-lane': `${Number(event.id.split('-')[1]) % 3 * timing.nameLanePx}px`,
      } as React.CSSProperties;
      return <React.Fragment key={event.id}>
        <span style={style} className={`skill-pulse ${source ? 'is-source' : 'is-participant'}`} />
        {(source || ownChanges.length > 0 || labels.length > 0) && <span style={style} className="skill-name">
          <span className="skill-ability"><SkillText text={event.ability} /></span>
          {labels.length > 0 && <span className="skill-change">{labels.join('・')}</span>}
        </span>}
      </React.Fragment>;
    })}
  </div>;
}
