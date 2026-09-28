import { CAMP_BUFFS } from '../../configs/campConfig';
import type { ResolutionContext } from '../battle/creatures/resolutionContext';

export function resolveCampShield(c: ResolutionContext) {
  if (c.battle.campBuff !== 'ward' || c.state.round > CAMP_BUFFS.ward.rounds) return;
  const event = c.event(4, undefined, CAMP_BUFFS.ward.name, c.items, 'support', 'camp');
  const before = c.teamShield.value;
  c.teamShield.value += CAMP_BUFFS.ward.shield;
  event.changes.push({ kind: 'shield', targetId: 'player', before, after: c.teamShield.value });
}

export function resolveCampAttacks(c: ResolutionContext) {
  const id = c.battle.campBuff;
  if (id !== 'sharpen' && id !== 'initiative') return;
  const buff = CAMP_BUFFS[id];
  if (c.state.round > buff.rounds) return;
  const targets = c.items.filter(item => item.finalDamage > 0);
  const event = c.event(12, undefined, buff.name, targets, 'support', 'camp');
  for (const item of targets) c.attack(event, item, id === 'sharpen'
    ? item.finalDamage + CAMP_BUFFS.sharpen.attack : item.finalDamage * CAMP_BUFFS.initiative.multiplier);
}
