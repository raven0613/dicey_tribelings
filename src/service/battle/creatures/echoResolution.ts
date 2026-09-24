import { echoAbilityName } from '../../../configs/materials/materialConfig';
import { CREATURE_CONFIG } from '../../../configs/creatures/creatureConfig';
import type { CalculatedRollItem, SkillEvent } from '../../../types/battle';
import type { Dice } from '../../../types/game';

/** One complete role activation can span multiple stages and targets in this resolution. */
export function createEchoResolution(dice: Dice[], items: CalculatedRollItem[], events: SkillEvent[], used: Set<string>) {
  const activations = new Map<string, string>();
  const replays = new Map<string, SkillEvent>();
  return (event: SkillEvent): SkillEvent | undefined => {
    if (event.echoed || ['material', 'equipment', 'imposter', 'princessReady', 'coward', 'teacher'].includes(event.skill)) return;
    const source = items.find(item => item.diceId === event.sourceDiceId);
    const faceId = event.sourceFaceId;
    const original = dice.flatMap(die => die.faces).find(face => face.id === faceId);
    if (!source || !faceId || original?.material !== 'echo') return;
    const skill = event.skill === 'storage' ? source.creature : event.skill;
    if (used.has(faceId) && activations.get(faceId) !== skill) return;
    used.add(faceId);
    activations.set(faceId, skill);
    let replay = replays.get(event.id);
    if (!replay) {
      replay = { ...event, id: `${event.id}-echo`, echoed: true, activated: false,
        ability: echoAbilityName(event.skill === 'storage' ? CREATURE_CONFIG[source.creature].ability : event.ability),
        participantDiceIds: [...event.participantDiceIds], changes: [], identities: [], bonusIds: [], repeatDiceIds: [] };
      events.push(replay);
      replays.set(event.id, replay);
    }
    return replay;
  };
}
