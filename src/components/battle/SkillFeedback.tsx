import { MATERIAL_CONFIG } from '../../configs/materials/materialConfig';
import { SkillText } from '../common/SkillText';
import { useMemo, useRef, type CSSProperties } from 'react';
import { SkillNameLayer } from './SkillNameLayer';
import { useSkillNameLayout } from './useSkillNameLayout';
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
  const anchorRef = useRef<HTMLDivElement>(null);
  const entries = useMemo(() => feedback.filter(({ event }) => event.participantDiceIds.includes(diceId)
    || event.equipmentId === diceId || event.changes.some((change) => change.targetId === diceId)).map(({ event }) => {
      const source = event.sourceDiceId === diceId || event.equipmentId === diceId;
      const ownChanges = event.changes.filter((change) => change.targetId === diceId
        || (source && (change.targetId === 'virtual-food' || change.targetId === 'player')));
      const spawned = source ? event.changes.filter((change) => event.bonusIds.includes(change.targetId)) : [];
      const changes = spawned.length ? [...ownChanges.filter((change) => change.kind !== 'food'), ...spawned] : ownChanges;
      const labels = changes.map(changeText).filter(Boolean);
      const identity = event.identities.find((item) => item.diceId === diceId);
      if (identity) labels.push(identity.creature === 'food' ? CREATURE_CONFIG.food.name
        : identity.tags.map((tag) => CREATURE_TAG_NAMES[tag]).join('／'));
      if (event.repeatDiceIds.includes(diceId)) labels.push('再攻擊');
      const style = {
        ...(event.healing ? { '--pulse-color': MATERIAL_CONFIG.vial.color, '--pulse-core': MATERIAL_CONFIG.vial.surface } : {}),
        '--pulse-ms': `${timing.pulseMs}ms`, '--name-delay': `${timing.nameDelayMs}ms`,
        '--name-ms': `${timing.nameFadeInMs + timing.nameHoldMs + timing.nameFadeOutMs}ms`,
        '--name-rise': `${timing.nameRisePx}px`, '--name-entry': `${timing.nameEntryPx}px`,
      } as CSSProperties;
      return { id: event.id, source, style, healing: !!event.healing,
        showName: source || ownChanges.length > 0 || labels.length > 0,
        ability: event.healing ? `${MATERIAL_CONFIG.vial.symbol} +${event.healing}` : <SkillText text={event.ability} />,
        changes: labels.join('・'),
      };
  }), [diceId, feedback]);
  const names = useMemo(() => entries.filter((entry) => entry.showName), [entries]);
  const nameLayerRef = useSkillNameLayout(anchorRef, names);

  return <div ref={anchorRef} className="skill-feedback" aria-hidden="true">
    {entries.map(({ id, style, source }) => <span key={id} style={style}
      className={`skill-pulse ${source ? 'is-source' : 'is-participant'}`} />)}
    <SkillNameLayer rootRef={nameLayerRef} names={names} />
  </div>;
}
