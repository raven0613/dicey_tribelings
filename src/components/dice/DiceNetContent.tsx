import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { DiceFace, FaceSticker } from '../../types/game';
import { isArrowFace } from '../../configs/directionalStickerConfig';
import { CREATURE_SKILL_INTRO } from '../../configs/creatures/creatureSkillConfig';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { getEffectiveFace, getFaceTags } from '../../service/dice/diceFaces';
import { SkillText } from '../common/SkillText';
import { DiceIdentityHeader } from './DiceIdentityHeader';
import { DiceCharacter } from './DiceCharacter';
import { MaterialBadge } from './MaterialBadge';

export function getPreviewFace(face: DiceFace, sticker?: FaceSticker) {
  if (!sticker) return getEffectiveFace(face);
  return getEffectiveFace(sticker.isDisposable === true
    ? { ...face, temporarySticker: { name: sticker.name, creature: sticker.creature, description: sticker.description } }
    : { id: face.id, creature: sticker.creature, baseValue: sticker.baseValue, material: sticker.material });
}

/** The face and its popover share the same structured description and preview values. */
export function DiceNetContent({ face, sticker, full = false }: { face: DiceFace; sticker?: FaceSticker; full?: boolean }) {
  const root = useRef<HTMLSpanElement>(null);
  const measure = useRef<HTMLSpanElement>(null);
  const [summaryLines, setSummaryLines] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (full || !root.current || !measure.current) return;
    const element = root.current, description = measure.current;
    const update = () => {
      const header = element.querySelector<HTMLElement>('.dice-identity-header')!;
      const available = element.clientHeight - header.offsetHeight - parseFloat(getComputedStyle(element).rowGap);
      const lineHeight = parseFloat(getComputedStyle(description).lineHeight);
      setSummaryLines(description.offsetHeight > available ? Math.max(0, Math.floor(available / lineHeight)) : null);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element); observer.observe(description);
    return () => observer.disconnect();
  }, [face, sticker, full]);
  const original = getEffectiveFace(face);
  const effective = getPreviewFace(face, sticker);
  const creature = CREATURE_CONFIG[effective.creature];
  if (isArrowFace(effective.creature) && !full) return <svg className="dice-net-arrow" viewBox="0 0 100 100" aria-label={creature.name}>
    <DiceCharacter creature={effective.creature} animate={false} />
  </svg>;
  const attack = sticker ? sticker.isDisposable === true ? `${effective.baseValue}（沿用）`
    : `${original.baseValue} → ${effective.baseValue}` : effective.baseValue;
  const description = <>
    <strong className="dice-net-ability-title"><SkillText text={creature.ability} /></strong>
    {creature.description.split('\n').map((line, index) => <span key={index} className="dice-net-ability"><SkillText text={line} /></span>)}
    <MaterialBadge material={effective.material} description />
    {!sticker && face.temporarySticker && <span className="dice-net-sticker">
      本場覆蓋・原面 {CREATURE_CONFIG[face.creature].name} {face.baseValue}
    </span>}
  </>;
  return <span ref={root} className={`dice-net-copy ${full ? 'is-full' : ''}`} style={{ '--face-color': creature.color } as CSSProperties}>
    <DiceIdentityHeader creature={effective.creature} title={creature.name} tags={getFaceTags(effective)} attack={attack} />
    {full || summaryLines === null ? <span className="dice-net-description">{description}</span>
      : summaryLines > 0 && <span className="dice-net-summary" style={{ WebkitLineClamp: summaryLines }}>
        <SkillText text={`${creature.ability}：${CREATURE_SKILL_INTRO[effective.creature]}`} />
      </span>}
    {!full && <span ref={measure} className="dice-net-description dice-net-description-measure" aria-hidden="true">{description}</span>}
  </span>;
}
