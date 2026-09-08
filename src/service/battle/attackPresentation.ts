import type { AttackStage } from '../../types/game';
import { BATTLE_PRESENTATION as timing } from '../../configs/battleConfig';
import { ATTACK_EMPHASIS as emphasis } from '../../configs/attackPresentationConfig';

const unit = (value: number) => Math.max(0, Math.min(1, value));

/** Compare the finalized batch once; damage weighting keeps tiny follow-ups from diluting the baseline. */
export function getAttackEmphases(attacks: readonly { value: number }[]): number[] {
  const total = attacks.reduce((sum, attack) => sum + attack.value, 0);
  const squares = attacks.reduce((sum, attack) => sum + attack.value ** 2, 0);
  const ranked = attacks.map(({ value }, position) => ({ value, position })).sort((a, b) => b.value - a.value);
  const [first, second, third] = ranked;
  const pairedLeaders = third && third.value > 0
    && second.value / third.value >= emphasis.relativeStart
    && first.value / second.value <= emphasis.relativeStart;
  const pairReference = pairedLeaders
    ? (squares - first.value ** 2 - second.value ** 2) / (total - first.value - second.value) : 0;
  return attacks.map(({ value }, position) => {
    const rest = total - value;
    if (value <= 0 || rest <= 0) return 0;
    const reference = pairedLeaders && (position === first.position || position === second.position)
      ? pairReference : (squares - value ** 2) / rest;
    const relative = unit((value / reference - emphasis.relativeStart) / (emphasis.relativePeak - emphasis.relativeStart));
    const share = unit((value / total - emphasis.shareStart) / (emphasis.sharePeak - emphasis.shareStart));
    const strength = Math.sqrt(relative * share);
    return strength >= emphasis.minimumStrength ? strength : 0;
  });
}

export function getAttackTiming(strength: number) {
  return {
    windup: strength > 0 ? emphasis.windupMs + emphasis.extraWindupMs * strength : timing.windupMs,
    dash: timing.dashMs,
    impact: timing.impactMs + emphasis.extraImpactMs * strength,
    recoil: timing.recoilMs + emphasis.extraRecoilMs * strength,
  };
}

/** Shared motion for normal, bonus and repeated attacks. */
export function getAttackPose(stage: AttackStage, strength: number, offset: { x: number; y: number }, reducedMotion = false) {
  const duration = stage === 'idle' ? 0 : getAttackTiming(strength)[stage];
  const carry = strength > 0;
  const progress = carry ? unit((strength - emphasis.minimumStrength) / (1 - emphasis.minimumStrength)) : 0;
  const carryScale = emphasis.carryScale.min + (emphasis.carryScale.max - emphasis.carryScale.min) * progress;
  const bulgeStrength = carry ? emphasis.bulge.minimum + (1 - emphasis.bulge.minimum) * progress : 0;
  const easing = stage === 'windup' && carry ? emphasis.easing.windup
    : stage === 'dash' ? emphasis.easing.dash : emphasis.easing.settle;
  let x = 0, y = 0, sx = 1, sy = 1, rotation = 0, bulge = 0;
  if (stage === 'windup') {
    y = emphasis.windupOffset; rotation = emphasis.rotation.windup;
    sx = sy = carry ? carryScale : emphasis.scale.windup;
    bulge = bulgeStrength * emphasis.bulge.windup;
  } else if (stage === 'dash') {
    x = offset.x; y = offset.y; rotation = emphasis.rotation.dash;
    sx = carry ? carryScale : emphasis.scale.dash;
    sy = sx + emphasis.dashStretch * strength;
    bulge = bulgeStrength * emphasis.bulge.dash;
  } else if (stage === 'impact') {
    x = offset.x; y = offset.y; rotation = emphasis.rotation.impact;
    const size = carry ? carryScale : emphasis.scale.impact;
    sx = size + emphasis.impactSquash * strength;
    sy = size - emphasis.impactSquash * strength;
    bulge = bulgeStrength * emphasis.bulge.impact;
  }
  if (reducedMotion) { sx = 1; sy = 1; rotation = 0; bulge = 0; }
  return {
    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${sx}, ${sy})`,
    transition: duration ? `transform ${duration}ms ${easing}` : 'none',
    rotation, bulge, duration, easing,
  };
}
