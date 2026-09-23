import { MATERIAL_CONFIG, MATERIAL_BALANCE, FOOD_CAPACITY } from '../../configs/materials/materialConfig';
import { CREATURE_CONFIG as roles } from '../../configs/creatures/creatureConfig';
import { CREATURE_SKILL_INTRO, CREATURE_SKILL_STAGES } from '../../configs/creatures/creatureSkillConfig';
import type { CreatureBattleState, CreatureId } from '../../types/creatures';
import type { BattleComboSummary } from '../../types/battle';
import type { Dice } from '../../types/game';
import { getEffectiveFace } from '../dice/diceFaces';
import { ceilDamage } from './damageValue';

export interface BattleSkillLine { text: string; achieved?: boolean }
interface DescriptionInput {
  die: Dice; faceIndex: number; creature: CreatureId;
  summary: BattleComboSummary | null; state: CreatureBattleState;
}

/** Player copy is independent of internal settlement rules; status uses captured skill inputs. */
export function describeBattleSkills({ die, faceIndex, creature, summary, state }: DescriptionInput) {
  const face = getEffectiveFace(die.faces[faceIndex]);
  const item = summary?.items.find((entry) => entry.diceId === die.id);
  const roleId = item?.rolledCreature === 'imposter' ? state.imposterTargets[die.id] ?? item.creature : item?.rolledCreature ?? creature;
  const role = roles[roleId];
  const events = summary?.events.filter((event) => event.sourceDiceId === die.id && !event.equipmentId) ?? [];
  const inputs = item?.skillInputs ?? {};
  const lines: BattleSkillLine[] = [{ text: `${role.ability}：${CREATURE_SKILL_INTRO[roleId]}` }];
  for (const stage of CREATURE_SKILL_STAGES[roleId] ?? []) lines.push({ text: stage.text, achieved: summary && item ? stage.achieved(inputs) : undefined });
  if (item?.rolledCreature === 'imposter' && roleId !== 'imposter') lines.unshift({ text: `本回合偽裝成：${role.name}` });
  if (item && summary) {
    const metric = roleId === 'chef' ? `釋放前存糧 ${inputs.value ?? 0}`
      : roleId === 'bulwark' ? `本回合新增護盾 ${inputs.value ?? 0}`
        : roleId === 'priest' ? `祭壇 ${inputs.count ?? 0} 次`
          : inputs.count !== undefined ? `目前符合數量 ${inputs.count}` : '';
    const bonuses = summary.bonusDice.filter((bonus) => bonus.source.kind === 'creature' && bonus.source.diceId === die.id);
    const repeats = summary.repeatAttacks.filter((attack) => attack.sourceDiceId === die.id);
    lines.push({ text: [metric, `攻擊力 ${ceilDamage(item.finalDamage)}`, item.shieldGranted ? `護盾 ${item.shieldGranted}` : '', bonuses.length ? `追加 ${bonuses.length} 顆，共 ${bonuses.reduce((sum, bonus) => sum + ceilDamage(bonus.bonusDamage), 0)} 傷害` : '', repeats.length ? `再攻擊 ${repeats.length} 次` : ''].filter(Boolean).join('；') });
  }
  if (face.material) {
    const status = face.material === 'echo' ? state.echoUsed.includes(face.id) ? '已發動' : '尚未發動' : '';
    lines.push({ text: `${MATERIAL_CONFIG[face.material].name}：${MATERIAL_CONFIG[face.material].description}${status}` });
    if (face.material === 'negative') lines.push({ text: `目前基礎攻擊力 ${face.baseValue}，結算後 ${Math.max(0, face.baseValue - MATERIAL_BALANCE.decay)}。` });
  }
  if (item?.tags.includes('food') || roleId === 'chef') lines.push({ text: `全隊存糧 ${Object.values(state.storedFood).reduce((sum, value) => sum + value, 0)}／${FOOD_CAPACITY.crocodile}` });
  if (state.altars[die.id] !== undefined) lines.push({ text: `本骰祭壇 ${state.altars[die.id]} 次；擲出祭司時釋放。` });
  if (state.cowardShields[die.id]) lines.push({ text: `膽小土人已留下 ${state.cowardShields[die.id]} 護盾` });
  if (state.teacherBonuses[die.id]) lines.push({ text: `老師加成 +${state.teacherBonuses[die.id]}` });
  if (state.lockedDice.includes(die.id)) lines.push({ text: '免疫強制重骰。' });
  const chain = roleId === 'porter' ? summary?.events.find((event) => event.skill === 'porter' && event.participantDiceIds.includes(die.id)) : undefined;
  return { abilities: [...new Set([...events.map((event) => event.ability), ...(chain ? [chain.ability] : [])])], lines, description: lines.map((line) => line.text).join('\n') };
}
