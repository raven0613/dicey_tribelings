import type { Dice } from '../../../types/game';
import { MATERIAL_BALANCE as b, MATERIAL_CONFIG } from '../../../configs/materials/materialConfig';
import type { ResolutionContext } from './resolutionContext';
import { combatNumber } from './creatureState';

export function resolveMaterials(c: ResolutionContext) {
  for (const [index, item] of c.items.entries()) {
    if (!item.material) continue;
    const meta = MATERIAL_CONFIG[item.material];
    const e = c.event(1, item, meta.name, [], 'support', 'material');
    switch (item.material) {
      case 'resonance':
        e.participantDiceIds.push(...c.neighbors(index).map((target) => target.diceId));
        for (const target of c.neighbors(index)) {
          c.foodValues[target.diceId] += b.resonance;
          c.attack(e, target, target.finalDamage + b.resonance);
        }
        break;
      case 'shock':
        c.bonus(e, item, b.shock);
        c.bonusDice.at(-1)!.sourceName = meta.name;
        break;
      case 'ripple': c.shield(e, item, b.ripple); break;
      case 'vial':
        e.healing = Math.ceil(combatNumber(b.vial));
        c.materials.healing += e.healing; e.activated = true; break;
      case 'mirror': c.materials.reflection += b.mirror; break;
      case 'gilded':
        if (!c.materials.gildedFaces.has(item.faceId)) {
          c.materials.gildedFaces.add(item.faceId); e.activated = true; e.ability += `・勝利 +${b.gilded} 金幣`;
        }
        break;
    }
  }
}

export function commitMaterialRound(dice: Dice[], indices: number[]): Dice[] {
  return dice.map((die, i) => ({ ...die, faces: die.faces.map((face, j) =>
    j === indices[i] && face.material === 'negative'
      ? { ...face, materialDecay: Math.min(face.baseValue + b.negative, (face.materialDecay ?? 0) + b.decay) } : face) }));
}
